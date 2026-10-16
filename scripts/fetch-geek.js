// 下载并解压内置 Geek Uninstaller 到 resources/
// 用法: node scripts/fetch-geek.js
const fs = require('fs')
const path = require('path')
const os = require('os')
const { downloadFile } = require('../src/main/download')
const { runPowerShell } = require('../src/main/security')

const GEEK_URL = 'https://geekuninstaller.com/geek.zip'

async function main() {
  const dir = path.join(__dirname, '..', 'resources')
  const target = path.join(dir, 'geek.exe')
  // 保证目录存在：electron-builder 的 extraResources 用目录 glob，目录缺失会报错
  fs.mkdirSync(dir, { recursive: true })
  if (fs.existsSync(target)) {
    console.log(`已存在 ${target}，跳过下载`)
    return
  }
  const tmp = path.join(os.tmpdir(), `jingzhuang-geek-${Date.now()}`)
  fs.mkdirSync(tmp, { recursive: true })
  console.log('正在从 Geek 官网下载…')
  const zip = await downloadFile(GEEK_URL, { toDir: tmp, onProgress: () => {} })
  console.log('正在解压…')
  const { stderr } = await runPowerShell(
    `Expand-Archive -LiteralPath $env:JZ_ZIP -DestinationPath $env:JZ_DST -Force`,
    { JZ_ZIP: zip.filePath, JZ_DST: tmp }
  )
  const inner = path.join(tmp, 'geek.exe')
  if (!fs.existsSync(inner)) throw new Error(`解压失败: ${stderr || '未找到 geek.exe'}`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(inner, target)
  fs.rmSync(tmp, { recursive: true, force: true })
  console.log(`✅ Geek 已就位: ${target}`)
}

// 下载失败不中断打包：Geek 官网在国内经常连不上，
// 没它就少了「一键卸载」这个小功能，不该让整个构建挂掉。
main().catch((e) => {
  console.warn('⚠️ 未能自动获取 Geek Uninstaller:', e.message)
  console.warn(`   可手动下载：${GEEK_URL} → 解压出 geek.exe → 放到 resources/ 目录，再重新打包`)
  console.warn('   本次继续打包，只是软件里「一键卸载」按钮会不可用。')
  process.exit(0)
})
