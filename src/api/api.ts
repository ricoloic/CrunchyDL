import fastify from 'fastify'
import cors from '@fastify/cors'
import NodeCache from 'node-cache'
import crunchyrollRoutes from './routes/crunchyroll/crunchyroll.route'
import { sequelize } from './db/database'
import serviceRoutes from './routes/service/service.route'
import { app } from 'electron'
import winston from 'winston'

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: app.getPath('documents') + '/Crunchyroll Downloader/logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: app.getPath('documents') + '/Crunchyroll Downloader/logs/combined.log' })
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
            return
        }
        console.log(`Server is listening on ${address}`)
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
        logger.log({
            level: 'error',
            message: 'Unable to connect to the database',
            error: error,
            timestamp: new Date().toISOString(),
            section: 'databaseConnection'
        })
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
        logger.log({
            level: 'error',
            message: 'Failed to synchronize Models',
            error: error,
            timestamp: new Date().toISOString(),
            section: 'databaseSync'
        })
    }
}

export default startAPI
