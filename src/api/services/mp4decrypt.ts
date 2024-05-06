import { app } from 'electron'
import path from 'path'
const isDev = process.env.NODE_ENV === 'development'
const appPath = app.getAppPath()
const resourcesPath = path.dirname(appPath)
const decryptPath = path.join(resourcesPath, 'mp4decrypt')
if (isDev) {
    require('dotenv').config()
}

export function getMP4DecryptPath() {
    if (isDev) {
        const mp4Decrypt = process.env.MP4DECRYPT_PATH

        return mp4Decrypt
    } else {
        // Linux: const mp4Decrypt = path.join(decryptPath, 'mp4decrypt').replace(/\s/g, '\\ ')
        const mp4Decrypt = path.join(decryptPath, 'mp4decrypt.exe')

        return mp4Decrypt
    }
}
