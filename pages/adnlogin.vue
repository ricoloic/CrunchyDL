<template>
    <div class="h-screen overflow-hidden bg-[#11111189] flex flex-col p-5 text-white font-dm" style="-webkit-app-region: drag">
        <div class="relative flex flex-row items-center justify-center">
            <div class="text-2xl">ADN Login</div>
        </div>
        <div class="flex flex-col mt-5 gap-3.5 h-full" style="-webkit-app-region: no-drag">
            <div class="relative flex flex-col">
                <input v-model="username" type="text" name="text" placeholder="Email" class="bg-[#5c5b5b] focus:outline-none px-3 py-3 rounded-xl text-sm text-center" />
            </div>
            <div class="relative flex flex-col">
                <input v-model="password" type="password" name="text" placeholder="Password" class="bg-[#5c5b5b] focus:outline-none px-3 py-3 rounded-xl text-sm text-center" />
            </div>
        </div>
        <div class="relative flex flex-col mt-auto">
            <button @click="login" class="relative py-3 border-2 rounded-xl flex flex-row items-center justify-center" style="-webkit-app-region: no-drag">
                <div class="flex flex-row items-center justify-center transition-all" :class="isLoggingIn ? 'opacity-0' : 'opacity-100'">
                    <div class="text-xl">Login</div>
                </div>
                <div class="absolute flex flex-row items-center justify-center gap-1 transition-all" :class="isLoggingIn ? 'opacity-100' : 'opacity-0'">
                    <Icon name="mdi:loading" class="h-6 w-6 animate-spin" />
                    <div class="text-xl">Logging in</div>
                </div>
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { loginAccount } from '~/components/Crunchyroll/Account'
const isProduction = process.env.NODE_ENV !== 'development'

const username = ref<string>()
const password = ref<string>()

const isLoggingIn = ref<number>(0)

const login = async () => {
    isLoggingIn.value++
    if (!username.value) {
        isLoggingIn.value--
        return
    }
    if (!password.value) {
        isLoggingIn.value--
        return
    }

    const { data, error } = await loginAccount(username.value, password.value, 'ADN')

    if (error.value) {
        isLoggingIn.value--
        return
    }
    isLoggingIn.value--
    close()
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
