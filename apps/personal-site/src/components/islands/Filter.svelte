<script module lang="ts">
  import { createFilterStore } from "$lib/stores/filters.js";

  // Shared across every Filter instance on the page (results, rail,
  // drawer) so all controls stay in sync through one nanostores atom.
  // Same pattern as PersonFilter.
  const listFilter = createFilterStore({ facets: {} });
  let listInit = false;
  let listKeys = "";
</script>

<script lang="ts">
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import SearchXIcon from "@lucide/svelte/icons/search-x";
  import SearchIcon from "@lucide/svelte/icons/search";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Combobox } from "$lib/components/ui/combobox/index.js";
  import { DateRangePicker } from "$lib/components/ui/date-range-picker/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import * as Pagination from "$lib/components/ui/pagination/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { cn } from "$lib/utils.js";
  import { inDateRange } from "../../lib/lists/dates.js";
  import ListRow from "../ListRow.svelte";
  import { onMount } from "svelte";

  interface FacetOption {
    id: string;
    label: string;
  }

  interface FilterGroup {
    key: string;
    label: string;
    options: (FacetOption & { group?: string })[];
  }

  interface ComboItem {
    value: string;
    label: string;
  }

  interface ComboGroup {
    heading?: string;
    items: ComboItem[];
  }

  interface FilterItem {
    id: string;
    title: string;
    detail: string;
    meta: string;
    href: string;
    facets: Record<string, string[]>;
    badges?: string[];
    badgeHrefs?: (string | null)[];
    hashBadges?: boolean;
    thumbSrc?: string;
    thumbAlt?: string;
    date?: string;
    dateEnd?: string | null;
  }

  type FilterView = "full" | "controls" | "results";

  let {
    groups = [],
    items = [],
    label = "Filter",
    pageSize = 6,
    initialFilters = {},
    view = "full",
    dateLabel = null,
    dateMin = null,
    dateMax = null,
    initialFrom = null,
    initialTo = null,
  }: {
    groups?: FilterGroup[];
    items?: FilterItem[];
    label?: string;
    pageSize?: number;
    initialFilters?: Record<string, string>;
    view?: FilterView;
    dateLabel?: string | null;
    dateMin?: string | null;
    dateMax?: string | null;
    initialFrom?: string | null;
    initialTo?: string | null;
  } = $props();

  const showControls = view === "full" || view === "controls";
  const showResults = view === "full" || view === "results";
  const showDate = dateLabel !== null && dateLabel !== "";

  const keys = $derived(groups.map((g) => g.key));

  let query = $state("");
  let active = $state<Record<string, string[]>>(
    Object.fromEntries(groups.map((g) => [g.key, []])) as Record<string, string[]>,
  );
  let from = $state<string | null>(null);
  let to = $state<string | null>(null);
  let page = $state(1);
  let mounted = $state(false);

  function writeUrl(): void {
    const snapshot = listFilter.snapshot();
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
    const fingerprint = keys.join("|");
    if (!listInit || listKeys !== fingerprint) {
      // Fresh facet map for exactly this instance's keys: reset() would
      // retain stale keys from a previous fingerprint in the shared module
      // store, leaking them into later snapshots.
      listFilter.store.set({
        q: "",
        facets: Object.fromEntries(keys.map((k) => [k, []])),
        from: null,
        to: null,
        page: 1,
      });
      listFilter.applySnapshot(window.location.search, keys);
      // Fall back to page defaults only when the URL has no value.
      const params = new URLSearchParams(window.location.search);
      const s = listFilter.store.get();
      for (const g of groups) {
        if (params.get(g.key) === null && initialFilters[g.key]) {
          const valid = g.options.some((o) => o.id === initialFilters[g.key]);
          const current = s.facets[g.key] ?? [];
          if (valid && !(current.length === 1 && current[0] === initialFilters[g.key])) {
            listFilter.setFacet(g.key, initialFilters[g.key]);
          }
        }
      }
      // Read the store fresh before each setRange: the first call may have
      // changed `from`, so reusing a stale snapshot drops the initial `from`.
      if (!params.get("from") && initialFrom) {
        const cur = listFilter.store.get();
        if (cur.from !== initialFrom) listFilter.setRange(initialFrom, initialTo ?? cur.to);
      }
      if (!params.get("to") && initialTo) {
        const cur = listFilter.store.get();
        if (cur.to !== initialTo) listFilter.setRange(cur.from, initialTo);
      }
      listKeys = fingerprint;
      listInit = true;
    } else {
      // Late instance (drawer): adopt the shared state, keep its keys.
      const s = listFilter.store.get();
      for (const k of keys) {
        if (!(k in s.facets)) listFilter.setFacet(k, null);
      }
    }
    const unsub = listFilter.store.subscribe((s) => {
      query = s.q;
      active = { ...s.facets };
      for (const k of keys) {
        if (!(k in active)) active[k] = [];
      }
      from = s.from;
      to = s.to;
      page = s.page;
      writeUrl();
    });
    const onPop = (): void => {
      listFilter.applySnapshot(window.location.search, keys);
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
    const s = listFilter.store.get();
    if (query !== s.q) {
      listFilter.setQuery(query);
      return;
    }
    for (const k of keys) {
      const cur = active[k] ?? [];
      const srv = s.facets[k] ?? [];
      if (!sameValues(cur, srv)) {
        listFilter.setFacet(k, cur);
        return;
      }
    }
    if (from !== s.from || to !== s.to) {
      listFilter.setRange(from, to);
      return;
    }
    if (page !== s.page) {
      listFilter.setPage(page);
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

  const normalizedQuery = $derived(query.trim().toLowerCase());

  const filtered = $derived(
    items.filter((item) => {
      const facetsOk = groups.every((g) => {
        const sel = active[g.key] ?? [];
        if (sel.length === 0) return true;
        const have = item.facets[g.key] ?? [];
        return sel.some((v) => have.includes(v));
      });
      if (!facetsOk) return false;
      if (!inDateRange(item, from, to)) return false;
      if (!normalizedQuery) return true;
      const hay = [item.title, item.detail, item.meta, ...(item.badges ?? [])]
        .join(" ")
        .toLowerCase();
      return normalizedQuery.split(/\s+/).every((w) => hay.includes(w));
    }),
  );

  const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));

  const safePage = $derived(Math.min(Math.max(1, page), totalPages));

  const paged = $derived(filtered.slice((safePage - 1) * pageSize, safePage * pageSize));

  const rangeStart = $derived(filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1);
  const rangeEnd = $derived(Math.min(safePage * pageSize, filtered.length));

  // Clamp only where results exist. Controls-only instances mount with
  // items=[] (totalPages=1) and would otherwise force a shared page>1 back
  // to 1, breaking client pagination from the results instance.
  $effect(() => {
    if (mounted && showResults && page !== safePage) listFilter.setPage(safePage);
  });

  function sameValues(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((v) => b.includes(v));
  }

  function comboGroups(g: FilterGroup): ComboGroup[] {
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

  function onQueryInput(v: string): void {
    query = v;
  }

  function clearAll(): void {
    listFilter.reset();
  }

</script>

<div class={cn("filter-app", view !== "full" && "filter-app-single")} data-view={view}>
  {#if showControls}
    <Collapsible.Root
      open
      data-slot="filter-panel"
      data-filter-label={label}
      class="group/filter-panel filter-panel flex min-w-0 flex-col"
    >
      <Collapsible.Trigger
        class="text-foreground flex min-h-11 w-full items-center justify-between gap-2 text-lg font-medium"
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
        <Field.Group class="filter-panel-fields min-w-0">
          {#if hasFilters}
            <div class="flex min-w-0 items-center justify-between gap-4">
              <p class="filter-small-label flex min-w-0 items-center gap-2 text-muted-foreground">
                Filters active
                <Badge variant="secondary" class="rounded-none tabular-nums">{activeCount}</Badge>
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="min-h-11 rounded-none"
                onclick={clearAll}
              >
                Clear all
              </Button>
            </div>
          {/if}
          <Field.Field class="filter-group-block">
            <Field.Title class="filter-small-label text-muted-foreground" id={`${label}-search-label`}>Search</Field.Title>
            <div class="mt-2 min-w-0">
              <InputGroup.Root class="min-h-11 w-full min-w-0 rounded-none">
                <InputGroup.Addon align="inline-start">
                  <SearchIcon data-icon="inline-start" aria-hidden="true" />
                </InputGroup.Addon>
                <InputGroup.Input
                  type="search"
                  value={query}
                  oninput={(e) => onQueryInput((e.target as HTMLInputElement).value)}
                  placeholder="Search this list"
                  aria-label={`${label} search`}
                />
              </InputGroup.Root>
            </div>
          </Field.Field>
          {#if showDate}
            <Separator class="filter-sep" />
            <Field.Field class="filter-group-block">
              <Field.Title class="filter-small-label text-muted-foreground">{dateLabel}</Field.Title>
              <div class="mt-2 min-w-0">
                <DateRangePicker
                  bind:from
                  bind:to
                  label={dateLabel ?? "Date range"}
                  min={dateMin}
                  max={dateMax}
                />
              </div>
              {#if dateInvalid}
                <div class="mt-2 min-w-0">
                  <Alert.Root variant="destructive" class="rounded-none">
                    <Alert.Title>Check the dates</Alert.Title>
                    <Alert.Description>From is after To. Pick a From date on or before the To date.</Alert.Description>
                  </Alert.Root>
                </div>
              {:else}
                <p class="mt-2 text-sm opacity-70">Applies to dated items; undated items always pass.</p>
              {/if}
            </Field.Field>
          {/if}
          {#each groups as g (g.key)}
            <Separator class="filter-sep" />
            <Field.Field class="filter-group-block" data-connection-group={g.key}>
              <Field.Title class="filter-small-label text-muted-foreground">{g.label}</Field.Title>
              <div class="mt-2">
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
        </Field.Group>
      </Collapsible.Content>
    </Collapsible.Root>
  {/if}

  {#if showResults}
    <div class="filter-results">
      {#if !mounted}
        <div class="result-count-row">
          <Skeleton class="h-5 w-44 rounded-none" />
        </div>
        <ol class="result-list" aria-hidden="true">
          {#each [0, 1, 2] as n (n)}
            <li>
              <Skeleton class="h-24 w-full rounded-none" />
            </li>
          {/each}
        </ol>
      {:else}
        <p class="result-count tabular-nums" aria-live="polite">
          {filtered.length} of {items.length} shown · page {safePage} of {totalPages}{#if filtered.length > 0}
            · {rangeStart}–{rangeEnd}{/if}
        </p>
        {#if paged.length > 0}
          <ol class="result-list">
            {#each paged as item (item.id)}
              <ListRow
                title={item.title}
                detail={item.detail}
                meta={item.meta}
                href={item.href}
                badges={item.badges ?? []}
                badgeHrefs={item.badgeHrefs ?? []}
                hashBadges={item.hashBadges ?? false}
                thumbSrc={item.thumbSrc}
                thumbAlt={item.thumbAlt}
              />
            {/each}
          </ol>
        {:else}
          <Empty.Root class="mt-4 rounded-none">
            <Empty.Header>
              <Empty.Media variant="icon">
                <SearchXIcon />
              </Empty.Media>
              <Empty.Title>No matches</Empty.Title>
              <Empty.Description>No items match these filters. Try clearing them.</Empty.Description>
            </Empty.Header>
            <Empty.Content>
              <Button type="button" class="min-h-11 rounded-none" size="sm" variant="outline" onclick={clearAll}>
                Clear filters
              </Button>
            </Empty.Content>
          </Empty.Root>
        {/if}
      {/if}
      {#if mounted && totalPages > 1}
        <div class="mt-6 min-w-0 max-w-full">
          <Pagination.Root
            count={filtered.length}
            perPage={pageSize}
            bind:page
            siblingCount={1}
            class="mx-0 min-w-0 max-w-full justify-start"
            aria-label={`${label} pagination`}
          >
            {#snippet children({ pages, currentPage })}
              <Pagination.Content class="min-w-0 max-w-full flex-wrap [overflow-wrap:anywhere]">
                <Pagination.Item>
                  <Pagination.Previous />
                </Pagination.Item>
                {#each pages as p (p.key)}
                  <Pagination.Item>
                    {#if p.type === "ellipsis"}
                      <Pagination.Ellipsis />
                    {:else}
                      <Pagination.Link page={p} isActive={currentPage === p.value} />
                    {/if}
                  </Pagination.Item>
                {/each}
                <Pagination.Item>
                  <Pagination.Next />
                </Pagination.Item>
              </Pagination.Content>
            {/snippet}
          </Pagination.Root>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .filter-app {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .filter-app-single {
    display: block;
  }

  .filter-panel-fields {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .filter-group-block {
    min-width: 0;
  }

  .filter-small-label {
    font-size: var(--step-caption);
    font-weight: 500;
    line-height: 1.4;
  }

  .result-count {
    font-size: 14px;
    opacity: 0.7;
  }

  .result-count-row {
    display: flex;
  }

  .result-list {
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 1rem;
    list-style: none;
    margin: 1rem 0 0;
    padding: 0;
    min-width: 0;
    max-width: 100%;
  }

  @media (min-width: 48rem) {
    .result-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 48rem) {
    .filter-app:not(.filter-app-single) .filter-panel-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem 1.5rem;
      align-items: start;
    }

    .filter-app:not(.filter-app-single) .filter-panel-fields .filter-sep {
      display: none;
    }
  }

  @media (min-width: 64rem) {
    .filter-app:not(.filter-app-single) {
      display: grid;
      grid-template-columns: 17rem minmax(0, 1fr);
      gap: 2.5rem;
      align-items: start;
    }

    .filter-app:not(.filter-app-single) .filter-panel {
      position: sticky;
      top: 1rem;
    }

    .filter-app:not(.filter-app-single) .filter-panel-fields {
      display: flex;
      flex-direction: column;
    }

    .filter-app:not(.filter-app-single) .filter-panel-fields .filter-sep {
      display: block;
    }
  }
</style>
