export default defineNuxtConfig({
    vite: {
        server: {
            hmr: {
                port: 3000,
                clientPort: 3000
            }
        }
    },
    ssr: false,
    modules: ['@nuxtjs/tailwindcss', 'nuxt-icon', '@nuxtjs/google-fonts'],
    googleFonts: {
        families: {
            'DM+Sans': ['600', '1000'],
            'Protest+Riot': true
        }
    }
})
