import { app } from 'electron'
import path from 'path'
const isDev = process.env.NODE_ENV === 'development'
const appPath = app.getAppPath()
const resourcesPath = path.dirname(appPath)
const keyPath = path.join(resourcesPath, 'keys')
if (isDev) {
    require('dotenv').config()
}

export function getWVKPath() {
    if (isDev) {
        const key = process.env.KEY_KEY
        const client = process.env.KEY_CLIENT

        return { key: key, client: client }
    } else {
        const key = path.join(keyPath, 'key')
        const client = path.join(keyPath, 'client')

        return { key: key, client: client }
    }
}