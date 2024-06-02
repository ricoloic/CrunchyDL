import fs from 'fs'
import { finished } from 'stream'
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

        const processNextFile = (index: number) => {
            if (index >= inputFiles.length) {
                writeStream.end()
                finished(writeStream, (err) => {
                    if (err) {
                        server.logger.log({
                            level: 'error',
                            message: `Error while finishing write stream`,
                            error: err,
                            timestamp: new Date().toISOString(),
                            section: 'crunchyrollDownloadProcessConcatenate'
                        })
                        return reject(err)
                    }
                    console.log('TS files concatenated successfully!')
                    resolve()
                })
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
