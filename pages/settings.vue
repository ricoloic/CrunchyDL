<template>
    <div class="h-screen bg-[#11111189] flex flex-col p-5 text-white font-dm" style="-webkit-app-region: drag">
        <div class="flex flex-row items-center justify-center">
            <div class="text-2xl">Settings</div>
        </div>
        <div class="flex flex-row mt-2" style="-webkit-app-region: no-drag">
            <button
                v-for="(option, index) in options"
                @click="activeIndex = index"
                class="w-full flex items-center text-sm justify-center py-2 border-b-2 transition-all"
                :class="activeIndex === index ? 'border-[#ce6104]' : 'border-[#ce620428]'"
            >
                {{ option }}
            </button>
        </div>
        <SettingsMain v-if="activeIndex === 0" />
        <SettingsNaming v-if="activeIndex === 1" />
        <SettingsCrunchyroll v-if="activeIndex === 2" />
        <SettingsWidevine v-if="activeIndex === 3" />
        <SettingsProxy v-if="activeIndex === 4" />
        <SettingsSystem v-if="activeIndex === 5" />
        <SettingsAbout v-if="activeIndex === 6" />
    </div>
</template>

<script lang="ts" setup>
const options = ref<Array<string>>(['Main', 'Naming', 'Crunchy', 'Widevine', 'Proxy', 'System', 'About'])
const activeIndex = ref(0)
</script>

<style>
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
