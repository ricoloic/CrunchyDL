import { FastifyReply, FastifyRequest } from 'fastify'
import { crunchyLogin } from '../crunchyroll/crunchyroll.service'
import { addEpisodeToPlaylist, getDownloading, getPlaylist, loggedInCheck, safeLoginData } from './service.service'
import { CrunchyEpisodes } from '../../types/crunchyroll'
import { adnLogin } from '../adn/adn.service'

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

    var responseData
    var responseError

    if (params.id === 'CR') {
        const { data, error } = await crunchyLogin(body.user, body.password)
        ;(responseError = error), (responseData = data)
    }

    if (params.id === 'ADN') {
        const { data, error } = await adnLogin(body.user, body.password)
        ;(responseError = error), (responseData = data)
    }

    if (responseError || !responseData) {
        return reply.code(404).send({
            message: 'Invalid Email or Password'
        })
    }

    await safeLoginData(body.user, body.password, params.id)

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
            service: 'CR' | 'ADN'
            format: 'mp4' | 'mkv'
        }
    }>,
    reply: FastifyReply
) {
    const body = request.body

    for (const e of body.episodes) {
        await addEpisodeToPlaylist(e, body.subs, body.dubs, body.dir, body.hardsub, 'waiting', body.quality, body.service, body.format)
    }

    return reply.code(201).send()
}

export async function getPlaylistController(request: FastifyRequest, reply: FastifyReply) {
    const playlist = await getPlaylist()

    for (const v of playlist) {
        if (v.dataValues.status === 'downloading') {
            const found = await getDownloading(v.dataValues.id)
            if (found) {
                ;(v as any).dataValues = {
                    ...v.dataValues,
                    partsleft: found.partsToDownload,
                    partsdownloaded: found.downloadedParts,
                    downloadspeed: found.downloadSpeed.toFixed(2)
                }
            }
        }
    }

    return reply.code(200).send(playlist.reverse())
}
