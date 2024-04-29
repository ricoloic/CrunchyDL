import { app } from 'electron'
import path from 'path'
import { messageBox } from '../../electron/background'
const isDev = process.env.NODE_ENV === 'development'
const appPath = app.getAppPath()
const resourcesPath = path.dirname(appPath)
const ffmpegPath = path.join(resourcesPath, 'ffmpeg')

export function getFFMPEGPath() {
  if (isDev) {
    const ffmpeg = '../../../ffmpeg/ffmpeg.exe'
    const ffprobe = '../../../ffmpeg/ffprobe.exe'

    return { ffmpeg: ffmpeg, ffprobe: ffprobe }
  } else {
    const ffmpeg = path.join(ffmpegPath, 'ffmpeg.exe')
    const ffprobe = path.join(ffmpegPath, 'ffprobe.exe')

    return { ffmpeg: ffmpeg, ffprobe: ffprobe }
  }
}
