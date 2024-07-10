import type { ADNEpisodes, ADNEpisodesFetch } from './Types'

export async function getEpisodesWithShowIdADN(id: number, lang: 'de' | 'fr') {
    const { data, error } = await useFetch<ADNEpisodesFetch>(`https://gw.api.animationdigitalnetwork.fr/video/show/${id}?offset=0&limit=-1&order=asc`, {
        method: 'GET',
        headers: {
            'x-target-distribution': 'de'
        }
    })

    if (error.value || !data.value) {
        const { data: newdata, error: newerror } = await useFetch<ADNEpisodesFetch>(`https://gw.api.animationdigitalnetwork.fr/video/show/${id}?offset=0&limit=-1&order=asc`, {
            method: 'GET',
            headers: {
                'x-target-distribution': 'fr'
            }
        })

        if (newerror.value || !newdata.value) {
            console.log(error.value)
            alert(error.value)
            return
        }

        return newdata.value.videos
    }

    return data.value.videos
}
