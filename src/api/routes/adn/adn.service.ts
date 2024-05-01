import JSEncrypt from 'jsencrypt'
import CryptoJS from 'crypto-js'
import { server } from '../../api'
import { ADNLink, ADNPlayerConfig } from '../../types/adn'
import { messageBox } from '../../../electron/background'
import { useFetch } from '../useFetch'
import { loggedInCheck } from '../service/service.service'
import { parse as mpdParse, parse } from 'mpd-parser'

export async function adnLogin(user: string, passw: string) {
    const cachedData:
        | {
              accessToken: string
          }
        | undefined = server.CacheController.get('adntoken')

    if (!cachedData) {
        var { data, error } = await adnLoginFetch(user, passw)

        if (error) {
            messageBox('error', ['Cancel'], 2, 'Failed to login', 'Failed to login to ADN', error.error as string)
            return { data: null, error: error.error }
        }

        if (!data) {
            messageBox('error', ['Cancel'], 2, 'Failed to login', 'Failed to login to ADN', 'ADN returned null')
            return { data: null, error: 'ADN returned null' }
        }

        if (!data.accessToken) {
            messageBox('error', ['Cancel'], 2, 'Failed to login', 'Failed to login to ADN', 'ADN returned malformed data')
            return { data: null, error: 'ADN returned malformed data' }
        }

        server.CacheController.set('adntoken', data, 300)

        return { data: data, error: null }
    }

    return { data: cachedData, error: null }
}

async function adnLoginFetch(user: string, passw: string) {
    const headers = {
        'Content-Type': 'application/json'
    }

    const body = {
        username: user,
        password: passw,
        source: 'Web',
        rememberMe: true
    }

    const { data, error } = await useFetch<{
        accessToken: string
    }>('https://gw.api.animationdigitalnetwork.fr/authentication/login', {
        type: 'POST',
        body: JSON.stringify(body),
        header: headers
    })

    if (error) {
        return { data: null, error: error }
    }

    if (!data) {
        return { data: null, error: null }
    }

    return { data: data, error: null }
}

export async function getEpisodeADN(q: number) {
    const cachedData = server.CacheController.get(`getepisodeadn-${q}`)

    if (cachedData) {
        return cachedData
    }

    try {
        const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/video/${q}/public`, {
            method: 'GET',
            headers: {
                'x-target-distribution': 'de'
            }
        })

        if (response.ok) {
            const data: {
                video: Array<any>
            } = JSON.parse(await response.text())

            server.CacheController.set(`getepisodeadn-${q}`, data.video, 1000)

            return data.video
        } else {
            throw new Error('Failed to fetch ADN')
        }
    } catch (e) {
        throw new Error(e as string)
    }
}

export async function getPlayerConfigADN(id: number, geo: 'de' | 'fr') {
    const account = await loggedInCheck('ADN')

    if (!account) return

    const token = await adnLogin(account.username, account.password)

    if (!token.data?.accessToken) return

    try {
        const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/player/video/${id}/configuration`, {
            method: 'GET',
            headers: {
                'x-target-distribution': geo,
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token.data.accessToken}`
            }
        })

        if (response.ok) {
            const data: ADNPlayerConfig = JSON.parse(await response.text())

            return data
        } else {
            throw new Error('Failed to fetch ADN')
        }
    } catch (e) {
        throw new Error(e as string)
    }
}

async function getPlayerToken(id: number, geo: 'de' | 'fr') {
    const r = await getPlayerConfigADN(id, geo)

    if (!r) return

    try {
        const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/player/refresh/token`, {
            method: 'POST',
            headers: {
                'x-target-distribution': geo,
                'Content-Type': 'application/json',
                'X-Player-Refresh-Token': r.player.options.user.refreshToken
            }
        })

        if (response.ok) {
            const data: {
                token: string
                accessToken: string
                refreshToken: string
            } = JSON.parse(await response.text())

            return data
        } else {
            throw new Error('Failed to fetch ADN')
        }
    } catch (e) {
        throw new Error(e as string)
    }
}

function randomHexaString(length: number) {
    const characters = '0123456789abcdef'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += characters[Math.floor(Math.random() * characters.length)]
    }
    return result
}

async function getPlayerEncryptedToken(id: number, geo: 'de' | 'fr') {
    const token = await getPlayerToken(id, geo)

    if (!token) return

    var key = new JSEncrypt()
    var random = randomHexaString(16)

    key.setPublicKey(
        '-----BEGIN PUBLIC KEY-----MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbQrCJBRmaXM4gJidDmcpWDssgnumHinCLHAgS4buMtdH7dEGGEUfBofLzoEdt1jqcrCDT6YNhM0aFCqbLOPFtx9cg/X2G/G5bPVu8cuFM0L+ehp8s6izK1kjx3OOPH/kWzvstM5tkqgJkNyNEvHdeJl6KhS+IFEqwvZqgbBpKuwIDAQAB-----END PUBLIC KEY-----'
    )

    const data = {
        k: random,
        t: String(token.token)
    }

    const finisheddata = JSON.stringify(data)

    const encryptedData = key.encrypt(finisheddata) || ''

    return { data: encryptedData, random: random }
}

export async function adnGetPlaylist(animeid: number, geo: 'de' | 'fr') {
    const token = await getPlayerEncryptedToken(animeid, geo)

    if (!token) return

    try {
        const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/player/video/${animeid}/link`, {
            method: 'GET',
            headers: {
                'x-target-distribution': geo,
                'X-Player-Token': token.data
            }
        })

        if (response.ok) {
            const data: ADNLink = await JSON.parse(await response.text())
            return { data: data, secret: token.random }
        } else {
            const data: { message: string; code: string; statusCode: string } = JSON.parse(await response.text())

            messageBox('error', ['Cancel'], 2, 'Failed to fetch Playlist', 'Failed to fetch ADN Playlist', `${data.message} - ${data.code}`)

            return null
        }
    } catch (e) {
        throw new Error(e as string)
    }
}

export async function adnGetM3U8Playlist(url: string) {
    try {
        const response = await fetch(url, {
            method: 'GET'
        })

        if (response.ok) {
            const data: { location: string } = await JSON.parse(await response.text())

            const mu8 = await fetch(data.location, {
                method: 'GET'
            })

            const playlist = await mu8.text()

            const url = await extractURLFromPlaylist(playlist)

            const partsraw = await fetch(url, {
                method: 'GET'
            })

            const parts = await partsraw.text()

            const baseurl = await extractBaseURL(url)

            const partsArray = await extractSequenceURLs(parts, baseurl)

            return partsArray
        }
    } catch (e) {
        throw new Error(e as string)
    }
}

async function extractURLFromPlaylist(playlist: string) {
    var startIndex = playlist.indexOf('http')
    var endIndex = playlist.indexOf(' ', startIndex)
    var extractedURL = playlist.slice(startIndex, endIndex)
    return extractedURL
}

async function extractBaseURL(playlistURL: string) {
    var baseURL = playlistURL.substring(0, playlistURL.lastIndexOf('/') + 1)
    return baseURL
}

async function extractSequenceURLs(playlistText: string, baseURL: string) {
    var sequenceURLs: Array<{ filename: string; url: string }> = []
    var matches = playlistText.match(/sequence_\d+\.ts/g)
    if (matches) {
        matches.forEach(function (match) {
            sequenceURLs.push({ filename: match, url: baseURL + match })
        })
    }
    return sequenceURLs
}

export async function parseSubs(url: string, secret: string) {
    const response = await fetch(url)

    const data = await response.text()

    var key = secret + '7fac1178830cfe0c'

    var parsedSubtitle = CryptoJS.enc.Base64.parse(data.substring(0, 24))
    var sec = CryptoJS.enc.Hex.parse(key)
    var som = data.substring(24)

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
