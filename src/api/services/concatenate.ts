import fs from 'fs'

export async function concatenateTSFiles(inputFiles: Array<string>, outputFile: string) {
  return new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(outputFile)

    writeStream.on('error', (error) => {
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
