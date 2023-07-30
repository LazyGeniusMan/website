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
      crawLinks: true,
      routes: [
        '/go/instagram',
        '/go/linkedin',
        '/go/thesis',
        '/go/bachelor-thesis',
        '/cv',
        '/projects',
        '/certificates',
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
