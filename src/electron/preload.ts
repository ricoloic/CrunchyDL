import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('myAPI', {
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
    selectFile: (type: string) => ipcRenderer.invoke('dialog:openFile', type),
    selectEndpoint: (nr: number) => ipcRenderer.invoke('dialog:selectEndpoint', nr),
    getEndpoint: () => ipcRenderer.invoke('dialog:getEndpoint'),
    getFolder: () => ipcRenderer.invoke('dialog:defaultDirectory'),
    getFile: (type: string) => ipcRenderer.invoke('dialog:defaultFile', type),
    openWindow: (opt: { title: string; url: string; width: number; height: number; backgroundColor: string }) => ipcRenderer.invoke('window:openNewWindow', opt),
    getUpdateStatus: () => ipcRenderer.invoke('updater:getUpdateStatus'),
    startUpdateDownload: () => ipcRenderer.invoke('updater:download'),
    startUpdateInstall: () => ipcRenderer.invoke('updater:quitAndInstall')
})
