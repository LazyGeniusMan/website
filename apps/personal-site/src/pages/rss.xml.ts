import type { APIRoute } from "astro";
import { publishedPosts, toAtsSlug } from "../lib/collections";

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.toString().replace(/\/$/, "") ?? "https://yansyah.my.id";
  const posts = await publishedPosts();

  const items = posts
    .map(
      (p) =>
        `    <item>\n      <title>${escapeXml(p.data.title)}</title>\n      <link>${siteUrl}/blog/${toAtsSlug(p.id)}</link>\n      <guid>${siteUrl}/blog/${toAtsSlug(p.id)}</guid>\n      <pubDate>${p.data.pubDate.toUTCString()}</pubDate>\n      <description>${escapeXml(p.data.description)}</description>\n    </item>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Andriyansyah Nurrachman - Blog</title>\n    <link>${siteUrl}/blog</link>\n    <description>Short notes on BPMN, accounting systems, and automation.</description>\n${items}\n  </channel>\n</rss>\n`;

  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
