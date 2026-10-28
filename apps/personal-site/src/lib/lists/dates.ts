export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function ymToIsoDay(ym: string): string {
  const raw = ym.trim();
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
  const m = raw.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-01`;
  const d = new Date(raw);
  if (Number.isNaN(+d)) throw new Error(`ymToIsoDay: unparseable date ${JSON.stringify(ym)}`);
  return isoDay(d);
}

export function inDateRange(
  item: { date?: string; dateEnd?: string | null },
  from: string | null,
  to: string | null,
): boolean {
  if (!from && !to) return true;
  if (!item.date) return true;
  const start = item.date;
  const end = item.dateEnd ?? "9999-12-31";
  if (from && end < from) return false;
  if (to && start > to) return false;
  return true;
}
