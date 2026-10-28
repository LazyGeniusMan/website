import type { APIRoute } from "astro";
import {
  allTags,
  publishedPosts,
  publishedProjects,
  getResume,
  toAtsSlug,
} from "../lib/collections";
import { getCollection } from "astro:content";

export const prerender = true;

export const GET: APIRoute = async () => {
  const posts = await publishedPosts();
  const projects = await publishedProjects();
  const resume = await getResume();
  const credsAll = await getCollection("credentials");
  const eduAll = await getCollection("education");
  const orgsAll = await getCollection("organizations");
  const lastmod = new Date().toISOString().slice(0, 10);

  const fmtMonthYear = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  };

  const lines = [
    "# Andriyansyah Nurrachman",
    "",
    "Business Process and Enterprise System Specialist in Bandung, Indonesia.",
    "Digital transformation, business process automation and improvement.",
    `Last updated: ${lastmod}`,
    "",
    "## Projects",
    ...projects.map(
      (w) =>
        `- [${w.data.title}](/projects/${toAtsSlug(w.id)}): ${w.data.outcome ?? w.data.description}`,
    ),
    "",
    "## Blog",
    ...posts.map((p) => `- [${p.data.title}](/blog/${toAtsSlug(p.id)}): ${p.data.description}`),
    "",
    "## Tags",
    ...allTags(posts).map((t) => `- ${t} (/blog/tag/${toAtsSlug(t)})`),
    "",
    ...(resume
      ? [
          "## Experience",
          ...resume.experience.map(
            (e) =>
              `- ${e.data.roleName} (${fmtMonthYear(e.data.startDate)} – ${e.data.endDate ? fmtMonthYear(e.data.endDate) : "Present"})`,
          ),
          "",
          "## Skills",
          ...resume.skills.map((s) => `- ${s.data.name}`),
          "",
        ]
      : []),
    "## Education",
    ...eduAll.map(
      (e) =>
        `- [${e.data.name}](/education/${toAtsSlug(e.data.publicSlug ?? e.id.split("/").pop() ?? e.id)})`,
    ),
    "",
    "## Certifications",
    ...credsAll.map((c) => `- ${c.data.name}`),
    "",
    "## Organizations",
    ...[...orgsAll]
      .sort((a, b) => a.data.name.localeCompare(b.data.name))
      .map((o) => `- [${o.data.name}](/organizations/${toAtsSlug(o.id)})`),
    "",
    "## Contact",
    "",
    "- Email: website@yansyah.my.id",
    "- GitHub: https://github.com/LazyGeniusMan",
  ];

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
