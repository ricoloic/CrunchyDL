import fs from 'fs'
import { server } from '../api'

export async function concatenateTSFiles(inputFiles: Array<string>, outputFile: string) {
    return new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(outputFile)

        writeStream.on('error', (error) => {
            server.logger.log({
                level: 'error',
                message: `Error while concatenating`,
                error: error,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessConcatenate'
            })
            reject(error)
        })

        writeStream.on('finish', () => {
            console.log('TS files concatenated successfully!')
            resolve()
        })

        const processNextFile = (index: number) => {
            if (index >= inputFiles.length) {
                writeStream.end()
                return
            }

            const readStream = fs.createReadStream(inputFiles[index])

            readStream.on('error', (error) => {
                server.logger.log({
                    level: 'error',
                    message: `Error while concatenating`,
                    error: error,
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessConcatenate'
                })
                reject(error)
            })

            readStream.pipe(writeStream, { end: false })

            readStream.on('end', () => {
                processNextFile(index + 1)
            })
        }

        processNextFile(0)
    })
}
