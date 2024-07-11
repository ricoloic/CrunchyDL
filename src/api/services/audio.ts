import fs from 'fs'
import { Readable } from 'stream'
import util from 'util'
import { finished } from 'stream/promises'
import Ffmpeg from 'fluent-ffmpeg'
import { server } from '../api'
import { MessageBoxBuilder } from '../../electron/utils/messageBox'
import { checkFileExistence, createFolder, deleteFolder } from './folder'
import { concatenateTSFiles } from './concatenate'
import { getFFMPEGPath } from './ffmpeg'
import { getShakaPath } from './shaka'
const ffmpegP = getFFMPEGPath()
const shaka = getShakaPath()
const execFile = util.promisify(require('child_process').execFile)

// Define Downloading Array
const downloading: Array<{
    id: number
    status: string
    audio: string
}> = []

export async function getDownloadingAudio(id: number) {
    const found = downloading.filter((i) => i.id === id)

    if (found) return found

    return null
}

export async function downloadMPDAudio(
    parts: { filename: string; url: string }[],
    dir: string,
    name: string,
    downloadID: number,
    drmkeys?: { kid: string; key: string }[] | undefined
) {
    const downloadedParts: { filename: string; url: string }[] = []

    const path = await createFolder()

    downloading.push({
        id: downloadID,
        status: `downloading`,
        audio: name
    })

    const dn = downloading.find((i) => i.id === downloadID && i.audio === name)

    async function downloadPart(part: { filename: string; url: string }, ind: number) {
        try {
            let stream

            console.log(`[${name} DOWNLOAD] Fetching Part ${ind + 1}`)

            const rawres = await fetch(part.url)

            const response = rawres.clone()

            if (!response.ok) {
                throw new Error(await response.text())
            }

            console.log(`[${name} DOWNLOAD] Writing Part ${ind + 1}`)

            stream = fs.createWriteStream(`${path}/${part.filename}`)

            const readableStream = Readable.from(response.body as any)

            await finished(readableStream.pipe(stream))

            console.log(`[${name} DOWNLOAD] Part ${ind + 1} downloaded`)

            downloadedParts.push(part)
        } catch (error) {
            console.error(`Error occurred during download of fragment ${ind + 1}:`, error)
            server.logger.log({
                level: 'error',
                message: `Error occurred during download of fragment ${ind + 1}`,
                error,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessAudioDownload'
            })
            console.log(`Retrying download of fragment ${ind + 1}...`)
            server.logger.log({
                level: 'warn',
                message: `Retrying download of fragment ${ind + 1} because failed`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessAudioDownload'
            })
            await downloadPart(part, ind)
        }
    }

    for (const [index, part] of parts.entries()) {
        await downloadPart(part, index)
    }

    if (parts[6] !== downloadedParts[6] && dn) {
        dn.status = 'failed'
        MessageBoxBuilder.new('error').button('Cancel', true).detail(`Validation returned downloaded parts are invalid`).build('Audio Download failed', 'Audio Download failed')
        server.logger.log({
            level: 'error',
            message: 'Audio Download failed',
            error: 'Validation returned downloaded parts are invalid',
            parts,
            partsdownloaded: downloadedParts,
            timestamp: new Date().toISOString(),
            section: 'AudioCrunchyrollValidation'
        })
        return
    }

    console.log(`[${name} DOWNLOAD] Parts validated`)

    return await mergePartsAudio(parts, path, dir, name, downloadID, drmkeys)
}

async function mergePartsAudio(
    parts: { filename: string; url: string }[],
    tmp: string,
    dir: string,
    name: string,
    downloadID: number,
    drmkeys?: { kid: string; key: string }[] | undefined
) {
    const dn = downloading.find((i) => i.id === downloadID && i.audio === name)

    if (dn) {
        dn.status = 'merging'
    }

    try {
        const list: Array<string> = []

        for (const [index, part] of parts.entries()) {
            list.push(`${tmp}/${part.filename}`)
        }

        let concatenatedFile: string

        if (drmkeys) {
            concatenatedFile = `${tmp}/temp-main.m4s`
        } else {
            concatenatedFile = `${tmp}/main.m4s`
        }

        await concatenateTSFiles(list, concatenatedFile)

        if (drmkeys) {
            const found = await checkFileExistence(`${tmp}/temp-main.m4s`)

            if (!found) {
                server.logger.log({
                    level: 'error',
                    message: `Temp Audiofile not found ${name}`,
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessAudioMerging'
                })
            }

            if (dn) {
                dn.status = 'decrypting'
            }

            console.log(`Audio Decryption started`)

            await execFile(shaka, [
                `input=${tmp}/temp-main.m4s,stream=audio,output=${tmp}/main.m4s`,
                '--enable_raw_key_decryption',
                '--keys',
                `key_id=${drmkeys[1].kid}:key=${drmkeys[1].key}`
            ])

            concatenatedFile = `${tmp}/main.m4s`
            console.log(`Audio Decryption finished`)
        }

        const found = await checkFileExistence(`${tmp}/main.m4s`)

        if (!found) {
            server.logger.log({
                level: 'error',
                message: `Audiofile not found ${name}`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessAudioMerging'
            })
        }

        return new Promise((resolve, reject) => {
            if (!ffmpegP.ffmpeg || !ffmpegP.ffprobe) return
            Ffmpeg()
                .setFfmpegPath(ffmpegP.ffmpeg)
                .setFfprobePath(ffmpegP.ffprobe)
                .input(concatenatedFile)
                .outputOptions('-c copy')
                .save(`${dir}/${name}.aac`)
                .on('error', (error) => {
                    console.log(error)
                    server.logger.log({
                        level: 'error',
                        message: `Error merging audio fragments of Download ${downloadID} Audio ${name}`,
                        error,
                        timestamp: new Date().toISOString(),
                        section: 'crunchyrollDownloadProcessAudioMergingFFMPEG'
                    })
                    reject(error)
                })
                .on('end', async () => {
                    console.log('Merging finished')
                    await deleteFolder(tmp)

                    if (dn) {
                        dn.status = 'finished'
                    }

                    return resolve(`${dir}/${name}.aac`)
                })
        })
    } catch (error) {
        console.error('Error merging parts:', error)
        if (dn) {
            dn.status = 'failed'
        }
        server.logger.log({
            level: 'error',
            message: 'Error while merging Audio',
            error,
            timestamp: new Date().toISOString(),
            section: 'audioCrunchyrollMerging'
        })
    }
}
