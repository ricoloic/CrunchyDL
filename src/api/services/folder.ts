import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import settings from 'electron-settings'

export async function createFolder() {
    var tempPath = (await settings.get('tempPath')) as string

    if (!tempPath) {
        tempPath = app.getPath('temp')
    }

    const tempFolderPath = path.join(tempPath, `crd-tmp-${(Math.random() + 1).toString(36).substring(2)}`)
    try {
        await fs.promises.mkdir(tempFolderPath, { recursive: true })
        return tempFolderPath
    } catch (error) {
        console.error('Error creating temporary folder:', error)
        throw error
    }
}

export async function checkDirectoryExistence(dir: string) {
    try {
        await fs.promises.access(dir)
        console.log(`Directory ${dir} exists.`)
        return true
    } catch (error) {
        console.log(`Directory ${dir} does not exist.`)
        return false
    }
}

export async function checkFileExistence(file: string) {
    try {
        await fs.promises.access(file)
        console.log(`File ${file} exists.`)
        return true
    } catch (error) {
        console.log(`File ${file} does not exist.`)
        return false
    }
}

export async function createFolderName(name: string, dir: string) {
    var tempPath = (await settings.get('tempPath')) as string

    if (!tempPath) {
        tempPath = app.getPath('temp')
    }

    var folderPath

    const dirExists = await checkDirectoryExistence(dir)

    if (dirExists) {
        folderPath = path.join(dir, name)
    } else {
        folderPath = path.join(tempPath, name)
    }

    try {
        await fs.promises.access(folderPath)
        return folderPath
    } catch (error) {
        try {
            await fs.promises.mkdir(folderPath, { recursive: true })
            return folderPath
        } catch (mkdirError) {
            console.error('Error creating season folder:', mkdirError)
            throw mkdirError
        }
    }
}

export async function deleteFolder(folderPath: string) {
    fs.rmSync(folderPath, { recursive: true, force: true })
}

export async function deleteTemporaryFolders() {
    var tempPath = (await settings.get('tempPath')) as string

    if (!tempPath) {
        tempPath = app.getPath('temp')
    }

    const folderPrefix = 'crd-tmp-'

    try {
        const files = await fs.promises.readdir(tempPath)
        const tempFolders = files.filter((file) => file.startsWith(folderPrefix))

        for (const folder of tempFolders) {
            const folderPath = path.join(tempPath, folder)
            await deleteFolder(folderPath)
            console.log(`Temporary folder ${folder} deleted.`)
        }
    } catch (error) {
        console.error('Error deleting temporary folders:', error)
        throw error
    }
}

export function getFilename(path: string, ext: string, delimiter: string) {
    const segments = path.split(delimiter)

    if (segments.length == 0) {
        return 'unkown'
    }

    return segments[segments.length - 1].split(ext)[0]
}
