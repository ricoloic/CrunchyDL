import { app } from 'electron'
import settings from 'electron-settings'
import path from 'path'
import { messageBox } from '../../electron/background'
import { server } from '../api'

settings.configure({
    dir: app.getPath('documents') + '/Crunchyroll Downloader/settings/'
})

export async function getWVKPath() {
    const drmL3blob = (await settings.get('l3blob')) as string
    const drmL3key = (await settings.get('l3key')) as string

    if (!drmL3blob || !drmL3key) {
        messageBox(
            'error',
            ['Cancel'],
            2,
            'No decryption keys found',
            'No decryption keys found',
            "Video/Audio with DRM detected, tried to decrypt but didn't found any decryption keys. Please add them in settings -> widevine. Aborting Download"
        )
        server.logger.log({
            level: 'error',
            message: 'No L3 Keys found',
            error: 'No L3 Keys found',
            timestamp: new Date().toISOString(),
            section: 'CrunchyrollDecryptionProcess'
        })
        return
    }

    return { key: drmL3key, client: drmL3blob }
}
