<template>
    <div class="flex flex-col gap-3 mt-3 font-dm" style="-webkit-app-region: no-drag">
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">Episode File Naming</div>
            <input
                v-model="episodeNamingTemplate"
                type="text"
                name="text"
                placeholder="Episode Naming"
                class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center"
            />
            <div class="text-sm mt-2">
                Example:
            </div>
            <div class="text-sm">
                {{ `${episodeNaming}` }}
            </div>

            <div class="text-sm mt-2">
                Variables:
            </div>
            <div class="text-sm text-center">
                {seriesName}, {seasonNumber}, {seasonNumberDD}, {episodeNumber}, {episodeNumberDD}, {quality}
            </div>
        </div>
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">Season Folder Naming</div>
            <input
                v-model="seasonNamingTemplate"
                type="text"
                name="text"
                placeholder="Episode Naming"
                class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center"
            />
            <div class="text-sm mt-2">
                Example:
            </div>
            <div class="text-sm">
                {{ `${seasonNaming}` }}
            </div>

            <div class="text-sm mt-2">
                Variables:
            </div>
            <div class="text-sm text-center">
                {seriesName}, {seasonNumber}, {seasonNumberDD}, {quality}
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
const episodeNumber = ref<number>(1);
const seasonNumber = ref<number>(1);
const quality = ref<number>(1080);
const seriesName = ref<string>('Frieren');
const episodeNamingTemplate = ref<string>();
const seasonNamingTemplate = ref<string>();

const episodeNaming = computed(() => {
    if (!episodeNamingTemplate.value) return
    return episodeNamingTemplate.value
        .replace('{seriesName}', seriesName.value)
        .replace('{seasonNumber}', seasonNumber.value.toString())
        .replace('{seasonNumberDD}', seasonNumber.value.toString().padStart(2, '0'))
        .replace('{episodeNumber}', episodeNumber.value.toString())
        .replace('{episodeNumberDD}', episodeNumber.value.toString().padStart(2, '0'))
        .replace('{quality}', quality.value.toString() +'p');
});

const seasonNaming = computed(() => {
    if (!seasonNamingTemplate.value) return
    return seasonNamingTemplate.value
        .replace('{seriesName}', seriesName.value)
        .replace('{seasonNumber}', seasonNumber.value.toString())
        .replace('{seasonNumberDD}', seasonNumber.value.toString().padStart(2, '0'))
        .replace('{quality}', quality.value.toString() +'p');
});

onMounted(() => {
    ;(window as any).myAPI.getSeasonTemplate().then((result: string) => {
        seasonNamingTemplate.value = result
    })
    ;(window as any).myAPI.getEpisodeTemplate().then((result: string) => {
        episodeNamingTemplate.value = result
    })
})
</script>

<style></style>
