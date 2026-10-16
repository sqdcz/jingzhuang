// 流式下载器：进度 + 秒速 + SHA256 + 取消 + 多线程分块（纯 Node，无 Electron 依赖）
//
// 策略：
//  1. 先发一个 GET 拿文件名/大小/是否支持 Range
//  2. 支持 Range 且文件够大 → 8 连接并行分块下载（ overseas 源单连接常被限速，
//     多开几路能显著提速；任何一块断了自动从断点重试 2 次）
//  3. 不支持 Range / 大小未知 / 小文件 → 退回单连接流式下载
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Readable } = require('stream')
const { fetchWithRedirects } = require('./verify')

const SEGMENT_CONNECTIONS = 8      // 并行连接数
const SEGMENT_MIN_SIZE = 2 * 1024 * 1024   // 小于 2MB 不值得分块
const SEGMENT_RETRIES = 2          // 每块失败重试次数

function sanitizeName(name) {
  return String(name || 'setup.exe').replace(/[\\/:*?"<>|\r\n]/g, '_').trim().slice(0, 120) || 'setup.exe'
}

function uniquePath(dir, name) {
  let p = path.join(dir, name)
  let i = 1
  const ext = path.extname(name)
  const base = path.basename(name, ext)
  while (fs.existsSync(p)) {
    p = path.join(dir, `${base} (${i++})${ext}`)
  }
  return p
}

function fmtBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** 进度聚合器：滚动窗口算秒速（比"平均速度"更接近体感），250ms 节流上报 */
function makeProgressReporter(onProgress, filePath, name, total) {
  const window = []          // [{t, received}] 最近 ~4 秒采样
  let lastEmit = 0
  return (received, done) => {
    if (!onProgress) return
    const now = Date.now()
    window.push({ t: now, received })
    while (window.length > 2 && now - window[0].t > 4000) window.shift()
    if (now - lastEmit < 250 && !done) return
    lastEmit = now
    const first = window[0]
    const secs = Math.max(0.5, (now - first.t) / 1000)
    const speed = (received - first.received) / secs
    onProgress({ received, total, speed, path: filePath, name })
  }
}

/** 单连接流式下载（保留原逻辑：边下边算哈希） */
async function downloadSingle(url, { toDir, onProgress, cancelToken }) {
  const r = await fetchWithRedirects(url, { method: 'GET', timeoutMs: 60000 })
  if (!r.ok) throw new Error(`无法连接下载地址: ${r.error}`)
  const { res } = r
  if (res.status >= 400) throw new Error(`下载地址返回 ${res.status}`)

  const ct = res.headers.get('content-type') || ''
  if (/text\/html/i.test(ct)) {
    throw new Error('该链接返回的是网页而不是安装包，请到官方下载页手动下载')
  }
  const { name, total } = parseMeta(res, url, ct)
  const filePath = uniquePath(toDir, name)
  const out = fs.createWriteStream(filePath)
  const hash = crypto.createHash('sha256')
  const nodeStream = Readable.fromWeb(res.body)
  const report = makeProgressReporter(onProgress, filePath, name, total)

  let received = 0
  nodeStream.on('data', (chunk) => {
    if (cancelToken && cancelToken.cancelled) {
      nodeStream.destroy(new Error('已取消下载'))
      return
    }
    received += chunk.length
    hash.update(chunk)
    report(received, total > 0 && received >= total)
  })

  try {
    await new Promise((resolve, reject) => {
      nodeStream.pipe(out)
      out.on('finish', resolve)
      out.on('error', reject)
      nodeStream.on('error', reject)
    })
  } catch (e) {
    try { out.close() } catch (_i) { /* 忽略 */ }
    try { fs.unlinkSync(filePath) } catch (_i) { /* 忽略 */ }
    throw e
  }

  if (cancelToken && cancelToken.cancelled) {
    try { fs.unlinkSync(filePath) } catch (_i) { /* 忽略 */ }
    throw new Error('已取消下载')
  }

  return { filePath, name, size: received, sizeText: fmtBytes(received), sha256: hash.digest('hex'), contentType: ct }
}

function parseMeta(res, url, ct) {
  let name = ''
  const cd = res.headers.get('content-disposition') || ''
  const cdm = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  if (cdm) {
    try { name = decodeURIComponent(cdm[1].trim()) } catch (_e) { name = cdm[1].trim() }
  }
  if (!name) {
    const tail = url.split('?')[0].split('#')[0].split('/').pop() || ''
    try { name = decodeURIComponent(tail) } catch (_e) { name = tail }
  }
  name = sanitizeName(name)
  if (!/\.(exe|msi|msix|zip)$/i.test(name)) {
    name += /zip/i.test(ct) ? '.zip' : '.exe'
  }
  const total = Number(res.headers.get('content-length') || 0)
  return { name, total }
}

/**
 * 多线程分块下载。
 * 思路：预分配目标文件 → 按 Range 分 N 块并行拉 → 每块写到自己的偏移 →
 *      全部完成后顺序读回文件算 SHA256（分块乱序到达，不能边下边算）。
 */
async function downloadSegmented(finalUrl, { toDir, name, total, ct, onProgress, cancelToken }) {
  const filePath = uniquePath(toDir, name)

  // 1. 预分配（稀疏文件即可，ftruncate 不实际占盘，写哪补哪）
  const fd = fs.openSync(filePath, 'w')
  fs.ftruncateSync(fd, total)
  fs.closeSync(fd)

  // 2. 分块
  const n = Math.max(1, Math.min(SEGMENT_CONNECTIONS, Math.ceil(total / (512 * 1024))))
  const segSize = Math.ceil(total / n)
  const segs = []
  for (let i = 0; i < n; i++) {
    const start = i * segSize
    const end = Math.min(total, start + segSize) - 1
    if (start > end) break
    segs.push({ i, start, end, received: 0 })
  }
  const report = makeProgressReporter(onProgress, filePath, name, total)
  const agg = () => segs.reduce((s, x) => s + x.received, 0)

  const pullSeg = async (seg) => {
    const r = await fetchWithRedirects(finalUrl, {
      method: 'GET',
      timeoutMs: 60000,
      headers: { range: `bytes=${seg.start + seg.received}-${seg.end}` }
    })
    if (!r.ok) throw new Error(`分块 ${seg.i + 1} 连接失败: ${r.error}`)
    if (r.res.status !== 206 && r.res.status !== 200) {
      try { await r.res.arrayBuffer() } catch (_e) { /* 忽略 */ }
      throw new Error(`分块 ${seg.i + 1} 返回 ${r.res.status}（服务器可能不支持 Range）`)
    }
    const nodeStream = Readable.fromWeb(r.res.body)
    const out = fs.createWriteStream(filePath, { flags: 'r+', start: seg.start + seg.received })
    const base = seg.received
    await new Promise((resolve, reject) => {
      nodeStream.on('data', (chunk) => {
        if (cancelToken && cancelToken.cancelled) {
          nodeStream.destroy(new Error('已取消下载'))
          return
        }
        seg.received += chunk.length
        out.write(chunk)
        report(agg())
      })
      nodeStream.on('error', reject)
      out.on('error', reject)
      nodeStream.on('end', () => { out.end(() => resolve()) })
      // 写入失败也要终结流，避免悬挂
      nodeStream.on('aborted', () => { try { out.end() } catch (_e) { /* 忽略 */ } reject(new Error('连接中断')) })
    })
    if (seg.start + seg.received !== seg.end + 1) {
      throw new Error(`分块 ${seg.i + 1} 不完整（${seg.received}/${seg.end - seg.start + 1}）`)
    }
  }

  const pullSegWithRetry = async (seg) => {
    let lastErr = null
    for (let attempt = 0; attempt <= SEGMENT_RETRIES; attempt++) {
      try {
        await pullSeg(seg)
        return
      } catch (e) {
        lastErr = e
        if (cancelToken && cancelToken.cancelled) break
        if (/已取消/.test(e.message)) break
        // 重试前把写坏的部分截掉不必要——r+ 按偏移写会覆盖，received 保持即可
      }
    }
    throw lastErr
  }

  try {
    await Promise.all(segs.map(pullSegWithRetry))
  } catch (e) {
    try { fs.unlinkSync(filePath) } catch (_i) { /* 忽略 */ }
    throw e
  }

  if (cancelToken && cancelToken.cancelled) {
    try { fs.unlinkSync(filePath) } catch (_i) { /* 忽略 */ }
    throw new Error('已取消下载')
  }
  report(total, true)

  // 3. 顺序读回算哈希
  const hash = crypto.createHash('sha256')
  await new Promise((resolve, reject) => {
    const rs = fs.createReadStream(filePath)
    rs.on('data', (c) => hash.update(c))
    rs.on('error', reject)
    rs.on('end', resolve)
  })

  return { filePath, name, size: total, sizeText: fmtBytes(total), sha256: hash.digest('hex'), contentType: ct }
}

/**
 * 下载文件到目录（对外接口不变）。
 * cancelToken: { cancelled: false }，外部置 true 即中断。
 */
async function downloadFile(url, { toDir, onProgress, cancelToken, connections } = {}) {
  if (!toDir) throw new Error('未指定保存目录')
  fs.mkdirSync(toDir, { recursive: true })

  // 探测：拿文件名 / 大小 / 是否支持 Range
  const r = await fetchWithRedirects(url, { method: 'GET', timeoutMs: 60000 })
  if (!r.ok) throw new Error(`无法连接下载地址: ${r.error}`)
  const { res, finalUrl } = r
  if (res.status >= 400) throw new Error(`下载地址返回 ${res.status}`)

  const ct = res.headers.get('content-type') || ''
  if (/text\/html/i.test(ct)) {
    throw new Error('该链接返回的是网页而不是安装包，请到官方下载页手动下载')
  }

  const { name, total } = parseMeta(res, url, ct)
  const acceptRanges = /bytes/i.test(res.headers.get('accept-ranges') || '')
  const maxConn = Math.max(1, Math.min(16, Number(connections) || SEGMENT_CONNECTIONS))

  // 释放探测用的响应体
  try { await res.body.cancel() } catch (_e) { /* 忽略 */ }

  const canSegment =
    total > SEGMENT_MIN_SIZE &&
    acceptRanges &&
    !(cancelToken && cancelToken.cancelled)

  if (!canSegment) {
    // 服务器不支持 Range 或文件太小 → 单连接下载（重新发一次请求）
    return downloadSingle(finalUrl, { toDir, onProgress, cancelToken })
  }

  try {
    return await downloadSegmented(finalUrl, { toDir, name, total, ct, onProgress, cancelToken, connections: maxConn })
  } catch (e) {
    if (cancelToken && cancelToken.cancelled) throw e
    if (/Range|206/.test(e.message)) {
      // 服务器嘴上说支持 Range 实际不给 206 → 退回单连接
      return downloadSingle(finalUrl, { toDir, onProgress, cancelToken })
    }
    throw e
  }
}

module.exports = { downloadFile, fmtBytes, sanitizeName }
