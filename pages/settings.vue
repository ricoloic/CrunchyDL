<template>
    <div
        class="h-screen bg-[#111111] flex flex-col p-5 text-white"
        style="-webkit-app-region: drag"
    >
        <div class="flex flex-row items-center justify-center">
            <div class="text-2xl">Settings</div>
        </div>
        <div class="flex flex-row mt-2" style="-webkit-app-region: no-drag">
            <button
                v-for="(option, index) in options"
                @click="activeIndex = index"
                class="w-full flex items-center justify-center py-2 border-b-2 transition-all"
                :class="
                    activeIndex === index
                        ? 'border-[#ce6104]'
                        : 'border-[#ce620428]'
                "
            >
                {{ option }}
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
const options = ref(["Main", "Output", "Naming", "Crunchyroll", "About"]);
const activeIndex = ref(0);
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
</style>
