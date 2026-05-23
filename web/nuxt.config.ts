export default defineNuxtConfig({
  compatibilityDate: '2025-05-23',
  devtools: { enabled: true },

  modules: ['@nuxt/ui'],

  css: ['~/assets/main.css'],

  colorMode: {
    preference: 'system',
    fallback: 'light',
  },

  runtimeConfig: {
    // Server-only: internal API URL (e.g. http://api:3000/api in Docker)
    apiBase: process.env.API_BASE_URL || 'http://localhost:3000/api',
    public: {
      // Client + server fallback: public-facing API URL
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api',
    },
  },
})
