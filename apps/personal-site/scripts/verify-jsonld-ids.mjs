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
    console.error(`verify-jsonld-ids: ${dist}/index.html missing — run build first`);
    process.exit(1);
  }
  const files = walk(dist);
  if (files.length < 10) {
    console.error(`verify-jsonld-ids: only ${files.length} pages, want >=10`);
    process.exit(1);
  }
  const defined = new Set();
  const refs = [];
  let failures = 0;
  for (const file of files) {
    const rel = relative(dist, file).split(sep).join("/");
    const html = readFileSync(file, "utf8");
    if (/^(go|profile)\//.test(rel)) {
      const n = graphsIn(html).length;
      if (n !== 0) {
        console.error(`${rel}: redirect page must have no JSON-LD, got ${n}`);
        failures++;
      }
      continue;
    }
    const scripts = graphsIn(html);
    if (scripts.length !== 1) {
      console.error(`${rel}: exactly one JSON-LD script, got ${scripts.length}`);
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
    if (payload["@context"] !== "https://schema.org") {
      console.error(`${rel}: @context must be https://schema.org`);
      failures++;
    }
    const graph = payload["@graph"];
    if (!Array.isArray(graph) || graph.length === 0) {
      console.error(`${rel}: non-empty @graph required`);
      failures++;
      continue;
    }
    for (const node of graph) {
      if (typeof node?.["@type"] !== "string") {
        console.error(`${rel}: every node needs @type`);
        failures++;
      }
      if (typeof node?.["@id"] !== "string") {
        console.error(`${rel}: every node needs @id (${node?.["@type"] ?? "?"})`);
        failures++;
      } else {
        defined.add(node["@id"]);
      }
      const collect = (v) => {
        if (Array.isArray(v)) return v.forEach(collect);
        if (v && typeof v === "object") {
          const keys = Object.keys(v);
          if (keys.length === 1 && typeof v["@id"] === "string") refs.push(v["@id"]);
          for (const val of Object.values(v)) collect(val);
        }
      };
      for (const [k, v] of Object.entries(node)) {
        if (k.startsWith("@")) continue;
        collect(v);
      }
    }
  }
  for (const r of new Set(refs)) {
    if (!defined.has(r)) {
      console.error(`dangling @id ref ${r}`);
      failures++;
    }
  }
  if (failures > 0) {
    console.error(`verify-jsonld-ids: ${failures} error(s)`);
    process.exit(1);
  }
  console.log(`verify-jsonld-ids: ok (${files.length} pages, ${defined.size} ids)`);
}

main();
