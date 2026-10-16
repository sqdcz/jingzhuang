// 流式下载器：进度 + 秒速 + SHA256 + 取消（纯 Node）
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Readable } = require('stream')
const { fetchWithRedirects } = require('./verify')

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

/**
 * 下载文件到目录。
 * cancelToken: { cancelled: false }，外部置 true 即中断。
 */
async function downloadFile(url, { toDir, onProgress, cancelToken } = {}) {
  if (!toDir) throw new Error('未指定保存目录')
  fs.mkdirSync(toDir, { recursive: true })

  const r = await fetchWithRedirects(url, { method: 'GET', timeoutMs: 60000 })
  if (!r.ok) throw new Error(`无法连接下载地址: ${r.error}`)
  const { res } = r
  if (res.status >= 400) throw new Error(`下载地址返回 ${res.status}`)

  const ct = res.headers.get('content-type') || ''
  if (/text\/html/i.test(ct)) {
    throw new Error('该链接返回的是网页而不是安装包，请到官方下载页手动下载')
  }

  // 文件名：优先 content-disposition，其次 URL 末段
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
  const filePath = uniquePath(toDir, name)
  const out = fs.createWriteStream(filePath)
  const hash = crypto.createHash('sha256')
  const nodeStream = Readable.fromWeb(res.body)

  let received = 0
  let lastEmit = 0
  const startedAt = Date.now()

  nodeStream.on('data', (chunk) => {
    if (cancelToken && cancelToken.cancelled) {
      nodeStream.destroy(new Error('已取消下载'))
      return
    }
    received += chunk.length
    hash.update(chunk)
    const now = Date.now()
    if (now - lastEmit > 250 || (total && received >= total)) {
      lastEmit = now
      const secs = Math.max(0.5, (now - startedAt) / 1000)
      if (onProgress) {
        onProgress({ received, total, speed: received / secs, path: filePath, name })
      }
    }
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

  return {
    filePath,
    name,
    size: received,
    sizeText: fmtBytes(received),
    sha256: hash.digest('hex'),
    contentType: ct
  }
}

module.exports = { downloadFile, fmtBytes, sanitizeName }
