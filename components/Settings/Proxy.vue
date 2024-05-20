<template>
    <div class="flex flex-col mt-3 gap-3 font-dm" style="-webkit-app-region: no-drag">
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2"> Proxy Settings </div>
            <div class="flex flex-row">
                <input v-model="isProxyLogin" @change="setProxyActive(isProxyLogin)" type="checkbox" name="Login Proxy" class="cursor-pointer" />
                <div class="text-sm ml-1.5"> Use Login Proxies </div>
            </div>
            <div class="text-xs mt-2"> Used for bypassing geoblocking </div>
        </div>
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none gap-1" :class="fetchingProxies ? 'h-44' : 'h-auto'">
            <div class="text-sm mb-2"> Global Proxies </div>
            <div v-if="fetchingProxies" class="flex flex-row items-center mt-5 text-sm">
                <Icon name="mdi:loading" class="h-5 w-5 text-white animate-spin mr-2" />
                Checking Proxies
            </div>
            <div
                v-for="proxy in proxies"
                class="flex flex-row items-center h-12 p-3 w-full bg-[#4b4b4b89] rounded-xl"
                :class="proxy.status === 'offline' ? 'bg-[#991e1e89]' : 'bg-[#4f991e89]'"
            >
                <Icon name="mdi:proxy" class="h-6 w-6 text-white" />
                <div class="text-[14px] ml-2">
                    {{ proxy.name }}
                </div>
                <div class="text-xs ml-auto uppercase" :class="proxy.status === 'offline' ? 'text-red-400' : 'text-green-400'">
                    {{ proxy.status }}
                </div>
                <div class="h-2.5 w-2.5 rounded-full ml-1.5" :class="proxy.status === 'offline' ? 'bg-red-400' : 'bg-green-400'"> </div>
                <!-- <div class="flex flex-row ml-2">
                    <button @click="deleteAccount(account.id)" class="flex items-center justify-center bg-red-500 hover:bg-red-600 w-8 h-8 rounded-lg transition-all">
                        <Icon name="majesticons:logout" class="h-4 w-4 text-white" />
                    </button>
                </div> -->
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
const isProxyLogin = ref<boolean>()
const proxies = ref<{ name: string; url: string; status: string }[]>()
const fetchingProxies = ref<0>(0)

const getProxies = async () => {
    fetchingProxies.value++

    const { data, error } = await useFetch<{ name: string; url: string; status: string }[]>(`http://localhost:9941/api/service/proxies`, {
        method: 'GET'
    })

    if (error.value) {
        alert(error.value)
        fetchingProxies.value--
        return
    }

    fetchingProxies.value--

    if (!data.value) return

    proxies.value = data.value
}

getProxies()

const setProxyActive = (status: boolean | undefined) => {
    if (process.client) {
        ;(window as any).myAPI.setProxyActive(status).then((result: boolean) => {
            isProxyLogin.value = result
        })
    }
}

onMounted(() => {
    ;(window as any).myAPI.getProxyActive().then((result: boolean) => {
        isProxyLogin.value = result
    })
})
</script>

<style></style>
