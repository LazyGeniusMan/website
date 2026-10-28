import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const dist = process.env.JSONLD_DIST ?? join(process.cwd(), "dist");

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}

function graphsIn(html) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

function main() {
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`verify-jsonld-parity: ${dist}/index.html missing — run build first`);
    process.exit(1);
  }
  const files = walk(dist);
  let failures = 0;
  for (const file of files) {
    const rel = relative(dist, file).split(sep).join("/");
    const html = readFileSync(file, "utf8");
    if (/^(go|profile)\//.test(rel)) continue;
    const scripts = graphsIn(html);
    if (scripts.length !== 1) {
      console.error(`${rel}: one-script-per-page, got ${scripts.length}`);
      failures++;
      continue;
    }
    let payload;
    try {
      payload = JSON.parse(scripts[0]);
    } catch {
      console.error(`${rel}: ld+json parse error`);
      failures++;
      continue;
    }
    const top = new Set(Object.keys(payload));
    for (const k of ["@context", "@graph"]) {
      if (!top.has(k)) {
        console.error(`${rel}: top-level key ${k} missing`);
        failures++;
      }
    }
    for (const k of top) {
      if (k !== "@context" && k !== "@graph") {
        console.error(`${rel}: unexpected top-level key ${k}`);
        failures++;
      }
    }
    const hasWebsite = (payload["@graph"] ?? []).some(
      (n) => n?.["@id"] === "https://yansyah.my.id/#website",
    );
    if (!hasWebsite) {
      console.error(`${rel}: WebSite #website node missing (auto-append)`);
      failures++;
    }
    const canon = html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i);
    if (!canon) {
      console.error(`${rel}: canonical link missing`);
      failures++;
    }
  }
  if (failures > 0) {
    console.error(`verify-jsonld-parity: ${failures} error(s)`);
    process.exit(1);
  }
  console.log(`verify-jsonld-parity: ok (${files.length} pages)`);
}

main();
