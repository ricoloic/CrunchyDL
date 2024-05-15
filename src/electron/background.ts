import * as path from 'path'
import * as os from 'os'
import { app, BrowserWindow, dialog, ipcMain, session } from 'electron'
import singleInstance from './singleInstance'
import dynamicRenderer from './dynamicRenderer'
import titleBarActionsModule from './modules/titleBarActions'
import updaterModule from './modules/updater'
import macMenuModule from './modules/macMenu'
import startAPI from '../api/api'
import settings from 'electron-settings'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
const isProduction = process.env.NODE_ENV !== 'development'
const platform: 'darwin' | 'win32' | 'linux' = process.platform as any
const architucture: '64' | '32' = os.arch() === 'x64' ? '64' : '32'
const modules = [titleBarActionsModule, macMenuModule, updaterModule]
var mainWindow: BrowserWindow

function createWindow() {
    console.log('System info', { isProduction, platform, architucture })
    mainWindow = new BrowserWindow({
        title: 'Crunchyroll Downloader',
        icon: __dirname + '/icon/favicon.ico',
        width: 950,
        height: 700,
        // Linux:
        // backgroundColor: '#2222222',
        webPreferences: {
            devTools: true,
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: 'rgba(0,0,0,0)',
            symbolColor: '#ffffff',
            height: 40
        },
        resizable: false,
        fullscreen: false,
        maximizable: false,
        vibrancy: 'fullscreen-ui',
        // Not working when unfocusing the window somehow?
        backgroundMaterial: 'acrylic',
        show: false,
        // For Linux
        autoHideMenuBar: true
    })

    // Show window after loading page
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    // Closes all windows if mainwindow is being closed
    mainWindow.on('closed', () => {
        app.quit()
    })

    // Lock app to single instance
    if (singleInstance(app, mainWindow)) return

    // Open the DevTools.
    !isProduction &&
        mainWindow.webContents.openDevTools({
            mode: 'bottom'
        })

    return mainWindow
}

// App events
// ==========
app.whenReady().then(async () => {
    startAPI()

    const mainWindow = createWindow()
    if (!mainWindow) return

    // Load renderer process
    await dynamicRenderer(mainWindow)

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
        return await settings.get('downloadPath')
    } else {
        await settings.set('downloadPath', filePaths[0])
        return filePaths[0]
    }
})

ipcMain.handle('dialog:openFile', async (events, type: string) => {
    if (!type) return

    const window = BrowserWindow.getFocusedWindow()

    if (!window) {
        return
    }

    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        properties: ['openFile']
    })
    if (canceled) {
        return await settings.get(type)
    } else {
        await settings.set(type, filePaths[0])
        return filePaths[0]
    }
})

ipcMain.handle('dialog:defaultDirectory', async () => {
    const savedPath = await settings.get('downloadPath')

    if (!savedPath) {
        const path = app.getPath('documents')

        await settings.set('downloadPath', path)

        return path
    }

    return savedPath
})

ipcMain.handle('dialog:defaultFile', async (events, type: string) => {

    if (!type) return

    const savedPath = await settings.get(type)

    if (!savedPath) {
        return ''
    }

    return savedPath
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

const openWindows = new Map()

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
        }
    ) => {
        if (openWindows.has(opt.title)) {
            const existingWindow = openWindows.get(opt.title)
            existingWindow.focus()
            return
        }

        const newWindow = new BrowserWindow({
            title: opt.title,
            icon: __dirname + '/icon/favicon.ico',
            width: opt.width,
            height: opt.height,
            // Linux:
            // backgroundColor: '#2222222',
            webPreferences: {
                devTools: true,
                nodeIntegration: true,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            titleBarStyle: 'hidden',
            titleBarOverlay: {
                color: 'rgba(0,0,0,0)',
                symbolColor: '#ffffff',
                height: 40
            },
            resizable: false,
            fullscreen: false,
            maximizable: false,
            vibrancy: 'fullscreen-ui',
            backgroundMaterial: 'acrylic',
            show: false,
            // For Linux
            autoHideMenuBar: true
        })

        newWindow.once('ready-to-show', () => {
            newWindow.show()
        })

        newWindow.loadURL(opt.url)

        openWindows.set(opt.title, newWindow)

        newWindow.on('closed', () => {
            openWindows.delete(opt.title)
        })
    }
)
