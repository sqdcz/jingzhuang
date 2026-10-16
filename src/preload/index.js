const { contextBridge, ipcRenderer } = require('electron')

const api = {
  // 核心流程
  search: (q) => ipcRenderer.invoke('search', q),
  answer: (payload) => ipcRenderer.send('answer', payload),
  cancelFlow: () => ipcRenderer.send('cancel-flow'),
  whitelistDownload: (entry) => ipcRenderer.invoke('whitelist-download', entry),
  continueAnyway: (query, kind, secret) => ipcRenderer.invoke('continue-anyway', query, kind, secret),
  wingetChoose: (candidate, query) => ipcRenderer.invoke('winget-choose', candidate, query),
  wingetInfo: () => ipcRenderer.invoke('winget-info'),

  // 系统
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  showInFolder: (p) => ipcRenderer.invoke('show-in-folder', p),
  runInstaller: (p) => ipcRenderer.invoke('run-installer', p),
  cancelDownload: () => ipcRenderer.send('cancel-download'),

  // 设置
  settings: {
    get: () => ipcRenderer.invoke('settings-get'),
    set: (patch) => ipcRenderer.invoke('settings-set', patch)
  },
  testAI: () => ipcRenderer.invoke('test-ai'),
  pickBg: () => ipcRenderer.invoke('pick-bg'),

  // 名单
  lists: {
    get: () => ipcRenderer.invoke('lists-get'),
    save: (d) => ipcRenderer.invoke('lists-save', d),
    reset: () => ipcRenderer.invoke('lists-reset'),
    openFolder: () => ipcRenderer.invoke('lists-open-folder')
  },

  // 历史 / 工具
  history: {
    get: () => ipcRenderer.invoke('history-get'),
    clear: () => ipcRenderer.invoke('history-clear')
  },
  geek: () => ipcRenderer.invoke('geek'),
  appInfo: () => ipcRenderer.invoke('app-info'),

  // 流程事件流
  onFlowEvent: (cb) => {
    const h = (_e, evt) => cb(evt)
    ipcRenderer.on('flow-event', h)
    return () => ipcRenderer.removeListener('flow-event', h)
  }
}

contextBridge.exposeInMainWorld('jingzhuang', api)
