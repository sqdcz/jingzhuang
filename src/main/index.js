const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const { registerIpc, setWindow } = require('./ipc')

// 窗口图标：打包后从资源目录拿（build/ 不进 asar），开发时从 build/ 拿。
// ico 里必须带 16/24/32/48 小尺寸帧，否则标题栏和任务栏预览会渲染异常。
function windowIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, '../../build/icon.ico')
}

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
      icon: windowIconPath(),
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
        // 界面初始化依赖异步 IPC（设置/名单/应用信息），
        // did-finish-load 会早于初始化完成，直接点搜索会点了个寂寞。
        // 这里轮询等 JZApp 就绪再动手，打包版与开发版都稳。
        const readyDeadline = Date.now() + 30000
        let ready = false
        while (Date.now() < readyDeadline) {
          try {
            ready = await win.webContents.executeJavaScript(
              `!!(window.JZApp && window.JZApi && document.getElementById('btnSearch'))`
            )
          } catch (_e) { /* 忽略 */ }
          if (ready) break
          await new Promise((r) => setTimeout(r, 300))
        }
        console.log('FLOW-READY ' + ready)
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
          // 只认终态：下载校验完的安装指导卡 / 出错 / 商店跳转 / 各类名单卡。
          // 「已锁定」只是中间态（锁定结果后还要下载），不能在这就收工。
          const done = /安装前必读|哈希比对|出错了|打开微软商店|风险提示|高风险警告|白名单直达/.test(txt)
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
        // 等异步 IPC 初始化完成再取值，否则 chips 之类的动态内容还没渲染
        const readyDeadline = Date.now() + 30000
        while (Date.now() < readyDeadline) {
          let ready = false
          try {
            ready = await win.webContents.executeJavaScript(`!!(window.JZApp && window.JZApi)`)
          } catch (_e) { /* 忽略 */ }
          if (ready) break
          await new Promise((r) => setTimeout(r, 300))
        }
        await new Promise((r) => setTimeout(r, 800))
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
            wingetCard: !!document.getElementById('wingetEnabled') || !!document.querySelector('#wingetStatus'),
            storeMode: !!window.JZStoreMode,
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
