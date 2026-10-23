<script lang="ts">
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import { tick } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { onMount } from "svelte";
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Drawer from "$lib/components/ui/drawer/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";

  export interface ComboboxItem {
    value: string;
    label: string;
  }

  export interface ComboboxGroup {
    heading?: string;
    items: ComboboxItem[];
  }

  let {
    items = [],
    groups = null,
    values = $bindable<string[]>([]),
    placeholder = "Select an option",
    searchPlaceholder = "Search options",
    emptyText = "No options found.",
    label = "Options",
    class: className = "",
  }: {
    items?: ComboboxItem[];
    groups?: ComboboxGroup[] | null;
    values?: string[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    label?: string;
    class?: string;
  } = $props();

  let open = $state(false);
  let triggerRef = $state<HTMLButtonElement | null>(null);
  let mounted = $state(false);

  onMount(() => {
    mounted = true;
  });

  // Desktop-first until mounted so SSR and the first client render agree
  // (these islands SSR under client:visible); small screens swap to the
  // bottom-sheet drawer after mount.
  const desktopQuery = new MediaQuery("min-width: 1024px", true);
  const isDesktop = $derived(!mounted || desktopQuery.current);

  const resolvedGroups = $derived<ComboboxGroup[]>(groups ?? [{ items }]);

  const selectedLabels = $derived(
    values.map((v) => {
      for (const g of resolvedGroups) {
        const found = g.items.find((item) => item.value === v);
        if (found) return found.label;
      }
      return v;
    }),
  );

  const selectedLabel = $derived(
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`,
  );

  function closeAndFocusTrigger(): void {
    open = false;
    tick().then(() => {
      triggerRef?.focus();
    });
  }

  function onSelect(itemValue: string): void {
    if (values.includes(itemValue)) {
      values = values.filter((v) => v !== itemValue);
    } else {
      values = [...values, itemValue];
    }
  }

  function clear(): void {
    values = [];
  }
</script>

{#snippet triggerInner()}
  <span class="truncate">{selectedLabel}</span>
  <ChevronsUpDownIcon data-icon="inline-end" aria-hidden="true" />
{/snippet}

{#snippet commandList()}
  <Command.Root>
    <Command.Input placeholder={searchPlaceholder} aria-label={`${label} search`} />
    <Command.List>
      <Command.Empty>{emptyText}</Command.Empty>
      {#each resolvedGroups as group, gi (group.heading ?? `options-${gi}`)}
        {#if gi > 0}
          <Command.Separator />
        {/if}
        <Command.Group heading={group.heading}>
          {#each group.items as item (item.value)}
            <Command.Item
              value={item.value}
              keywords={[item.label]}
              data-checked={values.includes(item.value)}
              onSelect={() => onSelect(item.value)}
            >
              {item.label}
            </Command.Item>
          {/each}
        </Command.Group>
      {/each}
    </Command.List>
  </Command.Root>
{/snippet}

{#snippet footer()}
  <div class="flex items-center justify-between gap-2 bg-muted/50 p-2.5">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      class="min-h-11 rounded-none"
      disabled={values.length === 0}
      onclick={clear}
    >
      Clear
    </Button>
    <Button
      type="button"
      size="sm"
      class="min-h-11 rounded-none"
      onclick={closeAndFocusTrigger}
    >
      Done
    </Button>
  </div>
{/snippet}

{#if isDesktop}
  <Popover.Root bind:open>
    <Popover.Trigger bind:ref={triggerRef}>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          class={cn("min-h-11 w-full justify-between rounded-none font-normal", className)}
        >
          {@render triggerInner()}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-auto max-w-[calc(100vw-2rem)] min-w-48 rounded-none p-0">
      {@render commandList()}
      {@render footer()}
    </Popover.Content>
  </Popover.Root>
{:else}
  <Drawer.Root bind:open>
    <Button
      bind:ref={triggerRef}
      variant="outline"
      role="combobox"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={label}
      onclick={() => (open = true)}
      class={cn("min-h-11 w-full justify-between rounded-none font-normal", className)}
    >
      {@render triggerInner()}
    </Button>
    <Drawer.Content class="max-h-[50svh] rounded-none p-0">
      <Drawer.Title class="sr-only">{label}</Drawer.Title>
      {@render commandList()}
      {@render footer()}
    </Drawer.Content>
  </Drawer.Root>
{/if}
