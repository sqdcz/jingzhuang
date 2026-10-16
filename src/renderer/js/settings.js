// 设置页：AI 服务 / 外观 / 关于（名单管理在 lists-ui.js）
(function () {
  const { escapeHtml } = window.JZUtils

  // 举报/反馈入口（生成式 AI 应用的合规要求：须为用户提供举报不当内容的途径）
  const REPORT_URL = 'https://github.com/sqdcz/jingzhuang/issues/new'

  const PRESETS = {
    deepseek: {
      label: 'DeepSeek（深度求索）',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      models: ['deepseek-chat', 'deepseek-reasoner'],
      tip: '注册后充值几块钱能用很久，性价比高。deepseek-chat 支持工具调用，推荐。'
    },
    siliconflow: {
      label: '硅基流动 SiliconFlow',
      baseUrl: 'https://api.siliconflow.cn/v1',
      model: 'deepseek-ai/DeepSeek-V3',
      models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct', 'Qwen/Qwen2.5-7B-Instruct'],
      tip: '注册送额度，模型广场有多种模型可选（以官网为准）。'
    },
    zhipu: {
      label: '智谱 BigModel',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4-flash',
      models: ['glm-4-flash', 'glm-4-air', 'glm-4-plus'],
      tip: '轻量模型有免费额度，适合本软件的查找任务。'
    },
    moonshot: {
      label: '月之暗面 Kimi',
      baseUrl: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-8k',
      models: ['moonshot-v1-8k', 'moonshot-v1-32k'],
      tip: '注册即送体验额度。'
    },
    qwen: {
      label: '阿里通义（百炼）',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus',
      models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
      tip: '支付宝账号登录百炼平台，开通模型服务后创建 API-KEY。'
    },
    ollama: {
      label: '本地 Ollama（完全免费）',
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: 'qwen2.5:7b',
      models: ['qwen2.5:7b', 'llama3.1:8b'],
      tip: '需先在电脑安装 Ollama 并拉取模型（终端执行 ollama pull qwen2.5:7b）。Key 随便填非空即可。对电脑配置有一定要求。'
    },
    custom: {
      label: '自定义（任意 OpenAI 兼容接口）',
      baseUrl: '',
      model: '',
      models: [],
      tip: '任何兼容 OpenAI Chat Completions 协议的服务都可以填。'
    }
  }

  const TUTORIALS = [
    {
      name: 'DeepSeek 开放平台',
      site: 'https://platform.deepseek.com',
      steps: ['手机号注册并登录', '完成实名认证', '左侧「充值」——几块钱即可用很久（以官网价格为准）', '左侧「API Keys」→ 创建 Key → 复制', '回到本页：预设选 DeepSeek，粘贴 Key，模型填 deepseek-chat']
    },
    {
      name: '硅基流动 SiliconFlow',
      site: 'https://cloud.siliconflow.cn',
      steps: ['手机号注册（新用户有赠送额度）', '完成实名认证', '左侧「API 密钥」→ 新建 → 复制', '回到本页：预设选硅基流动，粘贴 Key，模型按需选择（可用免费/低价模型）']
    },
    {
      name: '智谱开放平台 BigModel',
      site: 'https://open.bigmodel.cn',
      steps: ['手机号注册', '实名认证', '右上角头像 → 「API 密钥」→ 创建', '回到本页：预设选智谱，粘贴 Key，模型填 glm-4-flash 等轻量模型（有免费额度，以官网为准）']
    },
    {
      name: 'Kimi（月之暗面）',
      site: 'https://platform.moonshot.cn',
      steps: ['手机号注册（送体验额度）', '「API Key 管理」→ 创建', '回到本页：预设选 Kimi，粘贴 Key']
    },
    {
      name: '阿里通义（百炼）',
      site: 'https://bailian.console.aliyun.com',
      steps: ['支付宝/淘宝账号登录百炼', '首次进入按提示开通模型服务', '右上角「API-KEY」→ 创建（选择"百炼"业务空间）', '回到本页：预设选通义，粘贴 Key']
    },
    {
      name: 'Ollama 本地部署（免费无限用）',
      site: 'https://ollama.com',
      steps: ['官网下载 Windows 版并安装', '打开终端执行: ollama pull qwen2.5:7b（电脑配置够可用更大模型）', '回到本页：预设选 Ollama，Key 随便填个非空字符', '适合不想花钱、电脑配置还可以的用户；找官网需要联网，本地模型能力有限']
    }
  ]

  const ACCENTS = ['#0e8a6d', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#0f766e', '#dc2626']

  let settings = null

  function presetKeyByBaseUrl(url) {
    for (const k of Object.keys(PRESETS)) {
      if (k !== 'custom' && PRESETS[k].baseUrl && url && url.replace(/\/+$/, '') === PRESETS[k].baseUrl) return k
    }
    return 'custom'
  }

  function initPresetSelect() {
    const sel = document.getElementById('aiPreset')
    sel.innerHTML = Object.entries(PRESETS)
      .map(([k, v]) => `<option value="${k}">${escapeHtml(v.label)}</option>`).join('')
    sel.addEventListener('change', () => {
      const p = PRESETS[sel.value]
      document.getElementById('aiBaseUrl').value = p.baseUrl
      document.getElementById('aiModel').value = p.model
      document.getElementById('presetTip').textContent = p.tip || ''
      const dl = document.getElementById('modelList')
      dl.innerHTML = (p.models || []).map((m) => `<option value="${escapeHtml(m)}">`).join('')
    })
  }

  async function loadWingetStatus() {
    const el = document.getElementById('wingetStatus')
    const box = document.getElementById('wingetEnabled')
    box.checked = !!(settings.winget && settings.winget.enabled)
    el.textContent = '检测 winget…'
    const r = await window.JZApi.wingetInfo()
    if (r && r.ok) {
      el.textContent = `✅ 本机 winget 可用（v${escapeHtml(r.version)}），已启用`
      el.style.color = 'var(--ok)'
    } else {
      el.textContent = `⚠️ 未检测到 winget：${escapeHtml((r && r.error) || '未知原因')}。可到 Microsoft Store 更新「应用安装程序」，未启用时全部走 AI 查找`
      el.style.color = 'var(--warn)'
      box.checked = false
    }
  }

  function fill() {
    document.getElementById('aiBaseUrl').value = settings.ai.baseUrl || ''
    document.getElementById('aiKey').value = settings.ai.apiKey || ''
    document.getElementById('aiModel').value = settings.ai.model || ''
    const k = presetKeyByBaseUrl(settings.ai.baseUrl)
    document.getElementById('aiPreset').value = k
    document.getElementById('presetTip').textContent = PRESETS[k].tip || ''
    const dl = document.getElementById('modelList')
    dl.innerHTML = (PRESETS[k].models || []).map((m) => `<option value="${escapeHtml(m)}">`).join('')

    // 外观
    const mode = settings.theme.mode || 'light'
    document.querySelector(`input[name="themeMode"][value="${mode}"]`).checked = true
    document.getElementById('bgDim').value = settings.theme.bgDim || 55
    document.getElementById('bgDimVal').textContent = `${settings.theme.bgDim || 55}%`
    document.getElementById('accentCustom').value = settings.theme.accent || '#0e8a6d'
    renderAccentDots(settings.theme.accent || '#0e8a6d')
  }

  function renderAccentDots(active) {
    const row = document.getElementById('accentRow')
    row.innerHTML = ACCENTS.map((c) =>
      `<div class="accent-dot ${c === active ? 'active' : ''}" data-c="${c}" style="background:${c}"></div>`
    ).join('')
    row.querySelectorAll('.accent-dot').forEach((d) => {
      d.addEventListener('click', () => saveTheme({ accent: d.dataset.c }))
    })
  }

  async function saveTheme(patch) {
    const t = { ...(settings.theme || {}), ...patch }
    settings.theme = t
    window.JZTheme.apply(t)
    await window.JZApi.settings.set({ theme: t })
    renderAccentDots(t.accent)
    document.getElementById('accentCustom').value = t.accent
  }

  function renderTutorials() {
    const box = document.getElementById('tutorials')
    box.innerHTML = TUTORIALS.map((t) => `
      <details>
        <summary>${escapeHtml(t.name)}</summary>
        <ol>${t.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
        <span class="link" data-site="${escapeHtml(t.site)}">${escapeHtml(t.site)}</span>
      </details>`).join('')
    box.querySelectorAll('[data-site]').forEach((a) => {
      a.addEventListener('click', () => window.JZApi.openExternal(a.dataset.site))
    })
  }

  async function renderAbout() {
    const info = await window.JZApi.appInfo()
    document.getElementById('aboutCard').innerHTML = `
      <h3>净装 · AI 软件净装助手</h3>
      <div class="about-row"><span class="k">版本</span><span>v${escapeHtml(info.version)}</span></div>
      <div class="about-row"><span class="k">数据目录</span><span>${escapeHtml(info.userData)}</span></div>
      <div class="about-row"><span class="k">下载目录</span><span>${escapeHtml(info.downloads)}</span></div>
      <div class="about-row"><span class="k">运行模式</span><span>${info.storeMode ? '🏪 商店版（只给查询/校验/指引）' : '完整版（可代启动安装程序与 Geek）'}</span></div>
      <div class="about-row"><span class="k">反馈与举报</span><span><span class="link" data-act="report">报告问题或不当内容 →</span></span></div>
      <p class="muted" style="margin-top:14px;font-size:12px;line-height:1.8">
        · Geek Uninstaller 为免费软件，版权归其作者所有，本软件仅作内置集成。<br>
        · AI 查找结果经过程序侧多重验证（HTTPS、页面内容、下载链接、数字签名），并明示签名信息，但最终安装决定权在用户。<br>
        · 本软件包含<strong>可选的生成式 AI 辅助检索</strong>（由你自行配置服务商）。若 AI 返回的内容存在错误、误导或不适宜之处，请点击上方「反馈与举报」告知我们，我们会核实并处理。<br>
        · 各 AI 服务商价格与免费额度以其官网为准。<br>
        · 白/黑/病毒名单与暗号可在「名单管理」中自由修改。
      </p>`
    // 生成式 AI 应用的合规要求：必须为用户提供举报不当内容的途径
    const reportLink = document.getElementById('aboutCard').querySelector('[data-act="report"]')
    if (reportLink) {
      reportLink.addEventListener('click', () => window.JZApi.openExternal(REPORT_URL))
    }
  }

  function bind() {
    // winget 开关
    document.getElementById('wingetEnabled').addEventListener('change', async (e) => {
      const enabled = e.target.checked
      settings.winget = { ...(settings.winget || {}), enabled }
      await window.JZApi.settings.set({ winget: { enabled } })
      window.toast(enabled ? '已开启 winget 优先（省 AI 钱）' : '已关闭 winget，全部走 AI 查找')
    })

    // AI 保存
    document.getElementById('btnSaveAI').addEventListener('click', async () => {
      const baseUrl = document.getElementById('aiBaseUrl').value.trim()
      const apiKey = document.getElementById('aiKey').value.trim()
      const model = document.getElementById('aiModel').value.trim()
      if (!baseUrl || !apiKey || !model) {
        window.toast('接口地址、Key、模型名都要填')
        return
      }
      settings.ai = { baseUrl, apiKey, model }
      await window.JZApi.settings.set({ ai: { baseUrl, apiKey, model } })
      window.toast('✅ AI 配置已保存')
      window.JZApp.updateAiPill()
    })

    // Key 显示切换
    const keyInput = document.getElementById('aiKey')
    document.getElementById('btnToggleKey').addEventListener('click', (e) => {
      const show = keyInput.type === 'password'
      keyInput.type = show ? 'text' : 'password'
      e.target.textContent = show ? '隐藏' : '显示'
    })

    // 测试连接
    document.getElementById('btnTestAI').addEventListener('click', async (e) => {
      const btn = e.target
      const out = document.getElementById('aiTestResult')
      // 先保存当前输入再测
      const baseUrl = document.getElementById('aiBaseUrl').value.trim()
      const apiKey = document.getElementById('aiKey').value.trim()
      const model = document.getElementById('aiModel').value.trim()
      if (!baseUrl || !apiKey || !model) { out.textContent = '先把三项都填好再测'; return }
      await window.JZApi.settings.set({ ai: { baseUrl, apiKey, model } })
      settings.ai = { baseUrl, apiKey, model }
      btn.disabled = true
      out.textContent = '测试中…'
      const r = await window.JZApi.testAI()
      btn.disabled = false
      out.textContent = r.ok ? `✅ ${r.message}` : `✕ ${r.message}`
      out.style.color = r.ok ? 'var(--ok)' : 'var(--danger)'
      window.JZApp.updateAiPill()
    })

    // 外观
    document.querySelectorAll('input[name="themeMode"]').forEach((r) => {
      r.addEventListener('change', () => saveTheme({ mode: r.value }))
    })
    document.getElementById('accentCustom').addEventListener('change', (e) => saveTheme({ accent: e.target.value }))
    document.getElementById('bgDim').addEventListener('input', (e) => {
      document.getElementById('bgDimVal').textContent = `${e.target.value}%`
    })
    document.getElementById('bgDim').addEventListener('change', (e) => saveTheme({ bgDim: Number(e.target.value) }))
    document.getElementById('btnPickBg').addEventListener('click', async () => {
      const r = await window.JZApi.pickBg()
      if (r && r.ok) saveTheme({ bgImage: r.path })
    })
    document.getElementById('btnClearBg').addEventListener('click', () => saveTheme({ bgImage: '' }))
  }

  async function init() {
    settings = await window.JZApi.settings.get()
    initPresetSelect()
    fill()
    loadWingetStatus()
    renderTutorials()
    renderAbout()
    bind()
  }

  window.JZSettings = { init }
})()
