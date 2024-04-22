import type { ADNEpisodes, ADNEpisodesFetch } from './Types'

export async function getEpisodesWithShowIdADN(id: number) {
  const { data, error } = await useFetch<ADNEpisodesFetch>(`https://gw.api.animationdigitalnetwork.fr/video/show/${id}?offset=0&limit=-1&order=asc`, {
    method: 'GET',
    headers: {
        "x-target-distribution": "de",
    },
  })

  if (error.value || !data.value) {
    console.log(error.value)
    alert(error.value)
    return
  }

  return data.value.videos
}
