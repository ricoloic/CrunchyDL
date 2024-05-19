import { crunchyLogin } from './Account'
import { getProxies } from './Proxy'
import type { CrunchySeasonsFetch } from './Types'

export async function listSeasonCrunchy(q: string, geo: string | undefined) {
    const { data: proxies } = await getProxies()

    const { data: token, error: tokenerror } = await crunchyLogin(geo ? geo : 'LOCAL')

    if (!token.value) {
        return
    }

    const { data, error } = await useFetch<CrunchySeasonsFetch>(`https://beta-api.crunchyroll.com/content/v2/cms/series/${q}/seasons`, {
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

    if (proxies.value) {
        for (const p of proxies.value) {
            if (p.status !== 'offline') {
                const { data: gdata, error: gerror } = await useFetch<CrunchySeasonsFetch>(`https://beta-api.crunchyroll.com/content/v2/cms/series/${q}/seasons`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token.value.access_token}`
                    }
                })

                if (gerror.value) {
                    console.error(error.value)
                    throw new Error(JSON.stringify(error.value))
                }
            }
        }
    }

    return data.value.data
}
