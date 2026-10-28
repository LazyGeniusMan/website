export function initialsOf(name: string): string {
  return name
    .split(/[\s\-/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function hueOf(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 360;
  return h;
}

export function monogramOf(name: string): {
  initials: string;
  hue: number;
  bg: string;
  fg: string;
} {
  const initials = initialsOf(name);
  const hue = hueOf(name);
  return { initials, hue, bg: `hsl(${hue} 28% 20%)`, fg: `hsl(${hue} 65% 90%)` };
}
