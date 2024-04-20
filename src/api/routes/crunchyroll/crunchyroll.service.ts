import { messageBox } from '../../../electron/background'
import { server } from '../../api'
import { Account, Playlist } from '../../db/database'
import { CrunchyEpisode, VideoPlaylist } from '../../types/crunchyroll'
import { useFetch } from '../useFetch'
import fs from 'fs'
import path from 'path'
import Ffmpeg from 'fluent-ffmpeg'
import { parse as mpdParse } from 'mpd-parser'
import { parse, stringify } from 'ass-compiler'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import { v4 as uuidv4 } from 'uuid'
import { app } from 'electron'
var cron = require('node-cron')
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked')
const ffprobePath = require('ffprobe-static').path.replace('app.asar', 'app.asar.unpacked')

const crErrors = [
  {
    error: 'invalid_grant',
    response: 'Email/Password is wrong'
  }
]

export async function crunchyLogin(user: string, passw: string) {
  const cachedData:
    | {
        access_token: string
        refresh_token: string
        expires_in: number
        token_type: string
        scope: string
        country: string
        account_id: string
        profile_id: string
      }
    | undefined = server.CacheController.get('crtoken')

  if (!cachedData) {
    var { data, error } = await crunchyLoginFetch(user, passw)

    if (error) {
      messageBox(
        'error',
        ['Cancel'],
        2,
        'Failed to login',
        'Failed to login to Crunchyroll',
        crErrors.find((r) => r.error === (error?.error as string)) ? crErrors.find((r) => r.error === (error?.error as string))?.response : (error.error as string)
      )
      return { data: null, error: error.error }
    }

    if (!data) {
      messageBox('error', ['Cancel'], 2, 'Failed to login', 'Failed to login to Crunchyroll', 'Crunchyroll returned null')
      return { data: null, error: 'Crunchyroll returned null' }
    }

    if (!data.access_token) {
      messageBox('error', ['Cancel'], 2, 'Failed to login', 'Failed to login to Crunchyroll', 'Crunchyroll returned malformed data')
      return { data: null, error: 'Crunchyroll returned malformed data' }
    }

    server.CacheController.set('crtoken', data, data.expires_in - 30)

    return { data: data, error: null }
  }

  return { data: cachedData, error: null }
}

async function crunchyLoginFetch(user: string, passw: string) {
  const headers = {
    Authorization: 'Basic dC1rZGdwMmg4YzNqdWI4Zm4wZnE6eWZMRGZNZnJZdktYaDRKWFMxTEVJMmNDcXUxdjVXYW4=',
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Crunchyroll/3.46.2 Android/13 okhttp/4.12.0'
  }

  const body: any = {
    username: user,
    password: passw,
    grant_type: 'password',
    scope: 'offline_access',
    device_name: 'RMX2170',
    device_type: 'realme RMX2170'
  }

  const { data, error } = await useFetch<{
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
    country: string
    account_id: string
    profile_id: string
  }>('https://beta-api.crunchyroll.com/auth/v1/token', {
    type: 'POST',
    body: new URLSearchParams(body).toString(),
    header: headers,
    credentials: 'same-origin'
  })

  if (error) {
    return { data: null, error: error }
  }

  if (!data) {
    return { data: null, error: null }
  }

  return { data: data, error: null }
}

export async function checkIfLoggedInCR(service: string) {
  const login = await Account.findOne({
    where: {
      service: service
    }
  })

  return login?.get()
}

export async function safeLoginData(user: string, password: string, service: string) {
  const login = await Account.create({
    username: user,
    password: password,
    service: service
  })

  return login?.get()
}

export async function addEpisodeToPlaylist(
  e: CrunchyEpisode,
  s: Array<string>,
  d: Array<string>,
  dir: string,
  hardsub: boolean,
  status: 'waiting' | 'preparing' | 'downloading' | 'merging' | 'completed' | 'failed'
) {
  const episode = await Playlist.create({
    media: e,
    sub: s,
    dub: d,
    dir: dir,
    hardsub: hardsub,
    status
  })

  return episode.get()
}

export async function getPlaylist() {
  const episodes = await Playlist.findAll()

  return episodes
}

export async function deletePlaylist() {
  await Playlist.truncate()

  return true
}

export async function getDownloading(id: number) {
  const found = downloading.find((i) => i.id === id)

  if (found) return found

  return null
}

export async function updatePlaylistByID(id: number, status: 'waiting' | 'preparing' | 'downloading' | 'completed' | 'merging' | 'failed') {
  await Playlist.update({ status: status }, { where: { id: id } })
}

var isDownloading: number = 0

async function checkPlaylists() {
  const eps = await Playlist.findAll({ where: { status: 'waiting' } })

  for (const e of eps) {
    if (isDownloading < 3 && e.dataValues.status === 'waiting') {
      updatePlaylistByID(e.dataValues.id, 'preparing')
      isDownloading++
      downloadPlaylist(
        e.dataValues.media.id,
        (e as any).dataValues.dub.map((s: { locale: any }) => s.locale),
        (e as any).dataValues.sub.map((s: { locale: any }) => s.locale),
        e.dataValues.hardsub,
        e.dataValues.id,
        e.dataValues.media.series_title,
        e.dataValues.media.season_number,
        e.dataValues.media.episode_number
      )
    }
  }
}

cron.schedule('*/2 * * * * *', () => {
  checkPlaylists()
})

export async function crunchyGetPlaylist(q: string) {
  const account = await checkIfLoggedInCR('crunchyroll')

  if (!account) return

  const { data, error } = await crunchyLogin(account.username, account.password)

  if (!data) return

  const headers = {
    Authorization: `Bearer ${data.access_token}`,
    'X-Cr-Disable-Drm': 'true'
  }

  const query: any = {
    q: q,
    n: 100,
    type: 'series',
    ratings: false,
    locale: 'de-DE'
  }

  try {
    const response = await fetch(`https://cr-play-service.prd.crunchyrollsvc.com/v1/${q}/console/switch/play`, {
      method: 'GET',
      headers: headers
    })

    if (response.ok) {
      const data: VideoPlaylist = JSON.parse(await response.text())

      data.hardSubs = Object.values((data as any).hardSubs)

      data.subtitles = Object.values((data as any).subtitles)

      return data
    } else {
      throw new Error(await response.text())
    }
  } catch (e) {
    throw new Error(e as string)
  }
}

async function createFolder() {
  const tempFolderPath = path.join(app.getPath('documents'), (Math.random() + 1).toString(36).substring(2))
  try {
    await fs.promises.mkdir(tempFolderPath, { recursive: true })
    return tempFolderPath
  } catch (error) {
    console.error('Error creating temporary folder:', error)
    throw error
  }
}

async function createFolderName(name: string) {
  const folderPath = path.join(app.getPath('documents'), name)

  try {
    await fs.promises.access(folderPath)
    return folderPath
  } catch (error) {
    try {
      await fs.promises.mkdir(folderPath, { recursive: true })
      return folderPath
    } catch (mkdirError) {
      console.error('Error creating season folder:', mkdirError)
      throw mkdirError
    }
  }
}

async function deleteFolder(folderPath: string) {
  fs.rmSync(folderPath, { recursive: true, force: true })
}

export async function crunchyGetPlaylistMPD(q: string) {
  const account = await checkIfLoggedInCR('crunchyroll')

  if (!account) return

  const { data, error } = await crunchyLogin(account.username, account.password)

  if (!data) return

  const headers = {
    Authorization: `Bearer ${data.access_token}`,
    'X-Cr-Disable-Drm': 'true'
  }

  try {
    const response = await fetch(q, {
      method: 'GET',
      headers: headers
    })

    if (response.ok) {
      const parsed = mpdParse(await response.text())

      return parsed
    } else {
      throw new Error(await response.text())
    }
  } catch (e) {
    throw new Error(e as string)
  }
}

var downloading: Array<{
  id: number
  downloadedParts: number
  partsToDownload: number
  downloadSpeed: number
}> = []

export async function downloadPlaylist(e: string, dubs: Array<string>, subs: Array<string>, hardsub: boolean, downloadID: number, name: string, season: number, episode: number) {
  downloading.push({
    id: downloadID,
    downloadedParts: 0,
    partsToDownload: 0,
    downloadSpeed: 0
  })

  await updatePlaylistByID(downloadID, 'downloading')

  var playlist = await crunchyGetPlaylist(e)

  console.log(playlist)

  if (!playlist) {
    console.log('Playlist not found')
    return
  }

  if (playlist.versions && playlist.versions.length !== 0) {
    if (playlist.audioLocale !== subs[0]) {
      const found = playlist.versions.find((v) => v.audio_locale === 'ja-JP')
      if (found) {
        playlist = await crunchyGetPlaylist(found.guid)
      }
    }
  }

  if (!playlist) {
    console.log('Exact Playlist not found')
    return
  }

  const subFolder = await createFolder()

  const audioFolder = await createFolder()

  const videoFolder = await createFolder()

  const seasonFolder = await createFolderName(`${name.replace(/[/\\?%*:|"<>]/g, '')} Season ${season}`)

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

    if (playlist.audioLocale !== 'ja-JP') {
      const foundStream = playlist.versions.find((v) => v.audio_locale === 'ja-JP')
      if (foundStream) {
        subPlaylist = await crunchyGetPlaylist(foundStream.guid)
      }
    } else {
      subPlaylist = playlist
    }

    if (!subPlaylist) {
      console.log('Subtitle Playlist not found')
      return
    }

    const found = subPlaylist.subtitles.find((sub) => sub.language === s)
    if (found) {
      subDownloadList.push({ ...found, isDub: false })
      console.log(`Subtitle ${s}.ass found, adding to download`)
    } else {
      console.warn(`Subtitle ${s}.ass not found, skipping`)
    }
  }

  for (const d of dubs) {
    var found
    if (playlist.versions) {
      found = playlist.versions.find((p) => p.audio_locale === d)
    }

    if (found) {
      const list = await crunchyGetPlaylist(found.guid)
      if (list) {
        const foundSub = list.subtitles.find((sub) => sub.language === d)
        if (foundSub) {
          subDownloadList.push({ ...foundSub, isDub: true })
        } else {
          console.log(`No Dub Sub Found for ${d}`)
        }
      }
      dubDownloadList.push(found)
      console.log(`Audio ${d}.aac found, adding to download`)
    } else if (playlist.versions.length === 0) {
      const foundSub = playlist.subtitles.find((sub) => sub.language === d)
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
    const jpVersion = playlist.versions.find((v) => v.audio_locale === 'ja-JP')

    if (jpVersion) {
      console.log('Using ja-JP Audio because no Audio in download list')
      dubDownloadList.push(jpVersion)
    }
  }

  const subDownload = async () => {
    const sbs: Array<string> = []
    for (const sub of subDownloadList) {
      const name = await downloadSub(sub, subFolder)
      sbs.push(name)
    }
    return sbs
  }

  const audioDownload = async () => {
    const audios: Array<string> = []
    for (const v of dubDownloadList) {
      const list = await crunchyGetPlaylist(v.guid)

      if (!list) return

      const playlist = await crunchyGetPlaylistMPD(list.url)

      if (!playlist) return

      var p: { filename: string; url: string }[] = []

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

      const path = await downloadAudio(p, audioFolder, list.audioLocale)

      audios.push(path as string)
    }
    return audios
  }

  const downloadVideo = async () => {
    var code

    if (!playlist) return

    if (playlist.versions && playlist.versions.length !== 0) {
      if (playlist.versions.find((p) => p.audio_locale === dubs[0])) {
        code = playlist.versions.find((p) => p.audio_locale === dubs[0])?.guid
      } else {
        code = playlist.versions.find((p) => p.audio_locale === 'ja-JP')?.guid
      }
    } else {
      code = e
    }

    if (!code) return console.error('No clean stream found')

    const play = await crunchyGetPlaylist(code)

    if (!play) return

    var downloadURL

    if (hardsub) {
      const hardsubURL = play.hardSubs.find((h) => h.hlang === subs[0])?.url

      if (hardsubURL) {
        downloadURL = hardsubURL
        console.log('Hardsub Playlist found')
      } else {
        downloadURL = play.url
        console.log('Hardsub Playlist not found')
      }
    } else {
      downloadURL = play.url
      console.log('Hardsub disabled, skipping')
    }

    var mdp = await crunchyGetPlaylistMPD(downloadURL)

    if (!mdp) return

    var hq = mdp.playlists.find((i) => i.attributes.RESOLUTION?.width === 1920)

    if (!hq) return

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

    // await updatePlaylistToDownloadPartsByID(downloadID, p.length)

    const dn = downloading.find((i) => i.id === downloadID)

    if (dn) {
      dn.partsToDownload = p.length
    }

    const file = await downloadParts(p, downloadID, videoFolder)

    return file
  }

  const [subss, audios, file] = await Promise.all([subDownload(), audioDownload(), downloadVideo()])

  if (!audios) return

  await mergeFile(file as string, audios, subss, String(playlist.assetId), seasonFolder, `${name.replace(/[/\\?%*:|"<>]/g, '')} Season ${season} Episode ${episode}`)

  await updatePlaylistByID(downloadID, 'completed')

  await deleteFolder(subFolder)
  await deleteFolder(audioFolder)
  await deleteFolder(videoFolder)

  return playlist
}

async function downloadAudio(parts: { filename: string; url: string }[], dir: string, name: string) {
  const path = await createFolder()
  const downloadPromises = []

  for (const [index, part] of parts.entries()) {
    const stream = fs.createWriteStream(`${path}/${part.filename}`)
    const downloadPromise = fetchAndPipe(part.url, stream, index + 1)
    downloadPromises.push(downloadPromise)
  }

  await Promise.all(downloadPromises)

  return await mergePartsAudio(parts, path, dir, name)
}

async function fetchAndPipe(url: string, stream: fs.WriteStream, index: number) {
  const { body } = await fetch(url)
  const readableStream = Readable.from(body as any)

  return new Promise<void>((resolve, reject) => {
    readableStream
      .pipe(stream)
      .on('finish', () => {
        console.log(`Fragment ${index} downloaded`)
        resolve()
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

async function downloadParts(parts: { filename: string; url: string }[], downloadID: number, dir: string) {
  const path = await createFolder()
  const dn = downloading.find((i) => i.id === downloadID)

  let totalDownloadedBytes = 0
  let startTime = Date.now()

  for (const [index, part] of parts.entries()) {
    let success = false
    while (!success) {
      try {
        const stream = fs.createWriteStream(`${path}/${part.filename}`)
        const { body } = await fetch(part.url)

        const readableStream = Readable.from(body as any)
        let partDownloadedBytes = 0
        readableStream.on('data', (chunk) => {
          partDownloadedBytes += chunk.length
          totalDownloadedBytes += chunk.length
        })

        await finished(readableStream.pipe(stream))

        console.log(`Fragment ${index + 1} downloaded`)

        if (dn) {
          dn.downloadedParts++
          const endTime = Date.now()
          const durationInSeconds = (endTime - startTime) / 1000
          dn.downloadSpeed = totalDownloadedBytes / 1024 / 1024 / durationInSeconds
        }

        success = true
      } catch (error) {
        console.error(`Error occurred during download of fragment ${index + 1}:`, error)
        console.log(`Retrying download of fragment ${index + 1}...`)
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }
  }

  return await mergeParts(parts, downloadID, path, dir)
}

async function downloadSub(
  sub: {
    format: string
    language: string
    url: string
    isDub: boolean
  },
  dir: string
) {
  const path = `${dir}/${sub.language}${sub.isDub ? `-FORCED` : ''}.${sub.format}`

  const stream = fs.createWriteStream(path)
  const response = await fetch(sub.url)

  var parsedASS = parse(await response.text())

  // Disabling Changing ASS because still broken in vlc

  // parsedASS.info.PlayResX = "1920";
  // parsedASS.info.PlayResY = "1080";

  // for (const s of parsedASS.styles.style) {
  //     (s.Fontsize = "54"), (s.Outline = "4");
  // }

  const fixed = stringify(parsedASS)

  const readableStream = Readable.from([fixed])

  await finished(readableStream.pipe(stream))
  console.log(`Sub ${sub.language}.${sub.format} downloaded`)

  return path
}

async function concatenateTSFiles(inputFiles: Array<string>, outputFile: string) {
  return new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(outputFile)

    writeStream.on('error', (error) => {
      reject(error)
    })

    writeStream.on('finish', () => {
      console.log('TS files concatenated successfully!')
      resolve()
    })

    const processNextFile = (index: number) => {
      if (index >= inputFiles.length) {
        writeStream.end()
        return
      }

      const readStream = fs.createReadStream(inputFiles[index])

      readStream.on('error', (error) => {
        reject(error)
      })

      readStream.pipe(writeStream, { end: false })

      readStream.on('end', () => {
        processNextFile(index + 1)
      })
    }

    processNextFile(0)
  })
}

async function mergeParts(parts: { filename: string; url: string }[], downloadID: number, tmp: string, dir: string) {
  const tempname = (Math.random() + 1).toString(36).substring(2)

  try {
    const list: Array<string> = []

    await updatePlaylistByID(downloadID, 'merging')
    isDownloading--

    for (const [index, part] of parts.entries()) {
      list.push(`${tmp}/${part.filename}`)
    }

    const concatenatedFile = `${tmp}/main.m4s`
    await concatenateTSFiles(list, concatenatedFile)

    return new Promise((resolve, reject) => {
      Ffmpeg()
        .setFfmpegPath(ffmpegPath)
        .setFfprobePath(ffprobePath)
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

async function mergePartsAudio(parts: { filename: string; url: string }[], tmp: string, dir: string, name: string) {
  try {
    const list: Array<string> = []

    for (const [index, part] of parts.entries()) {
      list.push(`${tmp}/${part.filename}`)
    }

    const concatenatedFile = `${tmp}/main.m4s`
    await concatenateTSFiles(list, concatenatedFile)

    return new Promise((resolve, reject) => {
      Ffmpeg()
        .setFfmpegPath(ffmpegPath)
        .setFfprobePath(ffprobePath)
        .input(concatenatedFile)
        .outputOptions('-c copy')
        .save(`${dir}/${name}.aac`)
        .on('end', async () => {
          console.log('Merging finished')
          await deleteFolder(tmp)

          return resolve(`${dir}/${name}.aac`)
        })
    })
  } catch (error) {
    console.error('Error merging parts:', error)
  }
}

async function mergeFile(video: string, audios: Array<string>, subs: Array<string>, name: string, path: string, filename: string) {
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
    var output = Ffmpeg().setFfmpegPath(ffmpegPath).setFfprobePath(ffprobePath)
    var ffindex = 1
    output.addInput(video)
    var options = ['-map_metadata -1', '-c copy', '-metadata:s:v:0 VARIANT_BITRATE=0', '-map 0']

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

      options.push(`-metadata:s:a:${index} VARIANT_BITRATE=0`)
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
      .saveToFile(path + `/${filename}.mkv`)
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
