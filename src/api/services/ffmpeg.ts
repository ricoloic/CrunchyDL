import { app } from 'electron'
import path from 'path'
const isDev = process.env.NODE_ENV === 'development'
const appPath = app.getAppPath()
const resourcesPath = path.dirname(appPath)
const ffmpegPath = path.join(resourcesPath, 'ffmpeg')
if (isDev) {
    require('dotenv').config()
}

export function getFFMPEGPath() {
    if (isDev) {
        const ffmpeg = process.env.FFMPEG_PATH
        const ffprobe = process.env.FFPROBE_PATH

        return { ffmpeg: ffmpeg, ffprobe: ffprobe }
    } else {
        const ffmpeg = path.join(ffmpegPath, 'ffmpeg.exe')
        const ffprobe = path.join(ffmpegPath, 'ffprobe.exe')

        return { ffmpeg: ffmpeg, ffprobe: ffprobe }
    }
}
