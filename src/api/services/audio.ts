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

    const maxParallelDownloads = 5
    const downloadPromises = []

    for (const [index, part] of parts.entries()) {
        let retries = 0

        const downloadPromise = async () => {
            let downloadSuccess = false
            while (!downloadSuccess) {
                try {
                    const stream = fs.createWriteStream(`${path}/${part.filename}`)
                    await fetchAndPipe(part.url, stream, index + 1, downloadID, name)
                    downloadSuccess = true
                } catch (error) {
                    retries++
                    console.error(`Failed to download part ${part.filename}, retrying (${retries})...`)
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                }
            }
        }

        downloadPromises.push(downloadPromise())

        if (downloadPromises.length === maxParallelDownloads || index === parts.length - 1) {
            await Promise.all(downloadPromises)
            downloadPromises.length = 0
        }
    }

    return await mergePartsAudio(parts, path, dir, name, downloadID, drmkeys)
}

async function fetchAndPipe(url: string, stream: fs.WriteStream, index: number, downloadID: number, name: string) {
    try {
        const dn = downloading.find((i) => i.id === downloadID && i.audio === name)

        const response = await fetch(url)

        if (!response.ok) {
            if (dn) {
                dn.status = 'failed'
            }
            server.logger.log({
                level: 'error',
                message: 'Error while downloading an Audio Fragment',
                fragment: index,
                error: await response.text(),
                timestamp: new Date().toISOString(),
                section: 'audiofragmentCrunchyrollFetch'
            })
            throw new Error(`Failed to fetch URL: ${response.statusText}`)
        }

        const body = response.body

        if (!body) {
            if (dn) {
                dn.status = 'failed'
            }
            server.logger.log({
                level: 'error',
                message: 'Error while downloading an Audio Fragment',
                fragment: index,
                error: 'Response body is not a readable stream',
                timestamp: new Date().toISOString(),
                section: 'audiofragmentCrunchyrollFetch'
            })
            throw new Error('Response body is not a readable stream')
        }

        const readableStream = Readable.from(body as any)

        return new Promise<void>((resolve, reject) => {
            readableStream
                .pipe(stream)
                .on('finish', () => {
                    console.log(`Fragment ${index} downloaded`)
                    resolve()
                })
                .on('error', (error) => {
                    if (dn) {
                        dn.status = 'failed'
                    }
                    server.logger.log({
                        level: 'error',
                        message: 'Error while downloading an Audio Fragment',
                        fragment: index,
                        error: error,
                        timestamp: new Date().toISOString(),
                        section: 'audiofragmentCrunchyrollFetch'
                    })
                    reject(error)
                })
        })
    } catch (error) {
        server.logger.log({
            level: 'error',
            message: 'Error while downloading an Audio Fragment, retrying',
            fragment: index,
            error: error,
            timestamp: new Date().toISOString(),
            section: 'audiofragmentCrunchyrollFetch'
        })
        console.error(`Retrying fragment ${index} due to error:`, error)
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
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
    }
}
