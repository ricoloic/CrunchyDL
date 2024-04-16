// This is the preload script for Electron.
// It runs in the renderer process before the page is loaded.
// --------------------------------------------

// import { contextBridge } from 'electron'

// process.once('loaded', () => {
//   - Exposed variables will be accessible at "window.versions".
//   contextBridge.exposeInMainWorld('versions', process.env)
// })

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
})
