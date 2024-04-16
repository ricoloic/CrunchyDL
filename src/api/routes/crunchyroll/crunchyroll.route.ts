import type { FastifyInstance } from 'fastify'
import { addPlaylistController, checkLoginController, getPlaylistController, loginController, loginLoginController } from './crunchyroll.controller'

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
  ),
  server.post(
    '/login/login',
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
    loginLoginController
  ),
  server.get(
    '/check',
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
    checkLoginController
  ),
  server.post(
    '/playlist',
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
    addPlaylistController
  )
  server.get(
    '/playlist',
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
    getPlaylistController
  )
}

export default crunchyrollRoutes
