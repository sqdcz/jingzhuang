// 主题引擎：亮/暗/跟随系统 + 主题色 + 自定义背景
(function () {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  let current = { mode: 'light', accent: '#0e8a6d', bgImage: '', bgDim: 55 }

  function resolveMode(mode) {
    if (mode === 'auto') return mq.matches ? 'dark' : 'light'
    return mode === 'dark' ? 'dark' : 'light'
  }

  function apply(theme) {
    if (theme) current = { ...current, ...theme }
    document.documentElement.setAttribute('data-theme', resolveMode(current.mode))
    if (current.accent) {
      document.documentElement.style.setProperty('--accent', current.accent)
    }
    const layer = document.getElementById('bgLayer')
    const overlay = document.getElementById('bgOverlay')
    if (current.bgImage) {
      layer.style.backgroundImage = `url("file:///${String(current.bgImage).replace(/\\/g, '/')}")`
      overlay.style.opacity = String(Math.min(0.85, Math.max(0, (current.bgDim || 0) / 100)))
    } else {
      layer.style.backgroundImage = ''
      overlay.style.opacity = '0'
    }
  }

  // 跟随系统时监听变化
  mq.addEventListener('change', () => {
    if (current.mode === 'auto') apply()
  })

  window.JZTheme = { apply, get current() { return { ...current } } }
})()
