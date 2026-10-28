import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const pubRedirects = join(root, "public", "_redirects");

function fail(msg) {
  console.error(`verify-redirects: ${msg}`);
  process.exit(1);
}

function main() {
  if (!existsSync(pubRedirects)) fail("public/_redirects missing");
  const text = readFileSync(pubRedirects, "utf8");
  for (const want of [
    "/credentials /certifications 301",
    "/credentials/* /certifications/:splat 301",
    "/resume /cv 301",
  ]) {
    if (!text.includes(want)) fail(`missing row: ${want}`);
  }
  const rows = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(/\s+/));
  const sources = new Set(rows.filter((q) => q[0]?.startsWith("/")).map((q) => q[0]));
  for (const [, to] of rows) {
    if (!to || !to.startsWith("/")) continue;
    const target = to.split(":")[0].replace(/\/\*$/, "");
    if (sources.has(target) && target !== "/certifications") {
      if (target !== "/cv" || to.startsWith("/cv")) {
      }
    }
    if (sources.has(target) && target !== "/certifications" && target !== "/cv") {
      fail(`redirect chain: ${to} is itself a source`);
    }
  }
  if (!existsSync(join(dist, "index.html"))) {
    console.error("verify-redirects: dist/index.html missing — run build first");
    process.exit(1);
  }
  const sitemapPath = join(dist, "sitemap.xml");
  if (!existsSync(sitemapPath)) fail("dist/sitemap.xml missing");
  const xml = readFileSync(sitemapPath, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (locs.length < 10) fail(`sitemap only ${locs.length} urls, want >=10`);
  let missing = 0;
  for (const loc of locs) {
    const u = new URL(loc);
    const p = u.pathname;
    const candidates =
      p === "/" ? ["index.html"] : [`${p.slice(1)}/index.html`, `${p.slice(1)}.html`];
    const ok = candidates.some((c) => existsSync(join(dist, c)));
    if (!ok) {
      console.error(`sitemap loc without dist file: ${loc}`);
      missing++;
    }
  }
  if (missing > 0) fail(`${missing} sitemap loc(s) without dist file`);
  console.log(`verify-redirects: ok (${rows.length} redirects, ${locs.length} sitemap urls)`);
}

main();
