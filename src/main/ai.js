// OpenAI 兼容客户端 + agent 循环（纯 Node，无 Electron 依赖）
const { fetchPage } = require('./verify')
const { buildSystemPrompt, buildJudgePrompt, buildNoToolsPrompt } = require('./prompts')

function chatEndpoint(baseUrl) {
  let u = String(baseUrl || '').trim().replace(/\/+$/, '')
  if (!u) throw new Error('未配置 AI 接口地址')
  if (!/\/chat\/completions$/.test(u)) u += '/chat/completions'
  return u
}

async function chat(settings, messages, tools, { timeoutMs = 120000, maxTokens = 3000 } = {}) {
  if (!settings.ai.apiKey) throw new Error('未配置 API Key')
  const body = {
    model: settings.ai.model,
    messages,
    temperature: 0.2,
    max_tokens: maxTokens,
    stream: false
  }
  if (tools && tools.length) {
    body.tools = tools
    body.tool_choice = 'auto'
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(chatEndpoint(settings.ai.baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.ai.apiKey}` },
      body: JSON.stringify(body),
      signal: ctrl.signal
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`接口返回 ${res.status}: ${txt.slice(0, 300)}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'fetch_page',
      description: '访问一个网页并返回标题、摘要、正文和下载类链接。用于核实官网真实性，必须在报告结果前核实不确定的 URL',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: '要访问的完整 URL（http/https）' } },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ask_user',
      description: '向用户提问或在候选中让用户选择。输入模糊、多个软件匹配、或结果可能与用户预期不符时必须先问',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: '要问用户的问题' },
          options: {
            type: 'array',
            description: '候选选项',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: '选项显示文字，含一句说明' },
                value: { type: 'string', description: '选项对应的软件名或答案' }
              },
              required: ['label', 'value']
            }
          },
          allow_custom: { type: 'boolean', description: '是否允许用户自己输入补充，默认 true' }
        },
        required: ['question', 'options']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'report_result',
      description: '报告最终结果，调用后流程结束',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          publisher: { type: 'string' },
          official_url: { type: 'string' },
          download_url: { type: 'string', description: '安装包直链，拿不到填空字符串' },
          download_page: { type: 'string' },
          file_type: { type: 'string', enum: ['installer', 'zip', 'store'] },
          store_url: { type: 'string' },
          safety_note: { type: 'string' },
          install_tips: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number' }
        },
        required: ['name', 'publisher', 'official_url', 'file_type']
      }
    }
  }
]

function normalizeResult(a) {
  const r = {
    name: String(a.name || '').trim(),
    publisher: String(a.publisher || '').trim(),
    official_url: String(a.official_url || '').trim(),
    download_url: String(a.download_url || '').trim(),
    download_page: String(a.download_page || '').trim(),
    file_type: ['installer', 'zip', 'store'].includes(a.file_type) ? a.file_type : 'installer',
    store_url: String(a.store_url || '').trim(),
    safety_note: String(a.safety_note || '').trim(),
    install_tips: Array.isArray(a.install_tips) ? a.install_tips.map((t) => String(t)).filter(Boolean) : [],
    confidence: Number(a.confidence) || 0
  }
  if (!r.name) throw new Error('AI 未给出软件名')
  if (r.file_type === 'store' && !r.store_url && !r.official_url) throw new Error('商店类结果缺少链接')
  if (r.file_type !== 'store' && !r.official_url && !r.download_url && !r.download_page) {
    throw new Error('AI 未给出任何有效链接')
  }
  if (!r.download_page && r.official_url) r.download_page = r.official_url
  return r
}

function tryParseResult(text) {
  if (!text) return null
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const j = JSON.parse(m[0])
    if (j && j.name) return normalizeResult(j)
  } catch (_e) { /* 忽略 */ }
  return null
}

function parseJsonLoose(text) {
  if (!text) return null
  let t = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const i = t.indexOf('{')
  const j = t.lastIndexOf('}')
  if (i < 0 || j <= i) return null
  try { return JSON.parse(t.slice(i, j + 1)) } catch (_e) { return null }
}

/**
 * agent 主循环（工具模式）
 * emit(evt) 推送 UI 事件；askUser(args) 返回 Promise<用户回答>
 */
async function runAgent(settings, query, emit, askUser, token) {
  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: query }
  ]
  let toolFailed = false

  for (let round = 1; round <= 10; round++) {
    if (token && token.cancelled) throw new Error('已取消')
    emit({ type: 'ai-round', round })
    let data
    try {
      data = await chat(settings, messages, toolFailed ? null : TOOLS)
    } catch (err) {
      if (!toolFailed && /tool|function/i.test(String(err.message))) {
        toolFailed = true
        emit({ type: 'log', text: '当前模型不支持工具调用，切换到兼容模式…' })
        continue
      }
      throw err
    }

    const msg = data.choices && data.choices[0] && data.choices[0].message
    if (!msg) throw new Error('AI 返回为空')
    if (msg.content) emit({ type: 'ai-text', text: msg.content })

    const calls = msg.tool_calls || []
    if (!calls.length) {
      const direct = tryParseResult(msg.content)
      if (direct) return direct
      messages.push(msg)
      messages.push({ role: 'user', content: '请使用 report_result 工具报告结果；若需用户补充信息，使用 ask_user。不要输出其他内容。' })
      continue
    }

    messages.push(msg)
    let done = null
    for (const tc of calls) {
      if (token && token.cancelled) throw new Error('已取消')
      let args = {}
      try { args = JSON.parse(tc.function.arguments || '{}') } catch (_e) { args = {} }
      const name = tc.function.name

      if (name === 'fetch_page') {
        const url = String(args.url || '')
        emit({ type: 'tool', name: 'fetch_page', label: `核实官网 ${url.replace(/^https?:\/\//, '').slice(0, 50)}`, state: 'run' })
        const result = await fetchPage(url)
        emit({ type: 'tool', name: 'fetch_page', label: `核实 ${url.replace(/^https?:\/\//, '').slice(0, 40)}`, state: result.ok ? 'done' : 'fail' })
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result).slice(0, 12000) })
      } else if (name === 'ask_user') {
        emit({ type: 'tool', name: 'ask_user', label: '等待你的选择…', state: 'run' })
        const ans = await askUser(args)
        if (token && token.cancelled) throw new Error('已取消')
        emit({ type: 'tool', name: 'ask_user', label: '已收到你的回答', state: 'done' })
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(ans) })
      } else if (name === 'report_result') {
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ ok: true }) })
        try {
          done = normalizeResult(args)
        } catch (e) {
          messages.push({ role: 'user', content: `report_result 参数不完整：${e.message}，请补全后重新调用` })
        }
      } else {
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: `未知工具 ${name}` }) })
      }
    }
    if (done) return done
  }
  throw new Error('AI 思考轮次超限，请换个说法或稍后重试')
}

/** 无工具降级模式：单次 JSON 问答 */
async function runAgentNoTools(settings, query, emit, askUser, token) {
  const messages = [
    { role: 'system', content: buildNoToolsPrompt() },
    { role: 'user', content: query }
  ]
  for (let round = 1; round <= 5; round++) {
    if (token && token.cancelled) throw new Error('已取消')
    emit({ type: 'ai-round', round })
    const data = await chat(settings, messages, null)
    const msg = data.choices && data.choices[0] && data.choices[0].message
    if (!msg || !msg.content) throw new Error('AI 返回为空')
    emit({ type: 'ai-text', text: msg.content })
    const j = parseJsonLoose(msg.content)
    if (j && j.need_ask) {
      const ans = await askUser({
        question: j.question || '请补充说明你要的软件',
        options: Array.isArray(j.options) ? j.options : [],
        allow_custom: true
      })
      if (token && token.cancelled) throw new Error('已取消')
      messages.push(msg, { role: 'user', content: JSON.stringify(ans) })
      continue
    }
    if (j && j.result) return normalizeResult(j.result)
    messages.push(msg, { role: 'user', content: '请按约定只输出 JSON（need_ask 或 result）' })
  }
  throw new Error('AI 多次未返回有效结果，请换一个模型或稍后重试')
}

/** 下载校验完成后的 AI 安全终审 */
async function judgeSafety(settings, query, context) {
  const sys = buildJudgePrompt().replace('{{QUERY}}', query).replace('{{DATA}}', JSON.stringify(context))
  const data = await chat(settings, [
    { role: 'system', content: sys },
    { role: 'user', content: '请给出最终安全结论 JSON。' }
  ], null, { maxTokens: 1200 })
  const txt = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ''
  const j = parseJsonLoose(txt)
  if (j && ['safe', 'caution', 'danger'].includes(j.verdict)) {
    return {
      verdict: j.verdict,
      reasons: Array.isArray(j.reasons) ? j.reasons.map(String) : [],
      install_tips: Array.isArray(j.install_tips) ? j.install_tips.map(String) : []
    }
  }
  return { verdict: 'caution', reasons: ['AI 终审返回格式异常，请结合校验信息自行判断'], install_tips: [] }
}

/** 测试连接：先试 /models，失败则发一个最小对话 */
async function testConnection(settings) {
  const base = String(settings.ai.baseUrl || '').trim().replace(/\/+$/, '')
  if (!base) return { ok: false, message: '未填写接口地址' }
  if (!settings.ai.apiKey) return { ok: false, message: '未填写 API Key' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch(base + '/models', {
      headers: { Authorization: `Bearer ${settings.ai.apiKey}` },
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (res.ok) {
      let n = 0
      try {
        const j = await res.json()
        n = (j.data || []).length
      } catch (_e) { /* 忽略 */ }
      return { ok: true, message: `连接成功${n ? `，该 Key 可用模型 ${n} 个` : ''}` }
    }
    if (res.status !== 404 && res.status !== 405) {
      const t = await res.text().catch(() => '')
      return { ok: false, message: `接口返回 ${res.status}: ${t.slice(0, 120)}` }
    }
  } catch (e) {
    clearTimeout(timer)
    return { ok: false, message: `连接失败: ${e.name === 'AbortError' ? '超时' : e.message}` }
  }
  // /models 不支持 → 最小对话测试
  try {
    const data = await chat(settings, [
      { role: 'user', content: '回复"OK"' }
    ], null, { timeoutMs: 30000, maxTokens: 8 })
    return { ok: true, message: '连接成功，对话正常' }
  } catch (e) {
    return { ok: false, message: e.message }
  }
}

module.exports = { runAgent, runAgentNoTools, judgeSafety, testConnection, chat }
