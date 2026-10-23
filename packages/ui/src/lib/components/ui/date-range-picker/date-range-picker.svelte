<script lang="ts">
  import { parseDate, type DateValue } from "@internationalized/date";
  import { untrack } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { onMount } from "svelte";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Drawer from "$lib/components/ui/drawer/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as RangeCalendar from "$lib/components/ui/range-calendar/index.js";
  import { cn } from "$lib/utils.js";

  let {
    from = $bindable<string | null>(null),
    to = $bindable<string | null>(null),
    label = "Date range",
    min = null,
    max = null,
    class: className = "",
  }: {
    from?: string | null;
    to?: string | null;
    label?: string;
    min?: string | null;
    max?: string | null;
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

  const isoOf = (v: DateValue | undefined): string | null =>
    v ? v.toString().slice(0, 10) : null;

  function parseIso(iso: string | null): DateValue | undefined {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
    try {
      return parseDate(iso);
    } catch {
      return undefined;
    }
  }

  function toRange(
    f: string | null,
    t: string | null,
  ): { start: DateValue | undefined; end: DateValue | undefined } | undefined {
    if (!f && !t) return undefined;
    return { start: parseIso(f), end: parseIso(t) };
  }

  let range = $state(toRange(from, to));
  // svelte-ignore state_referenced_locally
  let placeholder = $state<DateValue | undefined>(range?.start ?? parseIso(min) ?? undefined);

  // User picks in the calendar -> publish ISO strings (tracks range only).
  $effect(() => {
    const f = isoOf(range?.start);
    const t = isoOf(range?.end);
    untrack(() => {
      if (f !== from) from = f;
      if (t !== to) to = t;
    });
  });

  // External change (URL sync, clear-all) -> reflect in the calendar (tracks from/to only).
  $effect(() => {
    const f = from;
    const t = to;
    untrack(() => {
      const rf = isoOf(range?.start);
      const rt = isoOf(range?.end);
      if (rf !== f || rt !== t) range = toRange(f, t);
    });
  });

  const triggerText = $derived(
    from && to ? `${from} – ${to}` : from ? `From ${from}` : to ? `Until ${to}` : "All dates",
  );

  const minValue = $derived(parseIso(min));
  const maxValue = $derived(parseIso(max));

  const triggerClass = $derived(
    cn(
      "min-h-11 w-full justify-between rounded-none font-normal tabular-nums",
      !from && !to && "text-muted-foreground",
      className,
    ),
  );

  function clear(): void {
    range = undefined;
    from = null;
    to = null;
    placeholder = parseIso(min) ?? undefined;
  }
</script>

{#snippet triggerInner()}
  <span class="flex items-center gap-2 truncate">
    <CalendarIcon data-icon="inline-start" class="shrink-0 opacity-60" aria-hidden="true" />
    <span class="truncate">{triggerText}</span>
  </span>
{/snippet}

{#snippet calendarBody()}
  <RangeCalendar.RangeCalendar
    bind:value={range}
    bind:placeholder
    {minValue}
    {maxValue}
    captionLayout="dropdown"
    locale="en-US"
    class="rounded-none"
  />
  <div class="flex items-center justify-between gap-2 bg-muted/50 p-2.5">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      class="min-h-11 rounded-none"
      disabled={!from && !to}
      onclick={clear}
    >
      Clear
    </Button>
    <Button type="button" size="sm" class="min-h-11 rounded-none" onclick={() => (open = false)}>
      Done
    </Button>
  </div>
{/snippet}

{#snippet drawerCalendarBody()}
  <div class="mx-auto w-full max-w-md px-5 pt-2 pb-3 sm:px-6">
    <RangeCalendar.RangeCalendar
      bind:value={range}
      bind:placeholder
      {minValue}
      {maxValue}
      captionLayout="dropdown"
      locale="en-US"
      class="w-full rounded-none p-0 [--cell-size:calc((min(100vw,28rem)-2.5rem)/7)] sm:[--cell-size:calc((min(100vw,28rem)-3rem)/7)]"
    />
  </div>
  <div class="flex items-center justify-between gap-2 bg-muted/50 px-5 py-2.5 sm:px-6">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      class="min-h-11 rounded-none"
      disabled={!from && !to}
      onclick={clear}
    >
      Clear
    </Button>
    <Button type="button" size="sm" class="min-h-11 rounded-none" onclick={() => (open = false)}>
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
          aria-label={label}
          class={triggerClass}
        >
          {@render triggerInner()}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
      {@render calendarBody()}
    </Popover.Content>
  </Popover.Root>
{:else}
  <Drawer.Root bind:open>
    <Button
      bind:ref={triggerRef}
      variant="outline"
      aria-haspopup="dialog"
      aria-label={label}
      onclick={() => (open = true)}
      class={triggerClass}
    >
      {@render triggerInner()}
    </Button>
    <Drawer.Content class="overflow-y-auto rounded-none p-0 data-[vaul-drawer-direction=bottom]:max-h-[50svh]">
      <Drawer.Title class="sr-only">{label}</Drawer.Title>
      {@render drawerCalendarBody()}
    </Drawer.Content>
  </Drawer.Root>
{/if}
