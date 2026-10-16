// 流程卡片：白名单 / 黑名单(5秒倒计时) / 病毒暗号 / 候选选择 / 下载 / 终审 / 错误
(function () {
  const { escapeHtml, fmtBytes, fmtSpeed, hostOf } = window.JZUtils

  function cardsEl() { return document.getElementById('cards') }

  function reset() {
    const c = cardsEl()
    if (c) c.innerHTML = ''
  }

  function add(html, cls) {
    const c = cardsEl()
    if (!c) return null
    const div = document.createElement('div')
    div.className = `flow-card ${cls || ''}`
    div.innerHTML = html
    c.appendChild(div)
    const main = document.querySelector('main')
    if (main) main.scrollTop = main.scrollHeight
    return div
  }

  /* ---------- 白名单 ---------- */
  function whitelist(entry, query) {
    const hasDirect = entry.downloadUrl && String(entry.downloadUrl).trim()
    const html = `
      <div class="big-title"><span class="emoji">✅</span>白名单直达：${escapeHtml(entry.name)}</div>
      ${entry.note ? `<p class="muted">${escapeHtml(entry.note)}</p>` : ''}
      <div class="kv"><span class="k">官网</span><span class="v">${escapeHtml(hostOf(entry.officialUrl))}</span></div>
      <div class="row gap" style="margin-top:12px">
        ${hasDirect ? '<button class="btn primary" data-act="dl">⬇ 直接下载官方安装包</button>' : ''}
        <button class="btn" data-act="site">🌐 打开官网</button>
        <a class="hint" style="cursor:pointer;align-self:center" data-act="ai">不是这个？让 AI 找 →</a>
      </div>`
    const el = add(html)
    el.querySelector('[data-act="dl"]')?.addEventListener('click', () => window.JZApi.whitelistDownload(entry))
    el.querySelector('[data-act="site"]')?.addEventListener('click', () => window.JZApi.openExternal(entry.officialUrl))
    el.querySelector('[data-act="ai"]')?.addEventListener('click', () => window.JZApi.continueAnyway(query, 'force'))
  }

  /* ---------- 黑名单（风险提示 + 5 秒倒计时） ---------- */
  function blacklist(entry, query) {
    const alts = (entry.alternatives || []).map((a, i) =>
      `<button class="btn sm" data-alt="${i}">✨ ${escapeHtml(a.name)}</button>`
    ).join('')
    const html = `
      <div class="big-title"><span class="emoji">⚠️</span>风险提示：${escapeHtml(entry.name)}</div>
      <p style="font-size:14px;line-height:1.8;color:var(--danger);font-weight:600;margin-bottom:8px">
        ${escapeHtml(entry.risk || '该软件属于「合规但行为流氓」类型，安装后可能出现弹窗、广告、卡顿等问题。')}
      </p>
      ${alts ? `<p style="margin-top:10px"><b>推荐替代（开源/干净）：</b></p><div class="alt-group">${alts}</div>` : ''}
      <div class="row gap" style="margin-top:14px">
        <button class="btn danger countdown-btn" id="cdBtn" disabled>仍要安装（5）</button>
        <button class="btn ghost" data-act="giveup">算了，不装了</button>
      </div>`
    const el = add(html, 'risk')

    // 替代按钮 → 直接发起对该软件的新搜索
    el.querySelectorAll('[data-alt]').forEach((b) => {
      b.addEventListener('click', () => {
        const alt = entry.alternatives[Number(b.dataset.alt)]
        if (alt && window.JZApp) window.JZApp.search(alt.name)
      })
    })
    el.querySelector('[data-act="giveup"]').addEventListener('click', () => window.JZApp.resetFlow())

    // 5 秒倒计时
    const btn = el.querySelector('#cdBtn')
    let n = 5
    const timer = setInterval(() => {
      n -= 1
      if (n <= 0) {
        clearInterval(timer)
        btn.disabled = false
        btn.textContent = '仍要安装（我已知晓风险）'
      } else {
        btn.textContent = `仍要安装（${n}）`
      }
    }, 1000)
    btn.addEventListener('click', () => {
      if (btn.disabled) return
      window.JZApi.continueAnyway(query, 'blacklist')
    })
  }

  /* ---------- 病毒名单（暗号） ---------- */
  function virus(entry, query) {
    const html = `
      <div class="big-title"><span class="emoji">☠️</span>高风险警告：${escapeHtml(entry.name)}</div>
      <p style="font-size:14px;line-height:1.8;color:var(--danger);font-weight:600;margin-bottom:8px">
        ${escapeHtml(entry.risk || '该软件存在恶意行为风险，可能危害你的电脑与账号安全。')}
      </p>
      <p class="muted" style="margin:10px 0 6px">如果你清楚后果并坚持安装，请输入暗号：</p>
      <div class="row">
        <input type="password" class="grow" id="virusCode" placeholder="输入暗号…" spellcheck="false">
        <button class="btn danger" id="virusGo">确认继续</button>
      </div>
      <div class="hint" id="virusMsg" style="margin-top:8px;color:var(--danger)"></div>
      <button class="btn ghost sm" id="virusBack" style="margin-top:10px">算了，不装了</button>`
    const el = add(html, 'virus')
    const input = el.querySelector('#virusCode')
    const msg = el.querySelector('#virusMsg')

    async function go() {
      const r = await window.JZApi.continueAnyway(query, 'virus', input.value)
      if (r && r.ok === false) {
        el.classList.remove('shake')
        void el.offsetWidth
        el.classList.add('shake')
        msg.textContent = `✕ ${r.message || '暗号不正确'}`
        input.value = ''
        input.focus()
      }
    }
    el.querySelector('#virusGo').addEventListener('click', go)
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go() })
    el.querySelector('#virusBack').addEventListener('click', () => window.JZApp.resetFlow())
  }

  /* ---------- 候选选择 ---------- */
  function question(evt) {
    const opts = (evt.options || []).map((o, i) =>
      `<button class="option-btn" data-opt="${i}">${escapeHtml(o.label || o.value)}</button>`
    ).join('')
    const customRow = evt.allowCustom
      ? `<div class="row" style="margin-top:10px">
           <input type="text" class="grow" id="qCustom" placeholder="或者自己输入补充说明…" spellcheck="false">
           <button class="btn sm" id="qSend">提交</button>
         </div>`
      : ''
    const html = `
      <div class="big-title"><span class="emoji">🤔</span>${escapeHtml(evt.question)}</div>
      <div class="option-group">${opts}</div>
      ${customRow}`
    const el = add(html, 'question')

    const send = (value, custom) => {
      el.querySelectorAll('button,input').forEach((n) => (n.disabled = true))
      el.style.opacity = '0.6'
      window.JZApi.answer({ id: evt.id, value, custom })
    }
    el.querySelectorAll('[data-opt]').forEach((b) => {
      b.addEventListener('click', () => {
        const o = evt.options[Number(b.dataset.opt)]
        send(o.value || o.label, '')
      })
    })
    const sendBtn = el.querySelector('#qSend')
    const customInput = el.querySelector('#qCustom')
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (customInput.value.trim()) send('', customInput.value.trim())
      })
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && customInput.value.trim()) send('', customInput.value.trim())
      })
    }
  }

  /* ---------- winget 候选选择 ---------- */
  function wingetCandidates(query, items) {
    const opts = (items || []).map((it, i) => `
      <button class="option-btn" data-wg="${i}">
        <b>${escapeHtml(it.name)}</b> <span class="muted">· ${escapeHtml(it.id)} · ${escapeHtml(it.version)}</span>
        <div class="hint">${it.source === 'msstore' ? '微软商店（需到商店安装）' : 'winget 官方索引 · 可直链下载'}</div>
      </button>`).join('')
    const html = `
      <div class="big-title"><span class="emoji">🔧</span>winget 官方索引里找到这些，你要哪个？</div>
      <div class="option-group">${opts}</div>
      <div class="row gap" style="margin-top:10px">
        <a class="hint" style="cursor:pointer" data-act="ai">都不是？让 AI 帮我找 →</a>
      </div>`
    const el = add(html, 'question')
    el.querySelectorAll('[data-wg]').forEach((b) => {
      b.addEventListener('click', () => {
        el.querySelectorAll('button,a').forEach((n) => { n.disabled = true })
        el.style.opacity = '0.6'
        window.JZApi.wingetChoose(items[Number(b.dataset.wg)], query)
      })
    })
    el.querySelector('[data-act="ai"]').addEventListener('click', () => window.JZApi.continueAnyway(query, 'force'))
  }

  /* ---------- 微软商店（winget msstore 源） ---------- */
  function store(d) {
    const html = `
      <div class="big-title"><span class="emoji">🏪</span>${escapeHtml(d.name)} 在微软商店</div>
      <p class="muted">${escapeHtml(d.note || '这个软件只能从微软商店安装。')}</p>
      <div class="row gap" style="margin-top:12px">
        <button class="btn primary" data-act="store">打开微软商店</button>
        <button class="btn ghost" data-act="done">结束</button>
      </div>`
    const el = add(html)
    el.querySelector('[data-act="store"]').addEventListener('click', () => window.JZApi.openExternal(d.storeUrl))
    el.querySelector('[data-act="done"]').addEventListener('click', () => window.JZApp.resetFlow())
  }

  /* ---------- 需要配置 AI ---------- */
  function needKey() {
    const html = `
      <div class="big-title"><span class="emoji">🔑</span>这个查询需要 AI 帮忙</div>
      <p class="muted">你还没配置 AI 服务。配置一次（大约 2 分钟）之后，输入任何软件名或功能描述都能智能查找。</p>
      <div class="row gap" style="margin-top:14px">
        <button class="btn primary" id="goCfg">去配置 AI</button>
      </div>`
    const el = add(html)
    el.querySelector('#goCfg').addEventListener('click', () => window.JZApp.openSettings('ai'))
  }

  /* ---------- AI 结果 ---------- */
  function result(r) {
    const conf = Math.round((Number(r.confidence) || 0) * 100)
    let action = ''
    if (r.file_type === 'store' && r.store_url) {
      action = `<button class="btn primary" data-act="store">🏪 打开微软商店</button>`
    } else if (!r.download_url) {
      action = `<button class="btn primary" data-act="page">⬇ 打开官方下载页</button>
                <p class="hint" style="margin-top:8px">该软件没有公开直链，需在官方页面点击下载。</p>`
    } else {
      action = `<p class="muted">⏳ 正在自动下载官方安装包…</p>`
    }
    const srcBadge = r.source === 'winget'
      ? '<span class="badge neutral">🔧 winget 官方索引</span>'
      : '<span class="badge neutral">🤖 AI 查找</span>'
    const html = `
      <div class="big-title"><span class="emoji">📦</span>已锁定：${escapeHtml(r.name)} ${srcBadge}</div>
      <div class="kv"><span class="k">发布商</span><span class="v">${escapeHtml(r.publisher || '未知')}</span></div>
      <div class="kv"><span class="k">官网</span><span class="v">${escapeHtml(hostOf(r.official_url || r.download_page))}</span></div>
      <div class="kv"><span class="k">AI 把握</span><span class="v">${conf}%</span></div>
      ${r.safety_note ? `<p style="margin-top:8px;font-size:13px;line-height:1.7">${escapeHtml(r.safety_note)}</p>` : ''}
      <div style="margin-top:12px">${action}</div>`
    const el = add(html)
    el.querySelector('[data-act="store"]')?.addEventListener('click', () => window.JZApi.openExternal(r.store_url))
    el.querySelector('[data-act="page"]')?.addEventListener('click', () => window.JZApi.openExternal(r.download_page || r.official_url))
  }

  /* ---------- 下载 ---------- */
  let progressEl = null
  function downloadStart(evt) {
    const html = `
      <div class="big-title"><span class="emoji">⬇️</span>正在下载：${escapeHtml(evt.name || '官方安装包')}</div>
      <div class="kv"><span class="k">保存到</span><span class="v">${escapeHtml(evt.dir)}</span></div>
      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div>
        <div class="progress-meta"><span class="pm-l">准备中…</span><span class="pm-r"></span></div>
      </div>
      <button class="btn ghost sm" id="dlCancel">取消下载</button>`
    progressEl = add(html)
    progressEl.querySelector('#dlCancel').addEventListener('click', () => window.JZApi.cancelDownload())
  }

  function progress(p) {
    if (!progressEl) return
    const fill = progressEl.querySelector('.progress-fill')
    const l = progressEl.querySelector('.pm-l')
    const r = progressEl.querySelector('.pm-r')
    if (p.total) {
      const pct = Math.min(100, (p.received / p.total) * 100)
      fill.style.width = `${pct.toFixed(1)}%`
      l.textContent = `${pct.toFixed(0)}% · ${fmtBytes(p.received)} / ${fmtBytes(p.total)}`
    } else {
      l.textContent = `已下载 ${fmtBytes(p.received)}`
    }
    r.textContent = fmtSpeed(p.speed)
  }

  function downloadDone(file) {
    if (!progressEl) return
    progressEl.querySelector('.progress-fill').style.width = '100%'
    progressEl.querySelector('.pm-l').textContent = `✅ 下载完成（${file.sizeText}）`
    progressEl.querySelector('.pm-r').textContent = ''
    progressEl.querySelector('#dlCancel')?.remove()
  }

  /* ---------- 终审 + 安装指导 ---------- */
  function finalCard(data) {
    const { verdict, signature, virustotal, file, result, override, publisherMatch, hashMatch } = data
    const vBadge = {
      safe: '<span class="badge ok">✅ 安全</span>',
      caution: '<span class="badge warn">⚠️ 谨慎安装</span>',
      danger: '<span class="badge bad">⛔ 高风险</span>'
    }[verdict.verdict] || ''

    const sigLine = signature
      ? `<div class="kv"><span class="k">数字签名</span><span class="v">${escapeHtml(signature.status || '未知')}${signature.signer ? ' · ' + escapeHtml(signature.signer.split(',').slice(0, 2).join(',')) : ''}</span></div>`
      : '<div class="kv"><span class="k">数字签名</span><span class="v">绿色压缩包，跳过签名校验</span></div>'

    let pmLine = ''
    if (publisherMatch === 'match') pmLine = '<div class="kv"><span class="k">发布者比对</span><span class="v" style="color:var(--ok)">签名发布者与官方发布商一致 ✅</span></div>'
    else if (publisherMatch === 'mismatch') pmLine = '<div class="kv"><span class="k">发布者比对</span><span class="v" style="color:var(--warn)">签名发布者与预期不完全一致，请核对 ⚠️</span></div>'

    let hashLine = ''
    if (hashMatch === 'match') {
      hashLine = '<div class="kv"><span class="k">哈希比对</span><span class="v" style="color:var(--ok)">✅ 与 winget 官方清单的 SHA256 完全一致</span></div>'
    } else if (hashMatch === 'mismatch') {
      hashLine = '<div class="kv"><span class="k">哈希比对</span><span class="v" style="color:var(--danger)">⛔ 与 winget 官方清单的 SHA256 不一致，文件可能被动过</span></div>'
    }

    let vtLine = ''
    if (virustotal && virustotal.ok && virustotal.found) {
      const bad = (virustotal.malicious || 0) + (virustotal.suspicious || 0)
      const cls = bad >= 2 ? 'bad' : bad === 1 ? 'warn' : 'ok'
      vtLine = `<div class="kv"><span class="k">云查杀</span><span class="v"><span class="badge ${cls}">VT ${virustotal.malicious} 报毒 / ${virustotal.suspicious} 可疑 / ${virustotal.undetected} 放行</span> <a class="link" data-act="vt">查看报告</a></span></div>`
    } else if (virustotal && virustotal.ok && !virustotal.found) {
      vtLine = '<div class="kv"><span class="k">云查杀</span><span class="v">VirusTotal 未收录（无恶意记录可查）</span></div>'
    }

    const reasons = (verdict.reasons || []).map((r) => `<li>${escapeHtml(r)}</li>`).join('')

    const isZip = result && result.file_type === 'zip'
    const genericTips = isZip
      ? ['解压到非系统盘的目录（如 D:\\Software）即可使用，无需安装向导', '部分绿色软件首次运行会请求防火墙/管理员权限，属正常现象', '不需要时直接删掉文件夹即完成"卸载"']
      : ['安装路径建议选非系统盘（如 D 盘），C 盘越满系统越卡', '注意安装向导里默认勾选的「开机自启动」，不需要就取消', '逐步检查捆绑勾选框（全家桶往往藏在"下一步"里），只保留主程序', '装完看一眼桌面，多了不认识的图标就顺手删掉']
    const aiTips = (verdict.install_tips || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('')

    const blocked = (verdict.verdict === 'danger' || hashMatch === 'mismatch') && !override
    const storeMode = !!window.JZStoreMode
    const storeHint = storeMode && !isZip
      ? '<p class="hint" style="margin-top:8px"> 🏪 商店版不代你运行安装程序，请手动双击安装包（按上面的建议清单一步步来）。</p>'
      : ''
    const btnRow = blocked
      ? `<p style="color:var(--danger);font-weight:600;margin-top:10px">⛔ 已拦截：本次安装存在高风险。建议换用同类安全软件。</p>
         <div class="row gap" style="margin-top:12px">
           <button class="btn" data-act="folder">📂 打开下载位置（仅保留文件，不运行）</button>
           <button class="btn primary" data-act="done">结束</button>
         </div>`
      : `<div class="row gap" style="margin-top:14px">
           ${isZip || storeMode ? '' : '<button class="btn primary" data-act="install">▶ 开始安装</button>'}
           <button class="btn" data-act="folder">📂 打开所在文件夹</button>
           <button class="btn ghost" data-act="done">完成</button>
         </div>`

    const warnExtra = verdict.verdict === 'danger' && override
      ? '<p style="color:var(--danger);font-weight:600;margin-top:8px">⛔ 你已选择风险自负，请务必仔细完成每一步安装确认。</p>' : ''

    const html = `
      <div class="big-title"><span class="emoji">${blocked ? '🛑' : '🧾'}</span>安装前必读 ${vBadge}</div>
      ${reasons ? `<ul class="reasons">${reasons}</ul>` : ''}
      ${sigLine}${hashLine}${pmLine}${vtLine}
      <div class="kv"><span class="k">安装包</span><span class="v">${escapeHtml(file.path)}（${file.sizeText}）</span></div>
      ${warnExtra}${storeHint}
      <p style="margin-top:14px;font-weight:600">📋 安装建议${isZip ? '（绿色软件）' : ''}</p>
      <ul class="tips-list">${genericTips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}${aiTips}</ul>
      ${btnRow}`
    const el = add(html, blocked ? 'risk' : '')

    el.querySelector('[data-act="vt"]')?.addEventListener('click', () => window.JZApi.openExternal(virustotal.link))
    el.querySelector('[data-act="install"]')?.addEventListener('click', async () => {
      const r = await window.JZApi.runInstaller(file.path)
      if (r && r.ok === false) window.toast(r.message)
    })
    el.querySelector('[data-act="folder"]')?.addEventListener('click', () => window.JZApi.showInFolder(file.path))
    el.querySelector('[data-act="done"]')?.addEventListener('click', () => window.JZApp.resetFlow())
  }

  /* ---------- 错误 ---------- */
  function error(message, fallbackPage) {
    const html = `
      <div class="big-title"><span class="emoji">😞</span>出错了</div>
      <p style="font-size:13px;line-height:1.7;word-break:break-all">${escapeHtml(message)}</p>
      <div class="row gap" style="margin-top:12px">
        <button class="btn primary" data-act="retry">重新搜索</button>
        ${fallbackPage ? '<button class="btn" data-act="page">🌐 打开官方下载页</button>' : ''}
      </div>`
    const el = add(html, 'risk')
    el.querySelector('[data-act="retry"]').addEventListener('click', () => {
      if (window.JZApp) window.JZApp.search(window.JZApp.currentQuery)
    })
    el.querySelector('[data-act="page"]')?.addEventListener('click', () => window.JZApi.openExternal(fallbackPage))
  }

  window.JZCards = { reset, whitelist, blacklist, virus, question, needKey, wingetCandidates, store, result, downloadStart, progress, downloadDone, final: finalCard, error }
})()
