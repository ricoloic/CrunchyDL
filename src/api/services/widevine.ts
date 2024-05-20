import { app } from 'electron'
import settings from 'electron-settings'
import path from 'path'

export async function getWVKPath() {
    const drmL3blob = (await settings.get('l3blob')) as string
    const drmL3key = (await settings.get('l3key')) as string

    if (!drmL3blob || !drmL3key) {
        return
    }

    return { key: drmL3key, client: drmL3blob }
}
