// 无头冒烟测试：不依赖 Electron，验证核心链路
// 1) 抓取 7-Zip 官网  2) 提取官方直链  3) 真实下载  4) PowerShell 数字签名校验
const os = require('os')
const path = require('path')
const verify = require('../src/main/verify')
const downloadLib = require('../src/main/download')
const security = require('../src/main/security')

async function main() {
  console.log('=== 净装 冒烟测试 ===\n')

  console.log('[1/4] 抓取 7-Zip 官网…')
  const page = await verify.fetchPage('https://www.7-zip.org/')
  if (!page.ok) throw new Error(`官网抓取失败: ${page.error}`)
  console.log(`  ✅ 标题: ${page.title}`)
  console.log(`  ✅ 找到 ${page.download_links.length} 个下载类链接`)

  console.log('\n[2/4] 提取 x64 安装包直链…')
  const dl = page.download_links.find((l) => /7z\d+-x64\.exe$/i.test(l.url))
  if (!dl) throw new Error('未找到 7z*-x64.exe 直链')
  console.log(`  ✅ ${dl.url}`)

  const fileCheck = await verify.checkFileUrl(dl.url)
  console.log(`  ✅ 直链探测: ${fileCheck.status} ${fileCheck.contentType} ${fileCheck.size} 字节${fileCheck.looksFile ? '（是文件）' : ''}`)
  if (!fileCheck.looksFile) throw new Error('直链探测不认为是文件')

  console.log('\n[3/4] 真实下载…')
  const r = await downloadLib.downloadFile(dl.url, {
    toDir: path.join(os.tmpdir(), 'jingzhuang-smoke'),
    onProgress: (p) => {
      if (p.total) process.stdout.write(`\r  下载 ${((p.received / p.total) * 100).toFixed(0)}%`)
    }
  })
  console.log(`\n  ✅ 已保存: ${r.filePath}`)
  console.log(`  ✅ 大小: ${r.sizeText}  SHA256: ${r.sha256.slice(0, 24)}…`)

  console.log('\n[4/4] 数字签名校验（PowerShell）…')
  const sig = await security.checkSignature(r.filePath)
  if (sig.ok === false) throw new Error(`签名查询失败: ${sig.error}`)
  const level = security.signatureLevel(sig)
  console.log(`  ✅ 签名状态: ${sig.status}`)
  console.log(`  ✅ 签发者: ${(sig.signer || '').split(',').slice(0, 2).join(',')}`)
  console.log(`  ✅ 产品名: ${sig.product || '-'}  公司: ${sig.company || '-'}`)
  console.log(`  ✅ 结论: [${level.level}] ${level.text}`)
  console.log(`  ✅ 发布者比对(Igor Pavlov vs 实际): ${security.publisherMatch('Igor Pavlov', sig.signer)}`)

  console.log('\n=== 全部通过 ✅ 核心链路（抓取→验证→下载→签名）正常 ===')
}

main().catch((e) => {
  console.error('\n❌ 测试失败:', e.message)
  process.exit(1)
})
