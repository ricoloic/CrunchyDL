import { messageBox } from '../../../electron/background'
import { server } from '../../api'
import { VideoMetadata, VideoPlaylist, VideoPlaylistNoGEO } from '../../types/crunchyroll'
import { useFetch } from '../useFetch'
import { parse as mpdParse } from 'mpd-parser'
import { checkProxies, loggedInCheck } from '../service/service.service'
import settings from 'electron-settings'
import { app } from 'electron'

settings.configure({
    dir: app.getPath('documents') + '/Crunchyroll Downloader/settings/'
})

// Crunchyroll Login Handler
export async function crunchyLogin(user: string, passw: string, geo: string) {
    var endpoint = await settings.get('CREndpoint')

    if (!endpoint) {
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

    if (!endpoint) {
        await settings.set('CREndpoint', 1)
        endpoint = 1
    }

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

    if (endpoint !== 1) {
        headers = {
            Authorization: 'Basic dm52cHJyN21ubW1la2Uyd2xwNTM6V19IdWlNekxUS1JqSnlKZTBHRlFYZXFoTldDREdUM2M=',
            'Content-Type': 'application/json',
            'User-Agent': 'Crunchyroll/4.51.0 (bundle_identifier:com.crunchyroll.iphone; build_number:3634220.454824296) iOS/17.4.1 Gravity/4.51.0'
        }

        body = {
            username: user,
            password: passw,
            grant_type: 'password',
            scope: 'offline_access',
            device_name: 'iPhone',
            device_type: 'iPhone 13',
            ursa: 'Crunchyroll/4.51.0 (bundle_identifier:com.crunchyroll.iphone; build_number:3634220.454824296) iOS/17.4.1 Gravity/4.51.0',
            token: 'Basic dm52cHJyN21ubW1la2Uyd2xwNTM6V19IdWlNekxUS1JqSnlKZTBHRlFYZXFoTldDREdUM2M='
        }
    }

    if (endpoint === 1) {
        headers = {
            Authorization: 'Basic dC1rZGdwMmg4YzNqdWI4Zm4wZnE6eWZMRGZNZnJZdktYaDRKWFMxTEVJMmNDcXUxdjVXYW4=',
            'Content-Type': 'application/json',
            'User-Agent': 'Crunchyroll/3.46.2 Android/13 okhttp/4.12.0'
        }

        body = {
            username: user,
            password: passw,
            grant_type: 'password',
            scope: 'offline_access',
            device_name: 'RMX2170',
            device_type: 'realme RMX2170',
            ursa: 'Crunchyroll/3.46.2 Android/13 okhttp/4.12.0',
            token: 'Basic dC1rZGdwMmg4YzNqdWI4Zm4wZnE6eWZMRGZNZnJZdktYaDRKWFMxTEVJMmNDcXUxdjVXYW4='
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
            console.log(response)
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

    if (!endpoint) {
        await settings.set('CREndpoint', 1)
        endpoint = 1
    }

    if (endpoint !== 1) {
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
            'User-Agent': 'Crunchyroll/3.46.2 Android/13 okhttp/4.12.0'
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

let counter = 0
var maxLimit = 0

async function incrementPlaylistCounter() {
    return new Promise<void>((resolve) => {
        const interval = setInterval(() => {
            if (counter < maxLimit) {
                counter++
                clearInterval(interval)
                resolve()
            }
        }, 100)
    })
}

function decrementPlaylistCounter() {
    if (counter > 0) {
        counter--
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

    if (!endpoint) {
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
            name: 'Chrome',
            url: `/web/chrome/play`
        },
        {
            id: 8,
            name: 'Web Fallback',
            url: `/web/fallback/play`
        },
        {
            id: 9,
            name: 'Android Phone',
            url: `/android/phone/play`
        },
        {
            id: 10,
            name: 'Android Tablet',
            url: `/android/tablet/play`
        },
        {
            id: 11,
            name: 'Samsung TV',
            url: `/tv/samsung/play`
        },
        {
            id: 12,
            name: 'Chromecast',
            url: `/tv/chromecast/play`
        },
        {
            id: 13,
            name: 'Fire TV',
            url: `/tv/fire_tv/play`
        },
        {
            id: 14,
            name: 'Android TV',
            url: `/tv/android_tv/play`
        },
        {
            id: 15,
            name: 'LG TV',
            url: `/tv/lg/play`
        },
        {
            id: 16,
            name: 'Roku',
            url: `/tv/roku/play`
        }
    ]

    const account = await loggedInCheck('CR')

    if (!account) return

    const login = await crunchyLogin(account.username, account.password, geo ? geo : 'LOCAL')

    if (!login) return

    const headersLoc = {
        Authorization: `Bearer ${login.access_token}`,
        'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27',
        'x-cr-disable-drm': 'true'
    }

    var playlist: VideoPlaylist

    if (maxLimit === 0) {
        maxLimit = await checkAccountMaxStreams()
    }

    await incrementPlaylistCounter()

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

            deleteVideoToken(q, playlist.token)
        } else {
            const error = await response.text()
            const errorJSON: {
                activeStreams: {
                    accountId: string
                    active: boolean
                    assetId: string
                    clientId: string
                    contentId: string
                    country: string
                    createdTimestamp: string
                    deviceSubtype: string
                    deviceType: string
                    episodeIdentity: string
                    id: string
                    token: string
                }[]
            } = await JSON.parse(error)

            if (errorJSON && errorJSON.activeStreams && errorJSON.activeStreams.length !== 0) {
                for (const e of errorJSON.activeStreams) {
                    await deleteVideoToken(e.contentId, e.token)
                }

                server.logger.log({
                    level: 'error',
                    message: 'Refetching Crunchyroll Video Playlist & Deleting all Video Token because too many streams',
                    error: errorJSON,
                    timestamp: new Date().toISOString(),
                    section: 'playlistCrunchyrollFetch'
                })

                return await crunchyGetPlaylist(q, geo)
            }

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

    if (isProxyActive) {
        for (const p of proxies) {
            if (p.code !== login.country) {
                await incrementPlaylistCounter()

                const logindata = await crunchyLogin(account.username, account.password, p.code)

                if (!logindata) return

                const headers = {
                    Authorization: `Bearer ${logindata.access_token}`,
                    'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27'
                }

                const responseProx = await fetch(
                    `https://cr-play-service.prd.crunchyrollsvc.com/v1/${q}${
                        endpoints.find((e) => e.id === endpoint) ? endpoints.find((e) => e.id === endpoint)?.url : '/console/switch/play'
                    }`,
                    {
                        method: 'GET',
                        headers: headers
                    }
                )

                if (responseProx.ok) {
                    const dataProx: VideoPlaylistNoGEO = JSON.parse(await responseProx.text())

                    dataProx.hardSubs = Object.values((dataProx as any).hardSubs)

                    dataProx.subtitles = Object.values((dataProx as any).subtitles)

                    for (const v of dataProx.versions) {
                        if (!playlist.versions.find((ver) => ver.guid === v.guid)) {
                            playlist.versions.push({ ...v, geo: p.code })
                        }
                    }

                    for (const v of dataProx.subtitles) {
                        if (!playlist.subtitles.find((ver) => ver.language === v.language)) {
                            playlist.subtitles.push({ ...v, geo: p.code })
                        }
                    }

                    for (const v of dataProx.hardSubs) {
                        if (!playlist.hardSubs.find((ver) => ver.hlang === v.hlang)) {
                            playlist.hardSubs.push({ ...v, geo: p.code })
                        }
                    }

                    deleteVideoToken(q, dataProx.token)
                } else {
                    decrementPlaylistCounter()
                    const error = await responseProx.text()
                    const errorJSON: {
                        activeStreams: {
                            accountId: string
                            active: boolean
                            assetId: string
                            clientId: string
                            contentId: string
                            country: string
                            createdTimestamp: string
                            deviceSubtype: string
                            deviceType: string
                            episodeIdentity: string
                            id: string
                            token: string
                        }[]
                    } = await JSON.parse(error)

                    if (errorJSON && errorJSON.activeStreams && errorJSON.activeStreams.length !== 0) {
                        for (const e of errorJSON.activeStreams) {
                            deleteVideoToken(e.contentId, e.token)
                        }

                        server.logger.log({
                            level: 'error',
                            message: 'Refetching Crunchyroll Video Playlist & Deleting all Video Token because too many streams',
                            error: errorJSON,
                            timestamp: new Date().toISOString(),
                            section: 'playlistCrunchyrollFetch'
                        })
                    }
                }
            }
        }
    }
    return { data: playlist, account_id: login.account_id }
}

// Crunchyroll Delete Video Token Fetch
export async function removeVideoToken(content: string, token: string) {
    const account = await loggedInCheck('CR')

    if (!account) return

    const login = await crunchyLogin(account.username, account.password, 'LOCAL')

    if (!login) return

    const headers = {
        Authorization: `Bearer ${login.access_token}`
    }

    const response = await fetch(`https://cr-play-service.prd.crunchyrollsvc.com/v1/token/${content}/${token}`, {
        method: 'DELETE',
        headers: headers
    })

    if (response.ok) {
        server.logger.log({
            level: 'info',
            message: 'Deleted Video Token',
            token: token,
            timestamp: new Date().toISOString(),
            section: 'tokenDeletionCrunchyrollFetch'
        })

        decrementPlaylistCounter()

        return 'ok'
    } else {
        decrementPlaylistCounter()
        const error = await response.text()
        // messageBox('error', ['Cancel'], 2, 'Failed to delete Crunchyroll Video Token', 'Failed to delete Crunchyroll Video Token', error)
        server.logger.log({
            level: 'error',
            message: 'Failed to delete Crunchyroll Video Token',
            token: token,
            error: error,
            timestamp: new Date().toISOString(),
            section: 'tokenDeletionCrunchyrollFetch'
        })
    }
}

// Crunchyroll Deactivate Video Token Fetch
export async function deleteVideoToken(content: string, token: string) {
    const account = await loggedInCheck('CR')

    if (!account) return

    const login = await crunchyLogin(account.username, account.password, 'LOCAL')

    if (!login) return

    const headers = {
        Authorization: `Bearer ${login.access_token}`
    }

    const response = await fetch(`https://cr-play-service.prd.crunchyrollsvc.com/v1/token/${content}/${token}/inactive`, {
        method: 'PATCH',
        headers: headers
    })

    if (response.ok) {
        server.logger.log({
            level: 'info',
            message: 'Disabled Video Token',
            token: token,
            timestamp: new Date().toISOString(),
            section: 'tokenDeletionCrunchyrollFetch'
        })

        decrementPlaylistCounter()

        return 'ok'
    } else {
        decrementPlaylistCounter()
        const error = await response.text()
        server.logger.log({
            level: 'error',
            message: 'Failed to disable Crunchyroll Video Token',
            token: token,
            error: error,
            timestamp: new Date().toISOString(),
            section: 'tokenDisabelingCrunchyrollFetch'
        })
    }
}

// Crunchyroll Activate Video Token Fetch
export async function activateVideoToken(content: string, token: string) {
    const account = await loggedInCheck('CR')

    if (!account) return

    const login = await crunchyLogin(account.username, account.password, 'LOCAL')

    if (!login) return

    const headers = {
        Authorization: `Bearer ${login.access_token}`
    }

    await incrementPlaylistCounter()
    const response = await fetch(`https://cr-play-service.prd.crunchyrollsvc.com/v1/token/${content}/${token}/keepAlive?playhead=1`, {
        method: 'PATCH',
        headers: headers
    })

    if (response.ok) {
        server.logger.log({
            level: 'info',
            message: 'Activated Video Token',
            token: token,
            timestamp: new Date().toISOString(),
            section: 'tokenDeletionCrunchyrollFetch'
        })

        return 'ok'
    } else {
        const error = await response.text()
        server.logger.log({
            level: 'error',
            message: 'Failed to activate Crunchyroll Video Token',
            token: token,
            error: error,
            timestamp: new Date().toISOString(),
            section: 'tokenActivationCrunchyrollFetch'
        })
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
        'x-cr-disable-drm': 'true'
    }

    const regex = /\/manifest\/([A-Z0-9]+)\/.*\?playbackGuid=([^&]+)/

    const match = q.match(regex)

    if (!match) return

    const contentID = match[1]
    const playlistID = match[2]

    await activateVideoToken(contentID, playlistID)

    try {
        const response = await fetch(q, {
            method: 'GET',
            headers: headers
        })

        if (response.ok) {
            deleteVideoToken(contentID, playlistID)
            const raw = await response.text()

            const parsed = mpdParse(raw)

            return parsed
        } else {
            const error = await response.text()

            const errorJSON: {
                error: string
            } = await JSON.parse(error)

            if (errorJSON.error === 'Invalid streaming token') {
                decrementPlaylistCounter()

                await activateVideoToken(contentID, playlistID)
                return await crunchyGetPlaylistMPD(q, geo)
            }

            messageBox('error', ['Cancel'], 2, 'Failed to get Crunchyroll MPD', 'Failed to get Crunchyroll MPD', error)
            server.logger.log({
                level: 'error',
                message: 'Failed to get Crunchyroll MPD',
                error: error,
                timestamp: new Date().toISOString(),
                section: 'mpdCrunchyrollFetch'
            })
            throw new Error(error)
        }
    } catch (e) {
        throw new Error(e as string)
    }
}

// Crunchyroll Metadata Fetch
export async function crunchyGetMetadata(q: string) {
    const headers = {
        'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27'
    }

    const response = await fetch(`https://static.crunchyroll.com/skip-events/production/${q}.json`, {
        method: 'GET',
        headers: headers
    })

    if (response.ok) {
        return (await JSON.parse(await response.text())) as VideoMetadata
    } else {
        return null
    }
}

export async function getAccountInfo() {
    const account = await loggedInCheck('CR')

    if (!account) return

    const login = await crunchyLogin(account.username, account.password, 'LOCAL')

    if (!login) return

    const headers = {
        Authorization: `Bearer ${login.access_token}`
    }

    try {
        const response = await fetch('https://beta-api.crunchyroll.com/accounts/v1/me', {
            method: 'GET',
            headers: headers
        })

        if (response.ok) {
            const data: {
                account_id: string
                external_id: string
            } = await JSON.parse(await response.text())

            return data
        } else {
            const error = await response.text()
            server.logger.log({
                level: 'error',
                message: 'Failed to get Crunchyroll Account Info',
                error: error,
                timestamp: new Date().toISOString(),
                section: 'settingsCrunchyrollFetch'
            })
            throw new Error(await response.text())
        }
    } catch (e) {
        throw new Error(e as string)
    }
}

// Check Max account streams because of crunchyroll activestream limit
export async function checkAccountMaxStreams() {
    const accountinfo = await getAccountInfo()

    if (!accountinfo) return 1

    const account = await loggedInCheck('CR')

    if (!account) return 1

    const login = await crunchyLogin(account.username, account.password, 'LOCAL')

    if (!login) return 1

    const headers = {
        Authorization: `Bearer ${login.access_token}`
    }

    try {
        const response = await fetch(`https://beta-api.crunchyroll.com/subs/v1/subscriptions/${accountinfo.external_id}/benefits`, {
            method: 'GET',
            headers: headers
        })

        if (response.ok) {
            const data: {
                items: {
                    __class__: string
                    __href__: string
                    __links__: string
                    __actions__: string
                    benefit: string
                    source: string
                }[]
            } = await JSON.parse(await response.text())

            if (!data.items || data.items.length === 0) return 1

            if (data.items.find((i) => i.benefit === 'concurrent_streams.4')) return 4

            if (data.items.find((i) => i.benefit === 'concurrent_streams.1')) return 1

            if (data.items.find((i) => i.benefit === 'concurrent_streams.6')) return 6

            return 1
        } else {
            const error = await response.text()
            messageBox('error', ['Cancel'], 2, 'Failed to get Crunchyroll Account Subscription', 'Failed to get Crunchyroll Account Subscription', error)
            server.logger.log({
                level: 'error',
                message: 'Failed to get Crunchyroll Account Subscription',
                error: error,
                timestamp: new Date().toISOString(),
                section: 'subCrunchyrollFetch'
            })
            throw new Error(await response.text())
        }
    } catch (e) {
        return 1
    }
}
