<template>
    <div class="flex flex-col gap-3 mt-3 font-dm" style="-webkit-app-region: no-drag">
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">L3 Keys</div>
            <input
                @click="getFilePathL3Blob()"
                v-model="pathL3Blob"
                type="text"
                name="text"
                placeholder="Click to select device_client_id_blob"
                class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer"
                readonly
            />
            <input
                @click="getFilePathL3Key()"
                v-model="pathL3Key"
                type="text"
                name="text"
                placeholder="Click to select device_private_key"
                class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer mt-2"
                readonly
            />
        </div>
        <!-- <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">L1 Keys</div>
            <input
                @click="getFilePathL1Blob()"
                v-model="pathL1Blob"
                type="text"
                name="text"
                placeholder="Click to select device_client_id_blob"
                class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer"
                readonly
            />
            <input
                @click="getFilePathL1Key()"
                v-model="pathL1Key"
                type="text"
                name="text"
                placeholder="Click to select device_private_key"
                class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer mt-2"
                readonly
            />
        </div> -->
    </div>
</template>

<script lang="ts" setup>
const pathL3Blob = ref<string>()
const pathL3Key = ref<string>()

const pathL1Blob = ref<string>()
const pathL1Key = ref<string>()

const getFilePathL3Blob = () => {
    if (process.client) {
        ;(window as any).myAPI.selectFile('l3blob').then((result: string) => {
            pathL3Blob.value = result
        })
    }
}

const getFilePathL3Key = () => {
    if (process.client) {
        ;(window as any).myAPI.selectFile('l3key').then((result: string) => {
            pathL3Key.value = result
        })
    }
}

const getFilePathL1Blob = () => {
    if (process.client) {
        ;(window as any).myAPI.selectFile('l1blob').then((result: string) => {
            pathL1Blob.value = result
        })
    }
}

const getFilePathL1Key = () => {
    if (process.client) {
        ;(window as any).myAPI.selectFile('l1key').then((result: string) => {
            pathL1Key.value = result
        })
    }
}

onMounted(() => {
    ;(window as any).myAPI.getFile('l3blob').then((result: any) => {
        pathL3Blob.value = result
    })
    ;(window as any).myAPI.getFile('l3key').then((result: any) => {
        pathL3Key.value = result
    })
    ;(window as any).myAPI.getFile('l1blob').then((result: any) => {
        pathL1Blob.value = result
    })
    ;(window as any).myAPI.getFile('l1key').then((result: any) => {
        pathL1Key.value = result
    })
})
</script>

<style></style>
