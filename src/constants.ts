export const STATUSES = {
    waiting: 'waiting',
    preparing: 'preparing',
    waitingForPlaylist: 'waiting for playlist',
    waitingForSubPlaylist: 'waiting for sub playlist',
    waitingForDubPlaylist: 'waiting for dub playlist',
    downloading: 'downloading',
    downloadingVideo: 'downloading video',
    mergingVideo: 'merging video',
    decryptingVideo: 'decrypting video',
    awaitingAllDubsDownloaded: 'awaiting all dubs downloaded',
    mergingVideoAudio: 'merging video & audio',
    completed: 'completed',
    failed: 'failed'
} as const

export type Statuses = (typeof STATUSES)[keyof typeof STATUSES]

export const FORMATS = {
    mp4: 'mp4',
    mkv: 'mkv'
} as const

export type Formats = (typeof FORMATS)[keyof typeof FORMATS]

export type Qualities = 1080 | 720 | 480 | 360 | 240

export const SERVICES = {
    crunchyroll: 'CR',
    animationdigitalnetwork: 'ADN'
} as const

export type Services = (typeof SERVICES)[keyof typeof SERVICES]

export const LOCALES = [
    { locale: 'ja-JP', name: 'JP' },
    { locale: 'de-DE', name: 'DE' },
    { locale: 'hi-IN', name: 'HI' },
    { locale: 'ru-RU', name: 'RU' },
    { locale: 'en-US', name: 'EN' },
    { locale: 'fr-FR', name: 'FR' },
    { locale: 'pt-BR', name: 'PT' },
    { locale: 'es-419', name: 'LA-ES' },
    { locale: 'en-IN', name: 'EN-IN' },
    { locale: 'it-IT', name: 'IT' },
    { locale: 'es-ES', name: 'ES' },
    { locale: 'ta-IN', name: 'TA' },
    { locale: 'te-IN', name: 'TE' },
    { locale: 'ar-SA', name: 'AR' },
    { locale: 'ms-MY', name: 'MS' },
    { locale: 'th-TH', name: 'TH' },
    { locale: 'vi-VN', name: 'VI' },
    { locale: 'id-ID', name: 'ID' },
    { locale: 'ko-KR', name: 'KO' },
    { locale: 'zh-CN', name: 'CN' }
] as const

export type Locale = (typeof LOCALES)[number]['locale']
export type LocaleName = (typeof LOCALES)[number]['name']
export type Locales = (typeof LOCALES)[number]
