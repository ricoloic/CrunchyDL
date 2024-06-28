export interface CrunchySearchFetch {
    total: number
    data: Array<{
        type: string
        count: number
        items: Array<{
            promo_description: string
            title: string
            promo_title: string
            channel_id: string
            slug_title: string
            search_metadata: {
                score: number
            }
            series_metadata: {
                audio_locales: Array<string>
                availability_notes: string
                episode_count: number
                extended_description: string
                extended_maturity_rating: string
                is_dubbed: boolean
                is_mature: boolean
                is_simulcast: boolean
                is_subbed: boolean
                mature_blocked: boolean
                maturity_ratings: Array<string>
                season_count: number
                series_launch_year: number
                subtitle_locales: Array<string>
            }
            id: string
            slug: string
            external_id: string
            description: string
            new: boolean
            images: {
                poster_tall: Array<
                    Array<{
                        height: number
                        source: string
                        type: string
                        width: number
                    }>
                >
                poster_wide: Array<
                    Array<{
                        height: number
                        source: string
                        type: string
                        width: number
                    }>
                >
            }
            linked_resource_key: string
            type: string
            geo: string | undefined
        }>
    }>
}

export interface CrunchyAnimeFetch {
    total: number
    data: Array<{
        promo_description: string
        title: string
        promo_title: string
        channel_id: string
        slug_title: string
        search_metadata: {
            score: number
        }
        audio_locales: Array<string>
        availability_notes: string
        episode_count: number
        extended_description: string
        extended_maturity_rating: string
        is_dubbed: boolean
        is_mature: boolean
        is_simulcast: boolean
        is_subbed: boolean
        mature_blocked: boolean
        maturity_ratings: Array<string>
        season_count: number
        series_launch_year: number
        subtitle_locales: Array<string>
        id: string
        slug: string
        external_id: string
        description: string
        new: boolean
        images: {
            poster_tall: Array<
                Array<{
                    height: number
                    source: string
                    type: string
                    width: number
                }>
            >
            poster_wide: Array<
                Array<{
                    height: number
                    source: string
                    type: string
                    width: number
                }>
            >
        }
        linked_resource_key: string
        type: string
        geo: string | undefined
    }>
}

export interface CrunchyLogin {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
    country: string
    account_id: string
    profile_id: string
}

export interface CrunchySeasonsFetch {
    total: number
    data: Array<{
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
    }>
    meta: {
        versions_considered: boolean
    }
}

export interface CrunchyEpisodesFetch {
    total: number
    data: Array<{
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
    }>
    meta: {
        versions_considered: boolean
    }
}

export interface CrunchyEpisodeFetch {
    total: number
    data: Array<{
        id: string
        episode_metadata: {
            series_id: string
            season_id: string
        }
    }>
    meta: {
        versions_considered: boolean
    }
}

export interface Proxy {
    name: string
    code: string
    url: string
    status: string
}

export interface Proxies extends Array<Proxy> {}
