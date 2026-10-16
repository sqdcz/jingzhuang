// 名单可视化管理：白 / 黑 / 病毒 + 暗号
(function () {
  const { escapeHtml } = window.JZUtils

  let data = null
  let sub = 'whitelist'

  const FIELD_DEFS = {
    whitelist: [
      { key: 'name', label: '软件名 *', type: 'text', ph: '如：微信' },
      { key: 'aliases', label: '别名/触发词（逗号分隔）', type: 'text', ph: '如：wechat, weixin, 电脑微信' },
      { key: 'officialUrl', label: '官网地址 *', type: 'text', ph: 'https://...' },
      { key: 'downloadUrl', label: '官方直链（可选，留空则只给官网入口）', type: 'text', ph: 'https://...exe' },
      { key: 'note', label: '备注', type: 'text', ph: '显示给用户的说明' }
    ],
    blacklist: [
      { key: 'name', label: '软件名 *', type: 'text', ph: '如：2345好压' },
      { key: 'aliases', label: '别名/触发词（逗号分隔）', type: 'text', ph: '' },
      { key: 'risk', label: '风险说明 *（弹窗/广告/卡顿等具体问题）', type: 'textarea', ph: '如：捆绑全家桶、弹窗广告、卸载困难' },
      { key: 'alternatives', label: '推荐替代（每行一个：名称|官网）', type: 'textarea', ph: '7-Zip|https://www.7-zip.org/' }
    ],
    viruslist: [
      { key: 'name', label: '分类名 *', type: 'text', ph: '如：激活类工具' },
      { key: 'patterns', label: '触发词（逗号分隔，用户输入包含即命中）', type: 'text', ph: '如：激活工具, kms, 破解版' },
      { key: 'risk', label: '风险说明 *', type: 'textarea', ph: '为什么危险、会有什么后果' }
    ]
  }

  function entryToForm(entry, listKey) {
    const e = entry || {}
    const out = {}
    for (const f of FIELD_DEFS[listKey]) {
      let v = e[f.key]
      if (Array.isArray(v)) v = v.join(', ')
      if (f.key === 'alternatives' && Array.isArray(e.alternatives)) {
        v = e.alternatives.map((a) => `${a.name}|${a.url || ''}`).join('\n')
      }
      out[f.key] = v || ''
    }
    return out
  }

  function formToEntry(form, listKey) {
    const entry = {}
    for (const f of FIELD_DEFS[listKey]) {
      let v = (form[f.key] || '').trim()
      if (['aliases', 'patterns'].includes(f.key)) {
        v = v.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
      }
      if (f.key === 'alternatives') {
        v = v.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
          const [name, url] = line.split('|').map((s) => s.trim())
          return { name: name || line, url: url || '' }
        })
      }
      entry[f.key] = v
    }
    return entry
  }

  function render() {
    const box = document.getElementById('listEditor')
    const list = data[sub] || []
    if (!list.length) {
      box.innerHTML = '<div class="empty">暂无条目，点下方「＋ 新增条目」添加</div>'
      return
    }
    box.innerHTML = list.map((e, i) => {
      let subline = ''
      if (sub === 'whitelist') subline = e.officialUrl || ''
      if (sub === 'blacklist') subline = e.risk || ''
      if (sub === 'viruslist') subline = (e.patterns || []).join(' / ')
      const altCount = (e.alternatives || []).length
      return `
        <div class="entry-item">
          <div class="entry-head">
            <span class="entry-name">${escapeHtml(e.name)}</span>
            <span class="row gap" style="gap:6px">
              ${altCount ? `<span class="badge neutral">${altCount} 个替代</span>` : ''}
              <button class="btn sm ghost" data-edit="${i}">编辑</button>
              <button class="btn sm ghost" data-del="${i}" style="color:var(--danger)">删除</button>
            </span>
          </div>
          ${subline ? `<div class="entry-sub">${escapeHtml(subline)}</div>` : ''}
        </div>`
    }).join('')

    box.querySelectorAll('[data-edit]').forEach((b) => {
      b.addEventListener('click', () => openEditor(Number(b.dataset.edit)))
    })
    box.querySelectorAll('[data-del]').forEach((b) => {
      b.addEventListener('click', () => {
        data[sub].splice(Number(b.dataset.del), 1)
        render()
      })
    })
  }

  function openEditor(index) {
    const isAdd = index < 0
    const form = entryToForm(isAdd ? null : data[sub][index], sub)
    const fields = FIELD_DEFS[sub].map((f) => `
      <div class="field">
        <label>${escapeHtml(f.label)}</label>
        ${f.type === 'textarea'
          ? `<textarea data-f="${f.key}" placeholder="${escapeHtml(f.ph)}">${escapeHtml(form[f.key])}</textarea>`
          : `<input type="text" data-f="${f.key}" value="${escapeHtml(form[f.key])}" placeholder="${escapeHtml(f.ph)}" spellcheck="false">`}
      </div>`).join('')

    const mask = document.createElement('div')
    mask.className = 'modal-mask'
    mask.innerHTML = `
      <div class="modal">
        <h3>${isAdd ? '新增' : '编辑'}${{ whitelist: '白名单', blacklist: '黑名单', viruslist: '病毒名单' }[sub]}条目</h3>
        ${fields}
        <div class="row gap" style="margin-top:16px">
          <button class="btn primary" id="mOk">确定</button>
          <button class="btn ghost" id="mCancel">取消</button>
        </div>
      </div>`
    document.body.appendChild(mask)
    mask.querySelector('#mCancel').addEventListener('click', () => mask.remove())
    mask.addEventListener('click', (e) => { if (e.target === mask) mask.remove() })
    mask.querySelector('#mOk').addEventListener('click', () => {
      const form2 = {}
      mask.querySelectorAll('[data-f]').forEach((n) => { form2[n.dataset.f] = n.value })
      const entry = formToEntry(form2, sub)
      // 校验必填
      const defs = FIELD_DEFS[sub]
      for (const d of defs) {
        if (d.label.includes('*') && !String(entry[d.key] || '').trim() && !(Array.isArray(entry[d.key]) && entry[d.key].length)) {
          window.toast(`「${d.label.replace('*', '').trim()}」是必填项`)
          return
        }
      }
      if (isAdd) data[sub].push(entry)
      else data[sub][index] = entry
      mask.remove()
      render()
    })
  }

  function bind() {
    document.querySelectorAll('#listSubTabs .subtab').forEach((t) => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#listSubTabs .subtab').forEach((x) => x.classList.remove('active'))
        t.classList.add('active')
        sub = t.dataset.sub
        render()
      })
    })
    document.getElementById('btnAddEntry').addEventListener('click', () => openEditor(-1))
    document.getElementById('btnSaveLists').addEventListener('click', async () => {
      data.secretCode = document.getElementById('secretCode').value.trim()
      try {
        await window.JZApi.lists.save(data)
        document.getElementById('listsSaveResult').textContent = '✅ 已保存'
        setTimeout(() => { const el = document.getElementById('listsSaveResult'); if (el) el.textContent = '' }, 2000)
      } catch (e) {
        window.toast(`保存失败：${e.message}`)
      }
    })
    document.getElementById('btnResetLists').addEventListener('click', async () => {
      if (!window.confirm('确定恢复默认名单？当前所有修改将丢失。')) return
      await window.JZApi.lists.reset()
      await init()
      window.toast('已恢复默认名单')
    })
    document.getElementById('btnOpenListsFolder').addEventListener('click', () => window.JZApi.lists.openFolder())
  }

  async function init() {
    data = await window.JZApi.lists.get()
    document.getElementById('secretCode').value = data.secretCode || ''
    render()
  }

  window.JZListsUI = { init, bind }
})()
