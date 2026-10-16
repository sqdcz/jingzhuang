// IPC 编排层：搜索流程 / 名单 / 设置 / 下载 / 校验 / Geek
const { ipcMain, shell, dialog, app } = require('electron')
const path = require('path')
const fs = require('fs')
const config = require('./config')
const lists = require('./lists')
const ai = require('./ai')
const security = require('./security')
const downloadLib = require('./download')
const winget = require('./winget')
const { launchGeek } = require('./geek')

let win = null
let pendingAsk = null          // { id, resolve }
let currentToken = null        // 当前流程取消令牌
let currentCancelDownload = null

/** 商店模式：打包 appx 时通过 extraMetadata 注入 storeMode=true */
function isStoreMode() {
  try {
    if (require('../package.json').storeMode) return true
  } catch (_e) { /* 忽略 */ }
  try {
    return !!config.load().storeMode
  } catch (_e) {
    return false
  }
}

function emit(evt) {
  try {
    if (win && !win.isDestroyed()) win.webContents.send('flow-event', evt)
  } catch (_e) { /* 忽略 */ }
}

function newToken() {
  if (currentToken) currentToken.cancelled = true
  if (pendingAsk) {
    try { pendingAsk.resolve({ choice: '__cancelled__', custom: '' }) } catch (_e) { /* 忽略 */ }
    pendingAsk = null
  }
  currentToken = { cancelled: false, id: Date.now() }
  return currentToken
}

function askUser(args) {
  return new Promise((resolve) => {
    const id = 'q' + Date.now()
    pendingAsk = { id, resolve }
    emit({
      type: 'question',
      id,
      question: args.question || '请确认',
      options: Array.isArray(args.options) ? args.options : [],
      allowCustom: args.allow_custom !== false
    })
  })
}

/* ---------------- 核心流程 ---------------- */

async function runSearch(query) {
  const q = String(query || '').trim()
  if (!q) return
  const token = newToken()
  const hit = lists.check(q)

  if (hit.type === 'virus') {
    emit({ type: 'virus', entry: { name: hit.entry.name, risk: hit.entry.risk || '该软件存在恶意风险' }, query: q })
    return
  }
  if (hit.type === 'blacklist') {
    emit({ type: 'blacklist', entry: hit.entry, query: q })
    return
  }
  if (hit.type === 'whitelist') {
    emit({ type: 'whitelist', entry: hit.entry, query: q })
    return
  }
  // 名单没命中 → 先用 winget 官方索引（不花 AI 的钱）
  const settings = config.load()
  if (settings.winget && settings.winget.enabled) {
    const handled = await tryWinget(q, token)
    if (handled) return
  }
  await runAI(q, '', token)
}

/** winget 官方索引查找：命中则处理，返回是否已接管流程 */
async function tryWinget(query, token) {
  const avail = await winget.isAvailable()
  if (!avail.ok) {
    emit({ type: 'log', text: `本机没有可用的 winget（${avail.error}），改用 AI 查找` })
    return false
  }
  emit({ type: 'step', key: 'winget', label: '在 winget 官方索引中查找…（不花 AI 的钱）', state: 'run' })
  const r = await winget.search(query, 10)
  if (!r.ok || !r.items.length) {
    emit({ type: 'step', key: 'winget', label: 'winget 里没有匹配项', state: 'fail' })
    return false
  }
  const best = r.items[0]
  if (best.score >= 60) {
    emit({ type: 'step', key: 'winget', label: `winget 命中：${best.name}`, state: 'done' })
    await proceedWinget(best, query, token)
    return true
  }
  emit({ type: 'step', key: 'winget', label: `找到 ${r.items.length} 个候选，等你确认是哪一个`, state: 'done' })
  emit({ type: 'winget-candidates', query, items: r.items })
  return true
}

/** 用 winget 清单的官方直链下载（后续由本软件自己下载 + 校验哈希） */
async function proceedWinget(c, query, token) {
  if (token && token.cancelled) { emit({ type: 'cancelled' }); return }
  if (c.source === 'msstore') {
    emit({ type: 'store', data: { name: c.name, storeUrl: winget.storeUrl(c.id), note: '这个软件在微软商店，需要到商店安装（winget 源无法直接提供安装包）' } })
    config.addHistory({ query: query || c.name, name: c.name, status: 'store' })
    return
  }
  emit({ type: 'step', key: 'wgshow', label: `读取 ${c.name} 的官方清单…`, state: 'run' })
  const d = await winget.show(c.id)
  if (token && token.cancelled) { emit({ type: 'cancelled' }); return }
  if (!d.ok || !d.installerUrl) {
    emit({ type: 'step', key: 'wgshow', label: 'winget 没给出官方直链，交给 AI', state: 'fail' })
    await runAI(query || c.name, '', token)
    return
  }
  let host = ''
  try { host = new URL(d.installerUrl).hostname } catch (_e) { host = d.installerUrl }
  emit({ type: 'step', key: 'wgshow', label: `拿到官方直链（${host}）`, state: 'done' })

  const result = {
    name: c.name,
    publisher: d.publisher || '',
    official_url: d.homepage || '',
    download_url: d.installerUrl,
    download_page: d.homepage || '',
    file_type: /\.(zip)$/i.test(d.installerUrl) ? 'zip' : 'installer',
    store_url: '',
    safety_note: `来源：winget 官方索引（微软审核过的清单）${d.publisher ? ' · 发布者 ' + d.publisher : ''}${c.version ? ' · 版本 ' + c.version : ''}。下载后会与清单里的官方 SHA256 比对。`,
    install_tips: [],
    confidence: 0.95,
    source: 'winget',
    wingetId: c.id,
    wingetSha256: d.installerSha256 || '',
    wingetVersion: c.version || ''
  }
  emit({ type: 'result', result, override: '' })
  await doDownload(result, query || c.name, 'winget', token, config.load())
}

async function runAI(query, override, tokenArg) {
  const token = tokenArg || newToken()
  const settings = config.load()
  if (!settings.ai.apiKey) {
    emit({ type: 'need-key' })
    return
  }
  emit({ type: 'step', key: 'ai', label: 'AI 开始分析你的需求…', state: 'run' })
  let result
  try {
    result = await ai.runAgent(settings, query, emit, askUser, token)
  } catch (err) {
    if (token.cancelled) { emit({ type: 'cancelled' }); return }
    emit({ type: 'error', message: `AI 处理出错：${err.message}` })
    config.addHistory({ query, name: '', status: 'failed' })
    return
  }
  if (token.cancelled) { emit({ type: 'cancelled' }); return }
  emit({ type: 'step', key: 'ai', label: `已锁定：${result.name}`, state: 'done' })
  emit({ type: 'result', result, override })

  if (result.file_type === 'store') {
    config.addHistory({ query, name: result.name, status: 'store' })
    return
  }
  if (!result.download_url) {
    config.addHistory({ query, name: result.name, status: 'page' })
    return // 渲染层会给「打开官方下载页」按钮
  }
  await doDownload(result, query, override, token, settings)
}

async function doDownload(result, query, override, token, settingsArg) {
  const token2 = token || newToken()
  const settings = settingsArg || config.load()
  const dir = (settings.download && settings.download.dir) || app.getPath('downloads')
  emit({ type: 'download-start', url: result.download_url, dir, name: result.name })

  const cancelToken = { cancelled: false }
  currentCancelDownload = cancelToken
  let dl
  try {
    dl = await downloadLib.downloadFile(result.download_url, {
      toDir: dir,
      cancelToken,
      onProgress: (p) => {
        if (token2.cancelled || cancelToken.cancelled) return
        emit({ type: 'download-progress', ...p })
      }
    })
  } catch (e) {
    if (cancelToken.cancelled || token2.cancelled) { emit({ type: 'cancelled' }); return }
    emit({ type: 'error', message: `下载失败：${e.message}`, fallbackPage: result.download_page || result.official_url })
    config.addHistory({ query, name: result.name, status: 'failed' })
    return
  }
  if (token2.cancelled || cancelToken.cancelled) { emit({ type: 'cancelled' }); return }

  emit({ type: 'download-done', file: { path: dl.filePath, size: dl.size, sizeText: dl.sizeText, sha256: dl.sha256 } })

  // 与 winget 官方清单里的 SHA256 比对（最硬的官方性证明）
  let hashMatch = 'unknown'
  if (result.wingetSha256) {
    hashMatch = String(dl.sha256).toLowerCase() === String(result.wingetSha256).toLowerCase() ? 'match' : 'mismatch'
    emit({ type: 'log', text: hashMatch === 'match' ? '哈希与 winget 官方清单一致 ✅' : '警告：哈希与 winget 官方清单不一致 ⛔' })
  }

  // 校验
  emit({ type: 'step', key: 'verify', label: '校验安装包…', state: 'run' })
  let sig = null
  if (result.file_type !== 'zip') {
    sig = await security.checkSignature(dl.filePath)
  }
  let vt = null
  if (settings.vt && settings.vt.apiKey) {
    emit({ type: 'log', text: 'VirusTotal 联网查询中…' })
    vt = await security.vtCheck(dl.sha256, settings.vt.apiKey)
  }
  const pubMatch = sig ? security.publisherMatch(result.publisher, sig.signer) : 'unknown'
  emit({ type: 'step', key: 'verify', label: '校验完成', state: 'done' })

  // AI 终审
  let verdict
  if (settings.ai.apiKey) {
    emit({ type: 'step', key: 'judge', label: 'AI 安全终审…', state: 'run' })
    try {
      verdict = await ai.judgeSafety(settings, query, {
        result,
        source: result.source || 'ai',
        signature: sig ? { status: sig.status, signer: sig.signer, product: sig.product, company: sig.company } : null,
        publisher_match: pubMatch,
        winget_hash_match: hashMatch,
        virustotal: vt,
        file: { name: dl.name, size: dl.size, size_text: dl.sizeText, sha256: dl.sha256.slice(0, 16) + '…' }
      })
    } catch (e) {
      verdict = localVerdict(sig, vt, pubMatch, hashMatch)
      verdict.reasons.unshift(`AI 终审失败：${e.message}`)
    }
    emit({ type: 'step', key: 'judge', label: 'AI 终审完成', state: 'done' })
  } else {
    verdict = localVerdict(sig, vt, pubMatch, hashMatch)
  }
  if (token2.cancelled) { emit({ type: 'cancelled' }); return }

  emit({
    type: 'final',
    data: {
      file: { path: dl.filePath, sizeText: dl.sizeText, sha256: dl.sha256 },
      signature: sig,
      publisherMatch: pubMatch,
      virustotal: vt,
      hashMatch,
      verdict,
      result,
      override
    }
  })
  config.addHistory({ query, name: result.name, status: verdict.verdict })
}

/** 无 AI Key 时的本地规则判断 */
function localVerdict(sig, vt, pubMatch, hashMatch) {
  const reasons = []
  let verdict = 'safe'
  if (hashMatch === 'match') {
    reasons.push('哈希与 winget 官方清单完全一致（最强官方性证明）')
  } else if (hashMatch === 'mismatch') {
    verdict = 'danger'
    reasons.push('文件哈希与 winget 官方清单不一致 —— 文件可能被替换、损坏或劫持')
  }
  const sigL = security.signatureLevel(sig)
  if (sigL.level === 'bad') { verdict = 'danger'; reasons.push(sigL.text) }
  else if (sigL.level === 'warn') { verdict = 'caution'; reasons.push(sigL.text) }
  else {
    reasons.push('数字签名有效')
    if (pubMatch === 'mismatch') { verdict = 'caution'; reasons.push('签名发布者与预期发布商不完全一致，请核对') }
    else if (pubMatch === 'match') reasons.push('签名发布者与官方发布商一致')
  }
  if (vt && vt.ok && vt.found) {
    const bad = (vt.malicious || 0) + (vt.suspicious || 0)
    if (bad >= 2) { verdict = 'danger'; reasons.push(`VirusTotal: ${vt.malicious} 报毒 / ${vt.suspicious} 可疑`) }
    else if (bad === 1) { verdict = 'caution'; reasons.push('VirusTotal: 1 个引擎报警') }
    else reasons.push(`VirusTotal: ${vt.undetected} 引擎未检出问题`)
  } else if (vt && vt.ok && !vt.found) {
    reasons.push('VirusTotal 未收录该文件')
  }
  if (!sig) reasons.push('绿色压缩包默认跳过签名校验')
  if (!vt) reasons.push('未配置 VirusTotal Key，跳过云查杀')
  return { verdict, reasons, install_tips: [] }
}

/* ---------------- IPC 注册 ---------------- */

function registerIpc(createWindow) {
  ipcMain.handle('search', (_e, query) => { runSearch(query); return { started: true } })

  ipcMain.on('answer', (_e, payload) => {
    if (pendingAsk && payload && pendingAsk.id === payload.id) {
      pendingAsk.resolve({ choice: payload.value || '', custom: payload.custom || '' })
      pendingAsk = null
      emit({ type: 'question-done', id: payload.id })
    }
  })

  ipcMain.on('cancel-flow', () => {
    if (currentToken) currentToken.cancelled = true
    if (currentCancelDownload) currentCancelDownload.cancelled = true
    if (pendingAsk) { try { pendingAsk.resolve({ choice: '__cancelled__', custom: '' }) } catch (_e) { /* 忽略 */ } pendingAsk = null }
    emit({ type: 'cancelled' })
  })

  ipcMain.on('cancel-download', () => { if (currentCancelDownload) currentCancelDownload.cancelled = true })

  ipcMain.handle('continue-anyway', async (_e, query, kind, secret) => {
    // 病毒名单必须校验暗号（服务端强校验，不信任前端）
    if (kind === 'virus') {
      const ok = lists.verifySecret(String(secret || ''))
      if (!ok) return { ok: false, message: '暗号不正确' }
    }
    runAI(String(query), kind)
    return { ok: true, started: true }
  })

  // 用户在 winget 候选里选中了一个
  ipcMain.handle('winget-choose', async (_e, candidate, query) => {
    proceedWinget(candidate, String(query || candidate.name), newToken())
    return { started: true }
  })

  ipcMain.handle('winget-info', async () => winget.isAvailable())

  ipcMain.handle('whitelist-download', async (_e, entry) => {
    const settings = config.load()
    const result = {
      name: entry.name,
      publisher: '',
      official_url: entry.officialUrl || '',
      download_url: entry.downloadUrl || '',
      download_page: entry.officialUrl || '',
      file_type: 'installer',
      store_url: '',
      safety_note: entry.note || '白名单软件，官网直链',
      install_tips: [],
      confidence: 1
    }
    if (!result.download_url) return { ok: false, message: '该条目没有配置直链，请打开官网下载' }
    await doDownload(result, entry.name, 'whitelist', newToken(), settings)
    return { ok: true }
  })

  ipcMain.handle('open-external', (_e, url) => {
    if (/^https?:/i.test(String(url))) shell.openExternal(String(url))
    return true
  })
  ipcMain.handle('open-path', (_e, p) => shell.openPath(String(p)))
  ipcMain.handle('show-in-folder', (_e, p) => { shell.showItemInFolder(String(p)); return true })

  // 运行下载好的安装包：商店模式下被禁止（微软商店政策不允许代用户执行下载的代码）
  ipcMain.handle('run-installer', (_e, p) => {
    if (isStoreMode()) {
      return { ok: false, message: '商店版不支持直接启动安装程序，请手动双击安装包安装' }
    }
    return shell.openPath(String(p))
  })

  ipcMain.handle('settings-get', () => config.load())
  ipcMain.handle('settings-set', (_e, patch) => config.save(patch))

  ipcMain.handle('test-ai', async () => {
    const s = config.load()
    return ai.testConnection(s)
  })

  ipcMain.handle('pick-bg', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: '选择背景图片',
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
      properties: ['openFile']
    })
    if (r.canceled || !r.filePaths || !r.filePaths[0]) return { ok: false }
    const src = r.filePaths[0]
    const dstDir = path.join(app.getPath('userData'), 'theme')
    fs.mkdirSync(dstDir, { recursive: true })
    const dst = path.join(dstDir, 'bg' + path.extname(src).toLowerCase())
    fs.copyFileSync(src, dst)
    return { ok: true, path: dst }
  })

  ipcMain.handle('lists-get', () => lists.load())
  ipcMain.handle('lists-save', (_e, data) => { lists.save(data); return { ok: true } })
  ipcMain.handle('lists-reset', () => { lists.reset(); return { ok: true } })
  ipcMain.handle('lists-open-folder', () => { shell.showItemInFolder(lists.userListsPath()); return true })

  ipcMain.handle('history-get', () => config.getHistory())
  ipcMain.handle('history-clear', () => { config.clearHistory(); return true })

  ipcMain.handle('geek', async () => {
    if (isStoreMode()) {
      return { ok: false, message: '商店版不支持启动外部卸载程序，可用 Windows「设置 → 应用」卸载' }
    }
    try { return await launchGeek(emit) } catch (e) { return { ok: false, message: e.message } }
  })

  ipcMain.handle('app-info', () => ({
    version: app.getVersion(),
    userData: app.getPath('userData'),
    listsPath: lists.userListsPath(),
    downloads: app.getPath('downloads'),
    storeMode: isStoreMode()
  }))
}

/** 主进程在创建窗口后调用，登记窗口引用用于事件推送 */
function setWindow(w) {
  win = w
}

module.exports = { registerIpc, setWindow }
