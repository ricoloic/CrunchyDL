import { app } from 'electron'
import path from 'path'
const isDev = process.env.NODE_ENV === 'development'
const appPath = app.getAppPath()
const resourcesPath = path.dirname(appPath)
const shakaFolderPath = path.join(resourcesPath, 'shaka')
if (isDev) {
    require('dotenv').config()
}

export function getShakaPath() {
    const shaka = "/usr/local/bin/packager"

    return shaka;
}
