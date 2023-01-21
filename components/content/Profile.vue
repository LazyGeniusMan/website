<template>
  <img
    v-bind="$attrs"
    src="/yansyah.jpg"
    alt="Yansyah"
    :width="width"
    :height="height"
    class="rounded-lg"
  />
  <h2>
    <!--  <ContentSlot :use="$slots.name" unwrap="p" /> -->
    Andriyansyah Nurrachman
  </h2>
  <h3>
    <!--  <ContentSlot :use="$slots.location" unwrap="p" /> -->
    Bandung, Indonesia
  </h3>
</template>

<style scoped lang="ts">
css({
  h2: {
    display: 'block',
    margin: '0px',
    textAlign: 'center',
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
    letterSpacing: '{prose.h3.letterSpacing}'
  }
})
</style>

<script setup lang="ts">
defineProps({
  width: {
    type: [String, Number],
    default: undefined,
  },
  height: {
    type: [String, Number],
    default: undefined,
  },
});
</script>
