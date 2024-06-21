import path from 'path'
import fs from 'fs/promises'
import { VideoMetadata, VideoMetadataSingle } from '../types/crunchyroll'
import { server } from '../api'

function formatTimeFFMPEG(seconds: number) {
    return seconds * 1000
}

async function createChapter(chapter: VideoMetadataSingle, format: string, name: string) {
    var chapters: string[] = []
    if (format === 'mkv') {
        chapters.push('[CHAPTER]')
        chapters.push('TIMEBASE=1/1000')
        chapters.push(`START=${formatTimeFFMPEG(chapter.start)}`)
        chapters.push(`END=${formatTimeFFMPEG(chapter.start)}`)
        chapters.push(`title=${name}`)
        chapters.push(``)
        chapters.push('[CHAPTER]')
        chapters.push('TIMEBASE=1/1000')
        chapters.push(`START=${formatTimeFFMPEG(chapter.end)}`)
        chapters.push(`END=${formatTimeFFMPEG(chapter.end)}`)
        chapters.push(`title=${name} End`)
        chapters.push(``)
    } else {
        chapters.push('[CHAPTER]')
        chapters.push('TIMEBASE=1/1000')
        chapters.push(`START=${formatTimeFFMPEG(chapter.start)}`)
        chapters.push(`END=${formatTimeFFMPEG(chapter.end)}`)
        chapters.push(`title=${name}`)
        chapters.push(``)
    }

    return chapters
}

export async function createChapterFile(rawchapters: VideoMetadata, dir: string, format: string, mediaid: string) {
    const filepath = path.join(dir, 'chapters.txt')

    var chapters: string[] = []

    chapters.push(';FFMETADATA1')
    chapters.push(`title=${mediaid}`)
    chapters.push(`artist=Crunchyroll`)
    chapters.push(``)

    if (rawchapters.intro && rawchapters.intro.type && rawchapters.intro.start && rawchapters.intro.end) {
        chapters.push(...await createChapter(rawchapters.intro, format, 'Intro'));
        console.log(chapters)
    }

    if (rawchapters.credits && rawchapters.credits.type && rawchapters.credits.start && rawchapters.credits.end) {
        chapters.push(...await createChapter(rawchapters.credits, format, 'Credits'));
        console.log(chapters)
    }

    if (rawchapters.preview && rawchapters.preview.type && rawchapters.preview.start && rawchapters.preview.end) {
        chapters.push(...await createChapter(rawchapters.preview, format, 'Preview'));
        console.log(chapters)
    }

    if (rawchapters.recap && rawchapters.recap.type && rawchapters.recap.start && rawchapters.recap.end) {
        chapters.push(...await createChapter(rawchapters.recap, format, 'Recap'));
        console.log(chapters)
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
