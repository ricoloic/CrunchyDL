<template>
    <div class="flex flex-col mt-3 gap-3 font-dm overflow-y-scroll h-[calc(100%)]" style="-webkit-app-region: no-drag">
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none gap-2">
            <div class="text-sm"> Account Management </div>
            <div v-for="account in accounts" :key="account.id" class="flex flex-row items-center h-12 p-3 w-full bg-[#4b4b4b89] rounded-xl">
                <Icon v-if="account.service === SERVICES.crunchyroll" name="simple-icons:crunchyroll" class="h-6 w-6 text-white" />
                <Icon v-if="account.service === SERVICES.animationdigitalnetwork" name="arcticons:animeultima" lass="h-6 w-6 text-white" />
                <div class="text-xs ml-1.5">
                    {{ account.service }}
                </div>
                <div class="text-xs ml-auto">
                    {{ account.username }}
                </div>
                <div class="flex flex-row ml-2">
                    <button class="flex items-center justify-center bg-red-500 hover:bg-red-600 w-8 h-8 rounded-lg transition-all" @click="deleteAccount(account.id)">
                        <Icon name="majesticons:logout" class="h-4 w-4 text-white" />
                    </button>
                </div>
            </div>
        </div>
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">Max Concurrent Downloads</div>
            <input v-model="selectedMaxDownloads" type="number" class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer" />
        </div>
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2"> Default Dubs </div>
            <div class="w-full bg-[#636363] rounded-xl grid grid-cols-10 gap-1 p-1 z-10">
                <button
                    v-for="l in locales"
                    :key="l.locale"
                    class="flex flex-row items-center justify-center gap-3 py-2 rounded-xl text-sm"
                    :class="dubLocales && dubLocales.length !== 0 && dubLocales.find((i) => i.locale === l.locale) ? 'bg-[#424242]' : 'hover:bg-[#747474]'"
                    @click="toggleDub(l)"
                >
                    {{ l.name }}
                </button>
            </div>
        </div>
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2"> Default Subs </div>
            <div class="w-full bg-[#636363] rounded-xl grid grid-cols-10 gap-1 p-1 z-10">
                <button
                    v-for="l in locales"
                    class="flex flex-row items-center justify-center gap-3 py-2 rounded-xl text-sm"
                    :class="subLocales && subLocales.length !== 0 && subLocales.find((i) => i.locale === l.locale) ? 'bg-[#424242]' : 'hover:bg-[#747474]'"
                    @click="toggleSub(l)"
                >
                    {{ l.name }}
                </button>
            </div>
        </div>
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">Default Video Quality</div>
            <select
                v-model="selectedVideoQuality"
                class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer"
                @change="selectVideoQuality()"
            >
                <option :value="1080">1080p</option>
                <option :value="720">720p</option>
                <option :value="480">480p</option>
                <option :value="360">360p</option>
                <option :value="240">240p</option>
            </select>
        </div>
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">Default Audio Quality</div>
            <select
                v-model="selectedAudioQuality"
                class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer"
                @change="selectAudioQuality()"
            >
                <option :value="1">44.10 kHz</option>
                <option :value="3">22.05 kHz</option>
            </select>
        </div>
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">Default Output Format</div>
            <select
                v-model="selectedVideoFormat"
                class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer"
                @change="selectOutputFormat()"
            >
                <option value="mkv">MKV</option>
                <option value="mp4">MP4</option>
            </select>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { type Services, SERVICES } from '~/src/constants'

const dubLocales = ref<Array<{ locale: string; name: string }>>([])

const subLocales = ref<Array<{ locale: string; name: string }>>([])

const locales = ref<Array<{ locale: string; name: string }>>([
    { locale: 'ja-JP', name: 'JP' },
    { locale: 'de-DE', name: 'DE' },
    { locale: 'hi-IN', name: 'HI' },
    { locale: 'ru-RU', name: 'RU' },
    { locale: 'en-US', name: 'EN' },
    { locale: 'fr-FR', name: 'FR' },
    { locale: 'pt-BR', name: 'PT' },
    { locale: 'es-419', name: 'LA-ES' },
    { locale: 'en-IN', name: 'EN-IN' },
    { locale: 'it-IT', name: 'IT' },
    { locale: 'es-ES', name: 'ES' },
    { locale: 'ta-IN', name: 'TA' },
    { locale: 'te-IN', name: 'TE' },
    { locale: 'ar-SA', name: 'AR' },
    { locale: 'ms-MY', name: 'MS' },
    { locale: 'th-TH', name: 'TH' },
    { locale: 'vi-VN', name: 'VI' },
    { locale: 'id-ID', name: 'ID' },
    { locale: 'ko-KR', name: 'KO' },
    { locale: 'zh-CN', name: 'CN' }
])

const selectedVideoQuality = ref<number>()
const selectedAudioQuality = ref<number>()
const selectedVideoFormat = ref<number>()
const selectedMaxDownloads = ref<number>()

const toggleDub = (lang: { locale: string; name: string }) => {
    const index = dubLocales.value.findIndex((i) => i.locale === lang.locale)

    if (index !== -1) {
        dubLocales.value.splice(index, 1)
        if (process.client) {
            ;(window as any).myAPI.setArrayDub(JSON.stringify(dubLocales.value))
        }

        return
    }

    if (index === -1) {
        dubLocales.value.push(lang)

        if (process.client) {
            ;(window as any).myAPI.setArrayDub(JSON.stringify(dubLocales.value))
        }
    }
}

const toggleSub = (lang: { locale: string; name: string }) => {
    const index = subLocales.value.findIndex((i) => i.locale === lang.locale)

    if (index !== -1) {
        subLocales.value.splice(index, 1)
        if (process.client) {
            ;(window as any).myAPI.setArraySub(JSON.stringify(subLocales.value))
        }

        return
    }

    if (index === -1) {
        subLocales.value.push(lang)
        if (process.client) {
            ;(window as any).myAPI.setArraySub(JSON.stringify(subLocales.value))
        }
    }
}

const accounts = ref<{ id: number; username: string; service: Services }[]>()

const getAccounts = async () => {
    const { data, error } = await useFetch<{ id: number; username: string; service: Services }[]>(`http://localhost:9941/api/service/accounts`, {
        method: 'GET'
    })

    if (error.value) {
        alert(error.value)
        return
    }

    if (!data.value) return

    accounts.value = data.value
}

getAccounts()

const deleteAccount = async (id: number) => {
    const { error } = await useFetch(`http://localhost:9941/api/service/account/${id}`, {
        method: 'DELETE'
    })

    if (error.value) {
        alert(error.value)
        return
    }

    getAccounts()
}

const selectVideoQuality = () => {
    if (process.client) {
        ;(window as any).myAPI.setDefaultVideoQuality(selectedVideoQuality.value)
    }
}

const selectAudioQuality = () => {
    if (process.client) {
        ;(window as any).myAPI.setDefaultAudioQuality(selectedAudioQuality.value)
    }
}

const selectOutputFormat = () => {
    if (process.client) {
        ;(window as any).myAPI.setDefaultOutputFormat(selectedVideoFormat.value)
    }
}

watch(selectedMaxDownloads, () => {
    if (selectedMaxDownloads.value !== undefined && selectedMaxDownloads.value !== null) {
        selectMaxDownloads()
    }
})

const selectMaxDownloads = () => {
    if (process.client) {
        ;(window as any).myAPI.setDefaultMaxDownloads(selectedMaxDownloads.value)
    }
}

onMounted(() => {
    if (!(window as any).myAPI) return
    ;(window as any).myAPI.getArray('defdubarray').then((result: any) => {
        try {
            if (result.length !== 0 && result !== null && result !== undefined && result !== '') {
                dubLocales.value = JSON.parse(result)
            } else {
                dubLocales.value = []
            }
        } catch (e) {
            console.error('Failed to parse JSON:', e)
            dubLocales.value = []
        }
    })
    ;(window as any).myAPI.getArray('defsubarray').then((result: any) => {
        try {
            if (result.length !== 0 && result !== null && result !== undefined && result !== '') {
                subLocales.value = JSON.parse(result)
            } else {
                subLocales.value = []
            }
        } catch (e) {
            console.error('Failed to parse JSON:', e)
            subLocales.value = []
        }
    })
    ;(window as any).myAPI.getDefaultVideoQuality().then((result: any) => {
        selectedVideoQuality.value = result
    })
    ;(window as any).myAPI.getDefaultAudioQuality().then((result: any) => {
        selectedAudioQuality.value = result
    })
    ;(window as any).myAPI.getDefaultOutputFormat().then((result: any) => {
        selectedVideoFormat.value = result
    })
    ;(window as any).myAPI.getDefaultMaxDownloads().then((result: any) => {
        selectedMaxDownloads.value = result
    })
})
</script>

<style></style>
