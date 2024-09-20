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
    const ffmpeg = "/usr/bin/ffmpeg";
    const ffprobe = "/usr/bin/ffprobe";

    return { ffmpeg: ffmpeg, ffprobe: ffprobe }
}
