export interface CrunchySeason {
    identifier: string
    description: string
    is_simulcast: boolean
    subtitle_locales: Array<string>
    series_id: string
    id: string
    audio_locales: Array<string>
    title: string
    versions: Array<{
        audio_locale: string
        guid: string
        original: boolean
        variant: string
    }>
    season_sequence_number: number
    season_number: number
    maturity_ratings: Array<string>
    mature_blocked: boolean
    channel_id: string
    is_subbed: boolean
    audio_locale: string
    season_display_number: string
    is_complete: boolean
    season_tags: Array<string>
    is_mature: boolean
    is_dubbed: boolean
    slug_title: string
    availability_notes: string
    number_of_episodes: boolean
}

export interface CrunchySeasons extends Array<CrunchySeason> {}

export interface CrunchyEpisode {
    closed_captions_available: boolean
    availability_notes: string
    next_episode_title: string
    upload_date: string
    versions: Array<{
        audio_locale: string
        guid: string
        is_premium_only: boolean
        media_guid: string
        original: boolean
        season_guid: string
        variant: string
    }>
    season_slug_title: string
    series_title: string
    season_title: string
    sequence_number: number
    maturity_ratings: Array<string>
    slug_title: string
    is_premium_only: boolean
    availability_ends: string
    identifier: string
    recent_variant: string
    free_available_date: string
    subtitle_locales: Array<string>
    series_id: string
    mature_blocked: boolean
    duration_ms: number
    availability_starts: string
    audio_locale: string
    images: {
        thumbnail: Array<
            Array<{
                height: number
                source: string
                type: string
                width: number
            }>
        >
    }
    season_sequence_number: number
    season_id: string
    episode_number: number
    listing_id: string
    available_date: string
    channel_id: string
    season_number: number
    hd_flag: boolean
    recent_audio_locale: string
    available_offline: boolean
    episode: string
    is_subbed: boolean
    media_type: string
    is_clip: boolean
    title: string
    streams_link: string
    slug: string
    id: string
    production_episode_id: string
    is_dubbed: boolean
    next_episode_id: string
    series_slug_title: string
    season_tags: Array<string>
    premium_date: string
    is_mature: boolean
    premium_available_date: string
    description: string
    episode_air_date: string
    eligible_region: string
    geo: string | undefined
}

export interface CrunchyEpisodes extends Array<CrunchyEpisode> {}

export interface VideoPlaylist {
    assetId: number
    audioLocale: string
    bifs: string
    burnedInLocale: string
    captions: string
    hardSubs: Array<{
        hlang: string
        url: string
        quality: string
        geo: string | undefined
    }>
    playbackType: string
    session: {
        renewSeconds: number
        noNetworkRetryIntervalSeconds: number
        noNetworkTimeoutSeconds: number
        maximumPauseSeconds: number
        endOfVideoUnloadSeconds: number
        sessionExpirationSeconds: number
        usesStreamLimits: boolean
    }
    subtitles: Array<{
        format: string
        language: string
        url: string
        geo: string | undefined
    }>
    token: string
    url: string
    versions: Array<{
        audio_locale: string
        guid: string
        is_premium_only: boolean
        media_guid: string
        original: boolean
        season_guid: string
        variant: string
        geo: string | undefined
    }>
    geo: string | undefined
}

export interface VideoPlaylistNoGEO {
    assetId: number
    audioLocale: string
    bifs: string
    burnedInLocale: string
    captions: string
    hardSubs: Array<{
        hlang: string
        url: string
        quality: string
    }>
    playbackType: string
    session: {
        renewSeconds: number
        noNetworkRetryIntervalSeconds: number
        noNetworkTimeoutSeconds: number
        maximumPauseSeconds: number
        endOfVideoUnloadSeconds: number
        sessionExpirationSeconds: number
        usesStreamLimits: boolean
    }
    subtitles: Array<{
        format: string
        language: string
        url: string
    }>
    token: string
    url: string
    versions: Array<{
        audio_locale: string
        guid: string
        is_premium_only: boolean
        media_guid: string
        original: boolean
        season_guid: string
        variant: string
    }>
    geo: string | undefined
}


export interface VideoMetadata {
    intro: {
        approverId: string,
        distributionNumber: string,
        end: number,
        seriesId: string,
        start: number,
        title: string,
        type: string
    }
    credits: {
        approverId: string,
        distributionNumber: string,
        end: number,
        seriesId: string,
        start: number,
        title: string,
        type: string
    }
    preview: {
        approverId: string,
        distributionNumber: string,
        end: number,
        seriesId: string,
        start: number,
        title: string,
        type: string
    }
    recap: {
        approverId: string,
        distributionNumber: string,
        end: number,
        seriesId: string,
        start: number,
        title: string,
        type: string
    }
    lastUpdated: Date,
    mediaId: string
}