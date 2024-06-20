import { Account, Playlist } from '../../db/database'
import { downloadMPDAudio } from '../../services/audio'
import { concatenateTSFiles } from '../../services/concatenate'
import { checkFileExistence, createFolder, createFolderName, deleteFolder, deleteTemporaryFolders } from '../../services/folder'
import { downloadADNSub, downloadCRSub } from '../../services/subs'
import { CrunchyEpisode } from '../../types/crunchyroll'
import { checkAccountMaxStreams, crunchyGetMetadata, crunchyGetPlaylist, crunchyGetPlaylistMPD } from '../crunchyroll/crunchyroll.service'
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
import { server } from '../../api'
import { createChapterFile } from '../../services/chapter'
const exec = util.promisify(require('child_process').exec)

// Get All Accounts
export async function getAllAccounts() {
    try {
        const accounts = await Account.findAll({
            attributes: { exclude: ['password'] }
        })

        return accounts
    } catch (e) {
        messageBox('error', ['Cancel'], 2, 'Database Error', 'Failed to get all accounts', JSON.stringify(e))
        server.logger.log({
            level: 'error',
            message: 'Failed to get all accounts',
            error: e,
            timestamp: new Date().toISOString(),
            section: 'loginGetAccountsDatabase'
        })
    }
}

// Delete Account
export async function deleteAccountID(id: number) {
    try {
        const account = await Account.destroy({
            where: {
                id: id
            }
        })

        return account
    } catch (e) {
        messageBox('error', ['Cancel'], 2, 'Database Error', 'Failed to delete account', JSON.stringify(e))
        server.logger.log({
            level: 'error',
            message: 'Failed to delete account',
            error: e,
            timestamp: new Date().toISOString(),
            section: 'loginDeleteDatabase'
        })
    }
}

// DB Account existence check
export async function loggedInCheck(service: string) {
    try {
        const login = await Account.findOne({
            where: {
                service: service
            }
        })

        return login?.get()
    } catch (e) {
        messageBox('error', ['Cancel'], 2, 'Database Error', 'Failed to check if logged in', JSON.stringify(e))
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
export async function safeLoginData(user: string, password: string, service: string) {
    try {
        const login = await Account.create({
            username: user,
            password: password,
            service: service
        })

        return login?.get()
    } catch (e) {
        messageBox('error', ['Cancel'], 2, 'Database Error', 'Failed to save login data', JSON.stringify(e))
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
        await Playlist.update({ status: status, quality: quality, installDir: installedDir }, { where: { id: id } })

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
        messageBox('error', ['Cancel'], 2, 'Database Error', 'Failed to update playlist item', 'Failed to update playlist item')
        server.logger.log({
            level: 'error',
            message: 'Failed to update playlist item',
            error: e,
            timestamp: new Date().toISOString(),
            section: 'playlistItemUpdateDatabase'
        })
    }
}

// Add Episode to Playlist
export async function addEpisodeToPlaylist(
    e: CrunchyEpisode,
    s: Array<string>,
    d: Array<string>,
    dir: string,
    hardsub: boolean,
    status:
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
    status: string
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
    try {
        const eps = await Playlist.findAll({ where: { status: 'waiting' } })

        for (const e of eps) {
            if (isDownloading < 3 && e.dataValues.status === 'waiting') {
                updatePlaylistByID(e.dataValues.id, 'preparing')
                isDownloading++
                server.logger.log({
                    level: 'info',
                    message: `Added Playlist Item ${e.dataValues.id} to Download Process`,
                    timestamp: new Date().toISOString(),
                    section: 'playlistCheckCron'
                })
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
                        (e.dataValues.media as CrunchyEpisode).episode,
                        e.dataValues.quality,
                        e.dataValues.dir,
                        e.dataValues.format,
                        (e.dataValues.media as CrunchyEpisode).geo
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

    await mergeVideoFile(file as string, undefined, [], subss, seasonFolder, `${name.replace(/[/\\?%*:|"<>]/g, '')} Season ${season} Episode ${episode}`, format, downloadID)

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
    episode_string: string,
    quality: 1080 | 720 | 480 | 360 | 240,
    downloadPath: string,
    format: 'mp4' | 'mkv',
    geo: string | undefined
) {
    await updatePlaylistByID(downloadID, 'waiting for playlist')

    var playlist = await crunchyGetPlaylist(e, geo)

    if (!playlist) {
        await updatePlaylistByID(downloadID, 'failed')
        console.log('Playlist not found')
        messageBox('error', ['Cancel'], 2, 'Playlist not found', 'Playlist not found', 'Playlist not found')
        server.logger.log({
            level: 'error',
            message: `Playlist not found for Download ${downloadID}`,
            timestamp: new Date().toISOString(),
            section: 'crunchyrollDownloadProcess'
        })
        return
    }

    if (playlist.data.versions && playlist.data.versions.length !== 0) {
        if (playlist.data.audioLocale !== subs[0]) {
            const found = playlist.data.versions.find((v) => v.audio_locale === 'ja-JP')
            if (found) {
                playlist = await crunchyGetPlaylist(found.guid, found.geo)
            } else {
                console.log('Exact Playlist not found, taking what crunchy gives.')
                messageBox(
                    'error',
                    ['Cancel'],
                    2,
                    'Not found japanese stream',
                    'Not found japanese stream',
                    'This usually happens when Crunchyroll displays JP as dub on a language but its not available. The download will fail, just start a new download and remove JP from dubs'
                )
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

    var seasonFolderNaming = (await settings.get('SeasonTemp')) as string

    if (!seasonFolderNaming) {
        seasonFolderNaming = '{seriesName} Season {seasonNumber}'
    }

    seasonFolderNaming = seasonFolderNaming
        .replace('{seriesName}', name.replace(/[/\\?%*:|"<>]/g, ''))
        .replace('{seasonNumber}', season.toString())
        .replace('{seasonNumberDD}', season.toString().padStart(2, '0'))
        .replace('{quality}', quality.toString() + 'p')

    const seasonFolder = await createFolderName(seasonFolderNaming, downloadPath)

    await updatePlaylistByID(downloadID, undefined, undefined, seasonFolder)

    const drmL3blob = (await settings.get('l3blob')) as string
    const drmL3key = (await settings.get('l3key')) as string

    if (drmL3blob) {
        const found = await checkFileExistence(drmL3blob)

        if (!found) {
            messageBox('error', ['Cancel'], 2, 'Widevine Key path is invalid', 'Widevine Key path is invalid', 'Widevine Key path is invalid, downloading without drm decryption')
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
            messageBox('error', ['Cancel'], 2, 'Widevine Key path is invalid', 'Widevine Key path is invalid', 'Widevine Key path is invalid, downloading without drm decryption')
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
        var subPlaylist

        if (playlist.data.audioLocale !== 'ja-JP') {
            const foundStream = playlist.data.versions.find((v) => v.audio_locale === 'ja-JP')
            if (foundStream) {
                subPlaylist = await crunchyGetPlaylist(foundStream.guid, foundStream.geo)
            }
        } else {
            subPlaylist = playlist
        }

        if (!subPlaylist) {
            await updatePlaylistByID(downloadID, 'failed')
            console.log('Subtitle Playlist not found')
            messageBox('error', ['Cancel'], 2, 'Subtitle Playlist not found', 'Subtitle Playlist not found', 'Subtitle Playlist not found')
            server.logger.log({
                level: 'error',
                message: 'Subtitle Playlist not found',
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcess'
            })
            return
        }

        const found = subPlaylist.data.subtitles.find((sub) => sub.language === s)
        if (found) {
            subDownloadList.push({ ...found, isDub: false })
            console.log(`Subtitle ${s}.ass found, adding to download`)
            server.logger.log({
                level: 'info',
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

    await updatePlaylistByID(downloadID, 'waiting for dub playlist')

    for (const d of dubs) {
        var found
        if (playlist.data.versions) {
            found = playlist.data.versions.find((p) => p.audio_locale === d)
        }

        if (found) {
            const list = await crunchyGetPlaylist(found.guid, found.geo)
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
                variant: 'asd',
                geo: undefined
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

    await updatePlaylistByID(downloadID, 'downloading video')

    const chapterDownload = async () => {
        const metadata = await crunchyGetMetadata(e)

        if (!metadata.intro && !metadata.credits && !metadata.preview && !metadata.recap) {
            return null
        }

        const chapterPath = await createChapterFile(metadata, chapterFolder)

        return chapterPath
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
            const list = await crunchyGetPlaylist(v.guid, v.geo)

            if (!list) return

            const playlist = await crunchyGetPlaylistMPD(list.data.url, list.data.geo)

            if (!playlist) return

            const assetId = playlist.mediaGroups.AUDIO.audio.main.playlists[0].segments[0].resolvedUri.match(/\/assets\/(?:p\/)?([^_,]+)/)

            if (!assetId) {
                console.log(playlist.mediaGroups.AUDIO.audio.main.playlists[0].segments[0])
                console.log(playlist.mediaGroups.AUDIO.audio.main.playlists[0].segments[0].uri)
                console.log('No AssetID found, exiting.')
                await updatePlaylistByID(downloadID, 'failed')
                messageBox('error', ['Cancel'], 2, 'No AssetID found', 'No AssetID found', "No AssetID found, can't download MPD.")
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

            let p: { filename: string; url: string }[] = []

            if (playlist.mediaGroups.AUDIO.audio.main.playlists[0].contentProtection) {
                if (!playlist.mediaGroups.AUDIO.audio.main.playlists[0].contentProtection['com.widevine.alpha'].pssh) {
                    console.log('No PSSH found, exiting.')
                    messageBox(
                        'error',
                        ['Cancel'],
                        2,
                        'Encryption Detect error',
                        'Encryption Detect error',
                        'Audio file is decrypted, but it looks like not with widevine. Stopping Download. Contact Developer'
                    )
                    server.logger.log({
                        level: 'error',
                        message: `Audio file is decrypted, but it looks like not with widevine in Download ${downloadID}`,
                        error: 'No PSSH found',
                        timestamp: new Date().toISOString(),
                        section: 'crunchyrollDownloadProcessAudioDecryption'
                    })
                    return
                }
                pssh = Uint8ArrayToBase64(playlist.mediaGroups.AUDIO.audio.main.playlists[0].contentProtection['com.widevine.alpha'].pssh)

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
                    throw Error(`No decryption keys, failing Download ${downloadID}`)
                }
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
                server.logger.log({
                    level: 'error',
                    message: `Audio Widevine encrypted but no key provided in Download ${downloadID}`,
                    error: 'To download Widevine encrypted videos add the L3 Widevine keys in Settings > Widewine > L3 Keys',
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessVideo'
                })
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

            const path = await downloadMPDAudio(p, audioFolder, list.data.audioLocale, downloadID, keys ? keys : undefined)

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
            messageBox('error', ['Cancel'], 2, 'No Clean video stream found', 'No Clean video stream found', 'No Clean video stream found')
            server.logger.log({
                level: 'error',
                message: `No Clean video stream found in Download ${downloadID}`,
                stream: code,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideo'
            })
            return
        }

        const play = await crunchyGetPlaylist(code, geo)

        if (!play) {
            await updatePlaylistByID(downloadID, 'failed')
            console.log('Failed to get Playlist in download Video')
            messageBox('error', ['Cancel'], 2, 'Failed to get Playlist in download Video', 'Failed to get Playlist in download Video', 'Failed to get Playlist in download Video')
            server.logger.log({
                level: 'error',
                message: `Failed to get Playlist in download Video in Download ${downloadID}`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideo'
            })
            return
        }

        var downloadURL

        var downloadGEO

        if (hardsub) {
            const hardsubURL = play.data.hardSubs.find((h) => h.hlang === subs[0])?.url

            const hardsubGEO = play.data.hardSubs.find((h) => h.hlang === subs[0])?.geo

            if (hardsubURL) {
                downloadURL = hardsubURL
                downloadGEO = hardsubGEO
                console.log('Hardsub Playlist found')
            } else {
                downloadURL = play.data.url
                downloadGEO = play.data.geo
                console.log('Hardsub Playlist not found')
            }
        } else {
            downloadURL = play.data.url
            downloadGEO = play.data.geo
            console.log('Hardsub disabled, skipping')
        }

        var mdp = await crunchyGetPlaylistMPD(downloadURL, downloadGEO)

        if (!mdp) return

        var hq = mdp.playlists.find((i) => i.attributes.RESOLUTION?.height === quality)

        if (!hq) {
            console.log(`Res ${quality}p not found, using res ${mdp.playlists[0].attributes.RESOLUTION?.height}p instead`)
            messageBox(
                'warning',
                ['OK'],
                5,
                `Resolution ${quality}p not found`,
                `Resolution ${quality}p not found`,
                `Resolution ${quality}p not found, using resolution ${mdp.playlists[0].attributes.RESOLUTION?.height}p instead`
            )

            server.logger.log({
                level: 'warn',
                message: `Resolution ${quality}p not found in Download ${downloadID}, using resolution ${mdp.playlists[0].attributes.RESOLUTION?.height}p instead`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideo'
            })

            await updatePlaylistByID(downloadID, undefined, mdp.playlists[0].attributes.RESOLUTION?.height as 1080 | 720 | 480 | 360 | 240)

            hq = mdp.playlists[0]
        }

        const assetId = hq.segments[0].resolvedUri.match(/\/assets\/(?:p\/)?([^_,]+)/)

        if (!assetId) {
            await updatePlaylistByID(downloadID, 'failed')
            console.log('No AssetID found, exiting.')
            messageBox('error', ['Cancel'], 2, 'No AssetID found', 'No AssetID found', 'No AssetID found in Video Playlist')
            server.logger.log({
                level: 'error',
                message: `No AssetID found in Video Playlist in Download ${downloadID}`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideo'
            })
            return
        }

        var pssh
        var keys: { kid: string; key: string }[] | undefined

        if (hq.contentProtection) {
            if (!hq.contentProtection['com.widevine.alpha'].pssh) {
                await updatePlaylistByID(downloadID, 'failed')
                console.log('No PSSH found, exiting.')
                messageBox(
                    'error',
                    ['Cancel'],
                    2,
                    'Encryption Detect error',
                    'Encryption Detect error',
                    'Video file is decrypted, but it looks like not with widevine. Stopping Download. Contact Developer'
                )
                server.logger.log({
                    level: 'error',
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
                throw Error(`No decryption keys, failing Download ${downloadID}`)
            }
        }

        if ((hq.contentProtection && !drmL3blob && !drmL3key) || (hq.contentProtection && !drmL3blob) || (hq.contentProtection && !drmL3key)) {
            await updatePlaylistByID(downloadID, 'failed')
            messageBox(
                'error',
                ['Cancel'],
                2,
                'Video Widevine encrypted but no key provided',
                'Video Widevine encrypted but no key provided',
                'To download Widevine encrypted videos add the L3 Widevine keys in Settings > Widewine > L3 Keys'
            )
            server.logger.log({
                level: 'error',
                message: `Video Widevine encrypted but no key provided in Download ${downloadID}`,
                timestamp: new Date().toISOString(),
                section: 'crunchyrollDownloadProcessVideoDecryption'
            })
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

        await updatePlaylistByID(downloadID, 'awaiting all dubs downloaded')

        return file
    }

    const [chapter, subss, audios, file] = await Promise.all([chapterDownload(), subDownload(), audioDownload(), downloadVideo()])

    if (!audios) return

    if (!subss) return

    await updatePlaylistByID(downloadID, 'merging video & audio')

    var episodeNaming = (await settings.get('EpisodeTemp')) as string

    if (!episodeNaming) {
        episodeNaming = '{seriesName} Season {seasonNumber} Episode {episodeNumber}'
    }

    episodeNaming = episodeNaming
        .replace('{seriesName}', name.replace(/[/\\?%*:|"<>]/g, ''))
        .replace('{seasonNumber}', season.toString())
        .replace('{seasonNumberDD}', season.toString().padStart(2, '0'))
        .replace('{episodeNumber}', episode ? episode.toString() : episode_string)
        .replace('{episodeNumberDD}', episode ? episode.toString().padStart(2, '0') : episode_string)
        .replace('{quality}', quality.toString() + 'p')

    await mergeVideoFile(file as string, chapter, audios, subss, seasonFolder, episodeNaming, format, downloadID)

    await updatePlaylistByID(downloadID, 'completed')

    await deleteFolder(videoFolder)
    await deleteFolder(subFolder)
    await deleteFolder(audioFolder)
    await deleteFolder(chapterFolder)

    return playlist
}

async function downloadParts(parts: { filename: string; url: string }[], downloadID: number, dir: string, drmkeys?: { kid: string; key: string }[] | undefined) {
    const downloadedParts: { filename: string; url: string }[] = []

    const path = await createFolder()
    const dn = downloading.find((i) => i.id === downloadID)

    let totalDownloadedBytes = 0
    let totalSizeBytes = 0
    let startTime = Date.now()

    async function downloadPart(part: { filename: string; url: string }, ind: number) {
        try {
            var stream

            console.log(`[Video DOWNLOAD] Fetching Part ${ind + 1}`)

            const response = await fetch(part.url)

            if (!response.ok) {
                throw Error(await response.text())
            }

            console.log(`[Video DOWNLOAD] Writing Part ${ind + 1}`)

            stream = fs.createWriteStream(`${path}/${part.filename}`)

            const readableStream = Readable.from(response.body as any)
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
                error: error,
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
        messageBox('error', ['Cancel'], 2, 'Video Download failed', 'Video Download failed', 'Validation returned downloaded parts are invalid')
        server.logger.log({
            level: 'error',
            message: 'Video Download failed',
            error: 'Validation returned downloaded parts are invalid',
            parts: parts,
            partsdownloaded: downloadedParts,
            timestamp: new Date().toISOString(),
            section: 'VideoCrunchyrollValidation'
        })
        await updatePlaylistByID(downloadID, 'failed')
        return
    }

    return await mergeParts(parts, downloadID, path, dir, drmkeys)
}

async function mergeParts(parts: { filename: string; url: string }[], downloadID: number, tmp: string, dir: string, drmkeys: { kid: string; key: string }[] | undefined) {
    const tempname = (Math.random() + 1).toString(36).substring(2)

    try {
        const list: Array<string> = []

        await updatePlaylistByID(downloadID, 'merging video')
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
            const inputFilePath = `${tmp}/temp-main.m4s`
            const outputFilePath = `${tmp}/main.m4s`
            const keyArgument = `--show-progress --key ${drmkeys[1].kid}:${drmkeys[1].key}`

            const command = `${mp4e} ${keyArgument} "${inputFilePath}" "${outputFilePath}"`

            await exec(command)
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
        await updatePlaylistByID(downloadID, 'failed')
        messageBox('error', ['Cancel'], 2, 'Error merging video parts', 'Error merging video parts', 'Error merging video parts')
        server.logger.log({
            level: 'error',
            message: `Error merging video parts of Download ${downloadID}`,
            error: error,
            timestamp: new Date().toISOString(),
            section: 'crunchyrollDownloadProcessVideoMerging'
        })
    }
}

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
        { locale: 'ko-KR', name: 'KO', iso: 'kor', title: 'Korean' }
    ]

    return new Promise((resolve, reject) => {
        if (!ffmpegP.ffmpeg || !ffmpegP.ffprobe) return
        var output = Ffmpeg().setFfmpegPath(ffmpegP.ffmpeg).setFfprobePath(ffmpegP.ffprobe)
        var ffindex = 1
        output.addInput(video)
        if (chapter) {
            output.addInput(chapter)
            ffindex++
        }
        var options = [ chapter ? '-map_metadata 1' : '-map_metadata -1', '-metadata:s:v:0 VENDOR_ID=', '-metadata:s:v:0 language=', '-c copy', '-map 0']
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
                updatePlaylistByID(downloadID, 'failed')
                messageBox('error', ['Cancel'], 2, 'Error merging videos and audios', 'Error merging videos and audios', 'Error merging videos and audios')
                server.logger.log({
                    level: 'error',
                    message: `Error merging videos and audios of Download ${downloadID}`,
                    error: error,
                    timestamp: new Date().toISOString(),
                    section: 'crunchyrollDownloadProcessVideoMergingFFMPEG'
                })
                reject(error)
            })
            .on('end', async () => {
                console.log('Download finished')
                return resolve('combined')
            })
    })
}

export async function checkProxies() {
    const cachedData = server.CacheController.get('proxycheck') as { name: string; code: string; url: string; status: string | undefined }[]

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

        console.log('ok')

        for (const p of proxies) {
            try {
                const response: Response = await Promise.race([
                    fetch(p.url + 'health', { method: 'GET' }),
                    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 500))
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
