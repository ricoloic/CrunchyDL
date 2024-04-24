export interface ADNSearchFetch {
  shows: Array<{
    id: number
    url: string
    title: string
    image2x: string
    episodeCount: number,
    languages: Array<string>
  }>
}

export interface ADNEpisodesFetch {
  videos: Array<ADNEpisode>
}

export interface ADNEpisode {
  id: number,
  title: string,
  name: string,
  number: string,
  shortNumber: string,
  season: string,
  reference: string,
  type: string,
  order: number,
  image: string,
  image2x: string,
  summary: string,
  releaseDate: string,
  duration: number,
  url: string,
  urlPath: string,
  embeddedUrl: string,
  languages: Array<string>,
  qualities: Array<string>,
  rating: number,
  ratingsCount: number,
  commentsCount: number,
  available: boolean,
  download: boolean,
  free: boolean,
  freeWithAds: boolean,
  show: {
    id: number,
    title: string,
    type: string,
    originalTitle: string,
    shortTitle: string,
    reference: string,
    age: string,
    languages: Array<string>,
    summary: string,
    image: string,
    image2x: string,
    imageHorizontal: string,
    imageHorizontal2x: string,
    url: string,
    urlPath: string,
    episodeCount: number,
    genres: Array<string>,
    copyright: string,
    rating: number,
    ratingsCount: number,
    commentsCount: number,
    qualities: Array<string>,
    simulcast: boolean,
    free: boolean,
    available: boolean,
    download: boolean,
    basedOn: string,
    tagline: Array<string>,
    firstReleaseYear: string,
    productionStudio: string,
    countryOfOrigin: string,
    productionTeam: Array<{
      role: string,
      name: string,
    }>,
    nextVideoReleaseDate: string,
    indexable: boolean
  }
  indexable: boolean
}

export interface ADNEpisodes extends Array<ADNEpisode> {}