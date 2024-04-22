import path from 'path'
import { app } from 'electron'
import fs from 'fs'

export async function createFolder() {
  const tempFolderPath = path.join(app.getPath('documents'), (Math.random() + 1).toString(36).substring(2))
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

export async function createFolderName(name: string, dir: string) {
  var folderPath

  const dirExists = await checkDirectoryExistence(dir)

  if (dirExists) {
    folderPath = path.join(dir, name)
  } else {
    folderPath = path.join(app.getPath('documents'), name)
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
