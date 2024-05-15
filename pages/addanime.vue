<template>
    <div class="h-screen overflow-hidden bg-[#11111189] flex flex-col p-5 text-white font-dm" style="-webkit-app-region: drag">
        <div class="relative flex flex-row items-center justify-center">
            <button
                v-if="tab === 2"
                @click=";(tab = 1), (added = false), (CRselectedShow = null), (ADNselectedShow = null), (url = '')"
                class="absolute left-0 bg-[#5c5b5b9c] py-1.5 px-3 rounded-xl flex flex-row items-center justify-center gap-0.5 hover:bg-[#4b4a4a] transition-all text-sm"
                style="-webkit-app-region: no-drag"
            >
                <Icon name="formkit:arrowleft" class="h-5 w-5" />
                Back
            </button>
            <div class="text-2xl">Add Video</div>
        </div>
        <div v-if="tab === 1" class="flex flex-col mt-5 gap-3.5 h-full" style="-webkit-app-region: no-drag">
            <div class="relative flex flex-col">
                <select v-model="service" name="service" class="bg-[#5c5b5b] focus:outline-none px-3 py-3 rounded-xl text-sm text-center cursor-pointer">
                    <option value="crunchyroll">Crunchyroll</option>
                    <option value="adn">ADN</option>
                </select>
            </div>
            <div v-if="(isLoggedInCR && service === 'crunchyroll') || (isLoggedInADN && service === 'adn')" class="relative flex flex-col">
                <input v-model="search" @input="handleInputChange" placeholder="SEARCH" class="bg-[#5c5b5b] focus:outline-none px-3 py-3 rounded-xl text-sm text-center" />
                <div
                    class="absolute top-full left-0 h-28 w-full bg-[#868585] rounded-xl z-10 flex items-center justify-center transition-all duration-300"
                    :class="isFetchingResults ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                >
                    <Icon name="mdi:loading" class="h-8 w-8 animate-spin" />
                </div>
                <div
                    class="absolute top-full left-0 h-40 w-full bg-[#868585] rounded-xl overflow-y-scroll grid grid-cols-2 gap-3 p-2 z-10 transition-all duration-300"
                    style="-webkit-app-region: no-drag"
                    :class="searchActive ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                >
                    <button v-for="result in crunchySearchResults" @click="selectShow(result)" class="flex flex-row gap-3 px-3 py-3 hover:bg-[#747474] rounded-xl">
                        <div class="min-w-10 w-10 bg-gray-700">
                            <img :src="result.Images.poster_tall[0].find((p) => p.height === 720)?.source" alt="Image Banner" class="h-full w-full object-cover" />
                        </div>
                        <div class="flex flex-col items-start text-start">
                            <div class="text-sm line-clamp-1">
                                {{ result.Title }}
                            </div>
                            <div v-if="service === 'crunchyroll'" class="text-xs"> Seasons: {{ result.Seasons }} </div>
                            <div class="text-xs"> Episodes: {{ result.Episodes }} </div>
                        </div>
                    </button>
                    <button v-for="result in adnSearchResults" @click="selectShow(result)" class="flex flex-row gap-3 px-3 py-3 hover:bg-[#747474] rounded-xl h-20">
                        <div class="min-w-10 w-10 h-14 bg-gray-700">
                            <img :src="result.image2x" alt="Image Banner" class="h-full w-full object-cover" />
                        </div>
                        <div class="flex flex-col items-start text-start">
                            <div class="text-sm line-clamp-1">
                                {{ result.title }}
                            </div>
                            <div class="text-xs"> Episodes: {{ result.episodeCount }} </div>
                        </div>
                    </button>
                </div>
            </div>
            <div v-if="(isLoggedInCR && service === 'crunchyroll') || (isLoggedInADN && service === 'adn')" class="relative flex flex-col">
                <input v-model="url" type="text" name="text" placeholder="URL" class="bg-[#5c5b5b] focus:outline-none px-3 py-3 rounded-xl text-sm text-center" />
            </div>
            <div v-if="(isLoggedInCR && service === 'crunchyroll') || (isLoggedInADN && service === 'adn')" class="relative flex flex-col">
                <input
                    @click="getFolderPath()"
                    v-model="path"
                    type="text"
                    name="text"
                    placeholder="Path"
                    class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer"
                    readonly
                />
            </div>
            <div v-if="!isLoggedInCR && service === 'crunchyroll'" class="relative flex flex-col">
                <button @click="openCRLogin" class="bg-[#5c5b5b] focus:outline-none px-3 py-3 rounded-xl text-sm text-center cursor-pointer">Click to Login</button>
            </div>
            <div v-if="!isLoggedInADN && service === 'adn'" class="relative flex flex-col">
                <button @click="openADNLogin" class="bg-[#5c5b5b] focus:outline-none px-3 py-3 rounded-xl text-sm text-center cursor-pointer">Click to Login</button>
            </div>
            <div class="relative flex flex-col mt-auto">
                <button @click="switchToSeason" class="relative py-3 border-2 rounded-xl flex flex-row items-center justify-center">
                    <div class="flex flex-row items-center justify-center transition-all" :class="isFetchingSeasons ? 'opacity-0' : 'opacity-100'">
                        <div class="text-xl">Next</div>
                    </div>
                    <div class="absolute flex flex-row items-center justify-center gap-1 transition-all" :class="isFetchingSeasons ? 'opacity-100' : 'opacity-0'">
                        <Icon name="mdi:loading" class="h-6 w-6 animate-spin" />
                        <div class="text-xl">Loading</div>
                    </div>
                </button>
            </div>
        </div>
        <div v-if="tab === 2" class="flex flex-col mt-5 gap-3.5 h-full" style="-webkit-app-region: no-drag">
            <div v-if="service === 'crunchyroll'" class="relative flex flex-col">
                <select v-model="selectedSeason" name="seasons" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                    <option v-for="season in seasons" :value="season" class="text-sm text-slate-200"
                        >S{{ season.season_display_number ? season.season_display_number : season.season_number }} - {{ season.title }}</option
                    >
                </select>
            </div>
            <div v-if="service === 'crunchyroll'" class="relative flex flex-col">
                <select v-model="selectedStartEpisode" name="episode" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                    <option v-for="episode in episodes" :value="episode" class="text-sm text-slate-200"
                        >E{{ episode.episode_number ? episode.episode_number : episode.episode }} - {{ episode.title }}</option
                    >
                </select>
                <div
                    class="absolute w-full h-9 bg-[#afadad] rounded-xl transition-all flex flex-row items-center justify-center gap-1 text-black"
                    :class="isFetchingEpisodes ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                >
                    <Icon name="mdi:loading" class="h-6 w-6 animate-spin" />
                    <div class="text-sm">Loading</div>
                </div>
            </div>
            <div v-if="service === 'adn'" class="relative flex flex-col">
                <select v-model="selectedStartEpisodeADN" name="episode" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                    <option v-for="episode in episodesADN" :value="episode" class="text-sm text-slate-200"
                        >E{{ episode.shortNumber ? episode.shortNumber : episode.number }} - {{ episode.name }}</option
                    >
                </select>
                <div
                    class="absolute w-full h-9 bg-[#afadad] rounded-xl transition-all flex flex-row items-center justify-center gap-1 text-black"
                    :class="isFetchingEpisodes ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                >
                    <Icon name="mdi:loading" class="h-6 w-6 animate-spin" />
                    <div class="text-sm">Loading</div>
                </div>
            </div>
            <div v-if="service === 'crunchyroll'" class="relative flex flex-col">
                <select v-model="selectedEndEpisode" name="episode" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                    <option
                        v-if="episodes && selectedStartEpisode"
                        v-for="(episode, index) in episodes"
                        :value="episode"
                        class="text-sm text-slate-200"
                        :disabled="index < episodes.findIndex((i) => i.id === selectedStartEpisode?.id)"
                        >E{{ episode.episode_number ? episode.episode_number : episode.episode }} - {{ episode.title }}</option
                    >
                </select>
                <div
                    class="absolute w-full h-9 bg-[#afadad] rounded-xl transition-all flex flex-row items-center justify-center gap-1 text-black"
                    :class="isFetchingEpisodes ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                >
                    <Icon name="mdi:loading" class="h-6 w-6 animate-spin" />
                    <div class="text-sm">Loading</div></div
                >
            </div>
            <div v-if="service === 'adn'" class="relative flex flex-col">
                <select v-model="selectedEndEpisodeADN" name="episode" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                    <option
                        v-if="episodesADN && selectedEndEpisodeADN"
                        v-for="(episode, index) in episodesADN"
                        :value="episode"
                        class="text-sm text-slate-200"
                        :disabled="index < episodesADN.findIndex((i) => i.id === selectedStartEpisodeADN?.id)"
                        >E{{ episode.shortNumber ? episode.shortNumber : episode.number }} - {{ episode.name }}</option
                    >
                </select>
                <div
                    class="absolute w-full h-9 bg-[#afadad] rounded-xl transition-all flex flex-row items-center justify-center gap-1 text-black"
                    :class="isFetchingEpisodes ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                >
                    <Icon name="mdi:loading" class="h-6 w-6 animate-spin" />
                    <div class="text-sm">Loading</div></div
                >
            </div>
            <div v-if="service === 'crunchyroll'" class="relative flex flex-col select-none">
                <div @click="selectDub ? (selectDub = false) : (selectDub = true)" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                    Dubs:
                    {{ selectedDubs.map((t) => t.name).join(', ') }}
                </div>
                <div v-if="selectDub" class="absolute top-full left-0 w-full bg-[#868585] rounded-xl grid grid-cols-12 gap-1 p-1 z-10">
                    <button
                        v-for="l in CRselectedShow?.Dubs.map((s) => {
                            return { name: locales.find((l) => l.locale === s) ? locales.find((l) => l.locale === s)?.name : s, locale: s }
                        })"
                        @click="toggleDub(l)"
                        class="flex flex-row items-center justify-center gap-3 py-2 rounded-xl text-sm"
                        :class="selectedDubs.find((i) => i.locale === l.locale) ? 'bg-[#585858]' : 'hover:bg-[#747474]'"
                    >
                        {{ l.name }}
                    </button>
                </div>
            </div>
            <div v-if="service === 'adn' && ADNselectedShow" class="relative flex flex-col select-none">
                <div @click="selectDub ? (selectDub = false) : (selectDub = true)" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                    Dubs:
                    {{ selectedDubs.map((t) => t.name).join(', ') }}
                </div>
                <div v-if="selectDub" class="absolute top-full left-0 w-full bg-[#868585] rounded-xl grid grid-cols-12 gap-1 p-1 z-10">
                    <button
                        @click="toggleDub({ locale: 'ja-JP', name: 'JP' })"
                        class="flex flex-row items-center justify-center gap-3 py-2 rounded-xl text-sm"
                        :class="selectedDubs.find((i) => i.locale === 'ja-JP') ? 'bg-[#585858]' : 'hover:bg-[#747474]'"
                    >
                        JP
                    </button>
                    <!-- <button
            v-if="ADNselectedShow.languages.find((l) => l === 'vde')"
            @click="toggleDub({ locale: 'de-DE', name: 'DE' })"
            class="flex flex-row items-center justify-center gap-3 py-2 rounded-xl text-sm"
            :class="selectedDubs.find((i) => i.locale === 'de-DE') ? 'bg-[#585858]' : 'hover:bg-[#747474]'"
          >
            DE
          </button>
          <button
            v-if="ADNselectedShow.languages.find((l) => l === 'vf')"
            @click="toggleDub({ locale: 'fr-FR', name: 'FR' })"
            class="flex flex-row items-center justify-center gap-3 py-2 rounded-xl text-sm"
            :class="selectedDubs.find((i) => i.locale === 'fr-FR') ? 'bg-[#585858]' : 'hover:bg-[#747474]'"
          >
            FR
          </button> -->
                </div>
            </div>
            <div v-if="service === 'crunchyroll'" class="relative flex flex-col select-none">
                <div @click="selectSub ? (selectSub = false) : (selectSub = true)" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                    Subs:
                    {{ selectedSubs.length !== 0 ? selectedSubs.map((t) => t.name).join(', ') : 'No Subs selected' }}
                </div>
                <div v-if="selectSub" class="absolute top-full left-0 w-full bg-[#868585] rounded-xl grid grid-cols-12 gap-1 p-1 z-10">
                    <button
                        v-for="l in CRselectedShow?.Subs.map((s) => {
                            return { name: locales.find((l) => l.locale === s) ? locales.find((l) => l.locale === s)?.name : s, locale: s }
                        })"
                        @click="toggleSub(l)"
                        class="flex flex-row items-center justify-center gap-3 py-2 rounded-xl text-sm"
                        :class="selectedSubs.find((i) => i.locale === l.locale) ? 'bg-[#585858]' : 'hover:bg-[#747474]'"
                    >
                        {{ l.name }}
                    </button>
                </div>
            </div>
            <div v-if="service === 'adn' && ADNselectedShow" class="relative flex flex-col select-none">
                <div @click="selectSub ? (selectSub = false) : (selectSub = true)" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                    Subs:
                    {{ selectedSubs.length !== 0 ? selectedSubs.map((t) => t.name).join(', ') : 'No Subs selected' }}
                </div>
                <div v-if="selectSub" class="absolute top-full left-0 w-full bg-[#868585] rounded-xl grid grid-cols-12 gap-1 p-1 z-10">
                    <button
                        v-if="ADNselectedShow.languages.find((l) => l === 'vostde')"
                        @click="toggleSub({ locale: 'de-DE', name: 'DE' })"
                        class="flex flex-row items-center justify-center gap-3 py-2 rounded-xl text-sm"
                        :class="selectedSubs.find((i) => i.locale === 'de-DE') ? 'bg-[#585858]' : 'hover:bg-[#747474]'"
                    >
                        DE
                    </button>
                    <button
                        v-if="ADNselectedShow.languages.find((l) => l === 'vostf')"
                        @click="toggleSub({ locale: 'fr-FR', name: 'FR' })"
                        class="flex flex-row items-center justify-center gap-3 py-2 rounded-xl text-sm"
                        :class="selectedSubs.find((i) => i.locale === 'fr-FR') ? 'bg-[#585858]' : 'hover:bg-[#747474]'"
                    >
                        FR
                    </button>
                </div>
            </div>
            <div class="flex flex-row gap-3">
                <div v-if="service === 'crunchyroll'" class="relative flex flex-col w-full">
                    <select
                        v-model="hardsub"
                        name="episode"
                        class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer"
                        :disabled="isHardsubDisabled"
                    >
                        <option :value="false" class="text-sm text-slate-200">Hardsub: false</option>
                        <option :value="true" class="text-sm text-slate-200">Hardsub: true</option>
                    </select>
                    <div
                        class="absolute w-full h-9 bg-[#afadad] rounded-xl transition-all flex flex-row items-center justify-center gap-1 text-black"
                        :class="isFetchingEpisodes ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                    >
                        <Icon name="mdi:loading" class="h-6 w-6 animate-spin" />
                        <div class="text-sm">Loading</div></div
                    >
                </div>
                <div v-if="service === 'crunchyroll'" class="relative flex flex-col w-full">
                    <select v-model="quality" name="quality" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                        <option :value="1080" class="text-sm text-slate-200">1080p</option>
                        <option :value="720" class="text-sm text-slate-200">720p</option>
                        <option :value="480" class="text-sm text-slate-200">480p</option>
                        <option :value="360" class="text-sm text-slate-200">360p</option>
                        <option :value="240" class="text-sm text-slate-200">240p</option>
                    </select>
                </div>
                <div v-if="service === 'adn'" class="relative flex flex-col w-full">
                    <select v-model="qualityADN" name="quality" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                        <option :value="1080" class="text-sm text-slate-200">1080p</option>
                        <option :value="720" class="text-sm text-slate-200">720p</option>
                        <option :value="480" class="text-sm text-slate-200">480p</option>
                    </select>
                </div>
                <div class="relative flex flex-col w-full">
                    <select v-model="format" name="format" class="bg-[#5c5b5b] focus:outline-none px-3 py-2 rounded-xl text-sm text-center cursor-pointer">
                        <option value="mp4" class="text-sm text-slate-200">MP4</option>
                        <option value="mkv" class="text-sm text-slate-200">MKV</option>
                    </select>
                </div>
            </div>

            <!-- {{ CRselectedShow?.Subs.map(s=> { return locales.find(l => l.locale === s)?.name }) }}
      {{ CRselectedShow?.Dubs.map(s=> { return locales.find(l => l.locale === s)?.name }) }} -->
            <div v-if="!added && service === 'crunchyroll'" class="relative flex flex-col mt-auto">
                <button @click="addToPlaylist" class="relative py-3 border-2 rounded-xl flex flex-row items-center justify-center">
                    <div class="flex flex-row items-center justify-center transition-all" :class="isFetchingSeasons ? 'opacity-0' : 'opacity-100'">
                        <div class="text-xl">Add to Download</div>
                    </div>
                    <div class="absolute flex flex-row items-center justify-center gap-1 transition-all" :class="isFetchingSeasons ? 'opacity-100' : 'opacity-0'">
                        <Icon name="mdi:loading" class="h-6 w-6 animate-spin" />
                        <div class="text-xl">Loading</div>
                    </div>
                </button>
            </div>
            <div v-if="!added && service === 'adn'" class="relative flex flex-col mt-auto">
                <button @click="addToPlaylistADN" class="relative py-3 border-2 rounded-xl flex flex-row items-center justify-center">
                    <div class="flex flex-row items-center justify-center transition-all" :class="isFetchingSeasons ? 'opacity-0' : 'opacity-100'">
                        <div class="text-xl">Add to Download</div>
                    </div>
                    <div class="absolute flex flex-row items-center justify-center gap-1 transition-all" :class="isFetchingSeasons ? 'opacity-100' : 'opacity-0'">
                        <Icon name="mdi:loading" class="h-6 w-6 animate-spin" />
                        <div class="text-xl">Loading</div>
                    </div>
                </button>
            </div>
            <div v-if="added" class="relative flex flex-row gap-5 mt-auto">
                <button
                    @click=";(tab = 1), (added = false), (CRselectedShow = null), (ADNselectedShow = null), (url = '')"
                    class="relative py-3 border-2 rounded-xl flex flex-row items-center justify-center cursor-default w-full"
                >
                    <div class="flex gap-1 flex-row items-center justify-center transition-all">
                        <Icon name="formkit:arrowleft" class="h-6 w-6" />
                        <div class="text-xl">Back</div>
                    </div>
                </button>
                <button class="relative py-3 border-2 border-green-400 rounded-xl flex flex-row items-center justify-center cursor-default w-full">
                    <div class="flex gap-1 flex-row items-center justify-center transition-all">
                        <Icon name="material-symbols:check" class="h-6 w-6 text-green-200" />
                        <div class="text-xl text-green-200">Added</div>
                    </div>
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { searchADN } from '~/components/ADN/ListAnimes'
import { getEpisodesWithShowIdADN } from '~/components/ADN/ListEpisodes'
import type { ADNEpisode, ADNEpisodes } from '~/components/ADN/Types'
import { checkAccount } from '~/components/Crunchyroll/Account'
import { getCRSeries, searchCrunchy } from '~/components/Crunchyroll/ListAnimes'
import { listEpisodeCrunchy } from '~/components/Crunchyroll/ListEpisodes'
import { listSeasonCrunchy } from '~/components/Crunchyroll/ListSeasons'
import type { CrunchyEpisode, CrunchyEpisodes } from '~/components/Episode/Types'
import type { ADNSearchResult, ADNSearchResults, CrunchyrollSearchResult, CrunchyrollSearchResults } from '~/components/Search/Types'
import type { CrunchySeason, CrunchySeasons } from '~/components/Season/Types'

let timeoutId: ReturnType<typeof setTimeout> | null = null

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

const isProduction = process.env.NODE_ENV !== 'development'
const selectDub = ref<boolean>(false)
const selectedDubs = ref<Array<{ name: string | undefined; locale: string }>>([{ locale: 'ja-JP', name: 'JP' }])

const selectSub = ref<boolean>(false)
const selectedSubs = ref<Array<{ name: string | undefined; locale: string }>>([])

const tab = ref<number>(1)
const search = ref<string>('')
const searchActive = ref<boolean>(false)
const crunchySearchResults = ref<CrunchyrollSearchResults>()
const adnSearchResults = ref<ADNSearchResults>()
const CRselectedShow = ref<CrunchyrollSearchResult | null>()
const ADNselectedShow = ref<ADNSearchResult | null>()
const url = ref<string>('')
const path = ref<string>()
const service = ref<'adn' | 'crunchyroll'>('crunchyroll')
const seasons = ref<CrunchySeasons>()
const episodes = ref<CrunchyEpisodes>()
const selectedSeason = ref<CrunchySeason>()
const selectedStartEpisode = ref<CrunchyEpisode>()
const selectedEndEpisode = ref<CrunchyEpisode>()
const hardsub = ref<boolean>(false)
const added = ref<boolean>(false)
const isHardsubDisabled = ref<boolean>(true)
const quality = ref<1080 | 720 | 480 | 360 | 240>(1080)
const format = ref<'mp4' | 'mkv'>('mkv')

const isFetchingSeasons = ref<number>(0)
const isFetchingEpisodes = ref<number>(0)
const isFetchingResults = ref<number>(0)

const episodesADN = ref<ADNEpisodes | undefined>()
const selectedStartEpisodeADN = ref<ADNEpisode>()
const selectedEndEpisodeADN = ref<ADNEpisode>()
const qualityADN = ref<1080 | 720 | 480>(1080)

const isLoggedInCR = ref<boolean>(false)
const isLoggedInADN = ref<boolean>(false)
let intervalcr: NodeJS.Timeout
let intervaladn: NodeJS.Timeout

const checkIfLoggedInCR = async () => {
    const { data, error } = await checkAccount('CR')

    if (error.value) {
        isLoggedInCR.value = false
        return
    }

    if (intervalcr) {
        clearInterval(intervalcr)
    }

    isLoggedInCR.value = true
}

const openCRLogin = () => {
    ;(window as any).myAPI.openWindow({
        title: 'Crunchyroll Login',
        url: isProduction ? 'http://localhost:8079/crunchylogin' : 'http://localhost:3000/crunchylogin',
        width: 600,
        height: 300,
        backgroundColor: '#111111'
    })

    intervalcr = setInterval(checkIfLoggedInCR, 1000)
}

const checkIfLoggedInADN = async () => {
    const { data, error } = await checkAccount('ADN')

    if (error.value) {
        isLoggedInADN.value = false
        return
    }

    if (intervaladn) {
        clearInterval(intervaladn)
    }

    isLoggedInADN.value = true
}

const openADNLogin = () => {
    ;(window as any).myAPI.openWindow({
        title: 'ADN Login',
        url: isProduction ? 'http://localhost:8079/adnlogin' : 'http://localhost:3000/adnlogin',
        width: 600,
        height: 300,
        backgroundColor: '#111111'
    })

    intervalcr = setInterval(checkIfLoggedInADN, 1000)
}

checkIfLoggedInCR()
checkIfLoggedInADN()

const fetchSearch = async () => {
    if (!search.value || search.value.length === 0) {
        adnSearchResults.value = []
        crunchySearchResults.value = []
        searchActive.value = false
        return
    }

    if (!isFetchingResults.value) {
        isFetchingResults.value++
    }

    if (service.value === 'adn') {
        adnSearchResults.value = await searchADN(search.value)
    }

    if (service.value === 'crunchyroll') {
        crunchySearchResults.value = await searchCrunchy(search.value)
    }

    if (isFetchingResults.value) {
        isFetchingResults.value--
    }
    searchActive.value = true
}

const debounceFetchSearch = () => {
    if (timeoutId) {
        clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(fetchSearch, 500)
}

const handleInputChange = () => {
    debounceFetchSearch()
}

watch(search, () => {
    if (search.value.length === 0 || !search.value) {
        searchActive.value = false
    }
})

onMounted(() => {
    ;(window as any).myAPI.getFolder().then((result: any) => {
        path.value = result
    })
})

const getFolderPath = () => {
    if (process.client) {
        ;(window as any).myAPI.selectFolder().then((result: any) => {
            path.value = result
        })
    }
}

const selectShow = async (show: any) => {
    if (service.value === 'adn') {
        ADNselectedShow.value = show
        url.value = show.url
    }

    if (service.value === 'crunchyroll') {
        CRselectedShow.value = show
        url.value = show.Url + '/'
    }

    search.value = ''
    crunchySearchResults.value = []
    adnSearchResults.value = []
    searchActive.value = false
    if (isFetchingResults.value) {
        isFetchingResults.value--
    }
}

watch(selectedSeason, () => {
    refetchEpisodes()
})

watch(service, () => {
    ;(url.value = ''), (CRselectedShow.value = null), (ADNselectedShow.value = null)
})

watch(selectedStartEpisode, () => {
    if (!selectedEndEpisode.value) return
    if (!episodes.value) return

    const indexA = episodes.value.findIndex((i) => i === selectedStartEpisode.value)
    const indexE = episodes.value.findIndex((i) => i === selectedEndEpisode.value)

    if (indexA > indexE) {
        selectedEndEpisode.value = episodes.value[indexA]
    }
})

watch(selectedStartEpisodeADN, () => {
    if (!selectedEndEpisodeADN.value) return
    if (!episodesADN.value) return

    const indexA = episodesADN.value.findIndex((i) => i === selectedStartEpisodeADN.value)
    const indexE = episodesADN.value.findIndex((i) => i === selectedEndEpisodeADN.value)

    if (indexA > indexE) {
        selectedEndEpisodeADN.value = episodesADN.value[indexA]
    }
})

const refetchEpisodes = async () => {
    isFetchingEpisodes.value++
    if (!selectedSeason.value) {
        isFetchingEpisodes.value--
        return
    }

    episodes.value = await listEpisodeCrunchy(selectedSeason.value.id)
    if (episodes.value) {
        selectedStartEpisode.value = episodes.value[0]
        selectedEndEpisode.value = episodes.value[0]
    }
    isFetchingEpisodes.value--
}

const switchToSeason = async () => {
    isFetchingSeasons.value++
    if (!ADNselectedShow.value && !CRselectedShow.value && !url.value) {
        isFetchingSeasons.value--
        return
    }

    if (ADNselectedShow.value) {
        episodesADN.value = await getEpisodesWithShowIdADN(ADNselectedShow.value.id, 'de')
        if (!episodesADN.value) {
            isFetchingSeasons.value--
            return
        }
        selectedStartEpisodeADN.value = episodesADN.value[0]
        selectedEndEpisodeADN.value = episodesADN.value[0]
        tab.value = 2
        selectedDubs.value = [{ locale: 'ja-JP', name: 'JP' }]
        selectedSubs.value = []
    }

    if (CRselectedShow.value) {
        seasons.value = await listSeasonCrunchy(CRselectedShow.value.ID)
        if (!seasons.value) {
            isFetchingSeasons.value--
            return
        }
        selectedSeason.value = seasons.value[0]
        episodes.value = await listEpisodeCrunchy(selectedSeason.value.id)
        if (episodes.value) {
            selectedStartEpisode.value = episodes.value[0]
            selectedEndEpisode.value = episodes.value[0]
        }
        tab.value = 2
        selectedDubs.value = [{ locale: 'ja-JP', name: 'JP' }]
        selectedSubs.value = []
    }

    if (url.value && url.value.includes('crunchyroll') && !CRselectedShow.value) {
        const seriesID = url.value.split('/')
        CRselectedShow.value = await getCRSeries(seriesID[5])
        seasons.value = await listSeasonCrunchy(seriesID[5])
        if (!seasons.value) {
            isFetchingSeasons.value--
            return
        }
        selectedSeason.value = seasons.value[0]
        episodes.value = await listEpisodeCrunchy(selectedSeason.value.id)
        if (episodes.value) {
            selectedStartEpisode.value = episodes.value[0]
            selectedEndEpisode.value = episodes.value[0]
        }
        tab.value = 2
        selectedDubs.value = [{ locale: 'ja-JP', name: 'JP' }]
        selectedSubs.value = []
    }

    isFetchingSeasons.value--
}

const toggleDub = (lang: { name: string | undefined; locale: string }) => {
    const index = selectedDubs.value.findIndex((i) => i.locale === lang.locale)

    if (index !== -1) {
        if (selectedDubs.value.length !== 1) {
            selectedDubs.value.splice(index, 1)
            return
        }
    }

    if (index === -1) {
        selectedDubs.value.push(lang)
        return
    }
}

const toggleSub = (lang: { name: string | undefined; locale: string }) => {
    const index = selectedSubs.value.findIndex((i) => i.locale === lang.locale)

    if (index === -1) {
        selectedSubs.value.push(lang)
        if (selectedSubs.value.length !== 0) {
            isHardsubDisabled.value = false
        }
        return
    }

    selectedSubs.value.splice(index, 1)
    if (selectedSubs.value.length === 0) {
        hardsub.value = false
        isHardsubDisabled.value = true
    }
    return
}

const addToPlaylist = async () => {
    if (!episodes.value) return

    const startEpisodeIndex = episodes.value.findIndex((episode) => episode === selectedStartEpisode.value)
    const endEpisodeIndex = episodes.value.findIndex((episode) => episode === selectedEndEpisode.value)

    if (startEpisodeIndex === -1 || endEpisodeIndex === -1) {
        console.error('Indexes not found.')
        return
    }

    const selectedEpisodes = episodes.value.slice(startEpisodeIndex, endEpisodeIndex + 1)

    const data = {
        episodes: selectedEpisodes,
        dubs: selectedDubs.value,
        subs: selectedSubs.value,
        dir: path.value,
        hardsub: hardsub.value,
        quality: quality.value,
        service: 'CR',
        format: format.value
    }

    const { error } = await useFetch('http://localhost:9941/api/service/playlist', {
        method: 'POST',
        body: JSON.stringify(data)
    })

    if (error.value) {
        alert(error.value)
    }

    added.value = true
}

const addToPlaylistADN = async () => {
    if (!episodesADN.value) return

    const startEpisodeIndex = episodesADN.value.findIndex((episode) => episode === selectedStartEpisodeADN.value)
    const endEpisodeIndex = episodesADN.value.findIndex((episode) => episode === selectedEndEpisodeADN.value)

    if (startEpisodeIndex === -1 || endEpisodeIndex === -1) {
        console.error('Indexes not found.')
        return
    }

    const selectedEpisodes = episodesADN.value.slice(startEpisodeIndex, endEpisodeIndex + 1)

    const data = {
        episodes: selectedEpisodes,
        dubs: selectedDubs.value,
        subs: selectedSubs.value,
        dir: path.value,
        hardsub: false,
        quality: qualityADN.value,
        service: 'ADN',
        format: format.value
    }

    const { error } = await useFetch('http://localhost:9941/api/service/playlist', {
        method: 'POST',
        body: JSON.stringify(data)
    })

    if (error.value) {
        alert(error.value)
    }

    added.value = true
}
</script>

<style scoped>
::-webkit-scrollbar-track {
    background: #303030;
    border-radius: 0px 12px 12px 0px;
}

/* Handle */
::-webkit-scrollbar-thumb {
    background: #cac9c9;
    border-radius: 0px 12px 12px 0px;
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
    background: #555;
}

::-webkit-scrollbar {
    width: 8px;
}

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

select {
    background: url("data:image/svg+xml,<svg height='10px' width='10px' viewBox='0 0 16 16' fill='%23000000' xmlns='http://www.w3.org/2000/svg'><path d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/></svg>")
        no-repeat;
    background-position: calc(100% - 0.75rem) center !important;
    background-color: #5c5b5b;
    -moz-appearance: none !important;
    -webkit-appearance: none !important;
    appearance: none !important;
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
