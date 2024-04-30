export interface ADNPlayerConfig {
    player: {
        image: string
        options: {
            user: {
                hasAccess: true
                profileId: number
                refreshToken: string
                refreshTokenUrl: string
            }
            chromecast: {
                appId: string
                refreshTokenUrl: string
            }
            ios: {
                videoUrl: string
                appUrl: string
                title: string
            }
            video: {
                startDate: string
                currentDate: string
                available: boolean
                free: boolean
                url: string
            }
            dock: Array<string>
            preference: {
                quality: string
                autoplay: boolean
                language: string
                green: boolean
            }
        }
    }
}

export interface ADNLink {
    links: {
        streaming: {
            vostde: {
                mobile: string
                sd: string
                hd: string
                fhd: string
                auto: string
            }
        }
        subtitles: {
            all: string
        }
        history: string
        nextVideoUrl: string
        previousVideoUrl: string
    }
    video: {
        guid: string
        id: number
        currentTime: number
        duration: number
        url: string
        image: string
        tcEpisodeStart: string
        tcEpisodeEnd: string
        tcIntroStart: string
        tcIntroEnd: string
        tcEndingStart: string
        tcEndingEnd: string
    }
    metadata: {
        title: string
        subtitle: string
        summary: string
        rating: number
    }
}

export interface ADNEpisode {
    id: number
    title: string
    name: string
    number: string
    shortNumber: string
    season: string
    reference: string
    type: string
    order: number
    image: string
    image2x: string
    summary: string
    releaseDate: string
    duration: number
    url: string
    urlPath: string
    embeddedUrl: string
    languages: Array<string>
    qualities: Array<string>
    rating: number
    ratingsCount: number
    commentsCount: number
    available: boolean
    download: boolean
    free: boolean
    freeWithAds: boolean
    show: {
        id: number
        title: string
        type: string
        originalTitle: string
        shortTitle: string
        reference: string
        age: string
        languages: Array<string>
        summary: string
        image: string
        image2x: string
        imageHorizontal: string
        imageHorizontal2x: string
        url: string
        urlPath: string
        episodeCount: number
        genres: Array<string>
        copyright: string
        rating: number
        ratingsCount: number
        commentsCount: number
        qualities: Array<string>
        simulcast: boolean
        free: boolean
        available: boolean
        download: boolean
        basedOn: string
        tagline: Array<string>
        firstReleaseYear: string
        productionStudio: string
        countryOfOrigin: string
        productionTeam: Array<{
            role: string
            name: string
        }>
        nextVideoReleaseDate: string
        indexable: boolean
    }
    indexable: boolean
}
