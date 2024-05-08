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
const exec = util.promisify(require('child_process').exec)

export async function downloadMPDAudio(parts: { filename: string; url: string }[], dir: string, name: string, drmkeys?: { kid: string; key: string }[] | undefined) {
    const path = await createFolder()

    const maxParallelDownloads = 5
    const downloadPromises = []

    for (const [index, part] of parts.entries()) {
        let retries = 0

        const downloadPromise = async () => {
            let downloadSuccess = false
            while (!downloadSuccess) {
                try {
                    const stream = fs.createWriteStream(`${path}/${part.filename}`)
                    await fetchAndPipe(part.url, stream, index + 1)
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

    return await mergePartsAudio(parts, path, dir, name, drmkeys)
}

async function fetchAndPipe(url: string, stream: fs.WriteStream, index: number) {
    const { body } = await fetch(url)
    const readableStream = Readable.from(body as any)

    return new Promise<void>((resolve, reject) => {
        readableStream
            .pipe(stream)
            .on('finish', () => {
                console.log(`Fragment ${index} downloaded`)
                resolve()
            })
            .on('error', (error) => {
                reject(error)
            })
    })
}

async function mergePartsAudio(parts: { filename: string; url: string }[], tmp: string, dir: string, name: string, drmkeys?: { kid: string; key: string }[] | undefined) {
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

                    return resolve(`${dir}/${name}.aac`)
                })
        })
    } catch (error) {
        console.error('Error merging parts:', error)
    }
}
