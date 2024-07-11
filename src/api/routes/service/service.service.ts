import fs from 'fs'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import util from 'util'
import Ffmpeg from 'fluent-ffmpeg'
import settings from 'electron-settings'
import { app } from 'electron'
import { downloadMPDAudio } from '../../services/audio'
import { concatenateTSFiles } from '../../services/concatenate'
import {
    checkFileExistence,
    createFolder,
    createFolderName,
    deleteFolder,
    deleteTemporaryFolders,
    getFilename
} from '../../services/folder'
import { downloadADNSub, downloadCRSub } from '../../services/subs'
import { CrunchyEpisode } from '../../types/crunchyroll'
import { adnGetM3U8Playlist, adnGetPlaylist } from '../adn/adn.service'
import { ADNEpisode } from '../../types/adn'
import { getFFMPEGPath } from '../../services/ffmpeg'
import { getDRMKeys, Uint8ArrayToBase64 } from '../../services/decryption'
import { getShakaPath } from '../../services/shaka'
import { server } from '../../api'
import { createChapterFile } from '../../services/chapter'
import { Services, SERVICES } from '../../../constants'
import { MessageBoxBuilder } from '../../../electron/utils/messageBox'
import { Account } from '../../db/models/account'
import { Playlist } from '../../db/models/playlist'
import { CrunchyrollService } from '../crunchyroll/crunchyroll.service'

const cron = require('node-cron')
const ffmpegP = getFFMPEGPath()
const shaka = getShakaPath()
const execFile = util.promisify(require('child_process').execFile)

settings.configure({
    dir: app.getPath('documents') + '/Crunchyroll Downloader/settings/'
})

// DB Account existence check
export async function loggedInCheck(service: Services) {
    try {
        const login = await Account.findOne({
            where: {
                service
            }
        })

        return login?.get()
    } catch (e) {
        MessageBoxBuilder.new('error')
            .button('Cancel', true)
            .detail(JSON.stringify(e))
            .build('Database Error', 'Failed to check if logged in')
        server.logger.log({
            level: 'error',
            message: 'Failed to check if logged in',
            error: e,
            timestamp: new Date().toISOString(),
            section: 'loginCheckDatabase'
        })
    }
}

// Save Login Data in DB
export async function safeLoginData(user: string, password: string, service: Services) {
    try {
        const login = await Account.create({
            username: user,
            password,
            service
        })

        return login?.get()
    } catch (e) {
        MessageBoxBuilder.new('error')
            .button('Cancel', true)
            .detail(JSON.stringify(e))
            .build('Database Error', 'Failed to save login data')
        server.logger.log({
            level: 'error',
            message: 'Failed to save login data',
            error: e,
            timestamp: new Date().toISOString(),
            section: 'loginSaveDatabase'
        })
    }
}

// Get Playlist
export async function getPlaylist() {
    try {
        const episodes = await Playlist.findAll()

        return episodes
    } catch (e) {
        server.logger.log({
            level: 'error',
            message: 'Failed to get Playlist',
            error: e,
            timestamp: new Date().toISOString(),
            section: 'playlistGetDatabase'
        })
    }
}

// Delete Playlist and TEMP folders After Start
async function deletePlaylistandTMP() {
    try {
        await deleteTemporaryFolders()

        console.log('All TMP Folders and Files deleted')
        server.logger.log({
            level: 'info',
            message: 'All TMP Folders and Files deleted',
            timestamp: new Date().toISOString(),
            section: 'playlistClearDatabase'
        })

        await Playlist.truncate()

        console.log('Playlist cleared')
        server.logger.log({
            level: 'info',
            message: 'Playlist cleared',
            timestamp: new Date().toISOString(),
            section: 'playlistClearDatabase'
        })
    } catch (e) {
        server.logger.log({
            level: 'error',
            message: 'Failed to delete Playlist and tmp folders',
            error: e,
            timestamp: new Date().toISOString(),
            section: 'playlistClearDatabase'
        })
    }
}

deletePlaylistandTMP()

// Update Playlist Item
export async function updatePlaylistByID(
    id: number,
    status?:
        | 'waiting'
        | 'preparing'
        | 'waiting for playlist'
        | 'waiting for sub playlist'
        | 'waiting for dub playlist'
        | 'downloading'
        | 'downloading video'
        | 'merging video'
        | 'decrypting video'
        | 'awaiting all dubs downloaded'
        | 'merging video & audio'
        | 'completed'
        | 'failed',
    quality?: 1080 | 720 | 480 | 360 | 240,
    installedDir?: string
) {
    try {
        await Playlist.update({ status, quality, installDir: installedDir }, { where: { id } })

        server.logger.log({
            level: 'info',
            message: `Updated Playlist Item ${id}`,
            status: status || undefined,
            quality: quality || undefined,
            installedDir: installedDir || undefined,
            timestamp: new Date().toISOString(),
            section: 'playlistItemUpdateDatabase'
        })
    } catch (e) {
        MessageBoxBuilder.new('error')
            .button('Cancel', true)
            .detail('Failed to update playlist item')
            .build('Database Error', 'Failed to update playlist item')
        server.logger.log({
            level: 'error',
            message: 'Failed to update playlist item',
            error: e,
            timestamp: new Date().toISOString(),
            section: 'playlistItemUpdateDatabase'
        })
    }
}

// Define Downloading Array
const downloading: Array<{
    id: number
    status: string
    downloadedParts: number
    partsToDownload: number
    downloadSpeed: number
    totalDownloaded: number
}> = []

// Get Downloading Episodes
// eslint-disable-next-line require-await
export async function getDownloading(id: number) {
    const found = downloading.find((i) => i.id === id)

    if (found) return found

    return null
}

// Define IsDownloading Count
let isDownloading: number = 0
let maxDownloading: number = 3

// Check Playlist every 2 seconds for new items
async function checkPlaylists() {
    try {
        const eps = await Playlist.findAll({ where: { status: 'waiting' } })

        const maxd = (await settings.get('DefaultMaxDownloads')) as number

        if (maxd !== undefined && maxd !== null) {
            maxDownloading = maxd
        }

        for (const e of eps) {
            if (isDownloading < maxDownloading && e.dataValues.status === 'waiting') {
                updatePlaylistByID(e.dataValues.id, 'preparing')
                isDownloading++
                server.logger.log({
                    level: 'info',
                    message: `Added Playlist Item ${e.dataValues.id} to Download Process`,
                    timestamp: new Date().toISOString(),
                    section: 'playlistCheckCron'
                })
                if (e.dataValues.service === SERVICES.crunchyroll) {
                    downloadCrunchyrollPlaylist(
                        (e.dataValues.media as CrunchyEpisode).id,
                        e.dataValues.dub.map((s: { locale: any }) => s.locale),
                        e.dataValues.sub.map((s: { locale: any }) => s.locale),
                        e.dataValues.hardsub,
                        (e.dataValues.media as CrunchyEpisode).id,
                        e.dataValues.id,
                        (e.dataValues.media as CrunchyEpisode).series_title,
                        (e.dataValues.media as CrunchyEpisode).title,
                        (e.dataValues.media as CrunchyEpisode).season_number,
                        (e.dataValues.media as CrunchyEpisode).episode_number,
                        (e.dataValues.media as CrunchyEpisode).episode,
                        e.dataValues.quality,
                        e.dataValues.qualityaudio ? e.dataValues.qualityaudio - 1 : 0,
                        e.dataValues.dir,
                        e.dataValues.format,
                        (e.dataValues.media as CrunchyEpisode).geo
                    )
                }
                if (e.dataValues.service === SERVICES.animationdigitalnetwork) {
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
    } catch (e) {
        server.logger.log({
            level: 'error',
            message: 'Failed check Playlist',
            error: e,
            timestamp: new Date().toISOString(),
            section: 'playlistCheckCron'
        })
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
        status: 'downloading',
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

    const seasonFolder = await createFolderName(
        `${name.replace(/[/\\?%*:|"<>]/g, '')} Season ${season}`,
        downloadPath
    )

    const subDownload = async () => {
        const sbs: Array<string> = []

        if (subs.find((i) => i === 'de-DE')) {
            const dePlaylist = await adnGetPlaylist(e, 'de')

            if (!dePlaylist) return

            const name = await downloadADNSub(
                dePlaylist.data.links.subtitles.all,
                subFolder,
                dePlaylist.secret,
                'de-DE'
            )
            sbs.push(name)
        }
        if (subs.find((i) => i === 'fr-FR')) {
            const frPlaylist = await adnGetPlaylist(e, 'fr')

            if (!frPlaylist) return

            const name = await downloadADNSub(
                frPlaylist.data.links.subtitles.all,
                subFolder,
                frPlaylist.secret,
                'fr-FR'
            )
            sbs.push(name)
        }
        return sbs
    }

    const downloadVideo = async () => {
        let playlist

        playlist = await adnGetPlaylist(e, 'de')

        if (!playlist) {
            playlist = await adnGetPlaylist(e, 'fr')
        }

        if (!playlist) {
            await updatePlaylistByID(downloadID, 'failed')
            return
        }

        let link: string = ''

        if (dubs.find((i) => i === 'ja-JP') && playlist.data.links.streaming.vostde) {
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
        }

        if (dubs.find((i) => i === 'ja-JP') && playlist.data.links.streaming.vostf) {
            switch (quality) {
                case 1080:
                    link = playlist.data.links.streaming.vostf.fhd
                    break
                case 720:
                    link = playlist.data.links.streaming.vostf.hd
                    break
                case 480:
                    link = playlist.data.links.streaming.vostf.sd
                    break
            }
        }

        if (dubs.find((i) => i === 'de-DE')) {
            switch (quality) {
                case 1080:
                    link = playlist.data.links.streaming.vde.fhd
                    break
                case 720:
                    link = playlist.data.links.streaming.vde.hd
                    break
                case 480:
                    link = playlist.data.links.streaming.vde.sd
                    break
            }
        }

        if (dubs.find((i) => i === 'fr-FR')) {
            switch (quality) {
                case 1080:
                    link = playlist.data.links.streaming.vf.fhd
                    break
                case 720:
                    link = playlist.data.links.streaming.vf.hd
                    break
                case 480:
                    link = playlist.data.links.streaming.vf.sd
                    break
            }
        }

        if (!link) return

        const m3u8 = await adnGetM3U8Playlist(link)

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

    await mergeVideoFile(
        file as string,
        undefined,
        [],
        subss,
        seasonFolder,
        `${name.replace(/[/\\?%*:|"<>]/g, '')} Season ${season} Episode ${episode}`,
        format,
        downloadID
    )

    await updatePlaylistByID(downloadID, 'completed')

    await deleteFolder(subFolder)
    await deleteFolder(videoFolder)
}

// Download Crunchyroll Playlist
export async function downloadCrunchyrollPlaylist(
    e: string,
    dubs: Array<string>,
    subs: Array<string>,
    hardsub: { name: string | undefined; locale: string; format: string },
    episodeID: string,
    downloadID: number,
    name: string,
    // eslint-disable-next-line camelcase
    name_episode: string,
    season: number,
    episode: number,
    // eslint-disable-next-line camelcase
    episode_string: string,
    quality: 1080 | 720 | 480 | 360 | 240,
    qualityaudio: number,
    downloadPath: string,
    format: 'mp4' | 'mkv',
    geo: string | undefined
) {
    await updatePlaylistByID(downloadID, 'waiting for playlist')

    const versions = await CrunchyrollService.versions(e)

    if (!versions) {
        MessageBoxBuilder.new('error')
            .button('Cancel', true)
            .detail('Failed to get versions')
            .build('Failed to get versions', 'Failed to get versions')
        server.logger.log({
            level: 'error',
            message: `Failed to get versions ${downloadID}`,
            timestamp: new Date().toISOString(),
            section: 'crunchyrollDownloadProcess'
        })
        return
    }

    let playlist = await CrunchyrollService.playlist(e, geo)

    if (!playlist) {
        await updatePlaylistByID(downloadID, 'failed')
        console.log('Playlist not found')
        MessageBoxBuilder.new('error')
            .button('Cancel', true)
            .detail('Playlist not found')
            .build('Playlist not found', 'Playlist not found')
        server.logger.log({
            level: 'error',
            message: `Playlist not found for Download ${downloadID}`,
            timestamp: new Date().toISOString(),
            section: 'crunchyrollDownloadProcess'
        })
        return
    }

    if (versions && versions.length !== 0) {
        if (playlist.data.audioLocale !== subs[0]) {
            const found = versions.find((v) => v.audio_locale === 'ja-JP')
            if (found) {
                playlist = await CrunchyrollService.playlist(found.guid, found.geo)
            } else {
                console.log('Exact Playlist not found, taking what crunchy gives.')
                MessageBoxBuilder.new('error')
                    .button('Cancel', true)
                    .detail(
                        // eslint-disable-next-line max-len
                        'This usually happens when Crunchyroll displays JP as dub on a language but its not available. The download will fail, just start a new download and remove JP from dubs'
                    )
                    .build('Not found japanese stream', 'Not found japanese stream')
                server.logger.log({
                    level: 'error',
                    message: 'Not found japanese stream',
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcess'
                })
            }
        }
    }

    if (!playlist) {
        await updatePlaylistByID(downloadID, 'failed')
        console.log('Exact Playlist not found')
        return
    }

    const subFolder = await createFolder()

    const audioFolder = await createFolder()

    const videoFolder = await createFolder()

    const chapterFolder = await createFolder()

    let downloadDir: string = downloadPath

    let isSeasonFolderActive = (await settings.get('seasonFolderActive')) as boolean

    if (isSeasonFolderActive === undefined || isSeasonFolderActive === null) {
        await settings.set('seasonFolderActive', true)
        isSeasonFolderActive = true
    }

    if (isSeasonFolderActive) {
        let seasonFolderNaming = (await settings.get('SeasonTemp')) as string

        if (!seasonFolderNaming) {
            seasonFolderNaming = '{seriesName} Season {seasonNumber}'
        }

        seasonFolderNaming = seasonFolderNaming
            .replace('{seriesName}', name.replace(/[/\\?%*:|"<>]/g, ''))
            .replace('{seasonNumber}', season.toString())
            .replace('{seasonNumberDD}', season.toString().padStart(2, '0'))
            .replace('{quality}', quality.toString() + 'p')

        downloadDir = await createFolderName(seasonFolderNaming, downloadPath)
    }

    await updatePlaylistByID(downloadID, undefined, undefined, downloadDir)

    const drmL3blob = (await settings.get('l3blob')) as string
    const drmL3key = (await settings.get('l3key')) as string

    if (drmL3blob) {
        const found = await checkFileExistence(drmL3blob)

        if (!found) {
            MessageBoxBuilder.new('error')
                .button('Cancel', true)
                .detail('Widevine Key path is invalid, downloading without drm decryption')
                .build('Widevine Key path is invalid', 'Widevine Key path is invalid')
            server.logger.log({
                level: 'error',
                message: 'Widevine Key path is invalid, downloading without drm decryption',
                timestamp: new Date().toISOString(),
                section: 'crunchyrollCheckDRMPath'
            })
            await settings.set('CREndpoint', 1)
            await settings.set('l3blob', null)
        }
    }

    if (drmL3key) {
        const found = await checkFileExistence(drmL3key)

        if (!found) {
            MessageBoxBuilder.new('error')
                .button('Cancel', true)
                .detail('Widevine Key path is invalid, downloading without drm decryption')
                .build('Widevine Key path is invalid', 'Widevine Key path is invalid')
            server.logger.log({
                level: 'error',
                message: 'Widevine Key path is invalid, downloading without drm decryption',
                timestamp: new Date().toISOString(),
                section: 'crunchyrollCheckDRMPath'
            })
            await settings.set('CREndpoint', 1)
            await settings.set('l3key', null)
        }
    }

    const dubDownloadList: Array<{
        audio_locale: string
        guid: string
        is_premium_only: boolean
        media_guid: string
        original: boolean
        season_guid: string
        variant: string
        geo: string | undefined
    }> = []

    const subDownloadList: Array<{
        format: string
        language: string
        url: string
        isDub: boolean
    }> = []

    await updatePlaylistByID(downloadID, 'waiting for sub playlist')

    for (const s of subs) {
        let subPlaylist

        if (playlist.data.audioLocale !== 'ja-JP') {
            const foundStream = versions.find((v) => v.audio_locale === 'ja-JP')
            if (foundStream) {
                subPlaylist = await CrunchyrollService.playlist(foundStream.guid, foundStream.geo)
            }
        } else {
            subPlaylist = playlist
        }

        if (!subPlaylist) {
            console.log(`Subtitle Playlist for ${s} not found, skipping`)
            MessageBoxBuilder.new('warning')
                .button('Cancel', true)
                .detail(`Sub Playlist for ${s} not found, skipping download`)
                .build(
                    `Subtitle Playlist for ${s} not found`,
                    `Subtitle Playlist for ${s} not found`
                )
            server.logger.log({
                level: 'error',
                message: `Subtitle Playlist for ${s} not found, skipping`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollSubtitleDownloadProcess'
            })
        }

        if (subPlaylist) {
            const found = subPlaylist.data.subtitles.find((sub) => sub.language === s)
            if (found) {
                subDownloadList.push({ ...found, isDub: false })
                console.log(`Subtitle ${s}.ass found, adding to download`)
                server.logger.log({
                    level: 'info',
                    // eslint-disable-next-line max-len
                    message: `Subtitle ${s}.ass found in Download ${downloadID}, adding to download`,
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessSubtitles'
                })
            } else {
                console.warn(`Subtitle ${s}.ass not found, skipping`)
                server.logger.log({
                    level: 'warn',
                    message: `Subtitle ${s}.ass not found in Download ${downloadID}, skipping`,
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessSubtitles'
                })
            }
        }
    }

    await updatePlaylistByID(downloadID, 'waiting for dub playlist')

    for (const d of dubs) {
        let found
        if (versions) {
            found = versions.find((p) => p.audio_locale === d)
        }

        if (found) {
            const list = await CrunchyrollService.playlist(found.guid, found.geo)
            if (list) {
                const foundSub = list.data.subtitles.find((sub) => sub.language === d)
                if (foundSub) {
                    subDownloadList.push({ ...foundSub, isDub: true })
                } else {
                    console.log(`No Dub Sub Found for ${d}`)
                }
            }
            dubDownloadList.push(found)
            console.log(`Audio ${d}.aac found, adding to download`)
        } else if (versions.length === 0) {
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
                variant: 'asd',
                geo: undefined
            })
        } else {
            console.warn(`Audio ${d}.aac not found, skipping`)
        }
    }

    if (dubDownloadList.length === 0) {
        const jpVersion = versions.find((v) => v.audio_locale === 'ja-JP')

        if (jpVersion) {
            console.log('Using ja-JP Audio because no Audio in download list')
            dubDownloadList.push(jpVersion)
        }
    }

    await updatePlaylistByID(downloadID, 'downloading video')

    const chapterDownload = async () => {
        const metadata = await CrunchyrollService.metadata(e)

        if (!metadata) return null

        if (!metadata.intro && !metadata.credits && !metadata.preview && !metadata.recap) {
            return null
        }

        return await createChapterFile(metadata, chapterFolder, format, e)
    }

    const subDownload = async () => {
        const sbs: Array<string> = []
        for (const sub of subDownloadList) {
            const name = await downloadCRSub(sub, subFolder, quality)
            if (!name) return
            sbs.push(name)
        }
        return sbs
    }

    const audioDownload = async () => {
        const audios: Array<string | undefined> = new Array(dubDownloadList.length).fill(undefined)
        const concurrentDownloads = 2
        const tasks: Array<Promise<void>> = []

        const downloadTask = async (v: any, index: number) => {
            const list = await CrunchyrollService.playlist(v.guid, v.geo)

            if (!list) return

            const playlist = await CrunchyrollService.playlistMpd(list.data.url, list.data.geo)

            if (!playlist) return

            const playlistindex = playlist.mediaGroups.AUDIO.audio.main.playlists[qualityaudio]
                ? qualityaudio
                : 0

            const assetId = playlist.mediaGroups.AUDIO.audio.main.playlists[
                playlistindex
            ].segments[0].resolvedUri.match(/\/assets\/(?:p\/)?([^_,]+)/)

            if (!assetId) {
                console.log(
                    playlist.mediaGroups.AUDIO.audio.main.playlists[playlistindex].segments[0]
                )
                console.log(
                    playlist.mediaGroups.AUDIO.audio.main.playlists[playlistindex].segments[0].uri
                )
                console.log('No AssetID found, exiting.')
                await updatePlaylistByID(downloadID, 'failed')
                MessageBoxBuilder.new('error')
                    .button('Cancel', true)
                    .detail(`No AssetID found, can't download MPD.`)
                    .build(`No AssetID found`, `No AssetID found`)
                server.logger.log({
                    level: 'error',
                    message: `No AssetID found, can't download MPD of Download ${downloadID}`,
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessAudio'
                })
                return
            }

            let pssh
            let keys: { kid: string; key: string }[] | undefined

            const p: { filename: string; url: string }[] = []

            if (playlist.mediaGroups.AUDIO.audio.main.playlists[playlistindex].contentProtection) {
                if (
                    !playlist.mediaGroups.AUDIO.audio.main.playlists![playlistindex]!
                        .contentProtection!['com.widevine.alpha']!.pssh
                ) {
                    console.log('No PSSH found, exiting.')
                    MessageBoxBuilder.new('error')
                        .button('Cancel', true)
                        .detail(
                            // eslint-disable-next-line max-len
                            `Audio file is decrypted, but it looks like not with widevine. Stopping Download. Contact Developer`
                        )
                        .build(`Encryption Detect error`, `Encryption Detect error`)
                    server.logger.log({
                        level: 'error',
                        // eslint-disable-next-line max-len
                        message: `Audio file is decrypted, but it looks like not with widevine in Download ${downloadID}`,
                        error: 'No PSSH found',
                        timestamp: new Date().toISOString(),
                        section: 'crunchyrollDownloadProcessAudioDecryption'
                    })
                    return
                }
                pssh = Uint8ArrayToBase64(
                    playlist.mediaGroups.AUDIO.audio.main.playlists![playlistindex]!
                        .contentProtection!['com.widevine.alpha'].pssh!
                )

                keys = await getDRMKeys(pssh, assetId[1], list.account_id)

                if (!keys) {
                    await updatePlaylistByID(downloadID, 'failed')
                    server.logger.log({
                        level: 'error',
                        message: `No decryption keys, failing Download ${downloadID}`,
                        error: 'No decryption keys',
                        timestamp: new Date().toISOString(),
                        section: 'crunchyrollDownloadProcessAudioDecryption'
                    })
                    throw new Error(`No decryption keys, failing Download ${downloadID}`)
                }
            }

            if (
                (playlist.mediaGroups.AUDIO.audio.main.playlists[playlistindex].contentProtection &&
                    !drmL3blob &&
                    !drmL3key) ||
                (playlist.mediaGroups.AUDIO.audio.main.playlists[playlistindex].contentProtection &&
                    !drmL3blob) ||
                (playlist.mediaGroups.AUDIO.audio.main.playlists[playlistindex].contentProtection &&
                    !drmL3key)
            ) {
                await updatePlaylistByID(downloadID, 'failed')
                MessageBoxBuilder.new('error')
                    .button('Cancel', true)
                    .detail(
                        // eslint-disable-next-line max-len
                        `To download Widevine encrypted videos add the L3 Widevine keys in Settings > Widewine > L3 Keys`
                    )
                    .build(
                        `Audio Widevine encrypted but no key provided`,
                        `Audio Widevine encrypted but no key provided`
                    )
                server.logger.log({
                    level: 'error',
                    // eslint-disable-next-line max-len
                    message: `Audio Widevine encrypted but no key provided in Download ${downloadID}`,
                    // eslint-disable-next-line max-len
                    error: 'To download Widevine encrypted videos add the L3 Widevine keys in Settings > Widewine > L3 Keys',
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessVideo'
                })
                return
            }

            p.push({
                filename: (
                    playlist.mediaGroups.AUDIO.audio.main.playlists[
                        playlistindex
                    ].segments[0].map.uri.match(/([^\/]+)\?/) as RegExpMatchArray
                )[1],
                url: playlist.mediaGroups.AUDIO.audio.main.playlists[playlistindex].segments[0].map
                    .resolvedUri
            })

            for (const s of playlist.mediaGroups.AUDIO.audio.main.playlists[playlistindex]
                .segments) {
                p.push({
                    filename: (s.uri.match(/([^\/]+)\?/) as RegExpMatchArray)[1],
                    url: s.resolvedUri
                })
            }

            const path = await downloadMPDAudio(
                p,
                audioFolder,
                list.data.audioLocale,
                downloadID,
                keys || undefined
            )

            if (path) {
                audios[index] = path as string
            }
        }

        for (const [index, v] of dubDownloadList.entries()) {
            const task = downloadTask(v, index).finally(() => {
                tasks.splice(tasks.indexOf(task), 1)
            })

            tasks.push(task)

            if (tasks.length >= concurrentDownloads) {
                await Promise.race(tasks)
            }
        }

        await Promise.all(tasks)

        return audios.filter((path) => path !== undefined) as string[]
    }

    const downloadVideo = async () => {
        downloading.push({
            id: downloadID,
            status: 'Waiting for Playlist',
            downloadedParts: 0,
            partsToDownload: 0,
            downloadSpeed: 0,
            totalDownloaded: 0
        })

        let code

        if (!playlist) return

        if (versions && versions.length !== 0) {
            if (versions.find((p) => p.audio_locale === dubs[0])) {
                code = versions.find((p) => p.audio_locale === dubs[0])?.guid
            } else {
                code = versions.find((p) => p.audio_locale === 'ja-JP')?.guid
            }
        } else {
            code = e
        }

        if (!code) {
            await updatePlaylistByID(downloadID, 'failed')
            console.log('No Clean stream found')
            MessageBoxBuilder.new('error')
                .button('Cancel', true)
                .detail(`No Clean video stream found`)
                .build('No Clean video stream found', 'No Clean video stream found')
            server.logger.log({
                level: 'error',
                message: `No Clean video stream found in Download ${downloadID}`,
                stream: code,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideo'
            })
            return
        }

        const play = await CrunchyrollService.playlist(code, geo)

        if (!play) {
            await updatePlaylistByID(downloadID, 'failed')
            console.log('Failed to get Playlist in download Video')
            MessageBoxBuilder.new('error')
                .button('Cancel', true)
                .detail(`Failed to get Playlist in download Video`)
                .build(
                    'Failed to get Playlist in download Video',
                    'Failed to get Playlist in download Video'
                )
            server.logger.log({
                level: 'error',
                message: `Failed to get Playlist in download Video in Download ${downloadID}`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideo'
            })
            return
        }

        let downloadURL

        let downloadGEO

        if (hardsub && hardsub.locale) {
            let hardsubURL: string | undefined

            let hardsubGEO: string | undefined

            if (hardsub.format === 'dub') {
                const found = versions.find((h) => h.audio_locale === hardsub.locale)
                if (!found) {
                    hardsubURL = undefined
                } else {
                    const newplay = await CrunchyrollService.playlist(found.guid, found.geo)
                    if (!newplay) {
                        hardsubURL = undefined
                        hardsubGEO = undefined
                    } else {
                        hardsubURL = newplay.data.hardSubs.find(
                            (h) => h.hlang === hardsub.locale
                        )?.url
                        hardsubGEO = newplay.data.hardSubs.find((h) => h.hlang === subs[0])?.geo
                    }
                }
            }

            if (hardsub.format === 'sub') {
                const found = versions.find((h) => h.audio_locale === 'ja-JP')
                if (!found) {
                    hardsubURL = undefined
                } else {
                    const newplay = await CrunchyrollService.playlist(found.guid, found.geo)
                    if (!newplay) {
                        hardsubURL = undefined
                        hardsubGEO = undefined
                    } else {
                        hardsubURL = newplay.data.hardSubs.find(
                            (h) => h.hlang === hardsub.locale
                        )?.url
                        hardsubGEO = newplay.data.hardSubs.find((h) => h.hlang === subs[0])?.geo
                    }
                }
            }

            if (hardsubURL) {
                downloadURL = hardsubURL
                downloadGEO = hardsubGEO
            } else {
                downloadURL = play.data.url
                downloadGEO = play.data.geo
                console.log('Hardsub Playlist not found')
                MessageBoxBuilder.new('error')
                    .button('Cancel', true)
                    .detail(
                        // eslint-disable-next-line max-len
                        `${hardsub.locale} Hardsub Playlist not found, downloading japanese playlist instead.`
                    )
                    .build('Hardsub Playlist not found', 'Hardsub Playlist not found')
                server.logger.log({
                    level: 'error',
                    // eslint-disable-next-line max-len
                    message: `${hardsub.locale} Hardsub Playlist not found, downloading japanese playlist instead.`,
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessVideo'
                })
            }
        } else {
            downloadURL = play.data.url
            downloadGEO = play.data.geo
        }

        const mdp = await CrunchyrollService.playlistMpd(downloadURL, downloadGEO)

        if (!mdp) return

        let q: number

        switch (quality) {
            case 1080:
                q = 720
                break
            case 720:
                q = 480
                break
            case 480:
                q = 360
                break
            case 360:
                q = 240
                break
            case 240:
                q = 200
                break
        }

        let hq = mdp.playlists.find(
            (i) => i.attributes.RESOLUTION!.height <= quality && i.attributes.RESOLUTION!.height > q
        )

        if (!hq) {
            console.log(
                // eslint-disable-next-line max-len
                `Res ${quality}p not found, using res ${mdp.playlists[0].attributes.RESOLUTION?.height}p instead`
            )
            MessageBoxBuilder.new('warning')
                .button('Ok', true)
                .detail(
                    // eslint-disable-next-line max-len
                    `Resolution ${quality}p not found, using resolution ${mdp.playlists[0].attributes.RESOLUTION?.height}p instead`
                )
                .build(`Resolution ${quality}p not found`, `Resolution ${quality}p not found`)
            server.logger.log({
                level: 'warn',
                // eslint-disable-next-line max-len
                message: `Resolution ${quality}p not found in Download ${downloadID}, using resolution ${mdp.playlists[0].attributes.RESOLUTION?.height}p instead`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideo'
            })

            await updatePlaylistByID(
                downloadID,
                undefined,
                mdp.playlists[0].attributes.RESOLUTION?.height as 1080 | 720 | 480 | 360 | 240
            )

            hq = mdp.playlists[0]
        }

        const assetId = hq.segments[0].resolvedUri.match(/\/assets\/(?:p\/)?([^_,]+)/)

        if (!assetId) {
            await updatePlaylistByID(downloadID, 'failed')
            console.log('No AssetID found, exiting.')
            MessageBoxBuilder.new('error')
                .button('Cancel', true)
                .detail(`No AssetID found in Video Playlist`)
                .build('No AssetID found', 'No AssetID found')
            server.logger.log({
                level: 'error',
                message: `No AssetID found in Video Playlist in Download ${downloadID}`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideo'
            })
            return
        }

        let pssh
        let keys: { kid: string; key: string }[] | undefined

        if (hq.contentProtection) {
            if (!hq.contentProtection['com.widevine.alpha'].pssh) {
                await updatePlaylistByID(downloadID, 'failed')
                console.log('No PSSH found, exiting.')
                MessageBoxBuilder.new('error')
                    .button('Cancel', true)
                    .detail(
                        // eslint-disable-next-line max-len
                        `Video file is decrypted, but it looks like not with widevine. Stopping Download. Contact Developer`
                    )
                    .build('Encryption Detect error', 'Encryption Detect error')
                server.logger.log({
                    level: 'error',
                    // eslint-disable-next-line max-len
                    message: `Video file is decrypted, but it looks like not with widevine in Download ${downloadID}`,
                    error: 'No PSSH found',
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessVideoDecryption'
                })
                return
            }
            pssh = Uint8ArrayToBase64(hq.contentProtection['com.widevine.alpha'].pssh)

            keys = await getDRMKeys(pssh, assetId[1], play.account_id)

            if (!keys) {
                await updatePlaylistByID(downloadID, 'failed')
                server.logger.log({
                    level: 'error',
                    message: `No decryption keys, failing Download ${downloadID}`,
                    error: 'No decryption keys',
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessVideoDecryption'
                })
                throw new Error(`No decryption keys, failing Download ${downloadID}`)
            }
        }

        if (
            (hq.contentProtection && !drmL3blob && !drmL3key) ||
            (hq.contentProtection && !drmL3blob) ||
            (hq.contentProtection && !drmL3key)
        ) {
            await updatePlaylistByID(downloadID, 'failed')
            MessageBoxBuilder.new('error')
                .button('Cancel', true)
                .detail(
                    // eslint-disable-next-line max-len
                    `To download Widevine encrypted videos add the L3 Widevine keys in Settings > Widewine > L3 Keys`
                )
                .build(
                    'Video Widevine encrypted but no key provided',
                    'Video Widevine encrypted but no key provided'
                )
            server.logger.log({
                level: 'error',
                message: `Video Widevine encrypted but no key provided in Download ${downloadID}`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideoDecryption'
            })
            return
        }

        const p: { filename: string; url: string }[] = []

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

        const file = await downloadParts(p, downloadID, videoFolder, keys || undefined)

        await updatePlaylistByID(downloadID, 'awaiting all dubs downloaded')

        return file
    }

    const [chapter, subss, audios, file] = await Promise.all([
        chapterDownload(),
        subDownload(),
        audioDownload(),
        downloadVideo()
    ])

    if (!audios) return

    if (!subss) return

    await updatePlaylistByID(downloadID, 'merging video & audio')

    let episodeNaming = (await settings.get('EpisodeTemp')) as string

    if (!episodeNaming) {
        episodeNaming = '{seriesName} Season {seasonNumber} Episode {episodeNumber}'
    }

    episodeNaming = episodeNaming
        .replace('{seriesName}', name.replace(/[/\\?%*:|"<>]/g, ''))
        .replace(
            '{episodeName}',
            // eslint-disable-next-line camelcase
            name_episode ? name_episode.replace(/[/\\?%*:|"<>]/g, '') : 'no title'
        )
        .replace('{seasonNumber}', season.toString())
        .replace('{seasonNumberDD}', season.toString().padStart(2, '0'))
        // eslint-disable-next-line camelcase
        .replace('{episodeNumber}', episode ? episode.toString() : episode_string)
        .replace(
            '{episodeNumberDD}',
            // eslint-disable-next-line camelcase
            episode ? episode.toString().padStart(2, '0') : episode_string
        )
        .replace('{episodeID}', episodeID)
        .replace('{quality}', quality.toString() + 'p')

    await mergeVideoFile(
        file as string,
        chapter,
        audios,
        subss,
        downloadDir,
        episodeNaming,
        format,
        downloadID
    )

    await updatePlaylistByID(downloadID, 'completed')

    await deleteFolder(videoFolder)
    await deleteFolder(subFolder)
    await deleteFolder(audioFolder)
    await deleteFolder(chapterFolder)

    return playlist
}

async function downloadParts(
    parts: { filename: string; url: string }[],
    downloadID: number,
    dir: string,
    drmkeys?: { kid: string; key: string }[] | undefined
) {
    const downloadedParts: { filename: string; url: string }[] = []

    const path = await createFolder()
    const dn = downloading.find((i) => i.id === downloadID)

    let totalDownloadedBytes = 0
    let totalSizeBytes = 0
    const startTime = Date.now()

    async function downloadPart(part: { filename: string; url: string }, ind: number) {
        try {
            let stream

            console.log(`[Video DOWNLOAD] Fetching Part ${ind + 1}`)

            const rawres = await fetch(part.url)

            const response = rawres.clone()

            if (!response.ok) {
                throw new Error(await response.text())
            }

            console.log(`[Video DOWNLOAD] Writing Part ${ind + 1}`)

            // eslint-disable-next-line prefer-const
            stream = fs.createWriteStream(`${path}/${part.filename}`)

            const readableStream = Readable.from(response.body as any)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            let partDownloadedBytes = 0

            readableStream.on('data', (chunk) => {
                partDownloadedBytes += chunk.length
                totalDownloadedBytes += chunk.length
                totalSizeBytes += chunk.length
            })

            await finished(readableStream.pipe(stream))

            console.log(`[Video DOWNLOAD] Part ${ind + 1} downloaded`)

            downloadedParts.push(part)

            if (dn) {
                const tot = totalSizeBytes
                dn.downloadedParts++
                const endTime = Date.now()
                const durationInSeconds = (endTime - startTime) / 1000
                dn.downloadSpeed = totalDownloadedBytes / 1024 / 1024 / durationInSeconds
                dn.totalDownloaded = tot
            }
        } catch (error) {
            console.error(`Error occurred during download of fragment ${ind + 1}:`, error)
            server.logger.log({
                level: 'error',
                message: `Error occurred during download of fragment ${ind + 1}`,
                error,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideoDownload'
            })
            console.log(`Retrying download of fragment ${ind + 1}...`)
            server.logger.log({
                level: 'warn',
                message: `Retrying download of fragment ${ind + 1} because failed`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideoDownload'
            })
            await downloadPart(part, ind)
        }
    }

    for (const [index, part] of parts.entries()) {
        await downloadPart(part, index)
    }

    if (parts[6] !== downloadedParts[6] && dn) {
        MessageBoxBuilder.new('error')
            .button('Cancel', true)
            .detail(`Validation returned downloaded parts are invalid`)
            .build('Video Download failed', 'Video Download failed')
        server.logger.log({
            level: 'error',
            message: 'Video Download failed',
            error: 'Validation returned downloaded parts are invalid',
            parts,
            partsdownloaded: downloadedParts,
            timestamp: new Date().toISOString(),
            section: 'VideoCrunchyrollValidation'
        })
        await updatePlaylistByID(downloadID, 'failed')
        return
    }

    return await mergeParts(parts, downloadID, path, dir, drmkeys)
}

async function mergeParts(
    parts: { filename: string; url: string }[],
    downloadID: number,
    tmp: string,
    dir: string,
    drmkeys: { kid: string; key: string }[] | undefined
) {
    const tempname = (Math.random() + 1).toString(36).substring(2)

    try {
        const list: Array<string> = []

        await updatePlaylistByID(downloadID, 'merging video')
        isDownloading--

        for (const [, part] of parts.entries()) {
            list.push(`${tmp}/${part.filename}`)
        }

        let concatenatedFile: string

        if (drmkeys) {
            concatenatedFile = `${tmp}/temp-main.m4s`
        } else {
            concatenatedFile = `${tmp}/main.m4s`
        }

        await concatenateTSFiles(list, concatenatedFile)

        if (drmkeys) {
            const found = await checkFileExistence(`${tmp}/temp-main.m4s`)

            if (!found) {
                server.logger.log({
                    level: 'error',
                    message: `Temp Videofile not found ${downloadID}`,
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessVideoMerging'
                })
            }

            await updatePlaylistByID(downloadID, 'decrypting video')
            console.log('Video Decryption started')

            await execFile(shaka, [
                `input=${tmp}/temp-main.m4s,stream=video,output=${tmp}/main.m4s`,
                '--enable_raw_key_decryption',
                '--keys',
                `key_id=${drmkeys[1].kid}:key=${drmkeys[1].key}`
            ])

            console.log('Video Decryption finished')
            concatenatedFile = `${tmp}/main.m4s`
        }

        const found = await checkFileExistence(`${tmp}/main.m4s`)

        if (!found) {
            server.logger.log({
                level: 'error',
                message: `Temp Videofile not found ${downloadID}`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideoMerging'
            })
        }

        return new Promise((resolve) => {
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
        await updatePlaylistByID(downloadID, 'failed')
        MessageBoxBuilder.new('error')
            .button('Cancel', true)
            .detail(`Error merging video parts`)
            .build('Error merging video parts', 'Error merging video parts')
        server.logger.log({
            level: 'error',
            message: `Error merging video parts of Download ${downloadID}`,
            error,
            timestamp: new Date().toISOString(),
            section: 'crunchyrollDownloadProcessVideoMerging'
        })
    }
}

// eslint-disable-next-line require-await
async function mergeVideoFile(
    video: string,
    chapter: string | null | undefined,
    audios: Array<string>,
    subs: Array<string>,
    path: string,
    filename: string,
    format: 'mp4' | 'mkv',
    downloadID: number
) {
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
        { locale: 'ko-KR', name: 'KO', iso: 'kor', title: 'Korean' },
        { locale: 'zh-CN', name: 'CN', iso: 'zho', title: 'Chinese' }
    ]

    return new Promise((resolve, reject) => {
        if (!ffmpegP.ffmpeg || !ffmpegP.ffprobe) return
        const output = Ffmpeg().setFfmpegPath(ffmpegP.ffmpeg).setFfprobePath(ffmpegP.ffprobe)
        let ffindex = 1
        output.addInput(video)
        if (chapter) {
            output.addInput(chapter)
            ffindex++
        }
        const options = [
            chapter ? '-map_metadata 1' : '-map_metadata -1',
            '-metadata:s:v:0 VENDOR_ID=',
            '-metadata:s:v:0 language=',
            '-c copy',
            '-map 0'
        ]
        if (format === 'mp4') {
            options.push('-c:s mov_text')
        }

        for (const [index, a] of audios.entries()) {
            output.addInput(a)
            options.push(`-map ${ffindex}:a:0`)
            options.push(
                `-metadata:s:a:${index} language=${
                    locales.find((l) => l.locale === getFilename(a, '.aac', '/'))
                        ? locales.find((l) => l.locale === getFilename(a, '.aac', '/'))?.iso
                        : getFilename(a, '.aac', '/')
                }`
            )
            options.push(
                `-metadata:s:a:${index} title=${
                    locales.find((l) => l.locale === getFilename(a, '.aac', '/'))
                        ? locales.find((l) => l.locale === getFilename(a, '.aac', '/'))?.title
                        : getFilename(a, '.aac', '/')
                }`
            )

            ffindex++
        }

        options.push(`-disposition:a:0 default`)

        if (subs) {
            for (const [index, s] of subs.entries()) {
                output.addInput(s)
                options.push(`-map ${ffindex}:s`)

                if (s.includes('-FORCED')) {
                    options.push(
                        `-metadata:s:s:${index} language=${
                            locales.find((l) => l.locale === getFilename(s, '-FORCED.ass', '/'))
                                ? locales.find(
                                      (l) => l.locale === getFilename(s, '-FORCED.ass', '/')
                                  )?.iso
                                : getFilename(s, '-FORCED.ass', '/')
                        }`
                    )
                } else {
                    options.push(
                        `-metadata:s:s:${index} language=${
                            locales.find((l) => l.locale === getFilename(s, '.ass', '/'))
                                ? locales.find((l) => l.locale === getFilename(s, '.ass', '/'))?.iso
                                : getFilename(s, '.ass', '/')
                        }`
                    )
                }

                if (s.includes('-FORCED')) {
                    options.push(
                        `-metadata:s:s:${index} title=${
                            locales.find((l) => l.locale === getFilename(s, '-FORCED.ass', '/'))
                                ? locales.find(
                                      (l) => l.locale === getFilename(s, '-FORCED.ass', '/')
                                  )?.title
                                : getFilename(s, '-FORCED.ass', '/')
                        }[FORCED]`
                    )
                } else {
                    options.push(
                        `-metadata:s:s:${index} title=${
                            locales.find((l) => l.locale === getFilename(s, '.ass', '/'))
                                ? locales.find((l) => l.locale === getFilename(s, '.ass', '/'))
                                      ?.title
                                : getFilename(s, '.ass', '/')
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
                updatePlaylistByID(downloadID, 'failed')
                MessageBoxBuilder.new('error')
                    .button('Cancel', true)
                    .detail(`Error merging videos and audios`)
                    .build('Error merging videos and audios', 'Error merging videos and audios')
                server.logger.log({
                    level: 'error',
                    message: `Error merging videos and audios of Download ${downloadID}`,
                    error,
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessVideoMergingFFMPEG'
                })
                reject(error)
            })
            // eslint-disable-next-line require-await
            .on('end', async () => {
                console.log('Download finished')
                return resolve('combined')
            })
    })
}

export async function checkProxies() {
    const cachedData = server.CacheController.get('proxycheck') as {
        name: string
        code: string
        url: string
        status: string | undefined
    }[]

    if (!cachedData) {
        const proxies: { name: string; code: string; url: string; status: string | undefined }[] = [
            {
                name: 'US Proxy',
                code: 'US',
                url: 'https://us-proxy.crd.cx/',
                status: undefined
            },
            {
                name: 'UK Proxy',
                code: 'GB',
                url: 'https://uk-proxy.crd.cx/',
                status: undefined
            },
            {
                name: 'DE Proxy',
                code: 'DE',
                url: 'https://de-proxy.crd.cx/',
                status: undefined
            }
        ]

        for (const p of proxies) {
            try {
                const response: Response = await Promise.race([
                    fetch(p.url + 'health', { method: 'GET' }),
                    new Promise<Response>((_resolve, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), 500)
                    )
                ])

                if (response.ok) {
                    p.status = 'online'
                } else {
                    p.status = 'offline'
                }
            } catch (error) {
                p.status = 'offline'
            }
        }

        server.CacheController.set('proxycheck', proxies, 60)

        return proxies
    }

    return cachedData
}
