export default defineAppConfig({
  shadcnDocs: {
    site: {
      name: 'Yansyah',
      description: 'Yansyah\'s Personal Website',
      // ogImage: ''
    },
    theme: {
      customizable: true,
      color: 'blue',
      radius: 0.5,
    },
    header: {
      title: 'Yansyah',
      showTitle: true,
      darkModeToggle: true,
      logo: {
        light: '/logo.svg',
        dark: '/logo-dark.svg',
      },
      nav: [],
      links: [],
    },
    aside: {
      useLevel: true,
      collapse: false,
    },
    main: {
      breadCrumb: false,
      showTitle: false,
    },
    footer: {
      credits: '',
      links: [
        {
          icon: 'lucide:instagram',
          to: '/go/instagram',
          target: '_blank',
        },
        {
          icon: 'lucide:github',
          to: '/go/github',
          target: '_blank',
        },
        {
          icon: 'lucide:linkedin',
          to: '/go/linkedin',
          target: '_blank',
        },
        {
          icon: 'lucide:mail',
          to: 'mailto:website@yansyah.my.id',
          target: '_blank',
        },
    ],
    },
    toc: {
      enable: true,
      enableInMobile: true,
      title: 'On This Page',
      links: [],
    },
    search: {
      enable: true,
      inAside: false,
      placeholder: "Search...",
      placeholderDetailed: "Search...",
    }
  }
});