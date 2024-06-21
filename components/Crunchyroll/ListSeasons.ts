import { crunchyLogin } from './Account'
import { getProxies } from './Proxy'
import type { CrunchySeasonsFetch } from './Types'

export async function listSeasonCrunchy(q: string, geo: string | undefined) {

    var selectedLanguage: string | undefined

    ;(window as any).myAPI.getDefaultCrunchyrollLanguage().then((result: string) => {
        selectedLanguage = result
    })

    const { data: token, error: tokenerror } = await crunchyLogin(geo ? geo : 'LOCAL')

    if (!token.value) {
        return
    }

    const { data, error } = await useFetch<CrunchySeasonsFetch>(`https://beta-api.crunchyroll.com/content/v2/cms/series/${q}/seasons`, {
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
