import { FastifyInstance } from 'fastify'
import { addPlaylistController, checkLoginController, checkProxiesController, deleteAccountHandler, getAllAccountsHandler, getPlaylistController, loginController } from './service.controller'

async function serviceRoutes(server: FastifyInstance) {
    server.post(
        '/login/:id',
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
        server.get(
            '/check/:id',
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

    server.get(
        '/accounts',
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
        getAllAccountsHandler
    )

    server.delete(
        '/account/:id',
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
        deleteAccountHandler
    )

    server.get(
        '/proxies',
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
        checkProxiesController
    )
}

export default serviceRoutes
