import path from 'path'
import fs from 'fs/promises'
import { VideoMetadata } from '../types/crunchyroll'
import { server } from '../api'

function formatTimeFFMPEG(seconds: number) {
    return seconds * 1000
}

export async function createChapterFile(rawchapters: VideoMetadata, dir: string) {
    const filepath = path.join(dir, 'chapters.txt')

    var chapters: string[] = []

    chapters.push(';FFMETADATA1')

    if (rawchapters.intro && rawchapters.intro.type && rawchapters.intro.start && rawchapters.intro.end) {
        chapters.push('[CHAPTER]')
        chapters.push('TIMEBASE=1/1000')
        chapters.push(`START=${formatTimeFFMPEG(rawchapters.intro.start)}`)
        chapters.push(`END=${formatTimeFFMPEG(rawchapters.intro.end) - 1}`)
        chapters.push('title=Intro')
    }

    if (rawchapters.credits && rawchapters.credits.type && rawchapters.credits.start && rawchapters.credits.end) {
        chapters.push('[CHAPTER]')
        chapters.push('TIMEBASE=1/1000')
        chapters.push(`START=${formatTimeFFMPEG(rawchapters.credits.start)}`)
        chapters.push(`END=${formatTimeFFMPEG(rawchapters.credits.end) - 1}`)
        chapters.push('title=Credits')
    }

    if (rawchapters.preview && rawchapters.preview.type && rawchapters.preview.start && rawchapters.preview.end) {
        chapters.push('[CHAPTER]')
        chapters.push('TIMEBASE=1/1000')
        chapters.push(`START=${formatTimeFFMPEG(rawchapters.preview.start)}`)
        chapters.push(`END=${formatTimeFFMPEG(rawchapters.preview.end) - 1}`)
        chapters.push('title=Preview')
    }

    if (rawchapters.recap && rawchapters.recap.type && rawchapters.recap.start && rawchapters.recap.end) {
        chapters.push('[CHAPTER]')
        chapters.push('TIMEBASE=1/1000')
        chapters.push(`START=${formatTimeFFMPEG(rawchapters.recap.start)}`)
        chapters.push(`END=${formatTimeFFMPEG(rawchapters.recap.end) - 1}`)
        chapters.push('title=Recap')
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
