<template>
    <div class="w-full sm:w-auto">
        <UiCarousel class="relative w-full" @init-api="(val) => emblaMainApi = val">
            <UiCarouselContent>
                <UiCarouselItem v-for="(item, index) in items" :key="index">
                    <div class="text-center text-xl my-4">
                        {{ item.alt }}
                    </div>
                    <div class="p-1">
                        <UiCard>
                            <UiCardContent class="flex items-center justify-center p-6">
                                <div class="h-96">
                                    <NuxtImg :src="item.src" :alt="item.alt" class="max-h-full object-contain" />
                                </div>
                            </UiCardContent>
                        </UiCard>
                    </div>
                </UiCarouselItem>
            </UiCarouselContent>
            <UiCarouselPrevious />
            <UiCarouselNext />
        </UiCarousel>

        <UiCarousel class="relative w-full" @init-api="(val) => emblaThumbnailApi = val">
            <UiCarouselContent>
                <UiCarouselItem v-for="(item, index) in items" :key="index" class="pl-0 basis-1/4 cursor-pointer"
                    @click="onThumbClick(index)">
                    <div class="p-1" :class="index === selectedIndex ? '' : 'opacity-50'">
                        <UiCard>
                            <UiCardContent class="flex items-center justify-center p-6">
                                <div class=" h-8 lg:h-32 md:h-24 sm:h-16">
                                    <NuxtImg :src="item.src" :alt="item.alt" class="max-h-full object-contain" />
                                </div>
                            </UiCardContent>
                        </UiCard>
                    </div>
                </UiCarouselItem>
            </UiCarouselContent>
        </UiCarousel>
    </div>
</template>

<script setup lang="ts">
const emblaMainApi = ref<UiCarouselApi>()
const emblaThumbnailApi = ref<UiCarouselApi>()
const selectedIndex = ref(0)
const items = [
    {
        src: '/img/certificates/2023-test-of-english-proficiency-and-skill.png',
        alt: 'Test of English Proficiency and Skill',
    },
    {
        src: '/img/certificates/2022-rutgers-process-mining.png',
        alt: 'Rutgers University\'s SWAM Course - Process Mining',
    },
    {
        src: '/img/certificates/2022-rutgers-ai-accounting-audit.png',
        alt: 'Rutgers University\'s SWAM Course - AI in Accounting & Auditing',
    },
    {
        src: '/img/certificates/2022-rutgers-audit-automation.png',
        alt: 'Rutgers University\'s SWAM Course - Audit Automation',
    },
    {
        src: '/img/certificates/2022-rutgers-audit-data-preprocessing.png',
        alt: 'Rutgers University\'s SWAM Course - Audit Data Preprocessing',
    },
    {
        src: '/img/certificates/2021-gits-internship.png',
        alt: 'GITS Indonesia\'s Internship',
    },
    {
        src: '/img/certificates/2021-ef-set-english-test.png',
        alt: 'EF SET\'s English Test',
    },
    {
        src: '/img/projects/2022-center-for-digital-innovation-studies-unpad-website.png',
        alt: 'Website Redesign for DIGITS Unpad',
    },
    {
        src: '/img/projects/2021-journal-of-digital-innovation-studies-ojs.png',
        alt: 'Open Journal Systems for Journal of Digital Innovation Studies',
    },
    {
        src: '/img/projects/2021-student-study-service-website.png',
        alt: 'Website for Student Study Service',
    },
    {
        src: '/img/projects/2020-center-for-digital-innovation-studies-unpad-website.png',
        alt: 'Website Migration for DIGITS Unpad',
    },
]

function onSelect() {
    if (!emblaMainApi.value || !emblaThumbnailApi.value)
        return
    selectedIndex.value = emblaMainApi.value.selectedScrollSnap()
    emblaThumbnailApi.value.scrollTo(emblaMainApi.value.selectedScrollSnap())
}

function onThumbClick(index: number) {
    if (!emblaMainApi.value || !emblaThumbnailApi.value)
        return
    emblaMainApi.value.scrollTo(index)
}

watchOnce(emblaMainApi, (emblaMainApi) => {
    if (!emblaMainApi)
        return

    onSelect()
    emblaMainApi.on('select', onSelect)
    emblaMainApi.on('reInit', onSelect)
})
</script>