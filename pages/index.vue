<template>
  <div>
    <MainHeader />
    <div class="flex flex-col text-white">
      <div v-for="p in playlist" class="flex flex-row gap-4 h-40 p-5 bg-[#636363]">
        <div class="flex min-w-52 w-52">
          <img :src="p.media.images.thumbnail[0].find((p) => p.height === 1080)?.source" alt="Image" class="object-cover rounded-xl" />
        </div>
        <div class="flex flex-col w-full">
          <div class="text-sm capitalize">
            {{ p.status }}
          </div>
          <div class="text-base capitalize"> {{ p.media.series_title }} Season {{ p.media.season_number }} Episode {{ p.media.episode_number }} </div>
          <div class="relative w-full min-h-5 bg-[#bdbbbb] mt-1 rounded"> 
            <div v-if="p.partsleft && p.status === 'downloading'" class="w-full h-full rounded bg-[#4e422d] transition-all duration-300" :style="`width: calc((${p.partsdownloaded} / ${p.partsleft}) * 100%);`"></div>
            <div v-if="p.status === 'completed'" class="w-full h-full rounded bg-[#79ff77] transition-all duration-300"></div>
            <div v-if="p.status === 'merging'" class="absolute top-0 w-20 h-full rounded bg-[#293129] transition-all duration-300 loading-a"></div>
          </div>
          <div class="flex h-full"> </div>
          <div class="flex flex-row gap-2 mt-2">
            <div class="text-sm">1080p</div>
            <div class="text-sm">Dubs: {{ p.dub.map((t) => t.name).join(', ') }}</div>
            <div class="text-sm">Subs: {{ p.sub.map((t) => t.name).join(', ') }}</div>
            <div v-if="p.partsleft && p.status === 'downloading'" class="text-sm">{{ p.partsdownloaded }}/{{ p.partsleft }}</div>
          </div>
        </div>
      </div> </div
    >s
  </div>
</template>

<script lang="ts" setup>
import type { CrunchyEpisode } from '~/components/Episode/Types'

const playlist = ref<
  Array<{
    id: number
    status: string
    media: CrunchyEpisode
    dub: Array<{ locale: string; name: string }>
    sub: Array<{ locale: string; name: string }>
    dir: string,
      partsleft: number,
      partsdownloaded: number
  }>
>()

const getPlaylist = async () => {
  const { data, error } = await useFetch<
    Array<{
      id: number
      status: string
      media: CrunchyEpisode
      dub: Array<{ locale: string; name: string }>
      sub: Array<{ locale: string; name: string }>
      dir: string,
      partsleft: number,
      partsdownloaded: number
    }>
  >('http://localhost:8080/api/crunchyroll/playlist')

  if (error.value) {
    alert(error.value)
    return
  }

  if (!data.value) {
    return
  }

  playlist.value = data.value.reverse()
}

onMounted(() => {
  getPlaylist()

  setInterval(getPlaylist, 1000)
})
</script>

<style>

.loading-a {
  animation: animation infinite 3s;
}

@keyframes animation {
  0% {
    left: 0%;
  }

  50% {
    left: 88%;
  }

  100% {
    left: 0%;
  }
}

</style>
