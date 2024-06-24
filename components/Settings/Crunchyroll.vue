<template>
    <div class="flex flex-col gap-3 mt-3 font-dm" style="-webkit-app-region: no-drag">
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">Default Language</div>
            <select v-model="selectedLanguage" @change="selectLanguage()" class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                <option value="en-US">English</option>
                <option value="de-DE">Deutsch</option>
                <option value="it-IT">Italiano</option>
                <option value="es-419">Español</option>
                <option value="es-ES">Español (España)</option>
                <option value="fr-FR">Français (France)</option>
                <option value="pt-BR">Português (Brasil)</option>
                <option value="pt-PT">Português (Portugal)</option>
                <option value="ru-RU">Русский</option>
                <option value="ar-SA">العربية</option>
                <option value="hi-IN">हिंदी</option>
            </select>
            <div class="text-xs mt-2"> For search, series and episode name </div>
        </div>
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">Stream Endpoint</div>
            <select v-model="selectedEndpoint" @change="selectEndpoint()" class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                <option :value="1">Switch (DRM PROTECTED)</option>
                <option :value="2">PS4 (DRM PROTECTED)</option>
                <option :value="3">PS5 (DRM PROTECTED)</option>
                <option :value="4">XBOX One (DRM PROTECTED)</option>
                <option :value="5">Firefox (DRM PROTECTED)</option>
                <option :value="6">Edge (DRM PROTECTED)</option>
                <!-- <option :value="7">Safari (DRM PROTECTED)</option> -->
                <option :value="7">Chrome (DRM PROTECTED)</option>
                <option :value="8">Web Fallback (DRM PROTECTED)</option>
                <!-- <option :value="10">Iphone (DRM PROTECTED)</option>
                <option :value="11">Ipad (DRM PROTECTED)</option> -->
                <option :value="9">Android (DRM PROTECTED)</option>
                <option :value="10">Samsung TV (DRM PROTECTED)</option>
            </select>
            <div class="text-xs mt-2"> Fallback to non-drm stream if no widevine key provided </div>
        </div>
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">Subtitle Resampler (Experimental)</div>
            <select v-model="selectedSubResampler" @change="setResampler()" class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                <option :value="true">Actived</option>
                <option :value="false">Deactivated</option>
            </select>
            <div class="text-xs mt-2"> Fixes broken crunchyroll subtitles </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
const selectedLanguage = ref<string>()
const selectedEndpoint = ref<number>()
const selectedSubResampler = ref<boolean>()

onMounted(() => {
    ;(window as any).myAPI.getEndpoint().then((result: any) => {
        selectedEndpoint.value = result
    })
    ;(window as any).myAPI.getDefaultCrunchyrollLanguage().then((result: any) => {
        selectedLanguage.value = result
    })
    ;(window as any).myAPI.getSubtitleResampler().then((result: boolean) => {
        selectedSubResampler.value = result
    })
})

const selectLanguage = () => {
    if (process.client) {
        ;(window as any).myAPI.setDefaultCrunchyrollLanguage(selectedLanguage.value)
    }
}

const selectEndpoint = () => {
    if (process.client) {
        ;(window as any).myAPI.selectEndpoint(selectedEndpoint.value)
    }
}

const setResampler = () => {
    if (process.client) {
        ;(window as any).myAPI.setSubtitleResampler(selectedSubResampler.value)
    }
}
</script>

<style>
select {
    background: url("data:image/svg+xml,<svg height='10px' width='10px' viewBox='0 0 16 16' fill='%23000000' xmlns='http://www.w3.org/2000/svg'><path d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/></svg>")
        no-repeat;
    background-position: calc(100% - 0.75rem) center !important;
    background-color: #5c5b5b;
    -moz-appearance: none !important;
    -webkit-appearance: none !important;
    appearance: none !important;
}
</style>
