import path from 'path'
import fs from 'fs/promises'
import { VideoMetadata, VideoMetadataSingle } from '../types/crunchyroll'
import { server } from '../api'

function formatTimeFFMPEG(seconds: number) {
    return seconds * 1000
}

export async function createChapterFile(rawchapters: VideoMetadata, dir: string, format: string) {
    const filepath = path.join(dir, 'chapters.txt')

    var chapters: string[] = []

    const addChapter = (chapter: VideoMetadataSingle) => {
        if (format === 'mkv') {
            chapters.push('[CHAPTER]')
            chapters.push('TIMEBASE=1/1000')
            chapters.push(`START=${formatTimeFFMPEG(chapter.start)}`)
            chapters.push(`title=${chapter.title}`)
            chapters.push('[CHAPTER]')
            chapters.push('TIMEBASE=1/1000')
            chapters.push(`START=${formatTimeFFMPEG(chapter.end)}`)
            chapters.push(`title=Chapter`)
        } else {
            chapters.push('[CHAPTER]')
            chapters.push('TIMEBASE=1/1000')
            chapters.push(`START=${formatTimeFFMPEG(chapter.start)}`)
            chapters.push(`END=${formatTimeFFMPEG(chapter.end)}`)
            chapters.push(`title=${chapter.title}`)
        }
    }

    if (rawchapters.intro && rawchapters.intro.type && rawchapters.intro.start && rawchapters.intro.end) {
        addChapter(rawchapters.intro)
    }

    if (rawchapters.credits && rawchapters.credits.type && rawchapters.credits.start && rawchapters.credits.end) {
        addChapter(rawchapters.credits)
    }

    if (rawchapters.preview && rawchapters.preview.type && rawchapters.preview.start && rawchapters.preview.end) {
        addChapter(rawchapters.preview)
    }

    if (rawchapters.recap && rawchapters.recap.type && rawchapters.recap.start && rawchapters.recap.end) {
        addChapter(rawchapters.recap)
    }

    try {
        await fs.writeFile(filepath, chapters.join('\r\n'), 'utf-8')
    } catch (e) {
        console.error(`Error occurred during chapter writing:`, e)
        server.logger.log({
            level: 'error',
            message: `Error occurred during chapter writing:`,
            error: e,
            timestamp: new Date().toISOString(),
            section: 'crunchyrollWritingProcessChapter'
        })
    }

    return filepath
}
