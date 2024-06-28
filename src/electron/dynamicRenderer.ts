import * as path from 'path'
import { BrowserWindow } from 'electron'
import express, { static as serveStatic } from 'express'

const isProduction = process.env.NODE_ENV !== 'development'

export default async function (mainWindow: BrowserWindow) {
    if (!isProduction) return mainWindow.loadURL('http://localhost:3000/')
    const app = express()
    app.use('/', serveStatic(path.join(__dirname, '../../public')))
    const listener = app.listen(8079, 'localhost', () => {
        const port = (listener.address() as any).port
        mainWindow.loadURL(`http://localhost:${port}`)
    })
}
