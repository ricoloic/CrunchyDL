import { FastifyReply, FastifyRequest } from 'fastify'
import { crunchyLogin } from '../crunchyroll/crunchyroll.service'
import { addEpisodeToPlaylist, deleteAccountID, getAllAccounts, getDownloading, getPlaylist, loggedInCheck, safeLoginData } from './service.service'
import { CrunchyEpisodes } from '../../types/crunchyroll'
import { adnLogin } from '../adn/adn.service'
import { server } from '../../api'
import { getDownloadingAudio } from '../../services/audio'

export async function checkLoginController(
    request: FastifyRequest<{
        Params: {
            id: string
        }
    }>,
    reply: FastifyReply
) {
    const account = await loggedInCheck(request.params.id)

    if (!account) {
        return reply.code(401).send({ message: 'Not Logged in' })
    }

    return reply.code(200).send({ message: 'Logged in' })
}

export async function loginController(
    request: FastifyRequest<{
        Body: {
            user: string
            password: string
        }
        Params: {
            id: string
        }
    }>,
    reply: FastifyReply
) {
    const body = request.body
    const params = request.params

    const account = await loggedInCheck(params.id)

    if (account) {
        return reply.code(404).send({ message: 'Already Logged In' })
    }

    var response
    var responseError
    var responseData

    if (params.id === 'CR') {
        const login = await crunchyLogin(body.user, body.password, 'LOCAL')
        response = login
    }

    if (params.id === 'ADN') {
        const { data, error } = await adnLogin(body.user, body.password)
        ;(responseError = error), (responseData = data)
    }

    if (responseError && !responseData && !response) {
        return reply.code(404).send({
            message: 'Invalid Email or Password'
        })
    }

    await safeLoginData(body.user, body.password, params.id)

    return reply.code(200).send()
}

export async function getAllAccountsHandler(request: FastifyRequest, reply: FastifyReply) {
    const accounts = await getAllAccounts()

    return reply.code(200).send(accounts)
}

export async function deleteAccountHandler(
    request: FastifyRequest<{
        Params: {
            id: number
        }
    }>,
    reply: FastifyReply
) {
    try {
        await deleteAccountID(request.params.id)
    } catch (e) {
        return reply.code(500).send(e)
    }

    return reply.code(200).send()
}

export async function addPlaylistController(
    request: FastifyRequest<{
        Body: {
            episodes: CrunchyEpisodes
            dubs: Array<string>
            subs: Array<string>
            dir: string
            hardsub: boolean
            quality: 1080 | 720 | 480 | 360 | 240
            qualityaudio: 1 | 2 | 3 | undefined
            service: 'CR' | 'ADN'
            format: 'mp4' | 'mkv'
        }
    }>,
    reply: FastifyReply
) {
    const body = request.body

    for (const e of body.episodes) {
        await addEpisodeToPlaylist(e, body.subs, body.dubs, body.dir, body.hardsub, 'waiting', body.quality, body.qualityaudio, body.service, body.format)
    }

    return reply.code(201).send()
}

export async function getPlaylistController(request: FastifyRequest, reply: FastifyReply) {
    const playlist = await getPlaylist()

    if (!playlist) return

    for (const v of playlist) {
        if (v.dataValues.status !== 'completed') {
            const found = await getDownloading(v.dataValues.id)
            const foundAudio = await getDownloadingAudio(v.dataValues.id)
            if (found) {
                ;(v as any).dataValues = {
                    ...v.dataValues,
                    partsleft: found.partsToDownload,
                    partsdownloaded: found.downloadedParts,
                    downloadspeed: found.downloadSpeed.toFixed(2),
                    totaldownloaded: found.totalDownloaded
                }
            }
            if (foundAudio) {
                ;(v as any).dataValues = {
                    ...v.dataValues,
                    audiosdownloading: foundAudio
                }
            }
        }
    }

    return reply.code(200).send(playlist.reverse())
}

export async function checkProxiesController(request: FastifyRequest, reply: FastifyReply) {
    const cachedData = server.CacheController.get('proxycheck')

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

        return reply.code(200).send(proxies)
    }

    return reply.code(200).send(cachedData)
}
