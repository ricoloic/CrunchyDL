import { app, BrowserWindow, Menu } from 'electron'

// Helpers
// =======
const template: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[] = []

// Module
// ======
export default (mainWindow: BrowserWindow) => {
    const isDevelopment = process.env.NODE_ENV === 'development'
    if (process.platform === 'darwin') {
        // OS X
        const name = 'Crunchyroll Downloader'
        template.unshift({
            label: name,
            submenu: [
                {
                    label: 'Quit',
                    accelerator: 'Command+Q',
                    click() {
                        app.quit()
                    }
                },
                ...(isDevelopment
                    ? [
                          {
                              label: 'Toggle Developer Tools',
                              accelerator: 'Alt+Command+I',
                              click() {
                                  // Open the DevTools.
                                  if (mainWindow) {
                                      mainWindow.webContents.toggleDevTools()
                                  }
                              }
                          }
                      ]
                    : [])
            ]
        })

        const menu = Menu.buildFromTemplate(template)
        Menu.setApplicationMenu(menu)

        console.log('[-] MODULE::macMenu Initialized')
    }
}
