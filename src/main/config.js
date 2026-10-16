const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const DEFAULTS = {
  ai: { baseUrl: 'https://api.deepseek.com/v1', apiKey: '', model: 'deepseek-chat' },
  vt: { apiKey: '' },
  winget: { enabled: true },
  storeMode: false,      // 商店模式：只提供查询/校验/指导，不代用户运行安装程序（微软商店政策要求）
  theme: { mode: 'light', accent: '#0e8a6d', bgImage: '', bgDim: 55 },
  download: { dir: '' }
}

function dataDir() {
  return app.getPath('userData')
}

function settingsPath() {
  return path.join(dataDir(), 'settings.json')
}

let cached = null

function deepMerge(base, patch) {
  for (const k of Object.keys(patch || {})) {
    if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k]) && base[k] && typeof base[k] === 'object') {
      deepMerge(base[k], patch[k])
    } else if (patch[k] !== undefined) {
      base[k] = patch[k]
    }
  }
  return base
}

function load() {
  if (cached) return cached
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8')
    cached = deepMerge(structuredClone(DEFAULTS), JSON.parse(raw))
  } catch (_e) {
    cached = structuredClone(DEFAULTS)
  }
  return cached
}

function save(patch) {
  const cur = load()
  deepMerge(cur, patch || {})
  fs.mkdirSync(dataDir(), { recursive: true })
  fs.writeFileSync(settingsPath(), JSON.stringify(cur, null, 2))
  return cur
}

function historyPath() {
  return path.join(dataDir(), 'history.json')
}

function addHistory(entry) {
  let list = []
  try { list = JSON.parse(fs.readFileSync(historyPath(), 'utf8')) } catch (_e) { list = [] }
  list.unshift({ time: Date.now(), ...entry })
  list = list.slice(0, 50)
  fs.mkdirSync(dataDir(), { recursive: true })
  fs.writeFileSync(historyPath(), JSON.stringify(list, null, 2))
}

function getHistory() {
  try { return JSON.parse(fs.readFileSync(historyPath(), 'utf8')) } catch (_e) { return [] }
}

function clearHistory() {
  try { fs.unlinkSync(historyPath()) } catch (_e) { /* 忽略 */ }
}

module.exports = { load, save, dataDir, addHistory, getHistory, clearHistory, DEFAULTS }
