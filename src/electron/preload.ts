import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('myAPI', {
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
    selectFile: (type: string) => ipcRenderer.invoke('dialog:openFile', type),
    getFolder: () => ipcRenderer.invoke('dialog:defaultDirectory'),
    getFile: (type: string) => ipcRenderer.invoke('dialog:defaultFile', type),
    openWindow: (opt: { title: string; url: string; width: number; height: number; backgroundColor: string }) => ipcRenderer.invoke('window:openNewWindow', opt),
    getUpdateStatus: () => ipcRenderer.invoke('updater:getUpdateStatus'),
    startUpdateDownload: () => ipcRenderer.invoke('updater:download'),
    startUpdateInstall: () => ipcRenderer.invoke('updater:quitAndInstall')
})
