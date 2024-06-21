import { crunchyLogin } from './Account'
import type { CrunchyEpisodesFetch } from './Types'

export async function listEpisodeCrunchy(q: string, geo: string | undefined) {

    var selectedLanguage: string | undefined

    ;(window as any).myAPI.getDefaultCrunchyrollLanguage().then((result: string) => {
        selectedLanguage = result
    })

    const { data: token, error: tokenerror } = await crunchyLogin(geo ? geo : 'LOCAL')

    if (!token.value) {
        return
    }

    const { data, error } = await useFetch<CrunchyEpisodesFetch>(`https://beta-api.crunchyroll.com/content/v2/cms/seasons/${q}/episodes`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token.value.access_token}`
        },
        query: {
            preferred_audio_language: selectedLanguage,
            locale: selectedLanguage
        }
    })

    if (error.value) {
        console.error(error.value)
        throw new Error(JSON.stringify(error.value))
    }

    if (!data.value) return

    return data.value.data
}
