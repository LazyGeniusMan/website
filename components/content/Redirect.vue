<template>
  <h2>Redirecting...</h2>
  <h3>
    <a :href="to">Click Here If Not Redirected</a>
  </h3>
</template>

<style scoped lang="ts">
css({
  h2: {
    display: 'block',
    margin: '0px',
    fontSize: '{prose.h2.fontSize}',
    lineHeight: '{prose.h2.lineHeight}',
    fontWeight: '{prose.h2.fontWeight}',
    letterSpacing: '{prose.h2.letterSpacing}'
  },
  h3: {
    display: 'block',
    margin: '0px',
    fontSize: '{prose.h3.fontSize}',
    lineHeight: '{prose.h3.lineHeight}',
    fontWeight: '{prose.h3.fontWeight}',
    letterSpacing: '{prose.h3.letterSpacing}',
  }
})
</style>

<script setup lang="ts">
const props = defineProps({
  to: {
    type: String,
    default: "#",
  },
  delay: {
    type: Number,
    default: 0,
  },
  ext: {
    type: Boolean,
    default: true,
  },
  code: {
    type: Number,
    default: 302,
  }
});

 
if (props.ext == true) {
  useHead({
    meta: [
      { "http-equiv":'Refresh', content: props.delay + '; URL=' + props.to }
    ]
  });
} else {
  navigateTo(props.to, {
    external: props.ext,
    redirectCode: props.code,
  });
}
</script>
