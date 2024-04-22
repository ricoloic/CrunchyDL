import fs from 'fs'
import { Readable } from 'stream'
import { createFolder, deleteFolder } from './folder'
import { concatenateTSFiles } from './concatenate'
import Ffmpeg from 'fluent-ffmpeg'
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked')
const ffprobePath = require('ffprobe-static').path.replace('app.asar', 'app.asar.unpacked')

export async function downloadMPDAudio(parts: { filename: string; url: string }[], dir: string, name: string) {
  const path = await createFolder()
  const downloadPromises = []

  for (const [index, part] of parts.entries()) {
    const stream = fs.createWriteStream(`${path}/${part.filename}`)
    const downloadPromise = fetchAndPipe(part.url, stream, index + 1)
    downloadPromises.push(downloadPromise)
  }

  await Promise.all(downloadPromises)

  return await mergePartsAudio(parts, path, dir, name)
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

async function mergePartsAudio(parts: { filename: string; url: string }[], tmp: string, dir: string, name: string) {
  try {
    const list: Array<string> = []

    for (const [index, part] of parts.entries()) {
      list.push(`${tmp}/${part.filename}`)
    }

    const concatenatedFile = `${tmp}/main.m4s`
    await concatenateTSFiles(list, concatenatedFile)

    return new Promise((resolve, reject) => {
      Ffmpeg()
        .setFfmpegPath(ffmpegPath)
        .setFfprobePath(ffprobePath)
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
