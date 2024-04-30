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
}

export interface CrunchyEpisodes extends Array<CrunchyEpisode> {}
