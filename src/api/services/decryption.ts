import { readFileSync } from 'fs'
import { Session } from '../modules/license'
import { server } from '../api'
import { MessageBoxBuilder } from '../../electron/utils/messageBox'
import { getWVKPath } from './widevine'

export async function getDRMKeys(pssh: string, assetID: string, userID: string) {
    const auth = await getWVKey(assetID, userID)

    if (!auth) {
        server.logger.log({
            level: 'error',
            message: 'WVKey missing, aborting',
            timestamp: new Date().toISOString(),
            section: 'drmAuthCrunchyrollStatus'
        })
        return
    }

    const depssh = Buffer.from(pssh, 'base64')

    const keys = await getWVKPath()

    if (!keys) return

    if (!keys.key) return

    if (!keys.client) return

    try {
        const privateKey = readFileSync(keys.key)
        const identifierBlob = readFileSync(keys.client)

        const session = new Session({ privateKey, identifierBlob }, depssh)

        const response = await fetch('https://lic.drmtoday.com/license-proxy-widevine/cenc/', {
            method: 'POST',
            body: session.createLicenseRequest(),
            headers: {
                'dt-custom-data': auth.custom_data,
                'x-dt-auth-token': auth.token
            }
        })

        if (response.ok) {
            const json = JSON.parse(await response.text())
            return session.parseLicense(Buffer.from(json.license, 'base64')) as { kid: string; key: string }[]
        } else {
            throw new Error(await response.text())
        }
    } catch (e) {
        MessageBoxBuilder.new('error')
            .button('Cancel', true)
            .detail(String(e))
            .build('Error while getting video/audio decryption keys', 'Error while getting video/audio decryption keys')
        server.logger.log({
            level: 'error',
            message: 'Error while getting video/audio decryption keys',
            error: String(e),
            timestamp: new Date().toISOString(),
            section: 'drmVideoAudioKeyCrunchyrollFetch'
        })
    }
}

export async function getWVKey(assetID: string, userID: string) {
    const body = {
        accounting_id: 'crunchyroll',
        asset_id: assetID,
        session_id: new Date().getUTCMilliseconds().toString().padStart(3, '0') + process.hrtime.bigint().toString().slice(0, 13),
        user_id: userID
    }

    try {
        const response = await fetch(`https://beta-api.crunchyroll.com/drm/v1/auth`, {
            method: 'POST',
            body: JSON.stringify(body)
        })

        if (response.ok) {
            const data: {
                custom_data: string
                token: string
            } = JSON.parse(await response.text())

            return data
        } else {
            throw new Error(await response.text())
        }
    } catch (e) {
        MessageBoxBuilder.new('error').button('Cancel', true).detail(String(e)).build('Failed to Fetch Decryption token', 'Failed to Fetch Decryption token')
        server.logger.log({
            level: 'error',
            message: 'Failed to Fetch Decryption token',
            error: String(e),
            timestamp: new Date().toISOString(),
            section: 'drmAuthCrunchyrollFetch'
        })
    }
}

export function Uint8ArrayToBase64(pssh: Uint8Array) {
    const u8 = new Uint8Array(pssh)
    return btoa(String.fromCharCode.apply(null, u8 as any))
}
