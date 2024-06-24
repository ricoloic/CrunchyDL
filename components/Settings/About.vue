<template>
    <div class="relative flex flex-col items-center justify-center h-full" style="-webkit-app-region: no-drag">
        <img src="/logo.png" class="h-24" />
        <div class="text-base text-center leading-[18px]">
            CrunchyDL
        </div>
        <div class="text-sm mt-1 text-gray-200"> v{{ packageJson.version }} </div>
        <div class="absolute right-0 bottom-0 text-xs text-gray-200"> Made by OpenSTDL </div>
    </div>
</template>

<script lang="ts" setup>
import packageJson from '../../package.json';
</script>

<style>
.font-dm {
    font-family: 'DM Sans', sans-serif;
}
</style>
