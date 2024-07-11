import type { FastifyReply, FastifyRequest } from 'fastify'
import { CrunchyEpisodes } from '../../types/crunchyroll'
import { adnLogin } from '../adn/adn.service'
import { server } from '../../api'
import { getDownloadingAudio } from '../../services/audio'
import { Formats, Locales, Qualities, Services, SERVICES } from '../../../constants'
import { deleteOneAccount, getAllAccounts } from '../../db/models/account'
import { CrunchyrollService } from '../crunchyroll/crunchyroll.service'
import { createOnePlaylist } from '../../db/models/playlist'
import { getDownloading, getPlaylist, loggedInCheck, safeLoginData } from './service.service'

export async function checkLoginController(
    request: FastifyRequest<{
        Params: {
            service: Services
        }
    }>,
    reply: FastifyReply
) {
    const account = await loggedInCheck(request.params.service)

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
            service: Services
        }
    }>,
    reply: FastifyReply
) {
    const body = request.body
    const params = request.params

    const account = await loggedInCheck(params.service)

    if (account) {
        return reply.code(404).send({ message: 'Already Logged In' })
    }

    let response
    let responseError
    let responseData

    if (params.service === SERVICES.crunchyroll) {
        response = await CrunchyrollService.loginHandler(body.user, body.password, 'LOCAL')
    }

    if (params.service === SERVICES.animationdigitalnetwork) {
        const { data, error } = await adnLogin(body.user, body.password)
        responseError = error
        responseData = data
    }

    if (responseError && !responseData && !response) {
        return reply.code(404).send({
            message: 'Invalid Email or Password'
        })
    }

    await safeLoginData(body.user, body.password, params.service)

    return reply.code(200).send()
}

export async function getAllAccountsHandler(_: FastifyRequest, reply: FastifyReply) {
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
    const account = await deleteOneAccount(request.params.id)

    if (account === null) {
        return reply.code(500).send()
    }

    return reply.code(200).send()
}

export async function addPlaylistController(
    request: FastifyRequest<{
        Body: {
            episodes: CrunchyEpisodes
            dubs: Locales[]
            subs: Locales[]
            hardsub: { format: string } & Locales
            dir: string
            quality: Qualities
            qualityaudio: 1 | 2 | 3 | undefined
            service: Services
            format: Formats
        }
    }>,
    reply: FastifyReply
) {
    const body = request.body

    for (const e of body.episodes) {
        await createOnePlaylist({
            media: e,
            sub: body.subs,
            dub: body.dubs,
            hardsub: body.hardsub,
            dir: body.dir,
            status: 'waiting',
            quality: body.quality,
            qualityaudio: body.qualityaudio,
            service: body.service,
            format: body.format
        })
    }

    return reply.code(201).send()
}

export async function getPlaylistController(_request: FastifyRequest, reply: FastifyReply) {
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

export async function checkProxiesController(_request: FastifyRequest, reply: FastifyReply) {
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
                    new Promise<Response>((_resolve, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), 500)
                    )
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
