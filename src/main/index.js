const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const { registerIpc, setWindow } = require('./ipc')

// 老显卡上关硬件加速更稳
app.disableHardwareAcceleration()
app.setAppUserModelId('cn.chuanzhi.jingzhuang')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  function createWindow() {
    const win = new BrowserWindow({
      width: 1100,
      height: 780,
      minWidth: 920,
      minHeight: 640,
      title: '净装',
      backgroundColor: '#f6f7f9',
      autoHideMenuBar: true,
      icon: path.join(__dirname, '../../build/icon.png'),
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })
    win.loadFile(path.join(__dirname, '../renderer/index.html'))

    // 自动化完整流程测试: npx electron . --flow-test "查询词"
    // 在界面里真实输入并点击搜索，等待流程走完，把结果打到控制台
    if (process.argv.includes('--flow-test')) {
      const fi = process.argv.indexOf('--flow-test')
      const fq = process.argv[fi + 1] || 'curl'
      win.webContents.on('console-message', (_e, _level, message) => {
        if (/error|uncaught|failed/i.test(message)) console.log('[renderer]', message)
      })
      win.webContents.on('did-finish-load', async () => {
        await win.webContents.executeJavaScript(`
          document.getElementById('searchInput').value = ${JSON.stringify(fq)};
          document.getElementById('btnSearch').click();
          true
        `)
        console.log('FLOW-START ' + fq)
        const deadline = Date.now() + 240000
        const timer = setInterval(async () => {
          let txt = ''
          try {
            txt = await win.webContents.executeJavaScript(`document.getElementById('cards').innerText || ''`)
          } catch (_e) { /* 忽略 */ }
          const done = /安装前必读|哈希比对|出错了|winget 官方索引里找到|打开微软商店|已锁定|风险提示|高风险警告|白名单直达/.test(txt)
          if (done || Date.now() > deadline) {
            clearInterval(timer)
            console.log('FLOW-TIMEOUT ' + (!done))
            console.log('FLOW-RESULT ' + JSON.stringify(String(txt).slice(0, 1500)))
            app.quit()
          }
        }, 4000)
      })
    }

    // 自动化界面冒烟测试: npx electron . --smoke-test
    if (process.argv.includes('--smoke-test')) {
      win.webContents.on('console-message', (_e, _level, message) => {
        if (/error|uncaught|failed/i.test(message)) console.log('[renderer-console]', message)
      })
      win.webContents.on('render-process-gone', (_e, details) => {
        console.log('SMOKE-RESULT renderer-gone ' + JSON.stringify(details))
        app.quit()
      })
      win.webContents.on('did-finish-load', async () => {
        try {
          const r = await win.webContents.executeJavaScript(`(() => ({
            ready: document.readyState,
            hasApi: !!window.JZApi,
            hasApp: !!window.JZApp,
            hasSettings: !!window.JZSettings,
            hasCards: !!window.JZCards,
            hasListsUI: !!window.JZListsUI,
            hasTheme: !!window.JZTheme,
            searchInput: !!document.getElementById('searchInput'),
            tabCount: document.querySelectorAll('#settingsTabs .tab').length,
            chipCount: document.querySelectorAll('#quickChips button').length,
            themeAttr: document.documentElement.getAttribute('data-theme')
          }))()`)
          console.log('SMOKE-RESULT ' + JSON.stringify(r))
        } catch (e) {
          console.log('SMOKE-RESULT error ' + e.message)
        }
        app.quit()
      })
    }
    return win
  }

  app.whenReady().then(() => {
    registerIpc()
    setWindow(createWindow())
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) setWindow(createWindow())
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  // 外链一律走系统默认浏览器，不开新窗口
  app.on('web-contents-created', (_e, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) shell.openExternal(url)
      return { action: 'deny' }
    })
  })
}
