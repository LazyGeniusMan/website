<script module lang="ts">
  import { createFilterStore } from "$lib/stores/filters.js";

  // Shared across every PersonFilter instance on the page (rail, drawer,
  // inline mobile) so all controls stay in sync through one nanostores atom.
  const personFilter = createFilterStore({
    facets: { org: [], skill: [], exp: [], project: [] },
  });
  let personInit = false;
</script>

<script lang="ts">
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import SearchIcon from "@lucide/svelte/icons/search";
  import SearchXIcon from "@lucide/svelte/icons/search-x";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Combobox } from "$lib/components/ui/combobox/index.js";
  import { DateRangePicker } from "$lib/components/ui/date-range-picker/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import { inDateRange } from "../../lib/lists/dates.js";
  import { onMount } from "svelte";

  interface FacetOption {
    id: string;
    label: string;
    group?: string;
  }

  interface PersonFilterGroup {
    key: string;
    label: string;
    options: FacetOption[];
  }

  interface ComboItem {
    value: string;
    label: string;
  }

  interface ComboGroup {
    heading?: string;
    items: ComboItem[];
  }

  let {
    groups = [],
    label = "Filter resume",
    resumeBase = "/cv",
    dateMin = null,
    dateMax = null,
  }: {
    groups?: PersonFilterGroup[];
    label?: string;
    resumeBase?: string;
    dateMin?: string | null;
    dateMax?: string | null;
  } = $props();

  const keys = $derived(groups.map((g) => g.key));

  let query = $state("");
  let active = $state<Record<string, string[]>>(
    Object.fromEntries(groups.map((g) => [g.key, []])) as Record<string, string[]>,
  );
  let from = $state<string | null>(null);
  let to = $state<string | null>(null);
  let mounted = $state(false);
  let shown = $state(0);
  let total = $state(0);

  function applyDom(): void {
    const s = personFilter.store.get();
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-person-item]"));
    let n = 0;
    for (const el of items) {
      let keep = true;
      for (const g of groups) {
        const sel = s.facets[g.key] ?? [];
        if (sel.length === 0) continue;
        const stems = (el.dataset[g.key] ?? "").split(/\s+/).filter(Boolean);
        if (!sel.some((v) => stems.includes(v))) {
          keep = false;
          break;
        }
      }
      if (keep && !inDateRange({ date: el.dataset.date || undefined, dateEnd: el.dataset.dateEnd || null }, s.from, s.to)) {
        keep = false;
      }
      if (keep) {
        const q = s.q.trim().toLowerCase();
        if (q !== "") {
          const hay = (el.dataset.text ?? "").toLowerCase();
          if (!q.split(/\s+/).every((w) => hay.includes(w))) keep = false;
        }
      }
      el.hidden = !keep;
      if (keep) n += 1;
    }
    shown = n;
    total = items.length;
    for (const group of Array.from(document.querySelectorAll<HTMLElement>("[data-person-group]"))) {
      group.hidden = group.querySelector("[data-person-item]:not([hidden])") === null;
    }
    for (const sec of Array.from(document.querySelectorAll<HTMLElement>("[data-person-section]"))) {
      sec.hidden = sec.querySelector("[data-person-item]:not([hidden])") === null;
    }
    const counts: Record<string, number> = { skills: 0, experience: 0, projects: 0, posts: 0, credentials: 0 };
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-person-item]:not([hidden])"))) {
      const k = el.dataset.kind;
      if (k === "skill") counts.skills += 1;
      else if (k === "experience") counts.experience += 1;
      else if (k === "project") counts.projects += 1;
      else if (k === "post") counts.posts += 1;
      else if (k === "credential") counts.credentials += 1;
    }
    window.dispatchEvent(new CustomEvent("person-filter-applied", { detail: counts }));
  }

  function writeUrl(): void {
    const snapshot = personFilter.snapshot();
    const current = new URLSearchParams(window.location.search).toString();
    if (snapshot === current) return;
    try {
      const next = snapshot ? `${window.location.pathname}?${snapshot}` : window.location.pathname;
      window.history.replaceState(null, "", next);
    } catch {
      // Non-fatal: filtering still applies to this page.
    }
  }

  onMount(() => {
    mounted = true;
    if (!personInit) {
      personFilter.applySnapshot(window.location.search, keys);
      personInit = true;
    } else {
      // Late instance (drawer/inline): adopt the shared state, keep its keys.
      const s = personFilter.store.get();
      for (const k of keys) {
        if (!(k in s.facets)) personFilter.setFacet(k, null);
      }
    }
    const unsub = personFilter.store.subscribe((s) => {
      query = s.q;
      active = { ...s.facets };
      for (const k of keys) {
        if (!(k in active)) active[k] = [];
      }
      from = s.from;
      to = s.to;
      applyDom();
      writeUrl();
    });
    applyDom();
    const onPop = (): void => {
      personFilter.applySnapshot(window.location.search, keys);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      unsub();
      window.removeEventListener("popstate", onPop);
    };
  });

  // Locals mirror the store for bindable controls; push diffs back.
  $effect(() => {
    if (!mounted) return;
    const s = personFilter.store.get();
    if (query !== s.q) {
      personFilter.setQuery(query);
      return;
    }
    for (const k of keys) {
      const cur = active[k] ?? [];
      const srv = s.facets[k] ?? [];
      if (!sameValues(cur, srv)) {
        personFilter.setFacet(k, cur);
        return;
      }
    }
    if (from !== s.from || to !== s.to) {
      personFilter.setRange(from, to);
    }
  });

  const hasFilters = $derived(
    Object.values(active).some((v) => v.length > 0) ||
      query.trim() !== "" ||
      from !== null ||
      to !== null,
  );

  const activeCount = $derived(
    Object.values(active).reduce((n, v) => n + v.length, 0) +
      (query.trim() !== "" ? 1 : 0) +
      (from !== null || to !== null ? 1 : 0),
  );

  const dateInvalid = $derived(from !== null && to !== null && from > to);

  const datePreset = $derived.by(() => {
    if (from === null && to === null) return "all";
    if (from === "2020-01-01" && to === "2022-12-31") return "2020-2022";
    if (from === "2023-01-01" && to === null) return "2023-now";
    return "";
  });

  function setPreset(v: string | undefined): void {
    if (!v) return;
    if (v === "all") personFilter.setRange(null, null);
    else if (v === "2020-2022") personFilter.setRange("2020-01-01", "2022-12-31");
    else if (v === "2023-now") personFilter.setRange("2023-01-01", null);
  }

  const resumeHref = $derived.by(() => {
    const params = new URLSearchParams();
    const q = query.trim();
    if (q !== "") params.set("q", q);
    for (const k of keys) {
      for (const v of active[k] ?? []) params.append(k, v);
    }
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const s = params.toString();
    return s ? `${resumeBase}?${s}` : resumeBase;
  });

  function sameValues(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((v) => b.includes(v));
  }

  function comboGroups(g: PersonFilterGroup): ComboGroup[] {
    const flat = g.options.map((o) => ({ value: o.id, label: o.label }));
    if (!g.options.some((o) => o.group)) return [{ items: flat }];
    const order: string[] = [];
    const byHeading = new Map<string, ComboItem[]>();
    const ungrouped: ComboItem[] = [];
    for (const o of g.options) {
      const entry = { value: o.id, label: o.label };
      if (!o.group) {
        ungrouped.push(entry);
        continue;
      }
      if (!byHeading.has(o.group)) {
        byHeading.set(o.group, []);
        order.push(o.group);
      }
      byHeading.get(o.group)!.push(entry);
    }
    const out: ComboGroup[] = [];
    if (ungrouped.length > 0) out.push({ items: ungrouped });
    for (const heading of order) out.push({ heading, items: byHeading.get(heading)! });
    return out;
  }

  function clearAll(): void {
    personFilter.reset();
  }
</script>

<Collapsible.Root open data-slot="filter-panel" class="group/filter-panel flex min-w-0 flex-col">
  <Collapsible.Trigger
    class="text-foreground flex min-h-11 w-full min-w-0 items-center justify-between gap-2 text-lg font-medium"
    aria-label={`Toggle ${label}`}
  >
    {label}
    <ChevronDownIcon
      data-icon="inline-end"
      aria-hidden="true"
      class="transition-transform group-data-[state=open]/filter-panel:rotate-180"
    />
  </Collapsible.Trigger>
  <Collapsible.Content class="pt-2">
    <Field.Group class="min-w-0 gap-5">
      {#if hasFilters}
        <div class="flex min-w-0 items-center justify-between gap-4">
          <p class="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
            Filters active
            <Badge variant="secondary" class="rounded-none tabular-nums">{activeCount}</Badge>
          </p>
          <Button type="button" variant="ghost" size="sm" class="min-h-11 rounded-none" onclick={clearAll}>
            Clear all
          </Button>
        </div>
      {/if}
      <Field.Field class="min-w-0">
        <Field.Title class="text-sm font-medium text-muted-foreground">Search</Field.Title>
        <div class="mt-2 min-w-0">
          <InputGroup.Root class="min-h-11 w-full min-w-0 rounded-none">
            <InputGroup.Addon align="inline-start">
              <SearchIcon data-icon="inline-start" aria-hidden="true" />
            </InputGroup.Addon>
            <InputGroup.Input
              type="search"
              bind:value={query}
              placeholder="Search connections"
              aria-label={`${label} search`}
            />
          </InputGroup.Root>
        </div>
      </Field.Field>
      <Separator />
      <Field.Field class="min-w-0">
        <Field.Title class="text-sm font-medium text-muted-foreground">Connection dates</Field.Title>
        <div class="mt-2 min-w-0">
          <ToggleGroup.Root
            type="single"
            value={datePreset === "" ? undefined : datePreset}
            onValueChange={(v) => setPreset(v)}
            variant="outline"
            spacing={2}
            aria-label="Date presets"
            class="flex-wrap justify-start rounded-none"
          >
            <ToggleGroup.Item value="all" aria-label="All time" class="min-h-11 rounded-none">All</ToggleGroup.Item>
            <ToggleGroup.Item value="2020-2022" aria-label="2020 to 2022" class="min-h-11 rounded-none">2020–2022</ToggleGroup.Item>
            <ToggleGroup.Item value="2023-now" aria-label="2023 to present" class="min-h-11 rounded-none">2023–Now</ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>
        <div class="mt-2 min-w-0">
          <DateRangePicker bind:from bind:to label="Connection date range" min={dateMin} max={dateMax} />
        </div>
        {#if dateInvalid}
          <div class="mt-2 min-w-0">
            <Alert.Root variant="destructive" class="rounded-none">
              <Alert.Title>Check the dates</Alert.Title>
              <Alert.Description>From is after To. Pick a From date on or before the To date.</Alert.Description>
            </Alert.Root>
          </div>
        {/if}
      </Field.Field>
      {#each groups as g (g.key)}
        <Separator />
        <Field.Field class="min-w-0" data-connection-group={g.key}>
          <Field.Title class="text-sm font-medium text-muted-foreground">{g.label}</Field.Title>
          <div class="mt-2 min-w-0">
            <Combobox
              groups={comboGroups(g)}
              bind:values={active[g.key]}
              placeholder={`All ${g.label}`}
              searchPlaceholder={`Search ${g.label}`}
              emptyText="No options found."
              label={g.label}
            />
          </div>
        </Field.Field>
      {/each}
      <Separator />
      <Field.Field class="min-w-0">
        {#if !mounted}
          <div class="flex min-w-0 flex-col gap-2">
            <Skeleton class="h-4 w-32 rounded-none" />
            <Skeleton class="h-11 w-full rounded-none" />
          </div>
        {:else if shown === 0}
          <Empty.Root class="rounded-none">
            <Empty.Header>
              <Empty.Media variant="icon">
                <SearchXIcon data-icon="inline-start" aria-hidden="true" />
              </Empty.Media>
              <Empty.Title>No matches</Empty.Title>
              <Empty.Description>No connections match these filters. Try clearing them.</Empty.Description>
            </Empty.Header>
            <Empty.Content>
              <Button type="button" variant="outline" size="sm" class="min-h-11 rounded-none" onclick={clearAll}>
                Clear filters
              </Button>
            </Empty.Content>
          </Empty.Root>
          <p class="mt-2 text-sm tabular-nums opacity-70" aria-live="polite">
            0 of {total} connections shown
          </p>
        {:else}
          <p class="text-sm tabular-nums opacity-70" aria-live="polite">
            {shown} of {total} connections shown
          </p>
        {/if}
        <div class="mt-2 min-w-0">
          <Button
            href={resumeHref}
            target="_blank"
            rel="noopener"
            class="min-h-11 w-full max-w-full rounded-none whitespace-normal"
          >
            Get Resume
            <ExternalLinkIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </Field.Field>
    </Field.Group>
  </Collapsible.Content>
</Collapsible.Root>
