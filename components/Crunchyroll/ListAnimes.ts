import type { CrunchyrollSearchResults } from '../Search/Types'
import { crunchyLogin } from './Account'
import { getProxies } from './Proxy'
import type { CrunchyAnimeFetch, CrunchyEpisodeFetch, CrunchyEpisodesFetch, CrunchySearchFetch } from './Types'

export async function searchCrunchy(q: string) {
    var isProxyActive: boolean | undefined
    ;(window as any).myAPI.getProxyActive().then((result: boolean) => {
        isProxyActive = result
    })

    var proxies

    if (isProxyActive) {
        const { data: prox } = await getProxies()

        proxies = prox.value
    }

    const { data: token, error: tokenerror } = await crunchyLogin('LOCAL')

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

    if (proxies && isProxyActive) {
        for (const p of proxies) {
            if (p.status !== 'offline') {
                const { data: tokeng, error: tokenerrorg } = await crunchyLogin(p.code)

                if (!tokeng.value) {
                    console.log(p.code)
                    console.log(tokenerrorg)
                    return
                }

                const { data: fdata, error: ferror } = await useFetch<CrunchySearchFetch>(`https://beta-api.crunchyroll.com/content/v2/discover/search`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${tokeng.value.access_token}`
                    },
                    query: {
                        q: q,
                        n: 100,
                        type: 'series',
                        ratings: false
                    }
                })

                if (ferror.value) {
                    console.error(ferror.value)
                    throw new Error(JSON.stringify(ferror.value))
                }

                if (fdata.value) {
                    for (const r of fdata.value.data[0].items) {
                        if (!data.value?.data[0].items.find((d) => d.id === r.id)) {
                            r.geo = p.code
                            data.value?.data[0].items.push(r)
                        } else {
                            for (const l of r.series_metadata.audio_locales) {
                                if (!data.value.data[0].items.find((d) => d.id === r.id)?.series_metadata.audio_locales.find((loc) => loc === l)) {
                                    data.value.data[0].items.find((d) => d.id === r.id)?.series_metadata.audio_locales.push(l)
                                }
                            }
                            for (const l of r.series_metadata.subtitle_locales) {
                                if (!data.value.data[0].items.find((d) => d.id === r.id)?.series_metadata.subtitle_locales.find((loc) => loc === l)) {
                                    data.value.data[0].items.find((d) => d.id === r.id)?.series_metadata.subtitle_locales.push(l)
                                }
                            }
                        }
                    }
                }
            }
        }
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
            Images: result.images,
            Geo: result.geo
        })
    }

    return results
}

export async function getCRSeries(q: string) {
    var isProxyActive: boolean | undefined
    ;(window as any).myAPI.getProxyActive().then((result: boolean) => {
        isProxyActive = result
    })

    var proxies

    if (isProxyActive) {
        const { data: prox } = await getProxies()

        proxies = prox.value
    }

    const { data: token, error: tokenerror } = await crunchyLogin('LOCAL')

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

    if (!data.value && proxies && isProxyActive) {
        for (const p of proxies) {
            if (p.status !== 'offline') {
                const { data: tokeng, error: tokenerrorg } = await crunchyLogin(p.code)

                if (!tokeng.value) {
                    return
                }

                const { data: fdata, error: ferror } = await useFetch<CrunchyAnimeFetch>(`https://beta-api.crunchyroll.com/content/v2/cms/series/${q}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${tokeng.value.access_token}`
                    }
                })

                if (ferror.value) {
                    console.error(ferror.value)
                    throw new Error(JSON.stringify(ferror.value))
                }

                if (fdata.value) {
                    fdata.value.data[0].geo = p.code
                }

                data.value = fdata.value
            }
        }
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
        Images: anime.images,
        Geo: undefined
    }
}

export async function getCREpisodeSeriesID(q: string) {
    var isProxyActive: boolean | undefined
    ;(window as any).myAPI.getProxyActive().then((result: boolean) => {
        isProxyActive = result
    })

    var proxies

    if (isProxyActive) {
        const { data: prox } = await getProxies()

        proxies = prox.value
    }

    const { data: token, error: tokenerror } = await crunchyLogin('LOCAL')

    if (!token.value) {
        return
    }

    const { data, error } = await useFetch<CrunchyEpisodeFetch>(`https://beta-api.crunchyroll.com/content/v2/cms/objects/${q}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token.value.access_token}`
        }
    })

    if (error.value) {
        console.error(error.value)
        throw new Error(JSON.stringify(error.value))
    }

    if (!data.value && proxies && isProxyActive) {
        for (const p of proxies) {
            if (p.status !== 'offline') {
                const { data: tokeng, error: tokenerrorg } = await crunchyLogin(p.code)

                if (!tokeng.value) {
                    return
                }

                const { data: fdata, error: ferror } = await useFetch<CrunchyEpisodeFetch>(`https://beta-api.crunchyroll.com/content/v2/cms/series/${q}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${tokeng.value.access_token}`
                    }
                })

                if (ferror.value) {
                    console.error(ferror.value)
                    throw new Error(JSON.stringify(ferror.value))
                }

                data.value = fdata.value
            }
        }
    }

    if (!data.value) return

    const episode = data.value.data[0]

    return episode.episode_metadata.series_id
}
