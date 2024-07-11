import type { FastifyReply, FastifyRequest } from 'fastify'
import { server } from '../../api'
import { getOneAccountByService } from '../../db/models/account'
import { SERVICES } from '../../../constants'
import { CrunchyrollService } from './crunchyroll.service'

export class CrunchyrollController {
    static async login(
        request: FastifyRequest<{ Querystring: { geo: string } }>,
        reply: FastifyReply
    ) {
        const account = await getOneAccountByService(SERVICES.crunchyroll)

        if (account === null) {
            server.logger.log({ level: 'error', message: 'Not Logged in' })
            return reply.code(401).send({ message: 'Not Logged in' })
        }

        const user = await CrunchyrollService.loginHandler(
            account.username,
            account.password,
            request.query.geo
        )

        if (user === null) return reply.code(401).send({ message: 'Not Logged in' })

        return reply.code(200).send(user)
    }
}
