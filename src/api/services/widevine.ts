import { app } from 'electron'
import settings from 'electron-settings'
import { server } from '../api'
import { MessageBoxBuilder } from '../../electron/utils/messageBox'

settings.configure({
    dir: app.getPath('documents') + '/Crunchyroll Downloader/settings/'
})

export async function getWVKPath() {
    const drmL3blob = (await settings.get('l3blob')) as string
    const drmL3key = (await settings.get('l3key')) as string

    if (!drmL3blob || !drmL3key) {
        MessageBoxBuilder.new('error')
            .button('Cancel', true)
            .detail("Video/Audio with DRM detected, tried to decrypt but didn't found any decryption keys. Please add them in settings -> widevine. Aborting Download")
            .build('No decryption keys found', 'No decryption keys found')
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
