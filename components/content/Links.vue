<template>
  <div class="flex flex-col gap-2">
    <div v-for="(item, index) in items" :key="index">
      <NuxtLink :to="item.url" :target="item?.target">
        <UiButton variant="outline" class="w-full"> 
          <div class="flex items-center gap-2">
            <SmartIcon :name="item.icon" />
            {{ item.label }}
          </div>
        </UiButton>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  items: {
    type: Array as PropType<{ icon: string; label: string, url: string }[]>,
    required: true,
    default: [
      {
        icon: "lucide:user",
        label: "Curriculum Vitae",
        url: "/profile/cv",
      },
      {
        icon: "lucide:mail",
        label: "Email",
        url: "mailto:website@yansyah.my.id",
      },
      {
        icon: "lucide:linkedin",
        label: "LinkedIn",
        url: "/go/linkedin",
        target: "_blank",
      },
      {
        icon: "lucide:github",
        label: "Github",
        url: "/go/github",
        target: "_blank",
      },
      {
        icon: "lucide:instagram",
        label: "Instagram",
        url: "/go/instagram",
        target: "_blank",
      }
    ]
  },
});
</script>