import type { FastifyInstance } from 'fastify'
import { RESPONSES } from '../service/service.route'
import { CrunchyrollController } from './crunchyroll.controller'

// eslint-disable-next-line require-await
async function crunchyrollRoutes(server: FastifyInstance) {
    server.post('/login', { schema: { response: { ...RESPONSES } } }, CrunchyrollController.login)
}

export default crunchyrollRoutes
