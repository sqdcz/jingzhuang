// Winget 集成（纯 Node，无 Electron 依赖）
// 作用：用微软审核过的官方清单，拿到软件的【官方直链 + 官方 SHA256】，
// 之后由本软件自己的下载器下载并比对哈希 —— 既官方又快，且不花 AI 的钱。
// 注意：不用 winget download 直接下载，因为很多官方源站在海外，国内直连极慢。
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFile } = require('child_process')

const CANDIDATES = [
  'winget',
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'winget.exe')
]

function decode(buf) {
  const utf8 = buf.toString('utf8')
  if (/\uFFFD/.test(utf8)) {
    try { return new TextDecoder('gb18030').decode(buf) } catch (_e) { return utf8 }
  }
  return utf8
}

function friendlyErr(err) {
  if (!err) return '未知错误'
  if (err.code === 'ENOENT') return '没有找到 winget'
  if (err.killed) return 'winget 执行超时'
  return err.message || String(err)
}

function run(args, timeoutMs = 120000) {
  return new Promise(async (resolve) => {
    const opts = { encoding: null, timeout: timeoutMs, windowsHide: true, maxBuffer: 16 * 1024 * 1024 }
    for (const exe of CANDIDATES) {
      const r = await new Promise((res) => {
        execFile(exe, args, opts, (err, stdout, stderr) => res({ err, stdout, stderr }))
      })
      if (!r.err) {
        resolve({ ok: true, text: decode(r.stdout) })
        return
      }
      if (r.err.code === 'ENOENT') continue // 换下一个候选路径
      resolve({ ok: false, error: friendlyErr(r.err), stderr: decode(r.stderr || Buffer.alloc(0)) })
      return
    }
    resolve({ ok: false, error: '本机没有可用的 winget（需要 Windows 10 1709+ 自带的「应用安装程序」，可在 Microsoft Store 更新）' })
  })
}

function sanitize(s) {
  // 只保留常用字符，防止命令行注入
  return String(s || '').replace(/[&|"'`^<>%$#!*?;(){}\[\]\\\/]/g, ' ').trim().slice(0, 80)
}

/** 版本检测，顺带确认 winget 可用 */
async function isAvailable() {
  const r = await run(['--version'], 20000)
  if (!r.ok) return { ok: false, error: r.error }
  const m = r.text.match(/v?(\d+\.\d+[\.\d+]*)/)
  return { ok: true, version: m ? m[1] : r.text.trim() }
}

/** 解析 winget 表格输出（列之间至少两个空格） */
function parseTable(text) {
  const lines = text.split(/\r?\n/)
  const headIdx = lines.findIndex((l) => /^\s*(名称|Name)\s+\S/.test(l))
  if (headIdx < 0) return []
  const rows = []
  for (const line of lines.slice(headIdx + 2)) {
    const t = line.replace(/\s+$/, '')
    if (!t.trim() || /^-{5,}/.test(t.trim())) continue
    const cols = t.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean)
    if (cols.length < 3) continue
    let name, id, version, match = '', source = 'winget'
    if (cols.length >= 5) {
      [name, id, version, match, source] = [cols[0], cols[1], cols[2], cols[3], cols[4]]
    } else if (cols.length === 4) {
      [name, id, version, source] = cols
    } else {
      [name, id, version] = cols
    }
    rows.push({ name, id, version, match, source })
  }
  return rows
}

async function search(query, limit = 10) {
  const q = sanitize(query)
  if (!q) return { ok: false, error: '查询词为空' }
  const r = await run(['search', '--query', q, '--accept-source-agreements', '--disable-interactivity'], 60000)
  if (!r.ok) return { ok: false, error: r.error }
  const items = parseTable(r.text)
    .filter((it) => it.id && it.id !== '-')
    .slice(0, limit)
    .map((it) => ({
      name: it.name,
      id: it.id,
      version: it.version || '未知',
      source: it.source,
      // 精确/署名匹配的可信度更高
      score: scoreMatch(q, it)
    }))
    .sort((a, b) => b.score - a.score)
  return { ok: true, items }
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/[\s\u3000·•,，。.、;；:：!！?？\-_/\\()'（）【】\[\]]/g, '')
}

function scoreMatch(query, item) {
  const q = norm(query)
  const n = norm(item.name)
  const id = norm(item.id)
  let s = 0
  if (n === q) s += 100
  if (n.startsWith(q) || q.startsWith(n)) s += 50
  if (n.includes(q) || q.includes(n)) s += 30
  if (id.includes(q)) s += 20
  if (/moniker/i.test(item.match || '')) s += 15
  if (item.source === 'winget') s += 5 // 优先 winget 源（可下载），msstore 只能跳转商店
  return s
}

/** 从 --verbose 输出里提取官方清单的安装包直链 + SHA256 */
function parseInstallers(text) {
  const out = []
  let pending = null
  for (const line of String(text || '').split(/\r?\n/)) {
    const u = line.match(/(?:安装程序\s*URL|Installer\s*Url)\s*[:：]\s*(\S+)/i)
    if (u) {
      pending = { url: u[1].trim(), sha256: '' }
      continue
    }
    const s = line.match(/(?:安装程序\s*SHA256|Installer\s*SHA256)\s*[:：]\s*([0-9a-fA-F]{64})/i)
    if (s && pending) {
      pending.sha256 = s[1].trim().toLowerCase()
      out.push(pending)
      pending = null
    }
  }
  if (pending) out.push(pending)
  return out
}

function archScore(url) {
  const s = String(url || '').toLowerCase()
  if (/x64|win64|_64|64-bit|amd64/.test(s)) return 100
  if (/arm64|aarch64/.test(s)) return 60
  if (/x86|win32|ia32|32-bit/.test(s)) return 40
  return 0
}

/**
 * 查询包详情：发布者 / 主页 / 说明 / 官方直链 + 官方 SHA256
 * 直链来自微软审核过的 winget 清单，权威性高于模型猜测
 */
async function show(id) {
  const clean = sanitize(id)
  const r = await run(['show', '--id', clean, '--exact', '--accept-source-agreements', '--disable-interactivity', '--verbose'], 60000)
  if (!r.ok) return { ok: false, error: r.error }
  const pick = (keys, exclude) => {
    const re = new RegExp(`(?:${keys.join('|')})\\s*[:：]\\s*(.+)`, 'i')
    const m = r.text.match(re)
    let v = m ? m[1].trim() : ''
    if (v && exclude && new RegExp(exclude, 'i').test(v)) v = ''
    return v
  }
  const installers = parseInstallers(r.text).sort((a, b) => archScore(b.url) - archScore(a.url))
  return {
    ok: true,
    publisher: pick(['发布者(?!\\s*URL)', 'Publisher(?!\\s*Url)', '作者']) || pick(['发布服务器(?!\\s*URL)', 'Publisher']) || '',
    homepage: pick(['主页', 'Homepage', '发布服务器 URL', 'Publisher Url']),
    description: pick(['说明', 'Description', '描述']),
    licenseUrl: pick(['许可证 URL', 'License Url']),
    version: pick(['版本', 'Version']),
    installers,
    installerUrl: installers.length ? installers[0].url : '',
    installerSha256: installers.length ? installers[0].sha256 : '',
    raw: r.text.slice(0, 1500)
  }
}

function storeUrl(id) {
  return `https://apps.microsoft.com/detail/${encodeURIComponent(id)}`
}

module.exports = { isAvailable, search, show, storeUrl, parseTable, parseInstallers }
