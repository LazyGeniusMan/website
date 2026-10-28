import { map } from "nanostores";

export interface FilterState {
  q: string;
  facets: Record<string, string[]>;
  from: string | null;
  to: string | null;
  page: number;
}

export interface FilterSnapshot {
  q: string;
  facets: Record<string, string[]>;
  from: string | null;
  to: string | null;
  page: number;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function cleanDay(value: string | null): string | null {
  return value && ISO_DAY.test(value) ? value : null;
}

function toValues(value: string | string[] | null): string[] {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(list.filter((v) => typeof v === "string" && v !== ""))];
}

export function createFilterStore(initial?: Partial<FilterSnapshot>) {
  const store = map<FilterState>({
    q: initial?.q ?? "",
    facets: Object.fromEntries(
      Object.entries(initial?.facets ?? {}).map(([k, v]) => [k, toValues(v)]),
    ),
    from: cleanDay(initial?.from ?? null),
    to: cleanDay(initial?.to ?? null),
    page: initial?.page && initial.page >= 1 ? Math.floor(initial.page) : 1,
  });

  function setQuery(q: string): void {
    store.setKey("q", q);
    store.setKey("page", 1);
  }

  function setFacet(key: string, value: string | string[] | null): void {
    store.setKey("facets", { ...store.get().facets, [key]: toValues(value) });
    store.setKey("page", 1);
  }

  function setRange(from: string | null, to: string | null): void {
    store.setKey("from", cleanDay(from));
    store.setKey("to", cleanDay(to));
    store.setKey("page", 1);
  }

  function setPage(page: number): void {
    if (Number.isFinite(page) && page >= 1) store.setKey("page", Math.floor(page));
  }

  function reset(): void {
    const facets: Record<string, string[]> = {};
    for (const key of Object.keys(store.get().facets)) facets[key] = [];
    store.set({ q: "", facets, from: null, to: null, page: 1 });
  }

  function snapshot(): string {
    const state = store.get();
    const params = new URLSearchParams();
    const q = state.q.trim();
    if (q !== "") params.set("q", q);
    for (const [key, values] of Object.entries(state.facets)) {
      for (const value of values) {
        if (value) params.append(key, value);
      }
    }
    if (state.from) params.set("from", state.from);
    if (state.to) params.set("to", state.to);
    if (state.page > 1) params.set("page", String(state.page));
    return params.toString();
  }

  function applySnapshot(state: string, knownFacets: readonly string[] = []): void {
    const params = new URLSearchParams(state.startsWith("?") ? state : `?${state}`);
    const facets: Record<string, string[]> = {};
    for (const key of [...Object.keys(store.get().facets), ...knownFacets]) {
      facets[key] = toValues(params.getAll(key));
    }
    const raw = Number(params.get("page") ?? "1");
    store.set({
      q: params.get("q") ?? "",
      facets,
      from: cleanDay(params.get("from")),
      to: cleanDay(params.get("to")),
      page: Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1,
    });
  }

  return { store, setQuery, setFacet, setRange, setPage, reset, snapshot, applySnapshot };
}

export type FilterStore = ReturnType<typeof createFilterStore>;
