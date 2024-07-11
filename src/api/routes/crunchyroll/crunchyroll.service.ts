import { type Manifest, parse as mpdParse } from 'mpd-parser'
import settings from 'electron-settings'
import { app } from 'electron'
import { server } from '../../api'
import { VideoMetadata, VideoPlaylist, VideoPlaylistNoGEO } from '../../types/crunchyroll'
import { MessageBoxBuilder } from '../../../electron/utils/messageBox'
import { isProxyActive, Proxy, validateProxies } from '../../utils/proxy'
import { getOneAccountByService } from '../../db/models/account'
import { SERVICES } from '../../../constants'

settings.configure({
    dir: app.getPath('documents') + '/Crunchyroll Downloader/settings/'
})

const ENDPOINT_KEY = 'CREndpoint'
const CRUNCHYROLL_BETA_API = 'https://beta-api.crunchyroll.com/'
const ENDPOINTS = [
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

let counter = 0
let maxLimit = 0

// eslint-disable-next-line require-await
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

interface UserData {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
    country: string
    account_id: string
    profile_id: string
}

interface Version {
    audio_locale: string
    guid: string
    is_premium_only: boolean
    media_guid: string
    original: boolean
    season_guid: string
    variant: string
    geo: string
}

interface ActiveStream {
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
}

interface Item {
    __class__: string
    __href__: string
    __links__: string
    __actions__: string
    benefit: string
    source: string
}

export function logCrunchyrollServiceError(
    action: Function,
    message: string,
    exception: any,
    show: boolean = true
) {
    const title = `Crunchyroll Service Error`
    const section = `crunchyroll_service.${action.name}`
    const detail = JSON.stringify(exception)
    const timestamp = new Date().toISOString()

    if (show) {
        MessageBoxBuilder.new('error').button('Cancel', true).detail(detail).build(title, message)
    }
    server.logger.log({ level: 'error', message, error: exception, timestamp, section })
}

export function logCrunchyrollServiceInfo(action: Function, message: string) {
    const section = `crunchyroll_service.${action.name}`
    const timestamp = new Date().toISOString()
    server.logger.log({ level: 'info', message, timestamp, section })
}

export class CrunchyrollService {
    static async endpoint() {
        const endpoint = await settings.get(ENDPOINT_KEY)
        if (endpoint) return endpoint

        await settings.set(ENDPOINT_KEY, 1)
        return 1
    }

    static async loginHandler(username: string, password: string, geo: string) {
        const endpoint = CrunchyrollService.endpoint()
        const cached: UserData | undefined = server.CacheController.get(
            `crtoken-${geo}-${endpoint}`
        )

        if (cached) return cached

        if (geo === 'LOCAL') {
            const { data, error } = await CrunchyrollService.login(username, password)
            if (error) return null

            server.CacheController.set(`crtoken-${geo}-${endpoint}`, data, data.expires_in - 30)
            return data
        }

        const { data, error } = await CrunchyrollService.loginProxy(username, password, geo)
        if (error) return null

        server.CacheController.set(`crtoken-${geo}-${endpoint}`, data, data.expires_in - 30)
        return data
    }

    static async login(
        username: string,
        password: string
    ): Promise<
        { data: UserData; error: null } | { data: null; error: { status: number; message: string } }
    > {
        await CrunchyrollService.endpoint()
        const headers = {
            Authorization:
                'Basic dC1rZGdwMmg4YzNqdWI4Zm4wZnE6eWZMRGZNZnJZdktYaDRKWFMxTEVJMmNDcXUxdjVXYW4=',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Crunchyroll/3.46.2 Android/13 okhttp/4.12.0'
        }
        const body = {
            username,
            password,
            grant_type: 'password',
            scope: 'offline_access',
            device_name: 'RMX2170',
            device_type: 'realme RMX2170'
        }

        return await fetch(`${CRUNCHYROLL_BETA_API}auth/v1/token`, {
            method: 'POST',
            body: new URLSearchParams(body).toString(),
            headers,
            credentials: 'same-origin'
        })
            .then(async (response) => {
                const text = await response.text()

                if (response.ok) {
                    return { data: JSON.parse(text) as UserData, error: null }
                }

                return { error: { status: response.status, message: text }, data: null }
            })
            .catch((error) => {
                logCrunchyrollServiceError(
                    CrunchyrollService.login,
                    'Failed to Login to Crunchyroll',
                    error
                )
                return { data: null, error: { status: 500, message: String(error) } }
            })
    }

    static async loginProxy(
        username: string,
        password: string,
        geo: string
    ): Promise<
        { data: UserData; error: null } | { data: null; error: { status: number; message: string } }
    > {
        const proxies = await validateProxies()

        await CrunchyrollService.endpoint()
        const proxy = proxies.find((p) => p.code === geo)

        if (!proxy) {
            logCrunchyrollServiceError(
                CrunchyrollService.loginProxy,
                'Login Proxy not found',
                `Login Proxy ${geo} not found`
            )
            return { error: { status: 500, message: `Login Proxy ${geo} not found` }, data: null }
        }

        if (proxy.status === 'offline') {
            logCrunchyrollServiceError(
                CrunchyrollService.loginProxy,
                `Login Proxy is offline`,
                `Login Proxy ${geo} is offline`
            )
            return { error: { status: 500, message: `Login Proxy ${geo} is offline` }, data: null }
        }

        const headers = {
            Authorization:
                'Basic dC1rZGdwMmg4YzNqdWI4Zm4wZnE6eWZMRGZNZnJZdktYaDRKWFMxTEVJMmNDcXUxdjVXYW4=',
            'Content-Type': 'application/json',
            'User-Agent': 'Crunchyroll/3.46.2 Android/13 okhttp/4.12.0'
        }
        const body = {
            username,
            password,
            grant_type: 'password',
            scope: 'offline_access',
            device_name: 'RMX2170',
            device_type: 'realme RMX2170',
            ursa: 'Crunchyroll/3.46.2 Android/13 okhttp/4.12.0',
            token: 'Basic dC1rZGdwMmg4YzNqdWI4Zm4wZnE6eWZMRGZNZnJZdktYaDRKWFMxTEVJMmNDcXUxdjVXYW4='
        }

        return await fetch(`${proxy.url}auth/v1/token`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
            credentials: 'same-origin'
        })
            .then(async (response) => {
                const text = await response.text()

                if (response.ok) {
                    return { data: JSON.parse(text) as UserData, error: null }
                }

                return { error: { status: response.status, message: text }, data: null }
            })
            .catch((error) => {
                logCrunchyrollServiceError(
                    CrunchyrollService.loginProxy,
                    'Failed to Login to Crunchyroll',
                    error
                )
                return { data: null, error: { status: 500, message: String(error) } }
            })
    }

    static async versions(query: string) {
        const account = await getOneAccountByService(SERVICES.crunchyroll)
        if (account === null) return null

        const user = await CrunchyrollService.loginHandler(
            account.username,
            account.password,
            'LOCAL'
        )
        if (user === null) return null

        const headers = {
            Authorization: `Bearer ${user.access_token}`
        }

        return await fetch(
            `${CRUNCHYROLL_BETA_API}content/v2/cms/objects/${query}?ratings=true&locale=en-US`,
            {
                method: 'GET',
                headers,
                credentials: 'same-origin'
            }
        )
            .then(async (response) => {
                const text = await response.text()

                if (response.ok) {
                    const body: { data: { episode_metadata: { versions: Version[] } }[] } =
                        JSON.parse(text)
                    return body.data[0].episode_metadata.versions
                }

                logCrunchyrollServiceError(
                    CrunchyrollService.versions,
                    'Failed to Fetch Crunchyroll Episode',
                    {
                        status: response.status,
                        message: text
                    }
                )
                return null
            })
            .catch((error) => {
                logCrunchyrollServiceError(
                    CrunchyrollService.versions,
                    'Failed to Fetch Crunchyroll Episode',
                    error
                )
                return null
            })
    }

    static async playlist(
        query: string,
        geo: string | undefined
    ): Promise<{ data: VideoPlaylist; account_id: string } | null> {
        const proxyActive = await isProxyActive()
        let proxies: Proxy[] = []

        if (proxyActive) {
            proxies = await validateProxies()
        }

        const account = await getOneAccountByService(SERVICES.crunchyroll)
        if (account === null) return null

        const user = await CrunchyrollService.loginHandler(
            account.username,
            account.password,
            geo || 'LOCAL'
        )
        if (user === null) return null

        const endpoints = [...ENDPOINTS]
        const endpoint = await CrunchyrollService.endpoint()
        const validatedEndpoint = endpoints.find((e) => e.id === endpoint)

        const headers = {
            Authorization: `Bearer ${user.access_token}`,
            'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27',
            'x-cr-disable-drm': 'true'
        }

        if (maxLimit === 0) {
            maxLimit = await CrunchyrollService.maxStreams()
        }

        await incrementPlaylistCounter()

        let playlist: VideoPlaylist = {} as VideoPlaylist

        try {
            const response = await fetch(
                `https://cr-play-service.prd.crunchyrollsvc.com/v1/${query}${
                    validatedEndpoint ? validatedEndpoint?.url : '/console/switch/play'
                }`,
                {
                    method: 'GET',
                    headers
                }
            )
            const text = await response.text()

            if (response.ok) {
                const data: VideoPlaylist = JSON.parse(text)

                data.hardSubs = Object.values((data as any).hardSubs)
                data.subtitles = Object.values((data as any).subtitles)
                data.geo = geo
                playlist = data

                await CrunchyrollService.deleteToken(query, playlist.token)
            } else {
                const error: { activeStreams: ActiveStream[] } = await JSON.parse(text)
                if (error && error.activeStreams && error.activeStreams.length > 0) {
                    for (const activeStream of error.activeStreams) {
                        await CrunchyrollService.deleteToken(
                            activeStream.contentId,
                            activeStream.token
                        )
                    }

                    logCrunchyrollServiceError(
                        CrunchyrollService.playlist,
                        // eslint-disable-next-line max-len
                        'Refetching Crunchyroll Video Playlist & Deleting all Video Token because too many streams',
                        error
                    )

                    return await CrunchyrollService.playlist(query, geo)
                }

                logCrunchyrollServiceError(
                    CrunchyrollService.playlist,
                    'Failed to get Crunchyroll Video Playlist',
                    text
                )

                return null
            }
        } catch (error) {
            logCrunchyrollServiceError(
                CrunchyrollService.playlist,
                'Failed to get Crunchyroll Video Playlist',
                error
            )
        }

        if (!proxyActive) return { data: playlist, account_id: user.account_id }

        for (const proxy of proxies) {
            if (proxy.code !== user.country) {
                await incrementPlaylistCounter()

                const user = await CrunchyrollService.loginHandler(
                    account.username,
                    account.password,
                    proxy.code
                )

                if (user === null) return null

                const headers = {
                    Authorization: `Bearer ${user.access_token}`,
                    'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27'
                }

                try {
                    const response = await fetch(
                        `https://cr-play-service.prd.crunchyrollsvc.com/v1/${query}${
                            validatedEndpoint ? validatedEndpoint?.url : '/console/switch/play'
                        }`,
                        {
                            method: 'GET',
                            headers
                        }
                    )

                    const text = await response.text()

                    if (response.ok) {
                        const data: VideoPlaylistNoGEO = JSON.parse(text)

                        data.hardSubs = Object.values((data as any).hardSubs)
                        data.subtitles = Object.values((data as any).subtitles)
                        for (const v of data.versions) {
                            if (!playlist.versions.find((ver) => ver.guid === v.guid)) {
                                playlist.versions.push({ ...v, geo: proxy.code })
                            }
                        }
                        for (const v of data.subtitles) {
                            if (!playlist.subtitles.find((ver) => ver.language === v.language)) {
                                playlist.subtitles.push({ ...v, geo: proxy.code })
                            }
                        }
                        for (const v of data.hardSubs) {
                            if (!playlist.hardSubs.find((ver) => ver.hlang === v.hlang)) {
                                playlist.hardSubs.push({ ...v, geo: proxy.code })
                            }
                        }

                        await CrunchyrollService.deleteToken(query, data.token)
                    } else {
                        decrementPlaylistCounter()
                        const error: { activeStreams: ActiveStream[] } = await JSON.parse(text)

                        if (error && error.activeStreams && error.activeStreams.length > 0) {
                            for (const activeStream of error.activeStreams) {
                                await CrunchyrollService.deleteToken(
                                    activeStream.contentId,
                                    activeStream.token
                                )
                            }

                            logCrunchyrollServiceError(
                                CrunchyrollService.playlist,
                                // eslint-disable-next-line max-len
                                'Refetching Crunchyroll Video Playlist & Deleting all Video Token because too many streams',
                                error
                            )
                        }
                    }
                } catch (error) {
                    logCrunchyrollServiceError(
                        CrunchyrollService.playlist,
                        'Failed to get Crunchyroll Video Playlist',
                        error
                    )
                }
            }
        }
        return { data: playlist, account_id: user.account_id }
    }

    static async deleteToken(content: string, token: string) {
        const account = await getOneAccountByService(SERVICES.crunchyroll)
        if (account === null) return null

        const user = await CrunchyrollService.loginHandler(
            account.username,
            account.password,
            'LOCAL'
        )
        if (user === null) return null

        const headers = { Authorization: `Bearer ${user.access_token}` }

        return await fetch(
            `https://cr-play-service.prd.crunchyrollsvc.com/v1/token/${content}/${token}/inactive`,
            {
                method: 'PATCH',
                headers
            }
        )
            .then(async (response) => {
                if (response.ok) {
                    logCrunchyrollServiceInfo(
                        CrunchyrollService.deleteToken,
                        `Disabled Video Token: ${token}`
                    )
                    decrementPlaylistCounter()
                    return 'deleted'
                }
                decrementPlaylistCounter()
                const error = await response.text()
                logCrunchyrollServiceError(
                    CrunchyrollService.deleteToken,
                    `Failed to disable Crunchyroll Video Token: ${token}`,
                    error,
                    false
                )
                return null
            })
            .catch((error) => {
                logCrunchyrollServiceError(
                    CrunchyrollService.deleteToken,
                    `Failed to disable Crunchyroll Video Token: ${token}`,
                    error,
                    false
                )
                return null
            })
    }

    static async activateToken(content: string, token: string) {
        const account = await getOneAccountByService(SERVICES.crunchyroll)
        if (account === null) return null

        const user = await CrunchyrollService.loginHandler(
            account.username,
            account.password,
            'LOCAL'
        )
        if (user === null) return null

        const headers = { Authorization: `Bearer ${user.access_token}` }

        await incrementPlaylistCounter()

        return await fetch(
            // eslint-disable-next-line max-len
            `https://cr-play-service.prd.crunchyrollsvc.com/v1/token/${content}/${token}/keepAlive?playhead=1`,
            {
                method: 'PATCH',
                headers
            }
        )
            .then(async (response) => {
                if (response.ok) {
                    logCrunchyrollServiceInfo(
                        CrunchyrollService.deleteToken,
                        `Activated Video Token: ${token}`
                    )
                    return 'activated'
                }
                const error = await response.text()
                logCrunchyrollServiceError(
                    CrunchyrollService.deleteToken,
                    `Failed to activate Crunchyroll Video Token: ${token}`,
                    error,
                    false
                )
                return null
            })
            .catch((error) => {
                logCrunchyrollServiceError(
                    CrunchyrollService.deleteToken,
                    `Failed to activate Crunchyroll Video Token: ${token}`,
                    error,
                    false
                )
                return null
            })
    }

    static async playlistMpd(query: string, geo: string | undefined) {
        const account = await getOneAccountByService(SERVICES.crunchyroll)
        if (account === null) return null

        const user = await CrunchyrollService.loginHandler(
            account.username,
            account.password,
            'LOCAL'
        )
        if (user === null) return null

        const headers = {
            Authorization: `Bearer ${user.access_token}`,
            'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27'
        }

        const regex = /\/manifest\/([A-Z0-9]+)\/.*\?playbackGuid=([^&]+)/

        const match = query.match(regex)

        if (!match) return null

        const contentId = match[1]
        const playlistId = match[2]

        await CrunchyrollService.activateToken(contentId, playlistId)

        return await fetch(query, {
            method: 'GET',
            headers
        })
            .then(async (response): Promise<null | Manifest> => {
                const text = await response.text()

                if (response.ok) {
                    await CrunchyrollService.deleteToken(contentId, playlistId)
                    return mpdParse(text)
                }

                const error: { error: string } = await JSON.parse(text)

                if (error.error === 'Invalid streaming token') {
                    decrementPlaylistCounter()

                    await CrunchyrollService.activateToken(contentId, playlistId)
                    return await CrunchyrollService.playlistMpd(query, geo)
                }

                logCrunchyrollServiceError(
                    CrunchyrollService.playlistMpd,
                    'Failed to get Crunchyroll MPD',
                    text
                )
                return null
            })
            .catch((error) => {
                logCrunchyrollServiceError(
                    CrunchyrollService.playlistMpd,
                    'Failed to get Crunchyroll MPD',
                    error
                )
                return null
            })
    }

    static async metadata(query: string) {
        const headers = {
            'User-Agent': 'Crunchyroll/1.8.0 Nintendo Switch/12.3.12.0 UE4/4.27'
        }

        return await fetch(`https://static.crunchyroll.com/skip-events/production/${query}.json`, {
            method: 'GET',
            headers
        })
            .then(async (response) => {
                if (response.ok) {
                    return (await JSON.parse(await response.text())) as VideoMetadata
                }

                return null
            })
            .catch((_error) => {
                return null
            })
    }

    static async accountInfo() {
        const account = await getOneAccountByService(SERVICES.crunchyroll)
        if (account === null) return null

        const user = await CrunchyrollService.loginHandler(
            account.username,
            account.password,
            'LOCAL'
        )
        if (user === null) return null

        const headers = { Authorization: `Bearer ${user.access_token}` }

        return await fetch('https://beta-api.crunchyroll.com/accounts/v1/me', {
            method: 'GET',
            headers
        })
            .then(async (response) => {
                const text = await response.text()

                if (response.ok) {
                    return (await JSON.parse(text)) as { account_id: string; external_id: string }
                }

                logCrunchyrollServiceError(
                    CrunchyrollService.accountInfo,
                    'Failed to get Crunchyroll Account Info',
                    text,
                    false
                )
                return null
            })
            .catch((error) => {
                logCrunchyrollServiceError(
                    CrunchyrollService.accountInfo,
                    'Failed to get Crunchyroll Account Info',
                    error,
                    false
                )
                return null
            })
    }

    static async maxStreams() {
        const accountInfo = await CrunchyrollService.accountInfo()

        if (accountInfo === null) return 1

        const account = await getOneAccountByService(SERVICES.crunchyroll)
        if (account === null) return 1

        const user = await CrunchyrollService.loginHandler(
            account.username,
            account.password,
            'LOCAL'
        )
        if (user === null) return 1

        const headers = { Authorization: `Bearer ${user.access_token}` }

        return await fetch(
            // eslint-disable-next-line max-len
            `https://beta-api.crunchyroll.com/subs/v1/subscriptions/${accountInfo.external_id}/benefits`,
            {
                method: 'GET',
                headers
            }
        )
            .then(async (response) => {
                const text = await response.text()

                if (response.ok) {
                    const data: { items: Item[] } = await JSON.parse(text)

                    if (!data.items || data.items.length === 0) return 1
                    if (data.items.find((i) => i.benefit === 'concurrent_streams.4')) return 4
                    if (data.items.find((i) => i.benefit === 'concurrent_streams.1')) return 1
                    if (data.items.find((i) => i.benefit === 'concurrent_streams.6')) return 6
                    return 1
                }

                logCrunchyrollServiceError(
                    CrunchyrollService.maxStreams,
                    'Failed to get Crunchyroll Account Subscription',
                    text
                )
                return 1
            })
            .catch((error) => {
                logCrunchyrollServiceError(
                    CrunchyrollService.maxStreams,
                    'Failed to get Crunchyroll Account Subscription',
                    error
                )
                return 1
            })
    }
}
