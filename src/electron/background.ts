import * as path from 'path'
import * as os from 'os'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import settings from 'electron-settings'
import contextMenu from 'electron-context-menu'
import startAPI from '../api/api'
import singleInstance from './singleInstance'
import dynamicRenderer from './dynamicRenderer'
import titleBarActionsModule from './modules/titleBarActions'
import updaterModule from './modules/updater'
import macMenuModule from './modules/macMenu'

settings.configure({
    dir: app.getPath('documents') + '/Crunchyroll Downloader/settings/'
})

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
const isProduction = process.env.NODE_ENV !== 'development'
const platform: 'darwin' | 'win32' | 'linux' = process.platform as any
const architucture: '64' | '32' = os.arch() === 'x64' ? '64' : '32'
const modules = [titleBarActionsModule, macMenuModule, updaterModule]
let mainWindow: BrowserWindow

settings.configure({
    dir: app.getPath('documents') + '/Crunchyroll Downloader/settings/'
})

function createWindow() {
    console.log('System info', { isProduction, platform, architucture })

    mainWindow = new BrowserWindow({
        title: 'Crunchyroll Downloader',
        icon: __dirname + '/icon/favicon.ico',
        width: 950,
        height: 700,
        backgroundColor: '#222222',
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
        // backgroundMaterial: 'acrylic',
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

ipcMain.handle('dialog:openFolder', async (events, dir: string) => {
    shell.showItemInFolder(dir)
})

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

ipcMain.handle('dialog:getDirectoryTEMP', async () => {
    const savedPath = await settings.get('tempPath')

    if (!savedPath) {
        const path = app.getPath('temp')

        await settings.set('tempPath', path)

        return path
    }

    return savedPath
})

ipcMain.handle('dialog:openDirectoryTEMP', async () => {
    const window = BrowserWindow.getFocusedWindow()

    if (!window) {
        return
    }

    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        properties: ['openDirectory']
    })
    if (canceled) {
        return await settings.get('tempPath')
    } else {
        await settings.set('tempPath', filePaths[0])
        return filePaths[0]
    }
})

ipcMain.handle('dialog:selectEndpoint', async (events, nr: number) => {
    await settings.set('CREndpoint', nr)

    return nr
})

ipcMain.handle('dialog:getEndpoint', async (events, nr: number) => {
    const endpointNr = await settings.get('CREndpoint')

    if (!endpointNr) {
        await settings.set('CREndpoint', 1)

        return 1
    }

    return endpointNr
})

ipcMain.handle('dialog:defaultFile', async (events, type: string) => {
    if (!type) return

    const savedPath = await settings.get(type)

    if (!savedPath) {
        return ''
    }

    return savedPath
})

ipcMain.handle('dialog:defaultArray', async (events, type: string) => {
    if (!type) return

    const savedPath = await settings.get(type)

    if (!savedPath) {
        return []
    }

    return savedPath
})

ipcMain.handle('dialog:defaultArraySetSub', async (events, va: Array<any>) => {
    await settings.set('defsubarray', va)

    return va
})

ipcMain.handle('dialog:defaultArraySetDub', async (events, va: Array<any>) => {
    await settings.set('defdubarray', va)

    return va
})

ipcMain.handle('dialog:proxyActive', async (events) => {
    const savedStat = await settings.get('proxyActive')

    if (!savedStat) {
        await settings.set('proxyActive', false)
        return false
    }

    return savedStat
})

ipcMain.handle('dialog:proxyActiveSet', async (events, status: boolean) => {
    await settings.set('proxyActive', status)

    return status
})

ipcMain.handle('dialog:getSeasonEnabledTemplate', async (events) => {
    const savedStat = await settings.get('seasonFolderActive')

    if (savedStat === undefined || savedStat === null) {
        await settings.set('seasonFolderActive', true)
        return true
    }

    return savedStat
})

ipcMain.handle('dialog:setSeasonEnabledTemplate', async (events, active: boolean) => {
    await settings.set('seasonFolderActive', active)

    return active
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

ipcMain.handle('dialog:setEpisodeTemplate', async (events, name: string) => {
    await settings.set('EpisodeTemp', name)

    return name
})

ipcMain.handle('dialog:getEpisodeTemplate', async (events) => {
    const epTP = await settings.get('EpisodeTemp')

    if (!epTP) {
        await settings.set('EpisodeTemp', '{seriesName} Season {seasonNumber} Episode {episodeNumber}')

        return '{seriesName} Season {seasonNumber} Episode {episodeNumber}'
    }

    return epTP
})

ipcMain.handle('dialog:setSeasonTemplate', async (events, name: string) => {
    await settings.set('SeasonTemp', name)

    return name
})

ipcMain.handle('dialog:getSeasonTemplate', async (events) => {
    const seTP = await settings.get('SeasonTemp')

    if (!seTP) {
        await settings.set('SeasonTemp', '{seriesName} Season {seasonNumber}')

        return '{seriesName} Season {seasonNumber}'
    }

    return seTP
})

ipcMain.handle('dialog:setDefaultCrunchyrollLanguageTemplate', async (events, lang: string) => {
    await settings.set('CrunchyrollDefaultLanguage', lang)

    return lang
})

ipcMain.handle('dialog:getDefaultCrunchyrollLanguageTemplate', async (events) => {
    const seTP = await settings.get('CrunchyrollDefaultLanguage')

    if (!seTP) {
        await settings.set('CrunchyrollDefaultLanguage', 'en-US')

        return 'en-US'
    }

    return seTP
})

ipcMain.handle('dialog:setDefaultVideoQualityTemplate', async (events, quality: number) => {
    await settings.set('CrunchyrollDefaultVideoQuality', quality)

    return quality
})

ipcMain.handle('dialog:getDefaultVideoQualityTemplate', async (events) => {
    const seTP = await settings.get('CrunchyrollDefaultVideoQuality')

    if (!seTP) {
        await settings.set('CrunchyrollDefaultVideoQuality', 1080)

        return 1080
    }

    return seTP
})

ipcMain.handle('dialog:setDefaultAudioQualityTemplate', async (events, quality: number) => {
    await settings.set('CrunchyrollDefaultAudioQuality', quality)

    return quality
})

ipcMain.handle('dialog:getDefaultAudioQualityTemplate', async (events) => {
    const seTP = await settings.get('CrunchyrollDefaultAudioQuality')

    if (!seTP) {
        await settings.set('CrunchyrollDefaultAudioQuality', 1)

        return 1
    }

    return seTP
})

ipcMain.handle('dialog:setDefaultOutputFormatTemplate', async (events, format: string) => {
    await settings.set('DefaultOutputFormat', format)

    return format
})

ipcMain.handle('dialog:getDefaultOutputFormatTemplate', async (events) => {
    const seTP = await settings.get('DefaultOutputFormat')

    if (!seTP) {
        await settings.set('DefaultOutputFormat', 'mkv')

        return 'mkv'
    }

    return seTP
})

ipcMain.handle('dialog:setDefaultMaxDownloadsTemplate', async (events, max: number) => {
    await settings.set('DefaultMaxDownloads', max)

    return max
})

ipcMain.handle('dialog:getDefaultMaxDownloadsTemplate', async (events) => {
    const seTP = await settings.get('DefaultMaxDownloads')

    if (!seTP) {
        await settings.set('DefaultMaxDownloads', 3)

        return 3
    }

    return seTP
})

ipcMain.handle('dialog:getSubtitleResamplerTemplate', async (events) => {
    const savedStat = await settings.get('subtitleResamplerActive')

    if (savedStat === undefined || savedStat === null) {
        await settings.set('subtitleResamplerActive', true)
        return true
    }

    return savedStat
})

ipcMain.handle('dialog:setSubtitleResamplerTemplate', async (events, active: boolean) => {
    await settings.set('subtitleResamplerActive', active)

    return active
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

        contextMenu({
            showInspectElement: false
        })

        const newWindow = new BrowserWindow({
            title: opt.title,
            icon: __dirname + '/icon/favicon.ico',
            width: opt.width,
            height: opt.height,
            backgroundColor: '#222222',
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
            // backgroundMaterial: 'acrylic',
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
