<template>
    <div class="flex flex-col mt-3 gap-3 font-dm" style="-webkit-app-region: no-drag">
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2"> Account Management </div>
            <div v-for="account in accounts" class="flex flex-row items-center h-12 p-3 w-full bg-[#4b4b4b89] rounded-xl">
                <Icon v-if="account.service === 'CR'" name="simple-icons:crunchyroll" class="h-6 w-6 text-white" />
                <Icon v-if="account.service === 'ADN'" name="arcticons:animeultima" class="h-6 w-6 text-white" />
                <div class="text-xs ml-1.5">
                    {{ services.find((s) => s.service === account.service)?.name }}
                </div>
                <div class="text-xs ml-auto">
                    {{ account.username }}
                </div>
                <div class="flex flex-row ml-2">
                    <button @click="deleteAccount(account.id)" class="flex items-center justify-center bg-red-500 hover:bg-red-600 w-8 h-8 rounded-lg transition-all">
                        <Icon name="majesticons:logout" class="h-4 w-4 text-white" />
                    </button>
                </div>
            </div>
        </div>
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2"> Default Dubs </div>
            <div class="w-full bg-[#636363] rounded-xl grid grid-cols-10 gap-1 p-1 z-10">
                <button
                    v-for="l in locales"
                    @click="toggleDub(l)"
                    class="flex flex-row items-center justify-center gap-3 py-2 rounded-xl text-sm"
                    :class="dubLocales.find((i) => i.locale === l.locale) ? 'bg-[#424242]' : 'hover:bg-[#747474]'"
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
                    @click="toggleSub(l)"
                    class="flex flex-row items-center justify-center gap-3 py-2 rounded-xl text-sm"
                    :class="subLocales.find((i) => i.locale === l.locale) ? 'bg-[#424242]' : 'hover:bg-[#747474]'"
                >
                    {{ l.name }}
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
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
    { locale: 'ko-KR', name: 'KO' }
])

const toggleDub = (lang: { locale: string; name: string }) => {
    const index = dubLocales.value.findIndex((i) => i.locale === lang.locale)

    if (index !== -1) {
        dubLocales.value.splice(index, 1)
        return
    }

    if (index === -1) {
        dubLocales.value.push(lang)
        return
    }
}

const toggleSub = (lang: { locale: string; name: string }) => {
    const index = subLocales.value.findIndex((i) => i.locale === lang.locale)

    if (index !== -1) {
        subLocales.value.splice(index, 1)
        return
    }

    if (index === -1) {
        subLocales.value.push(lang)
        return
    }
}


const services = ref<{ name: string; service: string }[]>([
    {
        name: 'Crunchyroll',
        service: 'CR'
    },
    {
        name: 'ADN',
        service: 'ADN'
    }
])

const accounts = ref<{ id: number; username: string; service: string }[]>()

const getAccounts = async () => {
    const { data, error } = await useFetch<{ id: number; username: string; service: string }[]>(`http://localhost:9941/api/service/accounts`, {
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

onMounted(() => {
    ;(window as any).myAPI.getArray('defdubarray').then((result: any) => {
        dubLocales.value = result
    })

    ;(window as any).myAPI.getFile('defsubarray').then((result: any) => {
        subLocales.value = result
    })
})

</script>

<style></style>
