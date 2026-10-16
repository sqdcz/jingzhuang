// Agent 时间线渲染
(function () {
  const timeline = () => document.getElementById('timeline')

  function reset() {
    const t = timeline()
    if (t) t.innerHTML = ''
    const blk = document.getElementById('aiTextBlock')
    if (blk) {
      blk.classList.add('hidden')
      document.getElementById('aiTextBody').textContent = ''
    }
  }

  function step({ key, label, state }) {
    const t = timeline()
    if (!t) return
    let el = key ? t.querySelector(`[data-key="${CSS.escape(key)}"]`) : null
    if (!el) {
      el = document.createElement('div')
      el.className = 'tl-item'
      if (key) el.dataset.key = key
      el.innerHTML = '<span class="tl-dot"></span><div class="tl-label"></div>'
      t.appendChild(el)
    }
    el.className = `tl-item ${state || 'run'}`
    el.querySelector('.tl-label').textContent = label
    el.querySelector('.tl-dot').textContent = state === 'done' ? '✓' : state === 'fail' ? '✕' : ''
    // 滚到底
    const main = document.querySelector('main')
    if (main) main.scrollTop = main.scrollHeight
  }

  function log(text) {
    const t = timeline()
    if (!t) return
    const el = document.createElement('div')
    el.className = 'tl-item done'
    el.innerHTML = '<span class="tl-dot">›</span><div class="tl-label"></div>'
    el.querySelector('.tl-label').textContent = text
    el.querySelector('.tl-label').style.color = 'var(--muted)'
    t.appendChild(el)
  }

  function aiText(text) {
    const blk = document.getElementById('aiTextBlock')
    const body = document.getElementById('aiTextBody')
    if (!blk || !body) return
    blk.classList.remove('hidden')
    if (body.textContent.length > 6000) body.textContent = body.textContent.slice(-6000)
    body.textContent += (body.textContent ? '\n' : '') + text
    body.scrollTop = body.scrollHeight
  }

  // 折叠交互
  document.addEventListener('DOMContentLoaded', () => {
    const head = document.getElementById('aiTextHead')
    if (head) {
      head.addEventListener('click', () => {
        const body = document.getElementById('aiTextBody')
        const hidden = body.classList.toggle('hidden')
        head.textContent = hidden ? '▸ AI 想法' : '▾ AI 想法'
      })
    }
  })

  window.JZAgent = { reset, step, log, aiText }
})()
