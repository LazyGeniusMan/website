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
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Combobox } from "$lib/components/ui/combobox/index.js";
  import { DateRangePicker } from "$lib/components/ui/date-range-picker/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
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
          <p class="text-sm font-medium text-muted-foreground">Filters active</p>
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
          <DateRangePicker bind:from bind:to label="Connection date range" min={dateMin} max={dateMax} />
        </div>
        <p class="mt-2 text-sm opacity-70">Applies to dated connections; skills have no dates and always pass.</p>
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
        {#if mounted}
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
            Open filtered resume
            <ExternalLinkIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
        <p class="mt-2 text-sm opacity-70">
          ATS-friendly printable page in a new tab, honoring the filters above.
        </p>
      </Field.Field>
    </Field.Group>
  </Collapsible.Content>
</Collapsible.Root>
