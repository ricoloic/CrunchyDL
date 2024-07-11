import { type FastifyInstance } from 'fastify'
import {
    addPlaylistController,
    checkLoginController,
    checkProxiesController,
    deleteAccountHandler,
    getAllAccountsHandler,
    getPlaylistController,
    loginController
} from './service.controller'

export const RESPONSES = {
    '4xx': {
        error: { type: 'string' },
        message: { type: 'string' }
    }
}

// eslint-disable-next-line require-await
async function serviceRoutes(server: FastifyInstance) {
    server.post('/login/:service', { schema: { response: { ...RESPONSES } } }, loginController)
    server.get('/check/:service', { schema: { response: { ...RESPONSES } } }, checkLoginController)
    server.post('/playlist', { schema: { response: { ...RESPONSES } } }, addPlaylistController)
    server.get('/playlist', { schema: { response: { ...RESPONSES } } }, getPlaylistController)
    server.get('/accounts', { schema: { response: { ...RESPONSES } } }, getAllAccountsHandler)
    server.delete('/account/:id', { schema: { response: { ...RESPONSES } } }, deleteAccountHandler)
    server.get('/proxies', { schema: { response: { ...RESPONSES } } }, checkProxiesController)
}

export default serviceRoutes
