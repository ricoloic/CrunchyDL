export interface CrunchyrollSearchResult {
    ID: string
    Url: string
    Title: string
    Description: string
    Dubs: Array<string>
    Subs: Array<string>
    Episodes: number
    Seasons: number
    PEGI: Array<string>
    Year: number
    Images: {
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
    Geo: string | undefined
}

export interface CrunchyrollSearchResults extends Array<CrunchyrollSearchResult> {}

export interface ADNSearchResult {
    id: number
    url: string
    title: string
    image2x: string
    episodeCount: number
    languages: Array<string>
}

export interface ADNSearchResults extends Array<ADNSearchResult> {}
