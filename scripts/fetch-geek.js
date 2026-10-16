// 下载并解压内置 Geek Uninstaller 到 resources/
// 用法: node scripts/fetch-geek.js
const fs = require('fs')
const path = require('path')
const os = require('os')
const { downloadFile } = require('../src/main/download')
const { runPowerShell } = require('../src/main/security')

const GEEK_URL = 'https://geekuninstaller.com/geek.zip'

async function main() {
  const target = path.join(__dirname, '..', 'resources', 'geek.exe')
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

main().catch((e) => {
  console.error('❌ 失败:', e.message)
  console.error(`可手动下载: ${GEEK_URL} → 解压 geek.exe 放到 resources/ 目录`)
  process.exit(1)
})
