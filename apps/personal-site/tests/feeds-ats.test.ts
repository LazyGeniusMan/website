import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("astro:content", async () => {
  const { z } = await import("astro/zod");
  const ref = () => z.object({ id: z.string().min(1), collection: z.string().min(1) });
  return {
    z,
    defineCollection: (c: unknown) => c,
    reference: ref,
    getCollection: () => {
      throw new Error("unit scope: getCollection is unavailable, pass hydrated fixtures");
    },
    getEntries: () => {
      throw new Error("unit scope: getEntries is unavailable, pass hydrated fixtures");
    },
  };
});

vi.mock("astro/loaders", () => ({
  glob: () => ({}),
}));

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toAtsSlug } from "../src/lib/collections";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const src = join(appRoot, "src");
const read = (p: string) => readFileSync(p, "utf8");

describe("feed-wide ATS slugs (F1+F5+F6)", () => {
  it("sitemap projects/experience/skills/blog/tags/certs all use toAtsSlug", () => {
    const s = read(join(src, "pages", "sitemap.xml.ts"));
    expect(s).toMatch(/\/projects\/\$\{toAtsSlug\(/);
    expect(s).toMatch(/\/experience\/\$\{toAtsSlug\(/);
    expect(s).toMatch(/\/skills\/\$\{toAtsSlug\(/);
    expect(s).toMatch(/\/blog\/\$\{toAtsSlug\(/);
    expect(s).toMatch(/\/blog\/tag\/\$\{toAtsSlug\(/);
    expect(s).toMatch(/\/certifications\/\$\{toAtsSlug\(/);
    expect(s).not.toContain("`/projects/${w.id}`");
    expect(s).not.toContain("`/experience/${e.id}`");
    expect(s).not.toContain("`/skills/${s.id}`");
    expect(s).not.toContain('"/work');
    expect(s).not.toContain("`/work");
  });

  it("rss blog link+guid use toAtsSlug", () => {
    const r = read(join(src, "pages", "rss.xml.ts"));
    expect(r).toContain("toAtsSlug");
    expect(r).toMatch(/\/blog\/\$\{toAtsSlug\(p\.id\)\}/);
    expect(r).not.toMatch(/\/blog\/\$\{p\.id\}/);
  });

  it("llms projects/blog use toAtsSlug with MMM YYYY short (en-US short UTC)", () => {
    const l = read(join(src, "pages", "llms.txt.ts"));
    expect(l).toContain("toAtsSlug");
    expect(l).toMatch(/\/projects\/\$\{toAtsSlug\(w\.id\)\}/);
    expect(l).toMatch(/\/blog\/\$\{toAtsSlug\(p\.id\)\}/);
    expect(l).not.toMatch(/\/projects\/\$\{w\.id\}/);
    expect(l).not.toMatch(/\/blog\/\$\{p\.id\}/);
    expect(l).toMatch(/\{\s*month:\s*"short"/);
    expect(l).toContain('timeZone: "UTC"');
    expect(l).toContain('"en-US"');
  });

  it("toAtsSlug is the identity gate for every getStaticPaths slug", () => {
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const q = join(d, e.name);
        if (e.isDirectory()) return walk(q);
        if (/\[slug\]/.test(e.name) || /\[tag\]/.test(e.name)) return [q];
        return [];
      });
    const routes = walk(join(src, "pages"));
    expect(routes.length).toBeGreaterThanOrEqual(6);
    for (const f of routes) {
      const t = read(f);
      expect(t).toContain("getStaticPaths");
      expect(t).toContain("toAtsSlug");
    }
    expect(toAtsSlug("tunaya")).toBe("tunaya");
    expect(toAtsSlug("chart-of-accounts")).toBe("chart-of-accounts");
  });
});

describe("redirect map + trailingSlash (F1)", () => {
  it("public/_redirects holds credentials→certifications and resume→cv with no chains", () => {
    const p = join(appRoot, "public", "_redirects");
    expect(existsSync(p)).toBe(true);
    const t = read(p);
    expect(t).toContain("/credentials /certifications 301");
    expect(t).toContain("/credentials/* /certifications/:splat 301");
    expect(t).toContain("/resume /cv 301");
    const rows = t
      .split("\n")
      .map((l) => l.trim().split(/\s+/))
      .filter((q) => q.length >= 2 && q[0].startsWith("/"));
    const sources = new Set(rows.map((q) => q[0]));
    for (const [, to] of rows) {
      if (!to.startsWith("/")) continue;
      const target = to.split(":")[0].replace(/\/\*$/, "");
      expect(sources.has(target)).toBe(false);
    }
  });

  it('astro.config.ts freezes trailingSlash: "never"', () => {
    const t = read(join(appRoot, "astro.config.ts"));
    expect(t).toMatch(/trailingSlash\s*:\s*"never"/);
  });
});

describe("feed published gate (fixtures excluded, no legacy)", () => {
  const list = (d: string) => {
    const p = join(src, "content", d);
    if (!existsSync(p)) return [];
    return readdirSync(p);
  };
  const fm = (p: string) => read(p).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const isPub = (dir: string, f: string) => {
    if (f.includes("fixture")) return false;
    const front = fm(join(src, "content", dir, f));
    if (/^draft:\s*true/m.test(front)) return false;
    const m = front.match(/^pubDate:\s*(.+)$/m)?.[1]?.trim();
    if (m) {
      const d = new Date(m);
      if (!Number.isNaN(+d) && d.getTime() > Date.now()) return false;
    }
    return true;
  };

  it("fixtures exist but stay out of the published set", () => {
    const projects = list("projects").filter((f) => f.endsWith(".md"));
    const blog = list("blog").filter((f) => f.endsWith(".md"));
    expect(projects).toContain("fixture-future.md");
    expect(blog).toContain("fixture-future.md");
    expect(isPub("projects", "fixture-future.md")).toBe(false);
    expect(isPub("blog", "fixture-future.md")).toBe(false);
    expect(projects.some((f) => isPub("projects", f))).toBe(true);
    expect(blog.some((f) => isPub("blog", f))).toBe(true);
  });

  it("no feed source leaks fixture, /work, or legacy /credentials", () => {
    for (const rel of ["pages/sitemap.xml.ts", "pages/rss.xml.ts", "pages/llms.txt.ts"]) {
      const t = read(join(src, rel));
      expect(t).not.toMatch(/fixture/);
    }
    const s = read(join(src, "pages", "sitemap.xml.ts"));
    expect(s).not.toContain('"/work');
    expect(s).not.toContain("`/work");
    expect(s).not.toContain("/credentials/");
  });
});
