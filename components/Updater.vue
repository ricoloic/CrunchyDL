<template>
  <div
    class="fixed bottom-3 right-5 p-3 flex flex-col bg-[#111111dc] w-80 min-h-24 rounded-xl font-dm text-white transition-all duration-300"
    :class="data?.status === 'update-available' && !ignoreUpdate || data?.status === 'downloading' || data?.status === 'update-downloaded' ? 'opacity-100' : 'opacity-0 pointer-events-none'"
  >
    <button @click="ignoreUpdate = true" class="absolute right-3 top-2">
      <Icon name="akar-icons:cross" class="h-4 w-4 text-white" />
    </button>
    <div class="text-base text-center"> Update available </div>
    <div class="text-sm text-center"> A new update is available </div>
    <div v-if="data && data.info && data.info.version" class="text-sm text-center"> v{{ data.info.version }} </div>
    <button @click="startDownload" v-if="data && data.status === 'update-available'" class="text-sm py-3 bg-[#363434] mt-5 rounded-xl" :disabled="downloading">
      Download Update
    </button>
    <button v-if="data && data.status === 'downloading'" class="relative text-sm py-3 bg-[#363434] mt-5 rounded-xl overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-full bg-[#a1a1a141] transition-all duration-300" :style="`width: calc((${data.info.percent} / 100) * 100%);`"></div>
      Downloading...
    </button>
    <button @click="startInstall" v-if="data && data.status === 'update-downloaded'" class="text-sm py-3 bg-[#363434] mt-5 rounded-xl" :disabled="installing">
      Install Update
    </button>
  </div>
</template>

<script lang="ts" setup>
const data = ref<{ status: string; info: any }>()
const downloading = ref<boolean>(false)
const installing = ref<boolean>(false)
const ignoreUpdate = ref<boolean>(false)

const checkUpdate = () => {
  ;(window as any).myAPI.getUpdateStatus().then((result: any) => {
    data.value = result
  })
}

const startDownload = () => {
  downloading.value = true
  ;(window as any).myAPI.startUpdateDownload()
}

const startInstall = () => {
  installing.value = true
  ;(window as any).myAPI.startUpdateInstall()
}

onMounted(() => {
  checkUpdate()

  setInterval(checkUpdate, 2000)
})
</script>

<style></style>
