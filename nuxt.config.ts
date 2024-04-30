// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  typescript: {
    shim: false
  },
  ssr: false,
  modules: ['@nuxtjs/tailwindcss', 'nuxt-icon', '@nuxtjs/google-fonts'],
  googleFonts: {
    families: {
      'DM+Sans': [600, '1000'],
      'Protest+Riot': true
    }
  },
})
