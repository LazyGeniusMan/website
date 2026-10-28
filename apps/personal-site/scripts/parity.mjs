import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const src = join(root, "src");

function fail(msg) {
  console.error(`parity: ${msg}`);
  process.exit(1);
}

function main() {
  for (const f of ["pages/sitemap.xml.ts", "pages/rss.xml.ts", "pages/llms.txt.ts"]) {
    const t = readFileSync(join(src, f), "utf8");
    if (!t.includes("toAtsSlug")) fail(`${f} must use toAtsSlug`);
    if (/fixture/.test(t)) fail(`${f} leaks fixture`);
  }
  const sitemap = readFileSync(join(src, "pages", "sitemap.xml.ts"), "utf8");
  for (const bad of ['"/work', "`/work", "/credentials/"]) {
    if (sitemap.includes(bad)) fail(`sitemap leaks legacy ${bad}`);
  }
  const astro = readFileSync(join(root, "astro.config.ts"), "utf8");
  if (!/trailingSlash\s*:\s*"never"/.test(astro)) fail("astro.config trailingSlash must be never");
  if (!/output\s*:\s*"static"/.test(astro)) fail("astro output must be static");
  const redirects = readFileSync(join(root, "public", "_redirects"), "utf8");
  for (const want of ["/credentials /certifications 301", "/resume /cv 301"]) {
    if (!redirects.includes(want)) fail(`_redirects missing ${want}`);
  }
  const collections = [
    "blog",
    "projects",
    "experience",
    "skills",
    "credentials",
    "education",
    "organizations",
    "person",
  ];
  for (const c of collections) {
    if (!existsSync(join(src, "content", c))) fail(`content/${c} missing`);
  }
  const contentConfig = readFileSync(join(src, "content.config.ts"), "utf8");
  for (const field of ["logoImageField", "heroImageField", "imagesField"]) {
    if (!contentConfig.includes(field)) fail(`content.config missing ${field}`);
  }
  if (
    !contentConfig.includes("LIST_IMAGE_FALLBACK_CHAIN") &&
    !readFileSync(join(src, "lib", "schema", "base.ts"), "utf8").includes(
      "LIST_IMAGE_FALLBACK_CHAIN",
    )
  ) {
    fail("LIST_IMAGE_FALLBACK_CHAIN missing");
  }
  console.log("parity: ok (collections, feeds gate, JSON-LD gate)");
}

main();
