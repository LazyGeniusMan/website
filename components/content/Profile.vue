<template>
  <div class="flex flex-col items-center space-y-4"> 
    <div class="overflow-hidden rounded-md">
      <NuxtImg :src="imageUrl" :alt="name"
        class="h-auto w-48 object-cover transition-all hover:scale-105 aspect-[3/4]" />
    </div>
    <div class="space-y-1 text-sm text-center">
      <h3 class="text-3xl leading-none">
        {{ name }}
      </h3>
      <p class="text-xl text-muted-foreground">
        {{ location }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  name: {
    type: String,
    default: "Andriyansyah Nurrachman",
  },
  location: {
    type: String,
    default: "Bandung, Indonesia",
  },
  imageUrl: {
    type: String,
    default: "/img/yansyah.jpeg",
  },
});
</script>
