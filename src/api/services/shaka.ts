import path from 'path'
import { app } from 'electron'
const isDev = process.env.NODE_ENV === 'development'
const appPath = app.getAppPath()
const resourcesPath = path.dirname(appPath)
const shakaFolderPath = path.join(resourcesPath, 'shaka')
if (isDev) {
    require('dotenv').config()
}

export function getShakaPath() {
    return '/opt/manual/shaka/packager-osx-arm64'
    // if (isDev) {
    //     const shaka = process.env.SHAKA_PATH
    //
    //     return shaka
    // } else {
    //     const shaka = path.join(shakaFolderPath, 'shaka.exe')
    //
    //     return shaka
    // }
}
