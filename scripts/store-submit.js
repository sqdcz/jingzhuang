// 微软商店自动提交：打包 → 上传 → 更新元数据 → 提交认证
// 走「经典 Submission API」(manage.devcenter.microsoft.com/v1.0)，
// 因为只有它支持直接上传 MSIX 包本体；
// 新版 MSI/EXE API 只能给一个公网下载直链，不能传文件。
//
// 用法：
//   node scripts/store-submit.js check     # 只验凭据连通性，不改任何东西
//   node scripts/store-submit.js submit    # 完整流程（提交前会要你确认）
//   node scripts/store-submit.js submit --yes   # 跳过确认（CI 用）
//
// 凭据放 scripts/.store.json（已 gitignore），也支持环境变量覆盖：
//   JZ_STORE_TENANT_ID / JZ_STORE_CLIENT_ID / JZ_STORE_CLIENT_SECRET / JZ_STORE_APP_ID

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const API = 'https://manage.devcenter.microsoft.com/v1.0/my'
const TOKEN_SCOPE = 'https://manage.devcenter.microsoft.com/.default'

// ============ 配置 ============

function loadConfig() {
  const file = path.join(__dirname, '.store.json')
  let disk = {}
  if (fs.existsSync(file)) {
    try { disk = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) {
      throw new Error(`scripts/.store.json 解析失败: ${e.message}`)
    }
  }
  const cfg = {
    tenantId: process.env.JZ_STORE_TENANT_ID || disk.tenantId,
    clientId: process.env.JZ_STORE_CLIENT_ID || disk.clientId,
    clientSecret: process.env.JZ_STORE_CLIENT_SECRET || disk.clientSecret,
    applicationId: process.env.JZ_STORE_APP_ID || disk.applicationId,
    targetPublishMode: disk.targetPublishMode || 'Manual',   // Manual 更稳：通过后你自己放行
    notesForCertification: disk.notesForCertification || '',
    packagePath: disk.packagePath || ''
  }
  const missing = Object.keys(cfg).filter((k) =>
    ['tenantId', 'clientId', 'clientSecret', 'applicationId'].includes(k) && !cfg[k]
  )
  if (missing.length) {
    throw new Error(
      `缺少凭据: ${missing.join(', ')}\n` +
      `请把以下字段填到 scripts/.store.json：\n` +
      `{\n  "tenantId": "…",\n  "clientId": "…",\n  "clientSecret": "…",\n  "applicationId": "…"\n}\n` +
      `怎么拿这四个值见 STORE.md 第 8 节。`
    )
  }
  return cfg
}

// ============ 最小 ZIP 打包（store 模式，不压缩；MSIX 本身已压缩） ============

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[i] = c
    }
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

/** entries: [{ name, data:Buffer }] → ZIP Buffer */
function buildZip(entries) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8')
    const crc = crc32(e.data)
    const lfh = Buffer.alloc(30)
    lfh.writeUInt32LE(0x04034b50, 0)
    lfh.writeUInt16LE(20, 4)      // version needed
    lfh.writeUInt16LE(0, 6)       // flags
    lfh.writeUInt16LE(0, 8)       // method = store
    lfh.writeUInt16LE(0, 10)      // mod time
    lfh.writeUInt16LE(0, 12)      // mod date
    lfh.writeUInt32LE(crc, 14)
    lfh.writeUInt32LE(e.data.length, 18)
    lfh.writeUInt32LE(e.data.length, 22)
    lfh.writeUInt16LE(nameBuf.length, 26)
    lfh.writeUInt16LE(0, 28)
    locals.push(lfh, nameBuf, e.data)

    const cdh = Buffer.alloc(46)
    cdh.writeUInt32LE(0x02014b50, 0)
    cdh.writeUInt16LE(20, 4)
    cdh.writeUInt16LE(20, 6)
    cdh.writeUInt16LE(0, 8)
    cdh.writeUInt16LE(0, 10)
    cdh.writeUInt16LE(0, 12)
    cdh.writeUInt16LE(0, 14)
    cdh.writeUInt32LE(crc, 16)
    cdh.writeUInt32LE(e.data.length, 20)
    cdh.writeUInt32LE(e.data.length, 24)
    cdh.writeUInt16LE(nameBuf.length, 28)
    cdh.writeUInt16LE(0, 30)
    cdh.writeUInt16LE(0, 32)
    cdh.writeUInt16LE(0, 34)
    cdh.writeUInt16LE(0, 36)
    cdh.writeUInt32LE(0, 38)
    cdh.writeUInt32LE(offset, 42)
    centrals.push(cdh, nameBuf)

    offset += lfh.length + nameBuf.length + e.data.length
  }
  const centralBuf = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)
  return Buffer.concat([Buffer.concat(locals), centralBuf, eocd])
}

// ============ API 客户端 ============

async function getToken(cfg) {
  const body = new URLSearchParams()
  body.set('grant_type', 'client_credentials')
  body.set('client_id', cfg.clientId)
  body.set('client_secret', cfg.clientSecret)
  body.set('scope', TOKEN_SCOPE)
  const r = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf-8' },
    body: body.toString()
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.access_token) {
    throw new Error(`拿令牌失败 (${r.status}): ${j.error_description || j.error || JSON.stringify(j).slice(0, 200)}`)
  }
  return j.access_token
}

async function api(method, urlSuffix, token, cfg, body) {
  const r = await fetch(`${API}${urlSuffix}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'accept': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const txt = await r.text()
  let j = null
  try { j = txt ? JSON.parse(txt) : null } catch (_e) { /* 非 JSON 响应 */ }
  if (!r.ok) {
    const detail = (j && (j.message || j.error_description || j.error)) || txt.slice(0, 300)
    throw new Error(`${method} ${urlSuffix} 失败 (${r.status}): ${detail}`)
  }
  return j
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** 轮询到终态 */
async function pollUntil(urlSuffix, token, cfg, done, label, timeoutMs = 30 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs
  let last = ''
  while (Date.now() < deadline) {
    const j = await api('GET', urlSuffix, token, cfg)
    const d = j || {}
    const s = d.status || d.publishingStatus || ''
    if (s !== last) {
      console.log(`   ${label}: ${s}`)
      last = s
    }
    const verdict = done(d)
    if (verdict) return d
    await sleep(15000)
  }
  throw new Error(`${label} 超时（30 分钟）`)
}

// ============ 子命令 ============

async function cmdCheck(cfg) {
  console.log('→ 正在获取访问令牌…')
  const token = await getToken(cfg)
  console.log('  ✅ 令牌获取成功（有效期 60 分钟）')

  console.log('→ 正在读取该产品的提交列表…')
  const j = await api('GET', `/applications/${cfg.applicationId}/submissions`, token, cfg)
  const list = (j && j.value) || []
  console.log(`  ✅ 找到该产品共 ${list.length} 个提交：`)
  for (const s of list.slice(0, 5)) {
    console.log(`     - ${s.id}  状态 ${s.status}${s.targetPublishMode ? ' / ' + s.targetPublishMode : ''}`)
  }
  console.log('\n凭据和产品 ID 都没问题。要提交新版本：node scripts/store-submit.js submit')
}

function findPackage(cfg) {
  if (cfg.packagePath) {
    if (!fs.existsSync(cfg.packagePath)) throw new Error(`配置的包不存在: ${cfg.packagePath}`)
    return cfg.packagePath
  }
  const distDir = path.join(__dirname, '..', 'dist')
  if (!fs.existsSync(distDir)) throw new Error('dist/ 不存在，先跑 npm run dist:appx')
  const files = fs.readdirSync(distDir).filter((f) => /\.(appx|msix)$/i.test(f))
  if (!files.length) throw new Error('dist/ 里没有 .appx/.msix，先跑 npm run dist:appx')
  files.sort((a, b) => fs.statSync(path.join(distDir, b)).mtimeMs - fs.statSync(path.join(distDir, a)).mtimeMs)
  return path.join(distDir, files[0])
}

async function cmdSubmit(cfg, autoYes) {
  const pkg = findPackage(cfg)
  const pkgSize = fs.statSync(pkg).size
  console.log(`→ 待提交包: ${path.basename(pkg)}  (${(pkgSize / 1048576).toFixed(1)} MB)`)

  if (!autoYes) {
    console.log(`\n即将向微软商店创建一次新提交（发布模式: ${cfg.targetPublishMode}）。`)
    console.log('输入 yes 继续，其它任意键取消：')
    const ans = await new Promise((resolve) => {
      process.stdin.once('data', (d) => resolve(String(d).trim().toLowerCase()))
      setTimeout(() => resolve(''), 60000)
    })
    if (ans !== 'yes' && ans !== 'y') {
      console.log('已取消。')
      process.stdin.destroy()
      return
    }
    process.stdin.destroy()
  }

  console.log('\n→ 获取令牌…')
  const token = await getToken(cfg)

  console.log('→ 创建新的 in-progress 提交…')
  const base = `/applications/${cfg.applicationId}/submissions`
  const created = await api('POST', base, token, cfg)
  const submissionId = created.id
  const uploadUrl = created.fileUploadUrl
  console.log(`  ✅ submissionId = ${submissionId}`)
  if (!uploadUrl) throw new Error('响应里没有 fileUploadUrl，无法上传包')

  console.log('→ 打包并上传到 Azure Blob…')
  const zip = buildZip([{ name: path.basename(pkg), data: fs.readFileSync(pkg) }])
  const up = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-ms-blob-type': 'BlockBlob', 'content-length': String(zip.length) },
    body: zip
  })
  if (!up.ok) throw new Error(`上传包失败 (${up.status}): ${(await up.text()).slice(0, 200)}`)
  console.log(`  ✅ 已上传 ${(zip.length / 1048576).toFixed(1)} MB`)

  // 关键：先 GET 出完整提交对象，改几个字段再整个 PUT 回去。
  // 直接 PUT 字段残缺的对象会被商店拒绝（listings/pricing 等必填）。
  console.log('→ 更新提交信息（包文件名 / 发布模式）…')
  const sub = await api('GET', `${base}/${submissionId}`, token, cfg)
  sub.targetPublishMode = cfg.targetPublishMode
  sub.applicationPackages = [{ fileName: path.basename(pkg), fileStatus: 'PendingUpload' }]
  if (cfg.notesForCertification) sub.notesForCertification = cfg.notesForCertification
  await api('PUT', `${base}/${submissionId}`, token, cfg, sub)

  console.log('→ Commit 提交…')
  await api('POST', `${base}/${submissionId}/commit`, token, cfg)

  console.log('→ 轮询认证状态（可能要十几分钟到一天）…')
  const final = await pollUntil(
    `${base}/${submissionId}/status`, token, cfg,
    (d) => ['Published', 'CommitFailed', 'PreProcessingFailed', 'CertificationFailed', 'ReleaseFailed'].includes(d.status),
    '提交状态'
  )
  console.log(`\n最终状态: ${final.status}`)
  if (final.status === 'Published') {
    console.log('🎉 已发布到微软商店')
  } else if (/Failed/.test(final.status)) {
    console.log('⛔ 认证失败，去合作伙伴中心看详细报告：')
    console.log(`   https://partner.microsoft.com/dashboard`)
    if (final.certificationReports && final.certificationReports.length) {
      for (const rp of final.certificationReports) console.log(`   报告: ${rp}`)
    }
    process.exitCode = 1
  } else {
    console.log('状态未落终态，脚本退出，可去合作伙伴中心接着看。')
  }
}

// ============ 入口 ============

async function main() {
  const args = process.argv.slice(2)
  const cmd = args[0] || 'check'
  if (!['check', 'submit'].includes(cmd)) {
    console.log('用法: node scripts/store-submit.js <check|submit> [--yes]')
    console.log('  check   只验证凭据与产品 ID，不做任何修改')
    console.log('  submit  打包上传并创建一次商店提交')
    process.exitCode = 1
    return
  }
  const cfg = loadConfig()
  if (cmd === 'check') await cmdCheck(cfg)
  else await cmdSubmit(cfg, args.includes('--yes'))
}

main().catch((e) => {
  console.error('\n❌ ' + e.message)
  process.exitCode = 1
})
