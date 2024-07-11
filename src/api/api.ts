import fastify from 'fastify'
import cors from '@fastify/cors'
import NodeCache from 'node-cache'
import { app } from 'electron'
import * as winston from 'winston'
import { MessageBoxBuilder } from '../electron/utils/messageBox'
import serviceRoutes from './routes/service/service.route'
import { sequelize } from './db/database'
import crunchyrollRoutes from './routes/crunchyroll/crunchyroll.route'

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({
            filename: app.getPath('documents') + '/Crunchyroll Downloader/logs/error.log',
            level: 'error'
        }),
        new winston.transports.File({
            filename: app.getPath('documents') + '/Crunchyroll Downloader/logs/combined.log'
        })
    ]
})

const CacheController = new NodeCache({ stdTTL: 100, checkperiod: 120 })

export const server = fastify()

// Cors registration
server.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
})

// Cache Controller Type
declare module 'fastify' {
    interface FastifyInstance {
        CacheController: NodeCache
    }
}

// Logger Type
declare module 'fastify' {
    interface FastifyInstance {
        logger: winston.Logger
    }
}

// Cache Controller
server.decorate('CacheController', CacheController)

// Logger
server.decorate('logger', logger)

// Routes
server.register(crunchyrollRoutes, { prefix: 'api/crunchyroll' })
server.register(serviceRoutes, { prefix: 'api/service' })

async function startAPI() {
    await startDB()

    server.listen({ port: 9941 }, (err, address) => {
        if (err) {
            console.error(err)
            MessageBoxBuilder.new('error')
                .button('Cancel', true)
                .detail(JSON.stringify(err))
                .build('Unable to start backend server', 'Unable to connect to the database')
            logger.log({
                level: 'error',
                message: 'Unable to start backend server',
                error: err,
                timestamp: new Date().toISOString(),
                section: 'backendServer'
            })
            app.quit()
            return
        }
        console.log(`Server is listening on ${address}`)
        logger.log({
            level: 'info',
            message: `Backend started on ${address}`,
            timestamp: new Date().toISOString(),
            section: 'backendServer'
        })
    })
}

async function startDB() {
    try {
        await sequelize.authenticate()
        console.log('Connection has been established successfully.')
        logger.log({
            level: 'info',
            message: 'Connection has been established successfully.',
            timestamp: new Date().toISOString(),
            section: 'databaseConnection'
        })
    } catch (error) {
        console.error('Unable to connect to the database:', error)
        MessageBoxBuilder.new('error')
            .button('Cancel', true)
            .detail(JSON.stringify(error))
            .build('Unable to connect to the database', 'Unable to connect to the database')
        logger.log({
            level: 'error',
            message: 'Unable to connect to the database',
            error,
            timestamp: new Date().toISOString(),
            section: 'databaseConnection'
        })
        app.quit()
    }

    try {
        await sequelize.sync()
        console.log('All models were synchronized successfully.')
        logger.log({
            level: 'info',
            message: 'All models were synchronized successfully.',
            timestamp: new Date().toISOString(),
            section: 'databaseSync'
        })
    } catch (error) {
        console.log('Failed to synchronize Models')
        MessageBoxBuilder.new('error')
            .button('Cancel', true)
            .detail(JSON.stringify(error))
            .build('Failed to synchronize database Models', 'Failed to synchronize database Models')
        logger.log({
            level: 'error',
            message: 'Failed to synchronize Models',
            error,
            timestamp: new Date().toISOString(),
            section: 'databaseSync'
        })
        app.quit()
    }
}

export default startAPI
