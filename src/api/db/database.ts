import { app } from 'electron'
import { Sequelize, DataTypes, ModelDefined } from 'sequelize'
import { CrunchyEpisode } from '../types/crunchyroll'
import { ADNEpisode } from '../types/adn'

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: app.getPath('documents') + '/Crunchyroll Downloader/databases/v1/data.db'
})

interface AccountAttributes {
    id: number
    username: string
    password: string
    service: string
}

interface AccountCreateAttributes {
    username: string
    password: string
    service: string
}

interface AccountCreateAttributes {
    username: string
    password: string
    service: string
}

interface PlaylistAttributes {
    id: number
    status: 'waiting' | 'preparing' | 'waiting for playlist' | 'waiting for sub playlist' | 'waiting for dub playlist' | 'downloading' | 'merging video' | 'decrypting video' | 'awaiting all dubs downloaded' | 'merging video & audio' | 'completed' | 'failed'
    media: CrunchyEpisode | ADNEpisode
    dub: Array<string>
    sub: Array<string>
    hardsub: boolean
    quality: 1080 | 720 | 480 | 360 | 240
    dir: string
    installDir: string
    failedreason: string
    service: 'CR' | 'ADN'
    format: 'mp4' | 'mkv'
}

interface PlaylistCreateAttributes {
    media: CrunchyEpisode | ADNEpisode
    dub: Array<string>
    sub: Array<string>
    dir: string
    quality: 1080 | 720 | 480 | 360 | 240
    hardsub: boolean
    status: 'waiting' | 'preparing' | 'waiting for playlist' | 'waiting for sub playlist' | 'waiting for dub playlist' | 'downloading' | 'merging video' | 'decrypting video' | 'awaiting all dubs downloaded' | 'merging video & audio' | 'completed' | 'failed'
    service: 'CR' | 'ADN'
    format: 'mp4' | 'mkv'
}

const Account: ModelDefined<AccountAttributes, AccountCreateAttributes> = sequelize.define('Accounts', {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    username: {
        allowNull: false,
        type: DataTypes.STRING
    },
    password: {
        allowNull: false,
        type: DataTypes.STRING
    },
    service: {
        allowNull: false,
        type: DataTypes.STRING
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
    }
})

const Playlist: ModelDefined<PlaylistAttributes, PlaylistCreateAttributes> = sequelize.define('Playlist', {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    status: {
        allowNull: false,
        type: DataTypes.STRING
    },
    media: {
        allowNull: false,
        type: DataTypes.JSON
    },
    dub: {
        allowNull: false,
        type: DataTypes.JSON
    },
    sub: {
        allowNull: false,
        type: DataTypes.JSON
    },
    dir: {
        allowNull: false,
        type: DataTypes.STRING
    },
    installDir: {
        allowNull: true,
        type: DataTypes.STRING
    },
    hardsub: {
        allowNull: false,
        type: DataTypes.BOOLEAN
    },
    failedreason: {
        allowNull: true,
        type: DataTypes.STRING
    },
    quality: {
        allowNull: true,
        type: DataTypes.BOOLEAN
    },
    service: {
        allowNull: true,
        type: DataTypes.STRING
    },
    format: {
        allowNull: true,
        type: DataTypes.STRING
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
    }
})

export { sequelize, Account, Playlist }
