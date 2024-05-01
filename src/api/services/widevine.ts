import { app } from 'electron'
import path from 'path'
const isDev = process.env.NODE_ENV === 'development'
const appPath = app.getAppPath()
const resourcesPath = path.dirname(appPath)
const keysPath = path.join(resourcesPath, 'keys')
if (isDev) {
    require('dotenv').config()
}

export function getWVKPath() {
    if (isDev) {
        const clientid = process.env.WV_DID
        const key = process.env.WV_PRV

        return { client: clientid, key: key }
    } else {
        const clientid = path.join(keysPath, 'device_client_id_blob')
        const key = path.join(keysPath, 'device_private_key')

        return { client: clientid, key: key }
    }
}
