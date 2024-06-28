import fs from 'fs'
import { parse, stringify } from 'ass-compiler'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import CryptoJS from 'crypto-js'
import { server } from '../api'
import settings from 'electron-settings'

export async function downloadCRSub(
    sub: {
        format: string
        language: string
        url: string
        isDub: boolean
    },
    dir: string,
    qual: 1080 | 720 | 480 | 360 | 240
) {
    try {
        var resamplerActive = await settings.get('subtitleResamplerActive')

        if (resamplerActive === undefined || resamplerActive === null) {
            resamplerActive = true
        }

        const path = `${dir}/${sub.language}${sub.isDub ? `-FORCED` : ''}.${sub.format}`
        var qualX
        var qualY

        switch (qual) {
            case 1080:
                qualX = 1920
                qualY = 1080
                break
            case 720:
                qualX = 1280
                qualY = 720
                break
            case 480:
                qualX = 720
                qualY = 480
                break
            case 360:
                qualX = 640
                qualY = 360
                break
            case 240:
                qualX = 426
                qualY = 240
                break
        }

        const stream = fs.createWriteStream(path)
        const response = await fetch(sub.url)

        if (!resamplerActive) {
            const readableStream = Readable.from([await response.text()])

            await finished(readableStream.pipe(stream))
            console.log(`Sub ${sub.language}.${sub.format} downloaded`)

            return path
        }

        var parsedASS = parse(await response.text())

        parsedASS.info['Original Script'] = 'crd  [https://github.com/stratuma/]'

        for (const s of parsedASS.styles.style) {
            ;(s.Fontsize = String(Math.round((parseInt(s.Fontsize) / parseInt(parsedASS.info.PlayResY)) * qualY))),
                (s.Outline = String(Math.round((parseInt(s.Outline) / parseInt(parsedASS.info.PlayResY)) * qualY))),
                (s.MarginL = String(Math.round((parseInt(s.MarginL) / parseInt(parsedASS.info.PlayResY)) * qualY))),
                (s.MarginR = String(Math.round((parseInt(s.MarginR) / parseInt(parsedASS.info.PlayResY)) * qualY))),
                (s.MarginV = String(Math.round((parseInt(s.MarginV) / parseInt(parsedASS.info.PlayResY)) * qualY)))
        }

        for (const s of parsedASS.events.dialogue) {
            ;(s.MarginL = Math.round((s.MarginL / parseInt(parsedASS.info.PlayResY)) * qualY)),
                (s.MarginR = Math.round((s.MarginR / parseInt(parsedASS.info.PlayResY)) * qualY)),
                (s.MarginV = Math.round((s.MarginV / parseInt(parsedASS.info.PlayResY)) * qualY))
        }

        parsedASS.info.PlayResX = String(qualX)
        parsedASS.info.PlayResY = String(qualY)

        const fixed = stringify(parsedASS)

        const resampledSubs = resamplePOSSubtitle(fixed, 640, 360, qualX, qualY)

        const readableStream = Readable.from([resampledSubs])

        await finished(readableStream.pipe(stream))
        console.log(`Sub ${sub.language}.${sub.format} downloaded`)

        return path
    } catch (e) {
        console.log('Failed to download and parse subs')
        server.logger.log({
            level: 'error',
            message: 'Failed to download and parse subs',
            error: e,
            timestamp: new Date().toISOString(),
            section: 'subDownloadProcess'
        })
    }
}

function resamplePOSSubtitle(subtitle: string, ox: number, oy: number, nx: number, ny: number) {
    let lines = subtitle.split('\n')

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i]

        if (line.includes('pos(')) {
            let posMatches = line.matchAll(/pos\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)/g)
            for (let posMatch of posMatches) {
                let oldX = parseInt(posMatch[1])
                let oldY = parseInt(posMatch[2])

                let newX = Math.round((oldX / ox) * nx)
                let newY = Math.round((oldY / oy) * ny)

                let newPos = `pos(${newX},${newY})`

                line = line.replace(posMatch[0], newPos)
            }
            lines[i] = line
        }

        if (line.includes('move(')) {
            let posMatches = line.matchAll(/move\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)
            for (let posMatch of posMatches) {
                let fromX = parseInt(posMatch[1])
                let fromY = parseInt(posMatch[2])
                let toX = parseInt(posMatch[3])
                let toY = parseInt(posMatch[4])
                let time1 = parseInt(posMatch[5])
                let time2 = parseInt(posMatch[6])

                let newFromX = Math.round((fromX / ox) * nx)
                let newFromY = Math.round((fromY / oy) * ny)
                let newToX = Math.round((toX / ox) * nx)
                let newToY = Math.round((toY / oy) * ny)

                let newMov = `move(${newFromX},${newFromY},${newToX},${newToY},${time1},${time2})`

                line = line.replace(posMatch[0], newMov)
            }
            lines[i] = line
        }

        if (line.includes('\\fs')) {
            let posMatches = line.matchAll(/\\fs(\d+(?:\.\d+)?)/g)
            for (let posMatch of posMatches) {
                let font = parseInt(posMatch[1])
                let newFontSize = Math.round((font / oy) * ny)
                let newFont = `\\fs${newFontSize}`
                line = line.replace(posMatch[0], newFont)
            }
            lines[i] = line
        }

        if (line.includes('\\bord')) {
            let posMatches = line.matchAll(/\\bord(-?\d+(?:\.\d+)?)/g)
            for (let posMatch of posMatches) {
                let oldBord = parseInt(posMatch[1])
                let newBord = Math.round((oldBord / oy) * ny)
                let bord = `\\bord${newBord}`
                line = line.replace(posMatch[0], bord)
            }
            lines[i] = line
        }

        if (line.match(/m\s|l\s/)) {
            let posMatches = line.matchAll(/([ml])\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)/g)
            for (let posMatch of posMatches) {
                let command = posMatch[1]
                let oldX = parseFloat(posMatch[2])
                let oldY = parseFloat(posMatch[3])

                let newX = Math.round((oldX / ox) * nx)
                let newY = Math.round((oldY / oy) * ny)

                let newCommand = `${command} ${newX} ${newY}`
                line = line.replace(posMatch[0], newCommand)
            }
            lines[i] = line
        }
    }

    return lines.join('\n')
}

export async function downloadADNSub(link: string, dir: string, secret: string, language: string) {
    var templateASS = `[Script Info]
; Script generated by Aegisub 3.2.2
; http://www.aegisub.org/
Title: Deutsch
Original Script: crd  [https://github.com/stratuma/]
Original Translation: 
Original Editing: 
Original Timing: 
Synch Point: 
Script Updated By: 
Update Details: 
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
Timer: 0.0000
WrapStyle: 0

[Aegisub Project Garbage]

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,56,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,0,0,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`
    const path = `${dir}/${language}.ass`

    const stream = fs.createWriteStream(path)
    const subURLFetch = await fetch(link)
    const subURL: {
        location: string
    } = JSON.parse(await subURLFetch.text())

    const rawSubsFetch = await fetch(subURL.location)
    const rawSubs = await rawSubsFetch.text()

    const subs = await ADNparseSub(rawSubs, secret)

    const parsedSubs: {
        vde: Array<{
            startTime: number
            endTime: number
            positionAligh: string
            lineAlign: string
            text: string
        }>
        vostde: Array<{
            startTime: number
            endTime: number
            positionAligh: string
            lineAlign: string
            text: string
        }>
        vostf: Array<{
            startTime: number
            endTime: number
            positionAligh: string
            lineAlign: string
            text: string
        }>
        vf: Array<{
            startTime: number
            endTime: number
            positionAligh: string
            lineAlign: string
            text: string
        }>
    } = await JSON.parse(subs)

    // if (parsedSubs.vde) {
    //   for (const s of parsedSubs.vde) {
    //     const convertedStart = convertToTimeFormat(s.startTime)
    //     const convertedEnd = convertToTimeFormat(s.endTime)

    //     templateASS =
    //       templateASS + `Dialogue: 0,${convertedStart},${convertedEnd},Default,,0,0,0,,${s.text.replace('\n', '\\N').replace('<i>', '{\\i1}').replace('</i>', '{\\i0}')}\n`
    //   }
    // }

    if (parsedSubs.vostde) {
        for (const s of parsedSubs.vostde) {
            const convertedStart = convertToTimeFormat(s.startTime)
            const convertedEnd = convertToTimeFormat(s.endTime)

            templateASS =
                templateASS + `Dialogue: 0,${convertedStart},${convertedEnd},Default,,0,0,0,,${s.text.replace('\n', '\\N').replace('<i>', '{\\i1}').replace('</i>', '{\\i0}')}\n`
        }
    }

    if (parsedSubs.vostf) {
        for (const s of parsedSubs.vostf) {
            const convertedStart = convertToTimeFormat(s.startTime)
            const convertedEnd = convertToTimeFormat(s.endTime)

            templateASS =
                templateASS + `Dialogue: 0,${convertedStart},${convertedEnd},Default,,0,0,0,,${s.text.replace('\n', '\\N').replace('<i>', '{\\i1}').replace('</i>', '{\\i0}')}\n`
        }
    }

    // Disabling Changing ASS because still broken in vlc

    // parsedASS.info.PlayResX = "1920";
    // parsedASS.info.PlayResY = "1080";

    // for (const s of parsedASS.styles.style) {
    //     (s.Fontsize = "54"), (s.Outline = "4");
    // }

    // const fixed = stringify(parsedASS)

    const readableStream = Readable.from([templateASS])

    await finished(readableStream.pipe(stream))
    console.log(`Sub downloaded`)

    return path
}

function convertToTimeFormat(time: number) {
    var seconds: number | string = Math.floor(time)
    var milliseconds = Math.round((time - seconds) * 1000)

    var hours: number | string = Math.floor(seconds / 3600)
    var minutes: number | string = Math.floor((seconds % 3600) / 60)
    seconds = seconds % 60

    hours = String(hours).padStart(2, '0')
    minutes = String(minutes).padStart(2, '0')
    seconds = String(seconds).padStart(2, '0')

    milliseconds = Math.round(milliseconds / 10)

    var formattedMilliseconds = milliseconds < 10 ? '0' + milliseconds : milliseconds

    var formattedTime = hours + ':' + minutes + ':' + seconds + '.' + formattedMilliseconds
    return formattedTime
}

export async function ADNparseSub(raw: string, secret: string) {
    var key = secret + '7fac1178830cfe0c'

    var parsedSubtitle = CryptoJS.enc.Base64.parse(raw.substring(0, 24))
    var sec = CryptoJS.enc.Hex.parse(key)
    var som = raw.substring(24)

    try {
        // Fuck You ADN
        var decrypted: any = CryptoJS.AES.decrypt(som, sec, { iv: parsedSubtitle })
        decrypted = decrypted.toString(CryptoJS.enc.Utf8)
        return decrypted
    } catch (error) {
        console.error('Error decrypting subtitles:', error)
        return null
    }
}
