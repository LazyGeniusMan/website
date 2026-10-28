import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");

function fail(msg) {
  console.error(`verify-ats: ${msg}`);
  process.exit(1);
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function main() {
  for (const p of ["cv/index.html", "about/index.html"]) {
    if (!existsSync(join(dist, p))) fail(`${p} missing — run build first`);
  }
  const cv = readFileSync(join(dist, "cv", "index.html"), "utf8");
  for (const h of [
    "Curriculum Vitae",
    "Summary",
    "Skills",
    "Work Experience",
    "Education",
    "Projects",
    "Certifications",
  ]) {
    if (!cv.includes(h)) fail(`cv missing ATS heading: ${h}`);
  }
  const about = readFileSync(join(dist, "about", "index.html"), "utf8");
  const text = stripTags(about);
  if (!/Andriyansyah Nurrachman/.test(text)) fail("about missing person name");
  const h1 = (about.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? [])[1] ?? "";
  if (!h1) fail("about missing h1");
  console.log("verify-ats: ok");
}

main();
