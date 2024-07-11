import { app } from 'electron'
import { ModelDefined, Sequelize } from 'sequelize'
import { MessageBoxBuilder } from '../../electron/utils/messageBox'
import { server } from '../api'

export const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: app.getPath('documents') + '/Crunchyroll Downloader/databases/v3/data.db'
})

export function logDatabaseError(
    model: ModelDefined<any, any>,
    action: Function,
    message: string,
    exception: any
) {
    const title = `Database Error: ${model.name}`
    const section = `database.${model.name}.${action.name}`
    const detail = JSON.stringify(exception)
    const timestamp = new Date().toISOString()

    MessageBoxBuilder.new('error').button('Cancel', true).detail(detail).build(title, message)
    server.logger.log({ level: 'error', message, error: exception, timestamp, section })
}
