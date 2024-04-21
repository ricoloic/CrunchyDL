import type { CrunchyrollSearchResults } from '../Search/Types'
import { crunchyLogin } from './Account'
import type { CrunchyAnimeFetch, CrunchySearchFetch } from './Types'

export async function searchCrunchy(q: string) {
  const { data: token, error: tokenerror } = await crunchyLogin()

  if (!token.value) {
    return
  }

  const { data, error } = await useFetch<CrunchySearchFetch>(`https://beta-api.crunchyroll.com/content/v2/discover/search`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token.value.access_token}`
    },
    query: {
      q: q,
      n: 100,
      type: 'series',
      ratings: false
    }
  })

  if (error.value) {
    console.error(error.value)
    throw new Error(JSON.stringify(error.value))
  }

  if (!data.value) return

  var results: CrunchyrollSearchResults = []

  for (const result of data.value.data[0].items) {
    results.push({
      ID: result.id,
      Url: `https://www.crunchyroll.com/series/${result.id}/${result.slug_title}`,
      Title: result.title,
      Description: result.description,
      Dubs: result.series_metadata.audio_locales,
      Subs: result.series_metadata.subtitle_locales,
      Episodes: result.series_metadata.episode_count,
      Seasons: result.series_metadata.season_count,
      PEGI: result.series_metadata.maturity_ratings,
      Year: result.series_metadata.series_launch_year,
      Images: result.images
    })
  }

  return results
}

export async function getCRSeries(q: string) {
  const { data: token, error: tokenerror } = await crunchyLogin()

  if (!token.value) {
    return
  }

  const { data, error } = await useFetch<CrunchyAnimeFetch>(`https://beta-api.crunchyroll.com/content/v2/cms/series/${q}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token.value.access_token}`
    }
  })

  if (error.value) {
    console.error(error.value)
    throw new Error(JSON.stringify(error.value))
  }

  if (!data.value) return

  const anime = data.value.data[0]

  return {
    ID: anime.id,
    Url: `https://www.crunchyroll.com/series/${anime.id}/${anime.slug_title}`,
    Title: anime.title,
    Description: anime.description,
    Dubs: anime.audio_locales,
    Subs: anime.subtitle_locales,
    Episodes: anime.episode_count,
    Seasons: anime.season_count,
    PEGI: anime.maturity_ratings,
    Year: anime.series_launch_year,
    Images: anime.images
  }
}
