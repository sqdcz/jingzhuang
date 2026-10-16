// Geek Uninstaller 集成：优先内置，缺失时从官网下载单文件版
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { app } = require('electron')
const { downloadFile } = require('./download')
const { runPowerShell } = require('./security')

const GEEK_URL = 'https://geekuninstaller.com/geek.zip'

function bundledPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'geek.exe')
    : path.join(__dirname, '../../resources/geek.exe')
}

function cachedPath() {
  return path.join(app.getPath('userData'), 'geek.exe')
}

function launch(exe) {
  spawn(exe, [], { detached: true, stdio: 'ignore', cwd: path.dirname(exe) }).unref()
}

async function launchGeek(emit) {
  // 1. 内置
  if (fs.existsSync(bundledPath())) {
    launch(bundledPath())
    return { ok: true, source: '内置' }
  }
  // 2. 已缓存
  if (fs.existsSync(cachedPath())) {
    launch(cachedPath())
    return { ok: true, source: '缓存' }
  }
  // 3. 首次使用：官网下载
  if (emit) emit({ type: 'log', text: '首次使用 Geek，正在从官网下载…' })
  const tmpDir = path.join(os.tmpdir(), `jingzhuang-geek-${Date.now()}`)
  const zipPath = path.join(tmpDir, 'geek.zip')
  try {
    await downloadFile(GEEK_URL, { toDir: tmpDir, onProgress: () => {} })
    const { stdout, stderr } = await runPowerShell(
      `Expand-Archive -LiteralPath $env:JZ_ZIP -DestinationPath $env:JZ_DST -Force`,
      { JZ_ZIP: zipPath, JZ_DST: tmpDir }
    )
    if (stderr && !fs.existsSync(path.join(tmpDir, 'geek.exe'))) {
      throw new Error(`解压失败: ${stderr.slice(0, 120)}`)
    }
    const inner = fs.existsSync(path.join(tmpDir, 'geek.exe')) ? path.join(tmpDir, 'geek.exe') : zipPath
    fs.copyFileSync(inner, cachedPath())
    launch(cachedPath())
    if (emit) emit({ type: 'log', text: 'Geek 下载完成并启动' })
    return { ok: true, source: '官网下载' }
  } catch (e) {
    throw new Error(`Geek 启动失败：${e.message}。可手动访问 ${GEEK_URL} 下载`)
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (_e) { /* 忽略 */ }
  }
}

module.exports = { launchGeek, bundledPath, cachedPath, GEEK_URL }
