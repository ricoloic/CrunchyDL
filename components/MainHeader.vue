<template>
    <div class="fixed w-full flex flex-row px-2 bg-[#111111] h-14 z-10 gap-1" style="-webkit-app-region: drag">
        <div class="w-full flex gap-10 flex-row items-center justify-center px-5">
            <button
                @click="openAddAnime"
                class="flex items-center justify-center px-2 py-2 gap-1 transition-all bg-[#ffffff16] hover:bg-[#ffffff25] rounded-lg select-none"
                style="-webkit-app-region: no-drag"
            >
                <Icon name="ph:plus-bold" class="h-3.5 w-3.5 text-white" />
                <div class="text-[11px] text-white font-dm"> ADD DOWNLOAD </div>
            </button>
        </div>
        <div class="relative w-full flex flex-row items-center justify-center">
            <img src="/logo.png" class="h-8" />
            <div class="text-[10px] leading-[10px] text-opacity-90 text-white select-none"
                >CrunchyDL <br />
                v{{ packageJson.version }}</div
            >
        </div>
        <div class="w-full flex gap-2 flex-row items-center justify-center">
            <button
                @click="openSettings"
                class="flex items-center justify-center px-2 py-2 gap-1 transition-all bg-[#ffffff16] hover:bg-[#ffffff25] rounded-lg select-none"
                style="-webkit-app-region: no-drag"
            >
                <Icon name="ic:round-settings" class="h-3.5 w-3.5 text-white" />
                <div class="text-[11px] text-white font-dm"> SETTINGS </div>
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import packageJson from '../package.json';

const isProduction = process.env.NODE_ENV !== 'development'

async function openSettings() {
    ;(window as any).myAPI.openWindow({
        title: 'Settings',
        url: isProduction ? 'http://localhost:8079/settings' : 'http://localhost:3000/settings',
        width: 600,
        height: 700,
        backgroundColor: '#111111'
    })
}

async function openAddAnime() {
    ;(window as any).myAPI.openWindow({
        title: 'Add Anime',
        url: isProduction ? 'http://localhost:8079/addanime' : 'http://localhost:3000/addanime',
        width: 700,
        height: 450,
        backgroundColor: '#111111'
    })
}
</script>

<style>
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
</style>
