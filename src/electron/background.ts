import * as path from 'path'
import * as os from 'os'
import { app, BrowserWindow, dialog, ipcMain, session } from 'electron'
import singleInstance from './singleInstance'
import dynamicRenderer from './dynamicRenderer'
import titleBarActionsModule from './modules/titleBarActions'
import updaterModule from './modules/updater'
import macMenuModule from './modules/macMenu'
import startAPI from '../api/api'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
const isProduction = process.env.NODE_ENV !== 'development'
const platform: 'darwin' | 'win32' | 'linux' = process.platform as any
const architucture: '64' | '32' = os.arch() === 'x64' ? '64' : '32'
const headerSize = 32
const modules = [titleBarActionsModule, macMenuModule, updaterModule]

function createWindow() {
  console.log('System info', { isProduction, platform, architucture })
  const mainWindow = new BrowserWindow({
    title: 'Crunchyroll Downloader',
    icon: __dirname + '/icon/favicon.ico',
    width: 950,
    height: 700,
    backgroundColor: '#111111',
    webPreferences: {
      devTools: true,
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#111111',
      symbolColor: '#ffffff',
      height: 40
    },
    resizable: false
  })

  mainWindow.webContents.setWindowOpenHandler(() => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        icon: __dirname + '/icon/favicon.ico',
        backgroundColor: '#111111',
        webPreferences: {
          devTools: true,
          nodeIntegration: true,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'hidden',
        titleBarOverlay: {
          color: '#111111',
          symbolColor: '#ffffff',
          height: 40
        },
        resizable: false
      }
    }
  })

  // Lock app to single instance
  if (singleInstance(app, mainWindow)) return

  // Open the DevTools.
    mainWindow.webContents.openDevTools({
      mode: 'bottom'
    })

  return mainWindow
}

// App events
// ==========
app.whenReady().then(async () => {
  if (!isProduction) {
    try {
      await session.defaultSession.loadExtension(path.join(__dirname, '../..', '__extensions', 'vue-devtools'))
    } catch (err) {
      console.log('[Electron::loadExtensions] An error occurred: ', err)
    }
  }

  startAPI()

  const mainWindow = createWindow()
  if (!mainWindow) return

  // Load renderer process
  dynamicRenderer(mainWindow)

  // Initialize modules
  console.log('-'.repeat(30) + '\n[+] Loading modules...')
  modules.forEach((module) => {
    try {
      module(mainWindow)
    } catch (err: any) {
      console.log('[!] Module error: ', err.message || err)
    }
  })

  console.log('[!] Loading modules: Done.' + '\r\n' + '-'.repeat(30))

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    // if (BrowserWindow.getAllWindows().length === 0) createWindow()
    mainWindow.show()
  })
})

export async function messageBox(
  type: 'none' | 'info' | 'error' | 'question' | 'warning' | undefined,
  buttons: Array<'Cancel'>,
  defaultId: number,
  title: string,
  message: string,
  detail: string | undefined
) {
  const options = {
    type: type as 'none' | 'info' | 'error' | 'question' | 'warning' | undefined,
    buttons: buttons,
    defaultId: defaultId,
    title: title,
    message: message,
    detail: detail
  }

  const response = dialog.showMessageBox(options)
  console.log(response)
}

ipcMain.handle('dialog:openDirectory', async () => {
  const window = BrowserWindow.getFocusedWindow()

  if (!window) {
    return
  }

  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    properties: ['openDirectory']
  })
  if (canceled) {
    return
  } else {
    return filePaths[0]
  }
})

ipcMain.handle('dialog:defaultDirectory', async () => {
  const path = app.getPath('documents')

  return path
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Open New Window
ipcMain.handle(
  'window:openNewWindow',
  async (
    events,
    opt: {
      title: string
      url: string
      width: number
      height: number
      backgroundColor: string
    }
  ) => {
    const mainWindow = new BrowserWindow({
      title: opt.title,
      icon: __dirname + '/icon/favicon.ico',
      width: opt.width,
      height: opt.height,
      backgroundColor: opt.backgroundColor,
      webPreferences: {
        devTools: true,
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#111111',
        symbolColor: '#ffffff',
        height: 40
      },
      resizable: false
    })

    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.show();
    });

    mainWindow.loadURL(opt.url)
  }
)
