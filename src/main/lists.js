const fs = require('fs')
const path = require('path')
const { app } = require('electron')

function defaultListsPath() {
  return path.join(app.getAppPath(), 'defaults', 'lists.json')
}

function userListsPath() {
  const { dataDir } = require('./config')
  return path.join(dataDir(), 'lists.json')
}

function ensureUserLists() {
  const p = userListsPath()
  if (fs.existsSync(p)) return
  fs.mkdirSync(path.dirname(p), { recursive: true })
  // 打包后默认名单位于 app.asar 内，copyFileSync 对 asar 支持不稳，统一用 read+write
  fs.writeFileSync(p, fs.readFileSync(defaultListsPath(), 'utf8'), 'utf8')
}

function load() {
  try {
    ensureUserLists()
  } catch (e) {
    console.error('[lists] 初始化用户名单失败:', e.message)
  }
  try {
    return JSON.parse(fs.readFileSync(userListsPath(), 'utf8'))
  } catch (_e) {
    // 用户名单损坏时回退默认
    return JSON.parse(fs.readFileSync(defaultListsPath(), 'utf8'))
  }
}

function save(data) {
  if (!data || !Array.isArray(data.whitelist) || !Array.isArray(data.blacklist) || !Array.isArray(data.viruslist)) {
    throw new Error('名单格式不完整（需要 whitelist/blacklist/viruslist 三个数组）')
  }
  if (!data.secretCode || !String(data.secretCode).trim()) {
    throw new Error('暗号不能为空')
  }
  ensureUserLists()
  fs.writeFileSync(userListsPath(), JSON.stringify(data, null, 2))
  return load()
}

function reset() {
  ensureUserLists()
  fs.writeFileSync(userListsPath(), fs.readFileSync(defaultListsPath(), 'utf8'), 'utf8')
  return load()
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s\u3000·•,，。.、;；:：!！?？\-_/\\()'（）【】\[\]]/g, '')
}

function matchEntry(query, entry) {
  const q = norm(query)
  if (!q) return false
  const names = [entry.name, ...(entry.aliases || []), ...(entry.patterns || [])]
  return names.some((n) => {
    const v = norm(n)
    if (v.length < 2) return false
    return q.includes(v) || v.includes(q)
  })
}

/** 查询顺序：病毒 → 黑名单 → 白名单（最严重的优先） */
function check(query) {
  const L = load()
  const virus = (L.viruslist || []).find((e) => matchEntry(query, e))
  if (virus) return { type: 'virus', entry: virus }
  const black = (L.blacklist || []).find((e) => matchEntry(query, e))
  if (black) return { type: 'blacklist', entry: black }
  const white = (L.whitelist || []).find((e) => matchEntry(query, e))
  if (white) return { type: 'whitelist', entry: white }
  return { type: 'none' }
}

function verifySecret(code) {
  const L = load()
  return norm(code) === norm(L.secretCode)
}

module.exports = { load, save, reset, check, verifySecret, userListsPath, defaultListsPath }
