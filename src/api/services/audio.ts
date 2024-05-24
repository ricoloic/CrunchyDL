import fs from 'fs'
import { Readable } from 'stream'
import { createFolder, deleteFolder } from './folder'
import { concatenateTSFiles } from './concatenate'
import Ffmpeg from 'fluent-ffmpeg'
import { getFFMPEGPath } from './ffmpeg'
import { getMP4DecryptPath } from '../services/mp4decrypt'
const ffmpegP = getFFMPEGPath()
const mp4e = getMP4DecryptPath()
import util from 'util'
import { server } from '../api'
const exec = util.promisify(require('child_process').exec)
import { finished } from 'stream/promises'

// Define Downloading Array
var downloading: Array<{
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
    const path = await createFolder()

    downloading.push({
        id: downloadID,
        status: `downloading`,
        audio: name
    })

    for (const [index, part] of parts.entries()) {
        let success = false
        while (!success) {
            try {
                var stream

                stream = fs.createWriteStream(`${path}/${part.filename}`)

                const { body } = await fetch(part.url)

                const readableStream = Readable.from(body as any)

                await finished(readableStream.pipe(stream))

                console.log(`Fragment ${index + 1} downloaded`)

                success = true
            } catch (error) {
                console.error(`Error occurred during download of fragment ${index + 1}:`, error)
                server.logger.log({
                    level: 'error',
                    message: `Error occurred during download of fragment ${index + 1}`,
                    error: error,
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessAudioDownload'
                })
                console.log(`Retrying download of fragment ${index + 1}...`)
                server.logger.log({
                    level: 'warn',
                    message: `Retrying download of fragment ${index + 1} because failed`,
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessAudioDownload'
                })
                await new Promise((resolve) => setTimeout(resolve, 5000))
            }
        }
    }

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

        var concatenatedFile: string

        if (drmkeys) {
            concatenatedFile = `${tmp}/temp-main.m4s`
        } else {
            concatenatedFile = `${tmp}/main.m4s`
        }

        await concatenateTSFiles(list, concatenatedFile)

        if (drmkeys) {
            if (dn) {
                dn.status = 'decrypting'
            }
            console.log(`Audio Decryption started`)
            const inputFilePath = `${tmp}/temp-main.m4s`
            const outputFilePath = `${tmp}/main.m4s`
            const keyArgument = `--show-progress --key ${drmkeys[1].kid}:${drmkeys[1].key}`

            const command = `${mp4e} ${keyArgument} "${inputFilePath}" "${outputFilePath}"`

            await exec(command)
            concatenatedFile = `${tmp}/main.m4s`
            console.log(`Audio Decryption finished`)
        }

        return new Promise((resolve, reject) => {
            if (!ffmpegP.ffmpeg || !ffmpegP.ffprobe) return
            Ffmpeg()
                .setFfmpegPath(ffmpegP.ffmpeg)
                .setFfprobePath(ffmpegP.ffprobe)
                .input(concatenatedFile)
                .outputOptions('-c copy')
                .save(`${dir}/${name}.aac`)
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
            error: error,
            timestamp: new Date().toISOString(),
            section: 'audioCrunchyrollMerging'
        })
    }
}
