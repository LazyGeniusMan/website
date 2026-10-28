import type { APIRoute } from "astro";
import { allTags, publishedPosts, publishedProjects, toAtsSlug } from "../lib/collections";
import { getCollection } from "astro:content";

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.toString().replace(/\/$/, "") ?? "https://yansyah.my.id";
  const posts = await publishedPosts();
  const projects = await publishedProjects();
  const tags = allTags(posts);
  const expAll = await getCollection("experience");
  const skillsAll = await getCollection("skills");
  const credsAll = await getCollection("credentials");
  const eduAll = await getCollection("education");
  const orgsAll = await getCollection("organizations");

  const lastmod = new Date().toISOString().slice(0, 10);
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: "/" },
    { loc: "/about" },
    { loc: "/projects" },
    ...projects.map((w) => ({ loc: `/projects/${toAtsSlug(w.id)}` })),
    { loc: "/experience" },
    ...expAll.map((e) => ({ loc: `/experience/${toAtsSlug(e.id)}` })),
    { loc: "/skills" },
    ...skillsAll.map((s) => ({ loc: `/skills/${toAtsSlug(s.id)}` })),
    { loc: "/blog" },
    ...posts.map((p) => ({ loc: `/blog/${toAtsSlug(p.id)}` })),
    ...tags.map((t) => ({ loc: `/blog/tag/${toAtsSlug(t)}` })),
    { loc: "/certifications" },
    ...credsAll.map((c) => ({
      loc: `/certifications/${toAtsSlug(c.data.publicSlug ?? c.id.split("/").pop() ?? c.id)}`,
    })),
    { loc: "/organizations" },
    ...orgsAll.map((o) => ({ loc: `/organizations/${toAtsSlug(o.id)}` })),
    { loc: "/education" },
    ...eduAll.map((e) => ({
      loc: `/education/${toAtsSlug(e.data.publicSlug ?? e.id.split("/").pop() ?? e.id)}`,
    })),
    { loc: "/contact" },
    { loc: "/cv" },
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${siteUrl}${u.loc}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`;

  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
