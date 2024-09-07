<template>
  <Card title="Redirecting" description="Click here if not redirecting automatically" :to="to" icon="lucide:info" />
</template>

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
      { "http-equiv": 'Refresh', content: props.delay + '; URL=' + props.to }
    ]
  });
} else {
  navigateTo(props.to, {
    external: props.ext,
    redirectCode: props.code,
  });
}
</script>
