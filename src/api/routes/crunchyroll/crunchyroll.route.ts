import type { FastifyInstance } from 'fastify'
import { loginController } from './crunchyroll.controller'

async function crunchyrollRoutes(server: FastifyInstance) {
  server.post(
    '/login',
    {
      schema: {
        response: {
          '4xx': {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    loginController
  )
}

export default crunchyrollRoutes
