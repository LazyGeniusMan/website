export default defineAppConfig({
  alpine: {
    title: 's',
    description: 'Yansyah\'s Personal Website',
    image: {
      src: '/yansyah.jpg',
      alt: 'Yansyah',
      width: 320,
      height: 320
    },
    header: {
      position: 'left', // possible value are : | 'left' | 'center' | 'right'
      logo: {
        path: '/logo.svg', // path of the logo
        pathDark: '/logo-dark.svg', // path of the logo in dark mode, leave this empty if you want to use the same logo
        alt: 'Yansyah' // alt of the logo
      }
    },
    footer: {
      credits: {
        enabled: false, // possible value are : true | false
        repository: 'https://www.github.com/nuxt-themes/alpine' // our github repository
      },
      navigation: true, // possible value are : true | false
      alignment: 'center', // possible value are : 'none' | 'left' | 'center' | 'right'
      message: '' // string that will be displayed in the footer (leave empty or delete to disable)
    },
    socials: {
      twitter: '',
      instagram: 'andriyansyah.n_',
      //github: 'lazygeniusman',
      facebook: '',
      medium: '',
      youtube: '',
      linkedin: {
        icon: 'uil:linkedin',
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/in/andriyansyah-nurrachman/'
      },
      email: {
        icon: 'uil:envelope',
        label: 'Email',
        href: 'mailto:web@yansyah.my.id'
      }
    },
    form: {
      successMessage: 'Message sent. Thank you!'
    }
  }
})
