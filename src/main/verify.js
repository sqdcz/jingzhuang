// 网页与下载地址验证（纯 Node，无 Electron 依赖，可独立测试）
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function friendlyErr(e) {
  if (e && e.name === 'AbortError') return '连接超时'
  if (e && e.code === 'ENOTFOUND') return '域名无法解析（网站可能不存在）'
  if (e && e.code === 'ECONNREFUSED') return '连接被拒绝'
  return (e && e.message) ? e.message : String(e)
}

/** 手动跟随重定向，记录跳转链 */
async function fetchWithRedirects(url, { timeoutMs = 20000, maxRedirects = 5, method = 'GET', headers = {} } = {}) {
  const chain = []
  let current = url
  for (let i = 0; i <= maxRedirects; i++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    let res
    try {
      res = await fetch(current, {
        method,
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { 'user-agent': UA, 'accept-language': 'zh-CN,zh;q=0.9', ...headers }
      })
    } catch (e) {
      clearTimeout(timer)
      return { ok: false, error: friendlyErr(e), chain }
    }
    clearTimeout(timer)
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location')
      try { await res.arrayBuffer() } catch (_e) { /* 忽略 */ }
      chain.push({ url: current, status: res.status })
      if (!loc) return { ok: false, error: '重定向缺少目标地址', chain }
      try {
        current = new URL(loc, current).toString()
      } catch (_e) {
        return { ok: false, error: `重定向地址非法: ${loc.slice(0, 100)}`, chain }
      }
      continue
    }
    return { ok: true, res, chain, finalUrl: current }
  }
  return { ok: false, error: '重定向次数过多（可疑）', chain }
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractLinks(html, baseUrl) {
  const out = []
  const seen = new Set()
  const re = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    let href = m[1]
    const text = stripTags(m[2]).slice(0, 80)
    if (!/^https?:/i.test(href)) {
      try { href = new URL(href, baseUrl).toString() } catch (_e) { continue }
      if (!/^https?:/i.test(href)) continue
    }
    const isDownloadish = /download|下载|dl\.|\/dl\/|-dist|releases|install|\.exe($|\?)|\.msi($|\?)|\.msix($|\?)|\.zip($|\?)/i.test(href + ' ' + text)
    if (!isDownloadish) continue
    if (seen.has(href)) continue
    seen.add(href)
    out.push({ url: href, text })
    if (out.length >= 30) break
  }
  return out
}

/** 访问网页：标题/摘要/正文/下载类链接 */
async function fetchPage(url) {
  try {
    const u = new URL(url)
    if (!/^https?:/i.test(u.protocol)) return { ok: false, error: '仅支持 http/https 链接' }
  } catch (_e) {
    return { ok: false, error: 'URL 格式非法' }
  }
  const r = await fetchWithRedirects(url, { method: 'GET' })
  if (!r.ok) return r
  const { res, finalUrl, chain } = r
  const ct = res.headers.get('content-type') || ''
  if (!/text\/html|application\/xhtml/i.test(ct)) {
    return { ok: false, error: `内容类型异常: ${ct || '未知'}（这不是网页，可能是文件直链）`, final_url: finalUrl, chain }
  }
  let html
  try {
    const buf = Buffer.from(await res.arrayBuffer())
    html = buf.slice(0, 3000000).toString('utf8')
  } catch (e) {
    return { ok: false, error: `读取页面失败: ${friendlyErr(e)}`, chain }
  }
  const title = (((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim().slice(0, 200))
  const desc = ((html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,300})/i) || [])[1] || '')
  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    final_url: finalUrl,
    title,
    description: desc.trim(),
    text: stripTags(html).slice(0, 2500),
    download_links: extractLinks(html, finalUrl),
    chain
  }
}

/** 探测一个直链是不是真的安装包文件 */
async function checkFileUrl(url) {
  let r = await fetchWithRedirects(url, { method: 'HEAD' })
  let method = 'HEAD'
  if (r.ok && (r.res.status === 405 || r.res.status === 501)) {
    try { await r.res.arrayBuffer() } catch (_e) { /* 忽略 */ }
    r = await fetchWithRedirects(url, { method: 'GET', headers: { range: 'bytes=0-0' } })
    method = 'GET(range)'
  }
  if (!r.ok) return { ok: false, error: r.error }
  const { res, finalUrl } = r
  try { await res.arrayBuffer() } catch (_e) { /* 忽略 */ }
  const ct = (res.headers.get('content-type') || '').toLowerCase()
  const len = Number(res.headers.get('content-length') || 0)
  const cr = res.headers.get('content-range') || ''
  const total = cr ? Number(cr.split('/')[1] || 0) : len
  const looksFile = /x-msdownload|octet-stream|x-msi|zip|msix|application\/x-executable/.test(ct)
  return {
    ok: res.status >= 200 && res.status < 400,
    method,
    status: res.status,
    contentType: ct,
    size: total,
    finalUrl,
    looksFile
  }
}

function domainOf(url) {
  try { return new URL(url).hostname.toLowerCase() } catch (_e) { return '' }
}

module.exports = { fetchWithRedirects, fetchPage, checkFileUrl, domainOf, stripTags, UA }
