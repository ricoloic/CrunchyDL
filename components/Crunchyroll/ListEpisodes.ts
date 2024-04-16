import { crunchyLogin } from './Account'
import type { CrunchyEpisodesFetch } from './Types'

export async function listEpisodeCrunchy(q: string) {
  const { data: token, error: tokenerror } = await crunchyLogin()

  if (!token.value) {
    return
  }

  const { data, error } = await useFetch<CrunchyEpisodesFetch>(`https://beta-api.crunchyroll.com/content/v2/cms/seasons/${q}/episodes`, {
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

  return data.value.data
}
