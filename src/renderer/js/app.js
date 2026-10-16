// 主控制器：搜索流程 / 页面切换 / 事件分发
(function () {
  const { escapeHtml, fmtTime } = window.JZUtils

  let currentQuery = ''

  function el(id) { return document.getElementById(id) }

  function toast(text) {
    const t = el('toast')
    t.textContent = text
    t.classList.remove('hidden')
    clearTimeout(toast._t)
    toast._t = setTimeout(() => t.classList.add('hidden'), 2600)
  }
  window.toast = toast

  /* ---------- 页面切换 ---------- */
  function showHome() {
    el('viewHome').classList.remove('hidden')
    el('viewSettings').classList.add('hidden')
  }

  function openSettings(tab) {
    el('viewHome').classList.add('hidden')
    el('viewSettings').classList.remove('hidden')
    if (tab) {
      const btn = document.querySelector(`#settingsTabs .tab[data-tab="${tab}"]`)
      if (btn) btn.click()
    }
  }

  /* ---------- 搜索流程 ---------- */
  function search(q) {
    q = String(q || '').trim()
    if (!q) return
    currentQuery = q
    // 重置界面
    el('hero').classList.add('hidden')
    el('flowArea').classList.remove('hidden')
    el('flowTitle').textContent = `正在查找：${q}`
    window.JZAgent.reset()
    window.JZCards.reset()
    window.JZApi.search(q)
  }

  function resetFlow() {
    el('flowArea').classList.add('hidden')
    el('hero').classList.remove('hidden')
    window.JZAgent.reset()
    window.JZCards.reset()
    refreshHistory()
  }

  /* ---------- 事件分发 ---------- */
  function onFlowEvent(evt) {
    switch (evt.type) {
      case 'step':
        window.JZAgent.step(evt)
        break
      case 'log':
        window.JZAgent.log(evt.text)
        break
      case 'ai-text':
        window.JZAgent.aiText(evt.text)
        break
      case 'tool':
        window.JZAgent.step({ key: `tool-${evt.name}-${evt.label}`, label: evt.label, state: evt.state })
        break
      case 'question':
        window.JZCards.question(evt)
        break
      case 'question-done':
        break
      case 'whitelist':
        window.JZCards.whitelist(evt.entry, evt.query || currentQuery)
        break
      case 'blacklist':
        window.JZCards.blacklist(evt.entry, evt.query || currentQuery)
        break
      case 'virus':
        window.JZCards.virus(evt.entry, evt.query || currentQuery)
        break
      case 'need-key':
        window.JZCards.needKey()
        break
      case 'winget-candidates':
        window.JZCards.wingetCandidates(evt.query, evt.items)
        break
      case 'store':
        window.JZCards.store(evt.data)
        break
      case 'result':
        window.JZCards.result(evt.result)
        break
      case 'download-start':
        window.JZCards.downloadStart(evt)
        break
      case 'download-progress':
        window.JZCards.progress(evt)
        break
      case 'download-done':
        window.JZCards.downloadDone(evt.file)
        break
      case 'final':
        window.JZCards.final(evt.data)
        break
      case 'error':
        window.JZCards.error(evt.message, evt.fallbackPage)
        break
      case 'cancelled':
        toast('已取消')
        resetFlow()
        break
      default:
        break
    }
  }

  /* ---------- 历史记录 ---------- */
  const STATUS_TXT = {
    safe: ['ok', '安全'],
    caution: ['warn', '装过'],
    danger: ['bad', '拦截'],
    store: ['neutral', '商店'],
    page: ['neutral', '官网'],
    failed: ['bad', '失败']
  }

  async function refreshHistory() {
    const list = await window.JZApi.history.get()
    const box = el('historyList')
    if (!list.length) {
      box.innerHTML = '<div class="empty">还没有记录，装第一个软件吧</div>'
      return
    }
    box.innerHTML = list.slice(0, 12).map((h) => {
      const st = STATUS_TXT[h.status] || ['neutral', h.status]
      return `
        <div class="history-row" data-q="${escapeHtml(h.query)}">
          <span class="history-time">${fmtTime(h.time)}</span>
          <span class="history-name">${escapeHtml(h.name || h.query)}</span>
          <span class="history-query grow">${escapeHtml(h.query)}</span>
          <span class="badge ${st[0]}">${st[1]}</span>
        </div>`
    }).join('')
    box.querySelectorAll('.history-row').forEach((r) => {
      r.addEventListener('click', () => search(r.dataset.q))
    })
  }

  /* ---------- 快捷 chips ---------- */
  async function refreshChips() {
    try {
      const lists = await window.JZApi.lists.get()
      const names = (lists.whitelist || []).slice(0, 8).map((e) => e.name)
      el('quickChips').innerHTML = names.map((n) =>
        `<button class="btn ghost sm" data-q="${escapeHtml(n)}">${escapeHtml(n)}</button>`
      ).join('')
      el('quickChips').querySelectorAll('[data-q]').forEach((b) => {
        b.addEventListener('click', () => search(b.dataset.q))
      })
    } catch (_e) { /* 忽略 */ }
  }

  /* ---------- AI 状态徽标 ---------- */
  function updateAiPill() {
    window.JZApi.settings.get().then((s) => {
      const pill = el('aiStatus')
      if (s.ai && s.ai.apiKey) {
        pill.textContent = 'AI 已配置'
        pill.classList.add('on')
      } else {
        pill.textContent = 'AI 未配置'
        pill.classList.remove('on')
      }
    })
  }

  /* ---------- 初始化 ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    // 主题
    const settings = await window.JZApi.settings.get()
    window.JZTheme.apply(settings.theme)

    // 商店模式（微软商店版不代用户运行安装程序）
    try {
      const info = await window.JZApi.appInfo()
      window.JZStoreMode = !!(info && info.storeMode)
      if (window.JZStoreMode) {
        el('btnGeek').title = '商店版不支持启动外部卸载程序，请用 Windows 设置卸载'
      }
    } catch (_e) { /* 忽略 */ }

    // 页面
    updateAiPill()
    refreshChips()
    refreshHistory()
    window.JZSettings.init()
    window.JZListsUI.init()
    window.JZListsUI.bind()

    // 订阅流程事件
    window.JZApi.onFlowEvent(onFlowEvent)

    // 顶栏
    el('btnSearch').addEventListener('click', () => search(el('searchInput').value))
    el('searchInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') search(el('searchInput').value)
    })
    el('btnSettings').addEventListener('click', () => openSettings())
    el('btnBackHome').addEventListener('click', showHome)
    el('aiStatus').addEventListener('click', () => openSettings('ai'))
    el('btnCancelFlow').addEventListener('click', () => window.JZApi.cancelFlow())

    el('btnGeek').addEventListener('click', async () => {
      const r = await window.JZApi.geek()
      if (r && r.ok === false) toast(r.message)
      else if (r && r.source) toast(`Geek 已启动（${r.source}）`)
    })

    // 设置页 tab 切换
    document.querySelectorAll('#settingsTabs .tab').forEach((t) => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#settingsTabs .tab').forEach((x) => x.classList.remove('active'))
        t.classList.add('active')
        document.querySelectorAll('.tabpane').forEach((p) => p.classList.add('hidden'))
        el(`tab-${t.dataset.tab}`).classList.remove('hidden')
      })
    })

    // 历史清空
    el('btnClearHistory').addEventListener('click', async () => {
      await window.JZApi.history.clear()
      refreshHistory()
    })
  })

  // 暴露给卡片层
  window.JZApp = {
    search,
    resetFlow,
    openSettings,
    updateAiPill,
    get currentQuery() { return currentQuery }
  }
})()
