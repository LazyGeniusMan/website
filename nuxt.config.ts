export default defineNuxtConfig({
  extends: "@nuxt-themes/alpine",
  modules: ["@nuxtjs/tailwindcss"],
  app: {
    head: {
      link: [
        {
          rel: 'icon', type: "image/svg+xml", href: '/icon.svg'
        }
      ]
    }
  },
  nitro: {
    prerender: {
      routes: [
        '/go/instagram',
        '/go/linkedin',
        '/go/thesis'
      ]
    }
  },
  // Server side redirect
  //routeRules: {
  //  '/go/linkedin' : {
  //    redirect: {
  //      to: 'https://www.linkedin.com/in/andriyansyah-nurrachman/',
  //      statusCode: 302
  //    }
  //  },
  //  '/go/instagram' : {
  //    redirect: {
  //      to: 'https://instagram.com/andriyansyah.n_',
  //      statusCode: 302
  //    }
  //  }
  //},
  tailwindcss: {
    config: {
      important: true,
      content: ["content/**/**.md"]
    },
  }
});
