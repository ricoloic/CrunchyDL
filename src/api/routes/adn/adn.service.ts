import crypto from 'crypto'
import CryptoJS from 'crypto-js'
import { server } from '../../api'
import { ADNLink, ADNPlayerConfig } from '../../types/adn'
import { useFetch } from '../useFetch'
import { loggedInCheck } from '../service/service.service'
import { SERVICES } from '../../../constants'
import { MessageBoxBuilder } from '../../../electron/utils/messageBox'

export async function adnLogin(user: string, passw: string) {
    const cachedData:
        | {
              accessToken: string
          }
        | undefined = server.CacheController.get('adntoken')

    if (!cachedData) {
        const { data, error } = await adnLoginFetch(user, passw)

        if (error) {
            MessageBoxBuilder.new('error')
                .button('Cancel', true)
                .detail(error.error as string)
                .build('Failed to login', 'Failed to login to ADN')
            return { data: null, error: error.error }
        }

        if (!data) {
            MessageBoxBuilder.new('error')
                .button('Cancel', true)
                .detail('ADN returned null')
                .build('Failed to login', 'Failed to login to ADN')
            return { data: null, error: 'ADN returned null' }
        }

        if (!data.accessToken) {
            MessageBoxBuilder.new('error')
                .button('Cancel', true)
                .detail('ADN returned malformed data')
                .build('Failed to login', 'Failed to login to ADN')
            return { data: null, error: 'ADN returned malformed data' }
        }

        server.CacheController.set('adntoken', data, 300)

        return { data, error: null }
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
        return { data: null, error }
    }

    if (!data) {
        return { data: null, error: null }
    }

    return { data, error: null }
}

export async function getEpisodeADN(q: number) {
    const cachedData = server.CacheController.get(`getepisodeadn-${q}`)

    if (cachedData) {
        return cachedData
    }

    try {
        const response = await fetch(
            `https://gw.api.animationdigitalnetwork.fr/video/${q}/public`,
            {
                method: 'GET',
                headers: {
                    'x-target-distribution': 'de'
                }
            }
        )

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
    const account = await loggedInCheck(SERVICES.animationdigitalnetwork)

    if (!account) return

    const token = await adnLogin(account.username, account.password)

    if (!token.data?.accessToken) return

    try {
        const response = await fetch(
            `https://gw.api.animationdigitalnetwork.fr/player/video/${id}/configuration`,
            {
                method: 'GET',
                headers: {
                    'x-target-distribution': geo,
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token.data.accessToken}`
                }
            }
        )

        if (response.ok) {
            const data: ADNPlayerConfig = JSON.parse(await response.text())

            return data
        } else {
            throw new Error('Failed to fetch ADN Player config')
        }
    } catch (e) {
        throw new Error(e as string)
    }
}

async function getPlayerToken(id: number, geo: 'de' | 'fr') {
    const r = await getPlayerConfigADN(id, geo)

    if (!r) return

    try {
        const response = await fetch(
            `https://gw.api.animationdigitalnetwork.fr/player/refresh/token`,
            {
                method: 'POST',
                headers: {
                    'x-target-distribution': geo,
                    'Content-Type': 'application/json',
                    'X-Player-Refresh-Token': r.player.options.user.refreshToken
                }
            }
        )

        if (response.ok) {
            const data: {
                token: string
                accessToken: string
                refreshToken: string
            } = JSON.parse(await response.text())

            return data
        } else {
            throw new Error('Failed to fetch ADN Player token')
        }
    } catch (e) {
        throw new Error(e as string)
    }
}

function randomHexaString(length: number) {
    const characters = '0123456789abcdef'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
}

export async function adnGetPlaylist(animeid: number, geo: 'de' | 'fr') {
    const player = await getPlayerToken(animeid, geo)

    if (!player) return

    const random = randomHexaString(16)

    const authorization = crypto
        .publicEncrypt(
            {
                key: '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbQrCJBRmaXM4gJidDmcpWDssg\nnumHinCLHAgS4buMtdH7dEGGEUfBofLzoEdt1jqcrCDT6YNhM0aFCqbLOPFtx9cg\n/X2G/G5bPVu8cuFM0L+ehp8s6izK1kjx3OOPH/kWzvstM5tkqgJkNyNEvHdeJl6\nKhS+IFEqwvZqgbBpKuwIDAQAB\n-----END PUBLIC KEY-----',
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            Buffer.from(
                JSON.stringify({
                    k: random,
                    t: player.token
                }),
                'utf-8'
            )
        )
        .toString('base64')

    if (!authorization) return

    try {
        const response = await fetch(
            `https://gw.api.animationdigitalnetwork.fr/player/video/${animeid}/link`,
            {
                method: 'GET',
                headers: {
                    'x-target-distribution': geo,
                    'X-Player-Token': authorization
                }
            }
        )

        if (response.ok) {
            const data: ADNLink = await JSON.parse(await response.text())
            return { data, secret: random }
        } else {
            const data: { message: string; code: string; statusCode: string } = JSON.parse(
                await response.text()
            )

            MessageBoxBuilder.new('error')
                .button('Cancel', true)
                .detail(`${data.message} - ${data.code}`)
                .build('Failed to fetch Playlist', 'Failed to fetch ADN Playlist')

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
    const startIndex = playlist.indexOf('http')
    const endIndex = playlist.indexOf(' ', startIndex)
    const extractedURL = playlist.slice(startIndex, endIndex)
    return extractedURL
}

async function extractBaseURL(playlistURL: string) {
    const baseURL = playlistURL.substring(0, playlistURL.lastIndexOf('/') + 1)
    return baseURL
}

async function extractSequenceURLs(playlistText: string, baseURL: string) {
    const sequenceURLs: Array<{ filename: string; url: string }> = []
    const matches = playlistText.match(/sequence_\d+\.ts/g)
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

    const key = secret + '7fac1178830cfe0c'

    const parsedSubtitle = CryptoJS.enc.Base64.parse(data.substring(0, 24))
    const sec = CryptoJS.enc.Hex.parse(key)
    const som = data.substring(24)

    try {
        // Fuck You ADN
        let decrypted: any = CryptoJS.AES.decrypt(som, sec, { iv: parsedSubtitle })
        decrypted = decrypted.toString(CryptoJS.enc.Utf8)
        return decrypted
    } catch (error) {
        console.error('Error decrypting subtitles:', error)
        return null
    }
}
