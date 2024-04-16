<template>
  <div class="flex flex-row bg-[#111111] h-16" style="-webkit-app-region: drag">
    <div class="w-full flex gap-10 flex-row items-center justify-center px-">
      <button @click="openAddAnime" class="px-6 py-0.5 border-2 border-[#ce6104] rounded-xl" style="-webkit-app-region: no-drag">
        <Icon name="ph:plus-bold" class="h-7 w-7 text-[#ce6104]" />
      </button>
      <button class="px-6 py-0.5 border-2 border-[#ce6104] rounded-xl" style="-webkit-app-region: no-drag">
        <Icon name="material-symbols:globe" class="h-7 w-7 text-[#ce6104]" />
      </button>
    </div>
    <div class="w-full flex flex-row items-center justify-center">
      <div class="text-2xl text-white select-none">Crunchyroll Downloader</div>
    </div>
    <div class="w-full flex gap-4 flex-row items-center justify-start px-5">
      <button class="px-6 py-0.5 border-2 border-[#ce6104] rounded-xl" style="-webkit-app-region: no-drag">
        <Icon name="iconamoon:playlist" class="h-7 w-7 text-[#ce6104]" />
      </button>
      <button @click="openSettings" class="px-6 py-0.5 border-2 border-[#ce6104] rounded-xl" style="-webkit-app-region: no-drag">
        <Icon name="ic:round-settings" class="h-7 w-7 text-[#ce6104]" />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { checkAccount, crunchyLogin } from './Crunchyroll/Account'
import { openNewWindow } from './Functions/WindowHandler'

const isProduction = process.env.NODE_ENV !== 'development'

async function openSettings() {
  (window as any).myAPI.openWindow({
    title: "Settings",
    url: isProduction ? 'http://localhost:8079/settings' : 'http://localhost:3000/settings',
    width: 600,
    height: 700,
    backgroundColor: "#111111"
  })
}

async function openAddAnime() {
  const { data, error } = await checkAccount()

  if (error.value) {
    (window as any).myAPI.openWindow({
    title: "Crunchyroll Login",
    url: isProduction ? 'http://localhost:8079/crunchylogin' : 'http://localhost:3000/crunchylogin',
    width: 600,
    height: 300,
    backgroundColor: "#111111"
  })
    return
  }

  (window as any).myAPI.openWindow({
    title: "Add Anime",
    url: isProduction ? 'http://localhost:8079/addanime' : 'http://localhost:3000/addanime',
    width: 700,
    height: 400,
    backgroundColor: "#111111"
  })
}
</script>

<style></style>
