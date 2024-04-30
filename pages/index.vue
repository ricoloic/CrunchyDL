<template>
  <div class="relative h-screen overflow-hidden">
    <Updater />
    <MainHeader />
    <div class="flex flex-col text-white gap-5 mt-14 p-5 overflow-y-scroll h-[calc(100vh-3.5rem)]">
      <!-- <button @click="deletePlaylist">
        Delete Playlist
      </button> -->
      <div v-for="p in playlist" class="relative flex flex-row gap-4 min-h-36 bg-[#63636383] rounded-xl font-dm overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-full bg-[#a1a1a141] transition-all duration-300" :style="`width: calc((${p.partsdownloaded} / ${p.partsleft}) * 100%);`"></div>
        <div class="absolute h-full w-full flex flex-row gap-3 p-3.5">
          <div v-if="p.service === 'CR'" class="flex w-48 min-w-48">
            <img :src="(p.media as CrunchyEpisode).images.thumbnail[0].find((p) => p.height === 1080)?.source" alt="Image" class="object-cover rounded-lg" />
          </div>
          <div v-if="p.service === 'ADN'" class="flex min-w-52 w-52">
            <img :src="(p.media as ADNEpisode).image2x" alt="Image" class="object-cover rounded-lg" />
          </div>
          <div class="flex flex-col w-full">
            <div class="flex flex-row h-full">
              <div class="flex flex-col">
                <div v-if="p.status === 'waiting'" class="flex flex-row items-center justify-center gap-1 text-xs capitalize p-1.5 bg-[#866332] rounded-lg">
                  <Icon name="mdi:clock" class="h-3.5 w-3.5 text-white" />
                  {{ p.status }}
                </div>
                <div v-if="p.status === 'preparing'" class="flex flex-row items-center justify-center gap-1 text-xs capitalize p-1.5 bg-[#866332] rounded-lg">
                  <Icon name="mdi:clock" class="h-3.5 w-3.5 text-white" />
                  {{ p.status }}
                </div>
                <div v-if="p.status === 'downloading'" class="flex flex-row items-center justify-center gap-1 text-xs capitalize p-1.5 bg-[#60501b] rounded-lg">
                  <Icon name="mdi:loading" class="h-3.5 w-3.5 text-white animate-spin" />
                  {{ p.status }}
                </div>
                <div v-if="p.status === 'merging'" class="flex flex-row items-center justify-center gap-1 text-xs capitalize p-1.5 bg-[#866332] rounded-lg">
                  <Icon name="mdi:loading" class="h-3.5 w-3.5 text-white animate-spin" />
                  {{ p.status }}
                </div>
                <div v-if="p.status === 'completed'" class="flex flex-row items-center justify-center gap-1 text-xs capitalize p-1.5 bg-[#266326] rounded-lg">
                  <Icon name="material-symbols:check" class="h-3.5 w-3.5 text-white" />
                  {{ p.status }}
                </div>
              </div>
              <div class="text-xs capitalize ml-auto">
                {{ p.service === 'CR' ? 'Crunchyroll' : 'ADN' }}
              </div>
            </div>
            <div v-if="p.service === 'CR'" class="text-base capitalize h-full flex items-center">
              {{ (p.media as CrunchyEpisode).series_title }} Season {{ (p.media as CrunchyEpisode).season_number }} Episode {{ (p.media as CrunchyEpisode).episode_number }}
            </div>
            <div v-if="p.service === 'ADN'" class="text-base capitalize h-full">
              {{ (p.media as ADNEpisode).show.title }} Season {{ (p.media as ADNEpisode).season ? (p.media as ADNEpisode).season : 1 }} Episode
              {{ (p.media as ADNEpisode).shortNumber }}
            </div>
            <div class="flex flex-row gap-2 h-full items-end">
              <div class="text-xs">{{ p.quality }}p</div>
              <div class="text-xs uppercase">{{ p.format }}</div>
              <div class="text-xs">Dubs: {{ p.dub.map((t) => t.name).join(', ') }}</div>
              <div class="text-xs">Subs: {{ p.sub.length !== 0 ? p.sub.map((t) => t.name).join(', ') : '-' }}</div>
              <div class="flex flex-col ml-auto gap-0.5">
                <div v-if="p.partsleft && p.status === 'downloading'" class="text-xs ml-auto">{{ p.partsdownloaded }}/{{ p.partsleft }}</div>
                <div v-if="p.downloadspeed && p.status === 'downloading'" class="text-xs">{{ p.downloadspeed }} MB/s</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ADNEpisode } from '~/components/ADN/Types'
import type { CrunchyEpisode } from '~/components/Episode/Types'
import Updater from '~/components/Updater.vue'

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

<style>
body {
  background: none;
  background-color: none;
  background: transparent;
  background-color: transparent;
}

.font-dm {
  font-family: 'DM Sans', sans-serif;
}

.font-protest {
  font-family: 'Protest Riot', sans-serif;
  font-weight: 400;
  font-style: normal;
}

.font-dm-big {
  font-family: 'DM Sans', sans-serif;
  font-weight: 1000;
  font-style: normal;
}

.loading-a {
  animation: animation infinite 3s;
}

::-webkit-scrollbar-track {
  background: #383838;
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

@keyframes fadein {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

body {
  animation: fadein 0.5s;
}
</style>
