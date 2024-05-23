<template>
    <div class="flex flex-col gap-3 mt-3 font-dm" style="-webkit-app-region: no-drag">
        <div class="flex flex-col items-center p-3 bg-[#11111189] rounded-xl select-none">
            <div class="text-sm mb-2">Default TEMP Path</div>
            <input
                @click="getTEMPFolder()"
                v-model="tempPath"
                type="text"
                name="text"
                placeholder="Select a TEMP Folder"
                class="bg-[#5c5b5b] w-full focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer"
                readonly
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
const tempPath = ref<string>()

const getTEMPFolder = () => {
    if (process.client) {
        ;(window as any).myAPI.selectTEMPFolder().then((result: string) => {
            tempPath.value = result
        })
    }
}

onMounted(() => {
    ;(window as any).myAPI.getTEMPFolder().then((result: any) => {
        tempPath.value = result
    })
})
</script>

<style></style>
