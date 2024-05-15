<template>
    <div class="flex flex-col mt-3 font-dm" style="-webkit-app-region: no-drag">
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
    </div>
</template>

<script lang="ts" setup>
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
</script>

<style></style>
