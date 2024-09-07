// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  extends: ['shadcn-docs-nuxt'],
  app: {
    head: {
      link: [
        {
          rel: 'icon', type: "image/svg+xml", href: '/icon.svg'
        }
      ]
    }
  },
  routeRules:{
    '/**': { prerender: true },
    '/gallery': { prerender: true },
    '/go/thesis': { prerender: true },
    '/go/bachelor-thesis': { prerender: true },
    '/go/linkedin': { prerender: true },
    '/go/github': { prerender: true },
    '/go/instagram': { prerender: true },
  },
  compatibilityDate: '2024-07-06',
});