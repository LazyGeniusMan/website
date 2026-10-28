<script lang="ts">
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";

  let { items }: { items: string[] } = $props();
</script>

<Collapsible.Root
  data-slot="responsibilities"
  class="group/responsibilities mt-2 min-w-0 max-w-full"
>
  <Collapsible.Trigger
    class="text-primary flex min-h-11 items-center gap-2 text-base underline underline-offset-4"
    aria-label={`Toggle responsibilities, ${items.length} items`}
  >
    Responsibilities ({items.length})
    <ChevronDownIcon
      data-icon="inline-end"
      aria-hidden="true"
      class="transition-transform group-data-[state=open]/responsibilities:rotate-180"
    />
  </Collapsible.Trigger>
  <Collapsible.Content class="pt-2">
    <ul class="flex max-w-3xl list-disc flex-col gap-1 pl-5 text-base leading-relaxed md:text-lg">
      {#each items as line}
        <li>{line}</li>
      {/each}
    </ul>
  </Collapsible.Content>
</Collapsible.Root>
