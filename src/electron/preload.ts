import {contextBridge, ipcRenderer} from 'electron'

contextBridge.exposeInMainWorld('myAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  getFolder: () => ipcRenderer.invoke('dialog:defaultDirectory'),
  openWindow: (opt: {
    title: string,
    url: string,
    width: number,
    height: number,
    backgroundColor: string
  }) => ipcRenderer.invoke('window:openNewWindow', opt),
  getUpdateStatus: () => ipcRenderer.invoke('updater:getUpdateStatus'),
  startUpdateDownload: () => ipcRenderer.invoke('updater:download'),
  startUpdateInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
})
