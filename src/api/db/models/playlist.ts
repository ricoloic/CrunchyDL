import { DataTypes, ModelDefined } from 'sequelize'
import { Formats, Locales, Qualities, Services, Statuses } from '../../../constants'
import { CrunchyEpisode } from '../../types/crunchyroll'
import { ADNEpisode } from '../../types/adn'
import { logDatabaseError, sequelize } from '../database'

export interface PlaylistAttributes {
    id: number
    status: Statuses
    media: CrunchyEpisode | ADNEpisode
    dub: Locales[]
    sub: Locales[]
    hardsub: { format: string } & Locales
    quality: Qualities
    qualityaudio: 1 | 2 | 3 | undefined
    dir: string
    service: Services
    format: Formats
    installDir: string
    failedreason: string
}

export type PlaylistCreateAttributes = Omit<
    PlaylistAttributes,
    'id' | 'installDir' | 'failedreason'
>

export const Playlist: ModelDefined<PlaylistAttributes, PlaylistCreateAttributes> =
    sequelize.define('Playlist', {
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
        hardsub: {
            allowNull: true,
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
        failedreason: {
            allowNull: true,
            type: DataTypes.STRING
        },
        quality: {
            allowNull: true,
            type: DataTypes.BOOLEAN
        },
        qualityaudio: {
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

export async function getAllPlaylists() {
    return await Playlist.findAll()
        .then((playlists) => playlists.map((playlist) => playlist.get()))
        .catch((exception) => {
            logDatabaseError(Playlist, getAllPlaylists, 'Failed to get all playlists', exception)
            return null
        })
}

export async function truncateAllPlaylists() {
    return await Playlist.truncate()
        .then(() => 'truncated')
        .catch((exception) => {
            logDatabaseError(
                Playlist,
                truncateAllPlaylists,
                'Failed to truncate all playlists',
                exception
            )
            return null
        })
}

export async function updateOnePlaylistById(
    id: number,
    attributes: Partial<Pick<PlaylistAttributes, 'status' | 'quality' | 'installDir'>>
) {
    return await Playlist.update(
        {
            status: attributes.status,
            quality: attributes.quality,
            installDir: attributes.installDir
        },
        { where: { id } }
    )
        .then((affectedCount) => affectedCount[0])
        .catch((exception) => {
            logDatabaseError(
                Playlist,
                updateOnePlaylistById,
                'Failed to update the playlist item',
                exception
            )
            return null
        })
}

export async function createOnePlaylist(
    attributes: Omit<PlaylistAttributes, 'id' | 'installDir' | 'failedreason'>
) {
    return await Playlist.create(attributes)
        .then((playlist) => playlist.get())
        .catch((exception) => {
            logDatabaseError(
                Playlist,
                createOnePlaylist,
                'Failed to create the playlist item',
                exception
            )
            return null
        })
}

export async function getAllPlaylistsByStatus(status: Statuses) {
    return await Playlist.findAll({ where: { status } })
        .then((playlists) => playlists.map((playlist) => playlist.get()))
        .catch((exception) => {
            logDatabaseError(
                Playlist,
                getAllPlaylistsByStatus,
                `Failed to get all the playlists for status "${status}"`,
                exception
            )
            return null
        })
}
