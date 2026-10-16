// 预加载桥封装
window.JZApi = window.jingzhuang

// 通用小工具
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtBytes(n) {
  if (!n && n !== 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function fmtSpeed(bps) {
  if (!bps) return ''
  return `${fmtBytes(bps)}/s`
}

function fmtTime(ts) {
  const d = new Date(ts)
  const p = (x) => String(x).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function hostOf(url) {
  try { return new URL(url).hostname } catch (_e) { return url || '' }
}

window.JZUtils = { escapeHtml, fmtBytes, fmtSpeed, fmtTime, hostOf }
