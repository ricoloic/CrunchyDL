import { messageBox } from '../../../electron/background'
import { server } from '../../api'
import { VideoPlaylist } from '../../types/crunchyroll'
import { useFetch } from '../useFetch'
import { parse as mpdParse } from 'mpd-parser'
import { loggedInCheck } from '../service/service.service'

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

export async function crunchyGetPlaylist(q: string) {
  const account = await loggedInCheck('CR')

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

export async function crunchyGetPlaylistMPD(q: string) {
  const account = await loggedInCheck('CR')

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
