import { BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

var status: { status: string; info: any } = { status: '', info: null }

autoUpdater.logger = log
;(autoUpdater.logger as typeof log).transports.file.level = 'info'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

ipcMain.handle('updater:getUpdateStatus', async () => {
    return status
})

export default (mainWindow: BrowserWindow) => {
    let readyToInstall = false
    function updateStatus(statusA: string, info?: any) {
        status = { status: statusA, info: info }
    }

    autoUpdater.on('checking-for-update', () => {
        updateStatus('check-for-update')
    })
    autoUpdater.on('update-available', (_info) => {
        updateStatus('update-available', _info)
    })
    autoUpdater.on('update-not-available', (_info) => {
        updateStatus('update-not-available', _info)
    })
    autoUpdater.on('error', (_err) => {
        updateStatus('update-error', _err)
    })
    autoUpdater.on('download-progress', (progress) => {
        updateStatus('downloading', progress)
    })
    autoUpdater.on('update-downloaded', (_info) => {
        updateStatus('update-downloaded', _info)
        mainWindow.webContents.send('updater:readyToInstall')
        readyToInstall = true
    })

    ipcMain.handle('updater:check', async (_event) => {
        return await autoUpdater.checkForUpdates()
    })

    ipcMain.handle('updater:download', async (_event) => {
        return await autoUpdater.downloadUpdate()
    })

    ipcMain.handle('updater:quitAndInstall', (_event) => {
        if (!readyToInstall) return
        autoUpdater.quitAndInstall()
    })

    autoUpdater.checkForUpdates()

    setInterval(() => {
        autoUpdater.checkForUpdates()
    }, 1000 * 60 * 60 * 2)

    console.log('[-] MODULE::updater Initialized')
}
