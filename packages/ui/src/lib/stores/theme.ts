import { atom } from "nanostores";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "yansyah-theme";

export const theme = atom<ThemeMode>("system");

function readStored(): ThemeMode | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" || saved === "system" ? saved : null;
  } catch {
    return null;
  }
}

function prefersDark(): boolean {
  try {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  } catch {}
  return false;
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return prefersDark() ? "dark" : "light";
}

function apply(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const effective = resolveTheme(mode);
  document.documentElement.classList.toggle("dark", effective === "dark");
  try {
    document.documentElement.style.colorScheme = effective;
  } catch {}
}

let booted = false;

export function bootTheme(): ThemeMode {
  const mode = readStored() ?? "system";
  theme.set(mode);
  apply(mode);
  if (!booted) {
    booted = true;
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = (): void => {
        if (theme.get() === "system") apply("system");
      };
      if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
    } catch {}
    theme.subscribe((next) => {
      apply(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
    });
  }
  return mode;
}

export function setTheme(mode: ThemeMode): void {
  theme.set(mode);
}
