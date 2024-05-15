import { Account, Playlist } from '../../db/database'
import { downloadMPDAudio } from '../../services/audio'
import { concatenateTSFiles } from '../../services/concatenate'
import { createFolder, createFolderName, deleteFolder, deleteTemporaryFolders } from '../../services/folder'
import { downloadADNSub, downloadCRSub } from '../../services/subs'
import { CrunchyEpisode } from '../../types/crunchyroll'
import { crunchyGetPlaylist, crunchyGetPlaylistMPD, deleteVideoToken } from '../crunchyroll/crunchyroll.service'
import fs from 'fs'
var cron = require('node-cron')
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import Ffmpeg from 'fluent-ffmpeg'
import { adnGetM3U8Playlist, adnGetPlaylist } from '../adn/adn.service'
import { ADNEpisode } from '../../types/adn'
import { messageBox } from '../../../electron/background'
import { getFFMPEGPath } from '../../services/ffmpeg'
import { getDRMKeys, Uint8ArrayToBase64 } from '../../services/decryption'
import { getMP4DecryptPath } from '../../services/mp4decrypt'
const ffmpegP = getFFMPEGPath()
const mp4e = getMP4DecryptPath()
import util from 'util'
import settings from 'electron-settings'
const exec = util.promisify(require('child_process').exec)

// Get All Accounts
export async function getAllAccounts() {
    const accounts = await Account.findAll({
        attributes: { exclude: ['password'] }
    })

    return accounts
}

// Delete Account
export async function deleteAccountID(id: number) {
    const account = await Account.destroy({
        where: {
            id: id
        }
    })

    return account
}

// DB Account existence check
export async function loggedInCheck(service: string) {
    const login = await Account.findOne({
        where: {
            service: service
        }
    })

    return login?.get()
}

// Save Login Data in DB
export async function safeLoginData(user: string, password: string, service: string) {
    const login = await Account.create({
        username: user,
        password: password,
        service: service
    })

    return login?.get()
}

// Get Playlist
export async function getPlaylist() {
    const episodes = await Playlist.findAll()

    return episodes
}

// Delete Playlist and TEMP folders After Start
async function deletePlaylistandTMP() {
    await Playlist.truncate()

    deleteTemporaryFolders()
}

deletePlaylistandTMP()

// Update Playlist Item
export async function updatePlaylistByID(id: number, status: 'waiting' | 'preparing' | 'downloading' | 'merging' | 'decrypting' | 'completed' | 'failed') {
    await Playlist.update({ status: status }, { where: { id: id } })
}

// Add Episode to Playlist
export async function addEpisodeToPlaylist(
    e: CrunchyEpisode,
    s: Array<string>,
    d: Array<string>,
    dir: string,
    hardsub: boolean,
    status: 'waiting' | 'preparing' | 'downloading' | 'merging' | 'decrypting' | 'completed' | 'failed',
    quality: 1080 | 720 | 480 | 360 | 240,
    service: 'CR' | 'ADN',
    format: 'mp4' | 'mkv'
) {
    const episode = await Playlist.create({
        media: e,
        sub: s,
        dub: d,
        dir: dir,
        hardsub: hardsub,
        status: status,
        quality: quality,
        service: service,
        format: format
    })

    return episode.get()
}

// Define Downloading Array
var downloading: Array<{
    id: number
    downloadedParts: number
    partsToDownload: number
    downloadSpeed: number
    totalDownloaded: number
}> = []

// Get Downloading Episodes
export async function getDownloading(id: number) {
    const found = downloading.find((i) => i.id === id)

    if (found) return found

    return null
}

// Define IsDownloading Count
var isDownloading: number = 0

// Check Playlist every 2 seconds for new items
async function checkPlaylists() {
    const eps = await Playlist.findAll({ where: { status: 'waiting' } })

    for (const e of eps) {
        if (isDownloading < 3 && e.dataValues.status === 'waiting') {
            updatePlaylistByID(e.dataValues.id, 'preparing')
            isDownloading++
            if (e.dataValues.service === 'CR') {
                downloadCrunchyrollPlaylist(
                    (e.dataValues.media as CrunchyEpisode).id,
                    (e as any).dataValues.dub.map((s: { locale: any }) => s.locale),
                    (e as any).dataValues.sub.map((s: { locale: any }) => s.locale),
                    e.dataValues.hardsub,
                    (e.dataValues.media as CrunchyEpisode).id,
                    e.dataValues.id,
                    (e.dataValues.media as CrunchyEpisode).series_title,
                    (e.dataValues.media as CrunchyEpisode).season_number,
                    (e.dataValues.media as CrunchyEpisode).episode_number,
                    e.dataValues.quality,
                    e.dataValues.dir,
                    e.dataValues.format
                )
            }
            if (e.dataValues.service === 'ADN') {
                downloadADNPlaylist(
                    (e.dataValues.media as ADNEpisode).id,
                    (e as any).dataValues.dub.map((s: { locale: any }) => s.locale),
                    (e as any).dataValues.sub.map((s: { locale: any }) => s.locale),
                    e.dataValues.id,
                    (e.dataValues.media as ADNEpisode).show.title,
                    (e.dataValues.media as ADNEpisode).season,
                    (e.dataValues.media as ADNEpisode).shortNumber,
                    e.dataValues.quality,
                    e.dataValues.dir,
                    e.dataValues.format
                )
            }
        }
    }
}

cron.schedule('*/2 * * * * *', () => {
    checkPlaylists()
})

// Download ADN Playlist
export async function downloadADNPlaylist(
    e: number,
    dubs: Array<string>,
    subs: Array<string>,
    downloadID: number,
    name: string,
    season: string,
    episode: string,
    quality: 1080 | 720 | 480 | 360 | 240,
    downloadPath: string,
    format: 'mp4' | 'mkv'
) {
    downloading.push({
        id: downloadID,
        downloadedParts: 0,
        partsToDownload: 0,
        downloadSpeed: 0,
        totalDownloaded: 0
    })

    if (!season) {
        season = '1'
    }

    await updatePlaylistByID(downloadID, 'downloading')

    // var playlist = await adnGetPlaylist(e)

    const subFolder = await createFolder()

    const videoFolder = await createFolder()

    const seasonFolder = await createFolderName(`${name.replace(/[/\\?%*:|"<>]/g, '')} Season ${season}`, downloadPath)

    const subDownload = async () => {
        const sbs: Array<string> = []

        if (subs.find((i) => i === 'de-DE')) {
            const dePlaylist = await adnGetPlaylist(e, 'de')

            if (!dePlaylist) return

            const name = await downloadADNSub(dePlaylist.data.links.subtitles.all, subFolder, dePlaylist.secret, 'de-DE')
            sbs.push(name)
        }
        if (subs.find((i) => i === 'fr-FR')) {
            const frPlaylist = await adnGetPlaylist(e, 'fr')

            if (!frPlaylist) return

            const name = await downloadADNSub(frPlaylist.data.links.subtitles.all, subFolder, frPlaylist.secret, 'fr-FR')
            sbs.push(name)
        }
        return sbs
    }

    const downloadVideo = async () => {
        var playlist

        playlist = await adnGetPlaylist(e, 'de')

        if (!playlist) {
            playlist = await adnGetPlaylist(e, 'fr')
        }

        if (!playlist) {
            await updatePlaylistByID(downloadID, 'failed')
            return
        }

        var link: string = ''

        switch (quality) {
            case 1080:
                link = playlist.data.links.streaming.vostde.fhd
                break
            case 720:
                link = playlist.data.links.streaming.vostde.hd
                break
            case 480:
                link = playlist.data.links.streaming.vostde.sd
                break
        }

        if (!link) return

        var m3u8 = await adnGetM3U8Playlist(link)

        if (!m3u8) return

        const dn = downloading.find((i) => i.id === downloadID)

        if (dn) {
            dn.partsToDownload = m3u8.length
        }

        const file = await downloadParts(m3u8, downloadID, videoFolder)

        return file
    }

    const [subss, file] = await Promise.all([subDownload(), downloadVideo()])

    if (!subss) {
        await updatePlaylistByID(downloadID, 'failed')
        return
    }

    if (!file) {
        await updatePlaylistByID(downloadID, 'failed')
        return
    }

    await mergeVideoFile(file as string, [], subss, seasonFolder, `${name.replace(/[/\\?%*:|"<>]/g, '')} Season ${season} Episode ${episode}`, format)

    await updatePlaylistByID(downloadID, 'completed')

    await deleteFolder(subFolder)
    await deleteFolder(videoFolder)
}

// Download Crunchyroll Playlist
export async function downloadCrunchyrollPlaylist(
    e: string,
    dubs: Array<string>,
    subs: Array<string>,
    hardsub: boolean,
    episodeID: string,
    downloadID: number,
    name: string,
    season: number,
    episode: number,
    quality: 1080 | 720 | 480 | 360 | 240,
    downloadPath: string,
    format: 'mp4' | 'mkv'
) {
    downloading.push({
        id: downloadID,
        downloadedParts: 0,
        partsToDownload: 0,
        downloadSpeed: 0,
        totalDownloaded: 0
    })

    await updatePlaylistByID(downloadID, 'downloading')

    var playlist = await crunchyGetPlaylist(e)

    if (!playlist) {
        await updatePlaylistByID(downloadID, 'failed')
        console.log('Playlist not found')
        return
    }

    if (playlist.data.versions && playlist.data.versions.length !== 0) {
        if (playlist.data.audioLocale !== subs[0]) {
            const found = playlist.data.versions.find((v) => v.audio_locale === 'ja-JP')
            if (found) {
                await deleteVideoToken(episodeID, playlist.data.token)
                playlist = await crunchyGetPlaylist(found.guid)
            } else {
                console.log('Exact Playlist not found, taking what crunchy gives.'),
                    messageBox(
                        'error',
                        ['Cancel'],
                        2,
                        'Not found japanese stream',
                        'Not found japanese stream',
                        'This usually happens when Crunchyroll displays JP as dub on a language but its not available. The download will fail, just start a new download and remove JP from dubs'
                    )
            }
        }
    }

    if (!playlist) {
        await updatePlaylistByID(downloadID, 'failed')
        console.log('Exact Playlist not found')
        return
    }

    await deleteVideoToken(episodeID, playlist.data.token)

    const subFolder = await createFolder()

    const audioFolder = await createFolder()

    const videoFolder = await createFolder()

    const seasonFolder = await createFolderName(`${name.replace(/[/\\?%*:|"<>]/g, '')} Season ${season}`, downloadPath)

    const drmL3blob = await settings.get('l3blob')
    const drmL3key = await settings.get('l3key')

    const dubDownloadList: Array<{
        audio_locale: string
        guid: string
        is_premium_only: boolean
        media_guid: string
        original: boolean
        season_guid: string
        variant: string
    }> = []

    const subDownloadList: Array<{
        format: string
        language: string
        url: string
        isDub: boolean
    }> = []

    for (const s of subs) {
        var subPlaylist

        if (playlist.data.audioLocale !== 'ja-JP') {
            const foundStream = playlist.data.versions.find((v) => v.audio_locale === 'ja-JP')
            if (foundStream) {
                subPlaylist = await crunchyGetPlaylist(foundStream.guid)
            }
        } else {
            subPlaylist = playlist
        }

        if (!subPlaylist) {
            await updatePlaylistByID(downloadID, 'failed')
            console.log('Subtitle Playlist not found')
            return
        }

        const found = subPlaylist.data.subtitles.find((sub) => sub.language === s)
        if (found) {
            subDownloadList.push({ ...found, isDub: false })
            console.log(`Subtitle ${s}.ass found, adding to download`)
        } else {
            console.warn(`Subtitle ${s}.ass not found, skipping`)
        }

        await deleteVideoToken(episodeID, playlist.data.token)
    }

    for (const d of dubs) {
        var found
        if (playlist.data.versions) {
            found = playlist.data.versions.find((p) => p.audio_locale === d)
        }

        if (found) {
            const list = await crunchyGetPlaylist(found.guid)
            if (list) {
                const foundSub = list.data.subtitles.find((sub) => sub.language === d)
                if (foundSub) {
                    subDownloadList.push({ ...foundSub, isDub: true })
                } else {
                    console.log(`No Dub Sub Found for ${d}`)
                }

                await deleteVideoToken(episodeID, playlist.data.token)
            }
            dubDownloadList.push(found)
            console.log(`Audio ${d}.aac found, adding to download`)
        } else if (playlist.data.versions.length === 0) {
            const foundSub = playlist.data.subtitles.find((sub) => sub.language === d)
            if (foundSub) {
                subDownloadList.push({ ...foundSub, isDub: true })
            } else {
                console.log(`No Dub Sub Found for ${d}`)
            }
            dubDownloadList.push({
                audio_locale: 'ja-JP',
                guid: e,
                is_premium_only: true,
                media_guid: 'adas',
                original: false,
                season_guid: 'asdasd',
                variant: 'asd'
            })
        } else {
            console.warn(`Audio ${d}.aac not found, skipping`)
        }
    }

    if (dubDownloadList.length === 0) {
        const jpVersion = playlist.data.versions.find((v) => v.audio_locale === 'ja-JP')

        if (jpVersion) {
            console.log('Using ja-JP Audio because no Audio in download list')
            dubDownloadList.push(jpVersion)
        }
    }

    const subDownload = async () => {
        const sbs: Array<string> = []
        for (const sub of subDownloadList) {
            const name = await downloadCRSub(sub, subFolder, quality)
            sbs.push(name)
        }
        return sbs
    }

    const audioDownload = async () => {
        const audios: Array<string> = []
        for (const v of dubDownloadList) {
            const list = await crunchyGetPlaylist(v.guid)

            if (!list) return

            const playlist = await crunchyGetPlaylistMPD(list.data.url)

            if (!playlist) return

            await deleteVideoToken(episodeID, list.data.token)

            const assetId = playlist.mediaGroups.AUDIO.audio.main.playlists[0].segments[0].resolvedUri.match(/\/assets\/(?:p\/)?([^_,]+)/)

            if (!assetId) {
                console.log(playlist.mediaGroups.AUDIO.audio.main.playlists[0].segments[0])
                console.log(playlist.mediaGroups.AUDIO.audio.main.playlists[0].segments[0].uri)
                console.log('No AssetID found, exiting.')
                await updatePlaylistByID(downloadID, 'failed')
                return
            }

            var pssh
            var keys: { kid: string; key: string }[] | undefined

            var p: { filename: string; url: string }[] = []

            if (playlist.mediaGroups.AUDIO.audio.main.playlists[0].contentProtection) {
                if (!playlist.mediaGroups.AUDIO.audio.main.playlists[0].contentProtection['com.widevine.alpha'].pssh) {
                    console.log('No PSSH found, exiting.')
                    return
                }
                pssh = Uint8ArrayToBase64(playlist.mediaGroups.AUDIO.audio.main.playlists[0].contentProtection['com.widevine.alpha'].pssh)

                keys = await getDRMKeys(pssh, assetId[1], list.account_id)
            }

            if (
                (playlist.mediaGroups.AUDIO.audio.main.playlists[0].contentProtection && !drmL3blob && !drmL3key) ||
                (playlist.mediaGroups.AUDIO.audio.main.playlists[0].contentProtection && !drmL3blob) ||
                (playlist.mediaGroups.AUDIO.audio.main.playlists[0].contentProtection && !drmL3key)
            ) {
                await updatePlaylistByID(downloadID, 'failed')
                messageBox(
                    'error',
                    ['Cancel'],
                    2,
                    'Audio Widevine encrypted but no key provided',
                    'Audio Widevine encrypted but no key provided',
                    'To download Widevine encrypted videos add the L3 Widevine keys in Settings > Widewine > L3 Keys'
                )
                return
            }
            p.push({
                filename: (playlist.mediaGroups.AUDIO.audio.main.playlists[0].segments[0].map.uri.match(/([^\/]+)\?/) as RegExpMatchArray)[1],
                url: playlist.mediaGroups.AUDIO.audio.main.playlists[0].segments[0].map.resolvedUri
            })

            for (const s of playlist.mediaGroups.AUDIO.audio.main.playlists[0].segments) {
                p.push({
                    filename: (s.uri.match(/([^\/]+)\?/) as RegExpMatchArray)[1],
                    url: s.resolvedUri
                })
            }

            const path = await downloadMPDAudio(p, audioFolder, list.data.audioLocale, keys ? keys : undefined)

            audios.push(path as string)
        }
        return audios
    }

    const downloadVideo = async () => {
        var code

        if (!playlist) return

        if (playlist.data.versions && playlist.data.versions.length !== 0) {
            if (playlist.data.versions.find((p) => p.audio_locale === dubs[0])) {
                code = playlist.data.versions.find((p) => p.audio_locale === dubs[0])?.guid
            } else {
                code = playlist.data.versions.find((p) => p.audio_locale === 'ja-JP')?.guid
            }
        } else {
            code = e
        }

        if (!code) {
            await updatePlaylistByID(downloadID, 'failed')
            console.log('No Clean stream found')
            return
        }

        const play = await crunchyGetPlaylist(code)

        if (!play) {
            await updatePlaylistByID(downloadID, 'failed')
            console.log('Failed to get Playlist in download Video')
            return
        }

        var downloadURL

        if (hardsub) {
            const hardsubURL = play.data.hardSubs.find((h) => h.hlang === subs[0])?.url

            if (hardsubURL) {
                downloadURL = hardsubURL
                console.log('Hardsub Playlist found')
            } else {
                downloadURL = play.data.url
                console.log('Hardsub Playlist not found')
            }
        } else {
            downloadURL = play.data.url
            console.log('Hardsub disabled, skipping')
        }

        var mdp = await crunchyGetPlaylistMPD(downloadURL)

        if (!mdp) return

        await deleteVideoToken(episodeID, play.data.token)

        var hq = mdp.playlists.find((i) => i.attributes.RESOLUTION?.height === quality)

        if (!hq) return

        const assetId = hq.segments[0].resolvedUri.match(/\/assets\/(?:p\/)?([^_,]+)/)

        if (!assetId) {
            console.log('No AssetID found, exiting.')
            return
        }

        var pssh
        var keys: { kid: string; key: string }[] | undefined

        if (hq.contentProtection) {
            if (!hq.contentProtection['com.widevine.alpha'].pssh) {
                console.log('No PSSH found, exiting.')
                return
            }
            pssh = Uint8ArrayToBase64(hq.contentProtection['com.widevine.alpha'].pssh)

            keys = await getDRMKeys(pssh, assetId[1], play.account_id)
        }

        if (
            (hq.contentProtection && !drmL3blob && !drmL3key) ||
            (hq.contentProtection && !drmL3blob) ||
            (hq.contentProtection && !drmL3key)
        ) {
            await updatePlaylistByID(downloadID, 'failed')
            messageBox(
                'error',
                ['Cancel'],
                2,
                'Audio Widevine encrypted but no key provided',
                'Audio Widevine encrypted but no key provided',
                'To download Widevine encrypted videos add the L3 Widevine keys in Settings > Widewine > L3 Keys'
            )
            return
        }

        var p: { filename: string; url: string }[] = []

        p.push({
            filename: (hq.segments[0].map.uri.match(/([^\/]+)\?/) as RegExpMatchArray)[1],
            url: hq.segments[0].map.resolvedUri
        })

        for (const s of hq.segments) {
            p.push({
                filename: (s.uri.match(/([^\/]+)\?/) as RegExpMatchArray)[1],
                url: s.resolvedUri
            })
        }

        const dn = downloading.find((i) => i.id === downloadID)

        if (dn) {
            dn.partsToDownload = p.length
        }

        const file = await downloadParts(p, downloadID, videoFolder, keys ? keys : undefined)

        return file
    }

    const [subss, audios, file] = await Promise.all([subDownload(), audioDownload(), downloadVideo()])

    if (!audios) return

    await mergeVideoFile(file as string, audios, subss, seasonFolder, `${name.replace(/[/\\?%*:|"<>]/g, '')} Season ${season} Episode ${episode}`, format)

    await updatePlaylistByID(downloadID, 'completed')

    await deleteFolder(videoFolder)
    await deleteFolder(subFolder)
    await deleteFolder(audioFolder)

    return playlist
}

async function downloadParts(parts: { filename: string; url: string }[], downloadID: number, dir: string, drmkeys?: { kid: string; key: string }[] | undefined) {
    const path = await createFolder()
    const dn = downloading.find((i) => i.id === downloadID)

    let totalDownloadedBytes = 0;
    let totalSizeBytes = 0;
    let startTime = Date.now()

    for (const [index, part] of parts.entries()) {
        let success = false
        while (!success) {
            try {
                var stream

                stream = fs.createWriteStream(`${path}/${part.filename}`)

                const { body } = await fetch(part.url)

                const readableStream = Readable.from(body as any)
                let partDownloadedBytes = 0
                let partSizeBytes = 0;
                
                readableStream.on('data', (chunk) => {
                    partDownloadedBytes += chunk.length
                    totalDownloadedBytes += chunk.length
                    totalSizeBytes += chunk.length;
                })

                await finished(readableStream.pipe(stream))

                console.log(`Fragment ${index + 1} downloaded`)

                if (dn) {
                    const tot = totalSizeBytes
                    dn.downloadedParts++
                    const endTime = Date.now()
                    const durationInSeconds = (endTime - startTime) / 1000
                    dn.downloadSpeed = totalDownloadedBytes / 1024 / 1024 / durationInSeconds
                    dn.totalDownloaded = tot;
                }

                success = true
            } catch (error) {
                console.error(`Error occurred during download of fragment ${index + 1}:`, error)
                console.log(`Retrying download of fragment ${index + 1}...`)
                await new Promise((resolve) => setTimeout(resolve, 5000))
            }
        }
    }

    return await mergeParts(parts, downloadID, path, dir, drmkeys)
}

async function mergeParts(parts: { filename: string; url: string }[], downloadID: number, tmp: string, dir: string, drmkeys: { kid: string; key: string }[] | undefined) {
    const tempname = (Math.random() + 1).toString(36).substring(2)

    try {
        const list: Array<string> = []

        await updatePlaylistByID(downloadID, 'merging')
        isDownloading--

        for (const [index, part] of parts.entries()) {
            list.push(`${tmp}/${part.filename}`)
        }

        var concatenatedFile: string

        if (drmkeys) {
            concatenatedFile = `${tmp}/temp-main.m4s`
        } else {
            concatenatedFile = `${tmp}/main.m4s`
        }

        await concatenateTSFiles(list, concatenatedFile)

        if (drmkeys) {
            await updatePlaylistByID(downloadID, 'decrypting')
            console.log('Video Decryption started')
            const inputFilePath = `${tmp}/temp-main.m4s`
            const outputFilePath = `${tmp}/main.m4s`
            const keyArgument = `--show-progress --key ${drmkeys[1].kid}:${drmkeys[1].key}`

            const command = `${mp4e} ${keyArgument} "${inputFilePath}" "${outputFilePath}"`

            await exec(command)
            console.log('Video Decryption finished')
            concatenatedFile = `${tmp}/main.m4s`
        }

        return new Promise((resolve, reject) => {
            if (!ffmpegP.ffmpeg || !ffmpegP.ffprobe) return
            Ffmpeg()
                .setFfmpegPath(ffmpegP.ffmpeg)
                .setFfprobePath(ffmpegP.ffprobe)
                .input(concatenatedFile)
                .outputOptions('-c copy')
                .save(dir + `/${tempname}.mp4`)
                .on('end', async () => {
                    console.log('Merging finished')
                    await deleteFolder(tmp)
                    return resolve(dir + `/${tempname}.mp4`)
                })
        })
    } catch (error) {
        console.error('Error merging parts:', error)
    }
}

async function mergeVideoFile(video: string, audios: Array<string>, subs: Array<string>, path: string, filename: string, format: 'mp4' | 'mkv') {
    const locales: Array<{
        locale: string
        name: string
        iso: string
        title: string
    }> = [
        { locale: 'ja-JP', name: 'JP', iso: 'jpn', title: 'Japanese' },
        { locale: 'de-DE', name: 'DE', iso: 'deu', title: 'German' },
        { locale: 'hi-IN', name: 'HI', iso: 'hin', title: 'Hindi' },
        { locale: 'ru-RU', name: 'RU', iso: 'rus', title: 'Russian' },
        { locale: 'en-US', name: 'EN', iso: 'eng', title: 'English' },
        { locale: 'fr-FR', name: 'FR', iso: 'fra', title: 'French' },
        { locale: 'pt-BR', name: 'PT', iso: 'por', title: 'Portugese' },
        { locale: 'es-419', name: 'LA-ES', iso: 'spa', title: 'SpanishLatin' },
        { locale: 'en-IN', name: 'EN-IN', iso: 'eng', title: 'IndianEnglish' },
        { locale: 'it-IT', name: 'IT', iso: 'ita', title: 'Italian' },
        { locale: 'es-ES', name: 'ES', iso: 'spa', title: 'Spanish' },
        { locale: 'ta-IN', name: 'TA', iso: 'tam', title: 'Tamil' },
        { locale: 'te-IN', name: 'TE', iso: 'tel', title: 'Telugu' },
        { locale: 'ar-SA', name: 'AR', iso: 'ara', title: 'ArabicSA' },
        { locale: 'ms-MY', name: 'MS', iso: 'msa', title: 'Malay' },
        { locale: 'th-TH', name: 'TH', iso: 'tha', title: 'Thai' },
        { locale: 'vi-VN', name: 'VI', iso: 'vie', title: 'Vietnamese' },
        { locale: 'id-ID', name: 'ID', iso: 'ind', title: 'Indonesian' },
        { locale: 'ko-KR', name: 'KO', iso: 'kor', title: 'Korean' }
    ]

    return new Promise((resolve, reject) => {
        if (!ffmpegP.ffmpeg || !ffmpegP.ffprobe) return
        var output = Ffmpeg().setFfmpegPath(ffmpegP.ffmpeg).setFfprobePath(ffmpegP.ffprobe)
        var ffindex = 1
        output.addInput(video)
        var options = ['-map_metadata -1', '-metadata:s:v:0 VENDOR_ID=', '-metadata:s:v:0 language=', '-c copy', '-map 0']
        if (format === 'mp4') {
            options.push('-c:s mov_text')
        }

        for (const [index, a] of audios.entries()) {
            output.addInput(a)
            options.push(`-map ${ffindex}:a:0`)
            options.push(
                `-metadata:s:a:${index} language=${
                    locales.find((l) => l.locale === a.split('/')[1].split('.aac')[0])
                        ? locales.find((l) => l.locale === a.split('/')[1].split('.aac')[0])?.iso
                        : a.split('/')[1].split('.aac')[0]
                }`
            )

            ffindex++

            options.push(
                `-metadata:s:a:${index} title=${
                    locales.find((l) => l.locale === a.split('/')[1].split('.aac')[0])
                        ? locales.find((l) => l.locale === a.split('/')[1].split('.aac')[0])?.title
                        : a.split('/')[1].split('.aac')[0]
                }`
            )
        }

        options.push(`-disposition:a:0 default`)

        if (subs) {
            for (const [index, s] of subs.entries()) {
                output.addInput(s)
                options.push(`-map ${ffindex}:s`)

                if (s.includes('-FORCED')) {
                    options.push(
                        `-metadata:s:s:${index} language=${
                            locales.find((l) => l.locale === s.split('/')[1].split('-FORCED.ass')[0])
                                ? locales.find((l) => l.locale === s.split('/')[1].split('-FORCED.ass')[0])?.iso
                                : s.split('/')[1].split('-FORCED.ass')[0]
                        }`
                    )
                } else {
                    options.push(
                        `-metadata:s:s:${index} language=${
                            locales.find((l) => l.locale === s.split('/')[1].split('.ass')[0])
                                ? locales.find((l) => l.locale === s.split('/')[1].split('.ass')[0])?.iso
                                : s.split('/')[1].split('.ass')[0]
                        }`
                    )
                }

                if (s.includes('-FORCED')) {
                    options.push(
                        `-metadata:s:s:${index} title=${
                            locales.find((l) => l.locale === s.split('/')[1].split('-FORCED.ass')[0])
                                ? locales.find((l) => l.locale === s.split('/')[1].split('-FORCED.ass')[0])?.title
                                : s.split('/')[1].split('-FORCED.ass')[0]
                        }[FORCED]`
                    )
                } else {
                    options.push(
                        `-metadata:s:s:${index} title=${
                            locales.find((l) => l.locale === s.split('/')[1].split('.ass')[0])
                                ? locales.find((l) => l.locale === s.split('/')[1].split('.ass')[0])?.title
                                : s.split('/')[1].split('.ass')[0]
                        }`
                    )
                }

                ffindex++
            }
            options.push(`-disposition:s:0 default`)
        }

        output
            .addOptions(options)
            .saveToFile(path + `/${filename}.${format}`)
            .on('error', (error) => {
                console.log(error)
                reject(error)
            })
            .on('end', async () => {
                console.log('Download finished')
                return resolve('combined')
            })
    })
}
