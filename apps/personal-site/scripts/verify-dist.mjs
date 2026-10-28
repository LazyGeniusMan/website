import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const dist = join(process.cwd(), "dist");

function fail(msg) {
  console.error(`verify-dist: ${msg}`);
  process.exit(1);
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function main() {
  if (!existsSync(join(dist, "index.html"))) fail("dist/index.html missing — run build first");
  const files = walk(dist);
  let total = 0;
  for (const f of files) total += statSync(f).size;
  const BUDGET_TOTAL = 60 * 1024 * 1024;
  if (total > BUDGET_TOTAL)
    fail(
      `dist total ${(total / 1048576).toFixed(1)}MB over ${(BUDGET_TOTAL / 1048576).toFixed(0)}MB`,
    );
  let failures = 0;
  for (const f of files.filter((p) => p.endsWith(".html"))) {
    const rel = relative(dist, f).split(sep).join("/");
    const html = readFileSync(f, "utf8");
    if (/protondrive|rclone/i.test(html)) {
      console.error(`${rel}: remote storage URL in dist`);
      failures++;
    }
    if (/_worker\.js|src=.*analytics/i.test(html)) {
      console.error(`${rel}: banned analytics/worker script`);
      failures++;
    }
    const scripts = [
      ...html.matchAll(/<script(?![^>]*type=["']application\/ld\+json["'])([^>]*)>/gi),
    ];
    for (const m of scripts) {
      const attrs = m[1] ?? "";
      if (/is:inline/.test(attrs)) continue;
      if (/src=/.test(attrs)) {
        console.error(`${rel}: non-inline remote script ${attrs.slice(0, 120)}`);
        failures++;
      } else if (attrs.trim() && !/is:inline/.test(attrs)) {
        if (!/type=["']module["']/.test(attrs) && attrs.trim().length > 0) {
          console.error(`${rel}: unexpected inline script attrs: ${attrs.slice(0, 120)}`);
          failures++;
        }
      }
    }
    const size = statSync(f).size;
    if (size > 600 * 1024) {
      console.error(`${rel}: ${(size / 1024).toFixed(0)}KB over 600KB single-file budget`);
      failures++;
    }
    if (
      !/<link[^>]*rel=["']canonical["']/i.test(html) &&
      !/^404\.html$/.test(rel) &&
      !/^(go|profile)\//.test(rel)
    ) {
      console.error(`${rel}: canonical link missing`);
      failures++;
    }
  }
  if (failures > 0) fail(`${failures} dist error(s)`);
  console.log(`verify-dist: ok (${files.length} files, ${(total / 1048576).toFixed(2)}MB)`);
}

main();
