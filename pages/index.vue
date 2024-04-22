<template>
  <div class="h-screen overflow-hidden">
    <MainHeader />
    <div class="flex flex-col text-white mt-16 overflow-y-scroll h-[calc(100vh-4rem)]">
      <!-- <button @click="deletePlaylist">
        Delete Playlist
      </button> -->
      <div v-for="p in playlist" class="flex flex-row gap-4 h-40 p-5 bg-[#636363] border-b-[1px] border-gray-400">
        <div v-if="p.service === 'CR'" class="flex min-w-52 w-52">
          <img :src="(p.media as CrunchyEpisode).images.thumbnail[0].find((p) => p.height === 1080)?.source" alt="Image" class="object-cover rounded-xl" />
        </div>
        <div v-if="p.service === 'ADN'" class="flex min-w-52 w-52">
          <img :src="(p.media as ADNEpisode).image2x" alt="Image" class="object-cover rounded-xl" />
        </div>
        <div class="flex flex-col w-full">
          <div class="flex flex-row">
            <div class="text-sm capitalize">
              {{ p.status }}
            </div>
            <div class="text-sm capitalize ml-auto">
              {{ p.service === 'CR' ? 'Crunchyroll' : 'ADN' }}
            </div>
          </div>
          <div v-if="p.service === 'CR'" class="text-base capitalize">
            {{ (p.media as CrunchyEpisode).series_title }} Season {{ (p.media as CrunchyEpisode).season_number }} Episode {{ (p.media as CrunchyEpisode).episode_number }}
          </div>
          <div v-if="p.service === 'ADN'" class="text-base capitalize">
            {{ (p.media as ADNEpisode).show.title }} Season {{ (p.media as ADNEpisode).season ? (p.media as ADNEpisode).season : 1 }} Episode {{ (p.media as ADNEpisode).shortNumber }}
          </div>
          <div class="relative w-full min-h-5 bg-[#bdbbbb] mt-1 rounded">
            <div
              v-if="p.partsleft && p.status === 'downloading'"
              class="w-full h-full rounded bg-[#4e422d] transition-all duration-300"
              :style="`width: calc((${p.partsdownloaded} / ${p.partsleft}) * 100%);`"
            ></div>
            <div v-if="p.status === 'completed'" class="w-full h-full rounded bg-[#79ff77] transition-all duration-300"></div>
            <div v-if="p.status === 'merging'" class="absolute top-0 w-20 h-full rounded bg-[#293129] transition-all duration-300 loading-a"></div>
          </div>
          <div class="flex h-full"> </div>
          <div class="flex flex-row gap-2 mt-2">
            <div class="text-sm">{{ p.quality }}p</div>
            <div class="text-sm uppercase">{{ p.format }}</div>
            <div class="text-sm">Dubs: {{ p.dub.map((t) => t.name).join(', ') }}</div>
            <div class="text-sm">Subs: {{ p.sub.length !== 0 ? p.sub.map((t) => t.name).join(', ') : '-' }}</div>
            <div v-if="p.partsleft && p.status === 'downloading'" class="text-sm ml-auto">{{ p.partsdownloaded }}/{{ p.partsleft }}</div>
            <div v-if="p.downloadspeed && p.status === 'downloading'" class="text-sm">{{ p.downloadspeed }} MB/s</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ADNEpisode } from '~/components/ADN/Types'
import type { CrunchyEpisode } from '~/components/Episode/Types'

const playlist = ref<
  Array<{
    id: number
    status: string
    media: CrunchyEpisode | ADNEpisode
    dub: Array<{ locale: string; name: string }>
    sub: Array<{ locale: string; name: string }>
    dir: string
    partsleft: number
    partsdownloaded: number
    downloadspeed: number
    quality: number
    service: string
    format: string
  }>
>()

const getPlaylist = async () => {
  const { data, error } = await useFetch<
    Array<{
      id: number
      status: string
      media: CrunchyEpisode | ADNEpisode
      dub: Array<{ locale: string; name: string }>
      sub: Array<{ locale: string; name: string }>
      dir: string
      partsleft: number
      partsdownloaded: number
      downloadspeed: number
      quality: number
      service: string
      format: string
    }>
  >('http://localhost:8080/api/service/playlist')

  if (error.value) {
    alert(error.value)
    return
  }

  if (!data.value) {
    return
  }

  playlist.value = data.value
}

const deletePlaylist = async () => {
  const { data, error } = await useFetch('http://localhost:8080/api/service/playlist', {
    method: 'delete'
  })

  if (error.value) {
    alert(error.value)
    return
  }

  if (!data.value) {
    return
  }
}

onMounted(() => {
  getPlaylist()

  setInterval(getPlaylist, 1000)
})
</script>

<style scoped>
.loading-a {
  animation: animation infinite 3s;
}

::-webkit-scrollbar-track {
  background: #303030;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: #cac9c9;
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: #555;
}

::-webkit-scrollbar {
  width: 10px;
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
