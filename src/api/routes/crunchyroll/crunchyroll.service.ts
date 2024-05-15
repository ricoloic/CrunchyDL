import { messageBox } from '../../../electron/background'
import { server } from '../../api'
import { VideoPlaylist } from '../../types/crunchyroll'
import { useFetch } from '../useFetch'
import { parse as mpdParse } from 'mpd-parser'
import { loggedInCheck } from '../service/service.service'
import settings from 'electron-settings'

// Disable when Crunchyroll turns off switch endpoint
const enableDRMBypass = true

// Crunchyroll Error message list
const crErrors = [
    {
        error: 'invalid_grant',
        response: 'Email/Password is wrong'
    }
]

// Crunchyroll Login Handler
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

// Crunchyroll Login Fetch
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

// Crunchyroll Playlist Fetch
export async function crunchyGetPlaylist(q: string) {

    var endpoint = await settings.get('CREndpoint');
    const drmL3blob = await settings.get('l3blob');
    const drmL3key = await settings.get('l3key');

    if (!drmL3blob || !drmL3key) {
        await settings.set('CREndpoint', 1);
        endpoint = 1
    }

    const endpoints: { id: number, name: string, url: string }[] = [
        {
            id: 1,
            name: 'Switch',
            url: `/console/switch/play`
        },
        {
            id: 2,
            name: 'PS4',
            url: `/console/ps4/play`
        },
        {
            id: 3,
            name: 'PS5',
            url: `/console/ps5/play`
        },
        {
            id: 4,
            name: 'XBOX One',
            url: `/console/xbox_one/play`
        },
        {
            id: 5,
            name: 'Firefox',
            url: `/web/firefox/play`
        },
        {
            id: 6,
            name: 'Edge',
            url: `/web/edge/play`
        },
        {
            id: 7,
            name: 'Safari',
            url: `/web/safari/play`
        },
        {
            id: 8,
            name: 'Chrome',
            url: `/web/chrome/play`
        },
        {
            id: 9,
            name: 'Web Fallback',
            url: `/web/fallback/play`
        },
        {
            id: 10,
            name: 'Iphone',
            url: `/ios/iphone/play`
        },
        {
            id: 11,
            name: 'Ipad',
            url: `/ios/ipad/play`
        },
        {
            id: 12,
            name: 'Android',
            url: `/android/phone/play`
        },
        {
            id: 13,
            name: 'Samsung TV',
            url: `/tv/samsung/play`
        },
    ]

    const account = await loggedInCheck('CR')

    if (!account) return

    const { data: login, error } = await crunchyLogin(account.username, account.password)

    if (!login) return

    const headers = {
        Authorization: `Bearer ${login.access_token}`,
        'X-Cr-Disable-Drm': 'true'
    }

    try {
        const response = await fetch(
            `https://cr-play-service.prd.crunchyrollsvc.com/v1/${q}${endpoints.find(e=> e.id === endpoint) ? endpoints.find(e=> e.id === endpoint)?.url : '/console/switch/play'}`,
            {
                method: 'GET',
                headers: headers
            }
        )

        if (response.ok) {
            const data: VideoPlaylist = JSON.parse(await response.text())

            data.hardSubs = Object.values((data as any).hardSubs)

            data.subtitles = Object.values((data as any).subtitles)

            return { data: data, account_id: login.account_id }
        } else {

            const error = await response.text()

            messageBox('error', ['Cancel'], 2, 'Failed to get MPD Playlist', 'Failed to get MPD Playlist', error)
            throw new Error(error)
        }
    } catch (e) {
        throw new Error(e as string)
    }
}

// Crunchyroll Delete Video Token Fetch
export async function deleteVideoToken(content: string, token: string) {
    const account = await loggedInCheck('CR')

    if (!account) return

    const { data: login, error } = await crunchyLogin(account.username, account.password)

    if (!login) return

    const headers = {
        Authorization: `Bearer ${login.access_token}`
    }

    try {
        const response = await fetch(`https://cr-play-service.prd.crunchyrollsvc.com/v1/token/${content}/${token}`, {
            method: 'DELETE',
            headers: headers
        })

        if (response.ok) {
            return 'ok'
        } else {
            throw new Error(await response.text())
        }
    } catch (e) {
        console.log('Delete token failed')
        throw new Error(e as string)
    }
}

// Crunchyroll MPD Fetch
export async function crunchyGetPlaylistMPD(q: string) {
    const account = await loggedInCheck('CR')

    if (!account) return

    const { data } = await crunchyLogin(account.username, account.password)

    if (!data) return

    const headers = {
        Authorization: `Bearer ${data.access_token}`
    }

    try {
        const response = await fetch(q, {
            method: 'GET',
            headers: headers
        })

        if (response.ok) {
            const raw = await response.text()

            const parsed = mpdParse(raw)

            return parsed
        } else {
            throw new Error(await response.text())
        }
    } catch (e) {
        throw new Error(e as string)
    }
}
