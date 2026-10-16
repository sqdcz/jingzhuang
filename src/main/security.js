// 安装包安全校验：数字签名（PowerShell）+ VirusTotal（可选）
const { execFile } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')

function runPowerShell(script, envVars = {}, timeoutMs = 30000) {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      {
        encoding: 'utf8',
        timeout: timeoutMs,
        windowsHide: true,
        env: { ...process.env, ...envVars }
      },
      (err, stdout, stderr) => resolve({ err, stdout: stdout || '', stderr: stderr || '' })
    )
  })
}

function parseFirstJson(s) {
  const i = s.indexOf('{')
  if (i < 0) return null
  // 找到与之配对的最后一个 }
  const j = s.lastIndexOf('}')
  if (j <= i) return null
  try { return JSON.parse(s.slice(i, j + 1)) } catch (_e) { return null }
}

/** Windows Authenticode 数字签名 + 文件版本信息 */
async function checkSignature(filePath) {
  const script = `
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
$p = $env:JZ_FILE
if (-not (Test-Path -LiteralPath $p)) { Write-Output '{"ok":false,"error":"file not found"}'; exit }
try {
  $s = Get-AuthenticodeSignature -LiteralPath $p
  $vi = (Get-Item -LiteralPath $p).VersionInfo
  [pscustomobject]@{
    ok = $true
    status = [string]$s.Status
    signer = if ($s.SignerCertificate) { $s.SignerCertificate.Subject } else { '' }
    product = [string]$vi.ProductName
    company = [string]$vi.CompanyName
    version = [string]$vi.FileVersion
    description = [string]$vi.FileDescription
  } | ConvertTo-Json -Compress
} catch {
  Write-Output ('{"ok":false,"error":"' + ($_.Exception.Message -replace '"', '') + '"}')
}
`
  const { stdout, stderr } = await runPowerShell(script, { JZ_FILE: filePath })
  const parsed = parseFirstJson(stdout.replace(/\uFEFF/g, ''))
  if (!parsed) {
    return { ok: false, error: `签名查询失败: ${(stderr || stdout || '').slice(0, 120)}` }
  }
  return parsed
}

/** 签名状态 → 展示级别与文案 */
function signatureLevel(sig) {
  if (!sig || sig.ok === false) return { level: 'warn', text: '签名信息获取失败', detail: sig && sig.error }
  switch (sig.status) {
    case 'Valid':
      return { level: 'ok', text: '数字签名有效', detail: sig.signer }
    case 'NotSigned':
      return { level: 'warn', text: '安装包没有数字签名（不一定是恶意，但要留意来源）', detail: '' }
    default:
      return { level: 'bad', text: `签名状态异常: ${sig.status}`, detail: sig.signer || '' }
  }
}

/** 发布者与签名者粗匹配（AI 给的发布商 vs 证书 Subject） */
function publisherMatch(expected, signer) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[\s（）()]/g, '')
  const e = norm(expected)
  const s = norm(signer)
  if (!e || !s) return 'unknown'
  if (s.includes(e) || e.includes(s)) return 'match'
  // 提取签名者 CN= 部分
  const cn = norm((String(signer).match(/CN=([^,]+)/) || [])[1] || '')
  if (cn && (cn.includes(e) || e.includes(cn))) return 'match'
  return 'mismatch'
}

/** VirusTotal 文件哈希查询（需用户配置的免费 Key） */
async function vtCheck(sha256, apiKey) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30000)
  try {
    const res = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
      headers: { 'x-apikey': apiKey },
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (res.status === 404) return { ok: true, found: false, note: 'VirusTotal 未收录该文件（新文件或冷门文件属正常）' }
    if (res.status === 401) return { ok: false, error: 'VirusTotal Key 无效' }
    if (res.status === 429) return { ok: false, error: 'VirusTotal 查询太频繁（免费额度每分钟 4 次），稍后再试' }
    if (!res.ok) return { ok: false, error: `VirusTotal 返回 ${res.status}` }
    const j = await res.json()
    const st = (j.data && j.data.attributes && j.data.attributes.last_analysis_stats) || {}
    const malicious = st.malicious || 0
    const suspicious = st.suspicious || 0
    return {
      ok: true,
      found: true,
      malicious,
      suspicious,
      harmless: st.harmless || 0,
      undetected: st.undetected || 0,
      link: `https://www.virustotal.com/gui/file/${sha256}`
    }
  } catch (e) {
    clearTimeout(timer)
    return { ok: false, error: `VirusTotal 查询失败: ${e.name === 'AbortError' ? '超时' : e.message}` }
  }
}

function vtLevel(vt) {
  if (!vt || vt.ok === false) return { level: 'warn', text: 'VirusTotal 查询失败' }
  if (!vt.found) return { level: 'ok', text: 'VirusTotal 未收录（无恶意记录可查）' }
  const bad = (vt.malicious || 0) + (vt.suspicious || 0)
  if (bad >= 2) return { level: 'bad', text: `${vt.malicious} 引擎报毒、${vt.suspicious} 可疑` }
  if (bad === 1) return { level: 'warn', text: `${vt.malicious + vt.suspicious} 个引擎报警，建议人工复核` }
  return { level: 'ok', text: `${vt.undetected} 引擎未检出问题` }
}

/** 流式计算文件 SHA256 */
function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256')
    const s = fs.createReadStream(filePath)
    s.on('data', (c) => h.update(c))
    s.on('end', () => resolve(h.digest('hex')))
    s.on('error', reject)
  })
}

module.exports = { checkSignature, signatureLevel, publisherMatch, vtCheck, vtLevel, sha256File, runPowerShell }
