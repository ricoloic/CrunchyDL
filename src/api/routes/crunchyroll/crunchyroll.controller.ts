import type { FastifyReply, FastifyRequest } from 'fastify'
import { crunchyLogin } from './crunchyroll.service'
import { loggedInCheck } from '../service/service.service'
import { server } from '../../api'

export async function loginController(
    request: FastifyRequest<{
        Querystring: {
            geo: string
        }
    }>,
    reply: FastifyReply
) {
    const query = request.query

    const account = await loggedInCheck('CR')

    if (!account) {
        server.logger.log({
            level: 'error',
            message: 'Not Logged in'
        })
        return reply.code(401).send({ message: 'Not Logged in' })
    }

    const login = await crunchyLogin(account.username, account.password, query.geo)

    return reply.code(200).send(login)
}
