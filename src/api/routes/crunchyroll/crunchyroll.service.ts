import { messageBox } from '../../../electron/background'
import { server } from '../../api'
import { VideoPlaylist, VideoPlaylistNoGEO } from '../../types/crunchyroll'
import { useFetch } from '../useFetch'
import { parse as mpdParse } from 'mpd-parser'
import { checkProxies, loggedInCheck } from '../service/service.service'
import settings from 'electron-settings'

// Crunchyroll Error message list
const crErrors = [
    {
        error: 'invalid_grant',
        response: 'Email/Password is wrong'
    }
]

// Crunchyroll Login Handler
export async function crunchyLogin(user: string, passw: string, geo: string) {

    var endpoint = await settings.get('CREndpoint')
    const drmL3blob = await settings.get('l3blob')
    const drmL3key = await settings.get('l3key')

    if (!drmL3blob || !drmL3key) {
        await settings.set('CREndpoint', 1)
        endpoint = 1
    }


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
        | undefined = server.CacheController.get(`crtoken-${geo}-${endpoint}`)

    if (!cachedData) {
        if (geo === 'LOCAL') {
            const data = await crunchyLoginFetch(user, passw)

            if (!data) return

            server.CacheController.set(`crtoken-${geo}-${endpoint}`, data, data.expires_in - 30)

            return data
        }

        if (geo !== 'LOCAL') {
            const data = await crunchyLoginFetchProxy(user, passw, geo)

            if (!data) return

            server.CacheController.set(`crtoken-${geo}-${endpoint}`, data, data.expires_in - 30)

            return data
        }
    }

    return cachedData
}

// Crunchyroll Login Fetch Proxy
async function crunchyLoginFetchProxy(user: string, passw: string, geo: string) {
    const proxies = await checkProxies()

    var headers
    var body

    var endpoint = await settings.get('CREndpoint')
    const drmL3blob = await settings.get('l3blob')
    const drmL3key = await settings.get('l3key')
    var proxy:
        | {
              name: string
              code: string
              url: string
              status: string | undefined
          }
        | undefined

    proxy = proxies.find((p) => p.code === geo)

    if (!proxy) {
        messageBox('error', ['Cancel'], 2, 'Login Proxy not found', 'Login Proxy not found', `Login Proxy ${geo} not found`)
        server.logger.log({
            level: 'error',
            message: `Login Proxy ${geo} not found`,
            timestamp: new Date().toISOString(),
            section: 'loginCrunchyrollFetchProxy'
        })
        return
    }

    if (proxy.status === 'offline') {
        messageBox('error', ['Cancel'], 2, 'Login Proxy is offline', 'Login Proxy is offline', `Login Proxy ${geo} is offline`)
        server.logger.log({
            level: 'error',
            message: `Login Proxy ${geo} is offline`,
            timestamp: new Date().toISOString(),
            section: 'loginCrunchyrollFetchProxy'
        })
        return
    }

    if (endpoint !== 1 && drmL3blob && drmL3key) {
        headers = {
            Authorization: 'Basic dm52cHJyN21ubW1la2Uyd2xwNTM6V19IdWlNekxUS1JqSnlKZTBHRlFYZXFoTldDREdUM2M=',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Crunchyroll/4.51.0 (bundle_identifier:com.crunchyroll.iphone; build_number:3634220.454824296) iOS/17.4.1 Gravity/4.51.0'
        }

        body = {
            username: user,
            password: passw,
            grant_type: 'password',
            scope: 'offline_access',
            device_name: 'iPhone',
            device_type: 'iPhone 13'
        }
    }

    if (endpoint === 1) {
        headers = {
            Authorization: 'Basic dC1rZGdwMmg4YzNqdWI4Zm4wZnE6eWZMRGZNZnJZdktYaDRKWFMxTEVJMmNDcXUxdjVXYW4=',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27'
        }

        body = {
            username: user,
            password: passw,
            grant_type: 'password',
            scope: 'offline_access',
            device_name: 'RMX2170',
            device_type: 'realme RMX2170'
        }
    }

    if (!headers || !body) return

    try {
        const response = await fetch(proxy.url + 'auth/v1/token', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers,
            credentials: 'same-origin'
        })

        if (response.ok) {
            const data: {
                access_token: string
                refresh_token: string
                expires_in: number
                token_type: string
                scope: string
                country: string
                account_id: string
                profile_id: string
            } = JSON.parse(await response.text())

            return data
        } else {
            throw new Error(JSON.stringify(response))
        }
    } catch (e) {
        messageBox('error', ['Cancel'], 2, 'Failed to Login to Crunchyroll', 'Failed to Login to Crunchyroll', String(e))
        server.logger.log({
            level: 'error',
            message: 'Failed to Login to Crunchyroll',
            error: String(e),
            timestamp: new Date().toISOString(),
            section: 'loginCrunchyrollFetchProxy'
        })
        throw new Error(e as string)
    }
}

async function crunchyLoginFetch(user: string, passw: string) {
    var headers
    var body

    var endpoint = await settings.get('CREndpoint')
    const drmL3blob = await settings.get('l3blob')
    const drmL3key = await settings.get('l3key')

    if (!drmL3blob || !drmL3key) {
        await settings.set('CREndpoint', 1)
        endpoint = 1
    }

    if (endpoint !== 1 && drmL3blob && drmL3key) {
        headers = {
            Authorization: 'Basic dm52cHJyN21ubW1la2Uyd2xwNTM6V19IdWlNekxUS1JqSnlKZTBHRlFYZXFoTldDREdUM2M=',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Crunchyroll/4.51.0 (bundle_identifier:com.crunchyroll.iphone; build_number:3634220.454824296) iOS/17.4.1 Gravity/4.51.0'
        }

        body = {
            username: user,
            password: passw,
            grant_type: 'password',
            scope: 'offline_access',
            device_name: 'iPhone',
            device_type: 'iPhone 13'
        }
    }

    if (endpoint === 1) {
        headers = {
            Authorization: 'Basic dC1rZGdwMmg4YzNqdWI4Zm4wZnE6eWZMRGZNZnJZdktYaDRKWFMxTEVJMmNDcXUxdjVXYW4=',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27'
        }

        body = {
            username: user,
            password: passw,
            grant_type: 'password',
            scope: 'offline_access',
            device_name: 'RMX2170',
            device_type: 'realme RMX2170'
        }
    }

    if (!headers || !body) return

    try {
        const response = await fetch('https://beta-api.crunchyroll.com/auth/v1/token', {
            method: 'POST',
            body: new URLSearchParams(body).toString(),
            headers: headers,
            credentials: 'same-origin'
        })

        if (response.ok) {
            const data: {
                access_token: string
                refresh_token: string
                expires_in: number
                token_type: string
                scope: string
                country: string
                account_id: string
                profile_id: string
            } = JSON.parse(await response.text())

            return data
        } else {
            const error = {
                status: response.status,
                message: await response.text()
            }
            throw new Error(JSON.stringify(error))
        }
    } catch (e) {
        messageBox('error', ['Cancel'], 2, 'Failed to Login to Crunchyroll', 'Failed to Login to Crunchyroll', String(e))
        server.logger.log({
            level: 'error',
            message: 'Failed to Login to Crunchyroll',
            error: String(e),
            timestamp: new Date().toISOString(),
            section: 'loginCrunchyroll Fetch'
        })
        throw new Error(e as string)
    }
}

// Crunchyroll Playlist Fetch
export async function crunchyGetPlaylist(q: string, geo: string | undefined) {
    const isProxyActive = await settings.get('proxyActive')

    var proxies: {
        name: string
        code: string
        url: string
        status: string | undefined
    }[] = []

    if (isProxyActive) {
        proxies = await checkProxies()
    }

    var endpoint = await settings.get('CREndpoint')
    const drmL3blob = await settings.get('l3blob')
    const drmL3key = await settings.get('l3key')

    if (!drmL3blob || !drmL3key) {
        await settings.set('CREndpoint', 1)
        endpoint = 1
    }

    const endpoints: { id: number; name: string; url: string }[] = [
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
        }
    ]

    const account = await loggedInCheck('CR')

    if (!account) return

    const login = await crunchyLogin(account.username, account.password, geo ? geo : 'LOCAL')

    if (!login) return

    const headersLoc = {
        Authorization: `Bearer ${login.access_token}`,
        'X-Cr-Disable-Drm': 'true',
        'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27',
    }

    var playlist: VideoPlaylist

    try {
        const response = await fetch(
            `https://cr-play-service.prd.crunchyrollsvc.com/v1/${q}${
                endpoints.find((e) => e.id === endpoint) ? endpoints.find((e) => e.id === endpoint)?.url : '/console/switch/play'
            }`,
            {
                method: 'GET',
                headers: headersLoc
            }
        )

        if (response.ok) {
            const data: VideoPlaylist = JSON.parse(await response.text())

            data.hardSubs = Object.values((data as any).hardSubs)

            data.subtitles = Object.values((data as any).subtitles)

            data.geo = geo

            playlist = data
        } else {
            const error = await response.text()
            messageBox('error', ['Cancel'], 2, 'Failed to get Crunchyroll Video Playlist', 'Failed to get Crunchyroll Video Playlist', error)
            server.logger.log({
                level: 'error',
                message: 'Failed to get Crunchyroll Video Playlist',
                error: error,
                timestamp: new Date().toISOString(),
                section: 'playlistCrunchyrollFetch'
            })
            throw new Error(error)
        }
    } catch (e) {
        throw new Error(e as string)
    }

    if (isProxyActive)
        for (const p of proxies) {
            if (p.code !== login.country) {
                const logindata = await crunchyLogin(account.username, account.password, p.code)

                if (!logindata) return

                const headers = {
                    Authorization: `Bearer ${logindata.access_token}`,
                    'X-Cr-Disable-Drm': 'true',
                    'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27',
                }

                const response = await fetch(
                    `https://cr-play-service.prd.crunchyrollsvc.com/v1/${q}${
                        endpoints.find((e) => e.id === endpoint) ? endpoints.find((e) => e.id === endpoint)?.url : '/console/switch/play'
                    }`,
                    {
                        method: 'GET',
                        headers: headers
                    }
                )

                if (response.ok) {
                    const data: VideoPlaylistNoGEO = JSON.parse(await response.text())

                    data.hardSubs = Object.values((data as any).hardSubs)

                    data.subtitles = Object.values((data as any).subtitles)

                    for (const v of data.versions) {
                        if (!playlist.versions.find((ver) => ver.guid === v.guid)) {
                            playlist.versions.push({ ...v, geo: p.code })
                        }
                    }

                    for (const v of data.subtitles) {
                        if (!playlist.subtitles.find((ver) => ver.language === v.language)) {
                            playlist.subtitles.push({ ...v, geo: p.code })
                        }
                    }

                    for (const v of data.hardSubs) {
                        if (!playlist.hardSubs.find((ver) => ver.hlang === v.hlang)) {
                            playlist.hardSubs.push({ ...v, geo: p.code })
                        }
                    }
                }
            }
        }

    return { data: playlist, account_id: login.account_id }
}

// Crunchyroll Delete Video Token Fetch
export async function deleteVideoToken(content: string, token: string) {
    const account = await loggedInCheck('CR')

    if (!account) return

    const login = await crunchyLogin(account.username, account.password, 'LOCAL')

    if (!login) return

    const headers = {
        Authorization: `Bearer ${login.access_token}`,
        'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27',
    }

    try {
        const response = await fetch(`https://cr-play-service.prd.crunchyrollsvc.com/v1/token/${content}/${token}`, {
            method: 'DELETE',
            headers: headers
        })

        if (response.ok) {
            return 'ok'
        } else {
            const error = await response.text()
            messageBox('error', ['Cancel'], 2, 'Failed to delete Crunchyroll Video Token', 'Failed to delete Crunchyroll Video Token', error)
            server.logger.log({
                level: 'error',
                message: 'Failed to delete Crunchyroll Video Token',
                error: error,
                timestamp: new Date().toISOString(),
                section: 'tokenDeletionCrunchyrollFetch'
            })
            throw new Error(await response.text())
        }
    } catch (e) {
        throw new Error(e as string)
    }
}

// Crunchyroll MPD Fetch
export async function crunchyGetPlaylistMPD(q: string, geo: string | undefined) {
    const account = await loggedInCheck('CR')

    if (!account) return

    const login = await crunchyLogin(account.username, account.password, geo ? geo : 'LOCAL')

    if (!login) return

    const headers = {
        Authorization: `Bearer ${login.access_token}`,
        'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27',
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
            const error = await response.text()
            messageBox('error', ['Cancel'], 2, 'Failed to get Crunchyroll MPD', 'Failed to get Crunchyroll MPD', error)
            server.logger.log({
                level: 'error',
                message: 'Failed to get Crunchyroll MPD',
                error: error,
                timestamp: new Date().toISOString(),
                section: 'mpdCrunchyrollFetch'
            })
            throw new Error(await response.text())
        }
    } catch (e) {
        throw new Error(e as string)
    }
}
