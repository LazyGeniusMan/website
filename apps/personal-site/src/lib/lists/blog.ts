import { getCollection } from "astro:content";
import type { ImageMetadata } from "astro";
import {
  allTags,
  categoryLabel,
  publishedPosts,
  publishedProjects,
  readingTime,
  toAtsSlug,
} from "../collections";
import { isoDay } from "./dates";
import type { ListGroup, ListItem, ListOption } from "./types";

export type { ListGroup, ListItem } from "./types";

export const BLOG_PATH = "/blog";
export const BLOG_PAGE_SIZE = 6;

const stemOf = (ref: unknown): string => {
  const raw = typeof ref === "string" ? ref : (ref as { id: string }).id;
  return raw.split("/").pop() ?? raw;
};

export const blogLangLabel = (l: string): string =>
  l === "id" ? "Bahasa Indonesia" : l === "en" ? "English" : l;

export const blogMonthYear = (d: Date): string =>
  d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export async function getBlogThumbSources(
  posts: Awaited<ReturnType<typeof publishedPosts>>,
): Promise<Map<string, { src: ImageMetadata; alt: string }>> {
  const out = new Map<string, { src: ImageMetadata; alt: string }>();
  for (const p of posts) {
    if (p.data.heroImage) {
      out.set(p.id, { src: p.data.heroImage, alt: `${p.data.title} thumbnail` });
      continue;
    }
    if (p.data.logo) {
      out.set(p.id, { src: p.data.logo, alt: `${p.data.title} logo` });
      continue;
    }
  }
  return out;
}

export function blogDateBounds(items: ListItem[]): {
  dateMin: string | null;
  dateMax: string | null;
} {
  const days = items.flatMap((i) => [i.date, i.dateEnd].filter((d): d is string => !!d)).sort();
  return { dateMin: days[0] ?? null, dateMax: days[days.length - 1] ?? null };
}

export async function getBlogList(): Promise<{
  posts: Awaited<ReturnType<typeof publishedPosts>>;
  groups: ListGroup[];
  items: ListItem[];
}> {
  const posts = await publishedPosts();
  const tags = allTags(posts);
  const cases = await publishedProjects();
  const expAll = await getCollection("experience");
  const skillsAll = await getCollection("skills");
  const personAll = await getCollection("person");

  const projectNameByStem = new Map(
    cases.map((c) => [c.id.split("/").pop() ?? c.id, c.data.title]),
  );
  const expNameByStem = new Map(
    expAll.map((e) => [e.id.split("/").pop() ?? e.id, e.data.roleName]),
  );
  const skillNameByStem = new Map(
    skillsAll.map((s) => [s.id.split("/").pop() ?? s.id, s.data.name]),
  );
  const personNameByStem = new Map(
    personAll.map((p) => [p.id.split("/").pop() ?? p.id, p.data.name]),
  );

  const aboutOf = (p: (typeof posts)[number]): string[] =>
    ((p.data.about ?? []) as unknown[]).map(stemOf);
  const aboutExpOf = (p: (typeof posts)[number]): string[] =>
    ((p.data.aboutExperience ?? []) as unknown[]).map(stemOf);
  const mentionsOf = (p: (typeof posts)[number]): string[] =>
    ((p.data.mentions ?? []) as unknown[]).map(stemOf);
  const authorOf = (p: (typeof posts)[number]): string[] =>
    ((p.data.author ?? []) as unknown[]).map(stemOf);

  const opt = (ids: string[], names: Map<string, string>, fallback?: (id: string) => string) =>
    [
      ...new Map(
        ids.map((id) => [id, { id, label: names.get(id) ?? fallback?.(id) ?? id }] as const),
      ).values(),
    ].sort((a, b) => a.label.localeCompare(b.label));

  const sentenceCase = (s: string): string =>
    s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const skillCatByStem = new Map(
    skillsAll.map((s) => [
      s.id.split("/").pop() ?? s.id,
      sentenceCase(categoryLabel(s.data.category)),
    ]),
  );

  const skillOptions = (ids: string[]): ListOption[] =>
    [
      ...new Map(
        ids.map(
          (stem) =>
            [
              stem,
              {
                id: stem,
                label: skillNameByStem.get(stem) ?? stem,
                group: skillCatByStem.get(stem) ?? "Other",
              },
            ] as const,
        ),
      ).values(),
    ].sort(
      (a, b) => (a.group ?? "").localeCompare(b.group ?? "") || a.label.localeCompare(b.label),
    );

  const groups: ListGroup[] = [
    {
      key: "about",
      label: "Project",
      options: opt(posts.flatMap(aboutOf), projectNameByStem),
    },
    {
      key: "aboutExperience",
      label: "Experience",
      options: opt(posts.flatMap(aboutExpOf), expNameByStem),
    },
    {
      key: "mentions",
      label: "Skill",
      options: skillOptions(posts.flatMap(mentionsOf)),
    },
    {
      key: "author",
      label: "Author",
      options: opt(posts.flatMap(authorOf), personNameByStem),
    },
    {
      key: "lang",
      label: "Language",
      options: [...new Set(posts.map((p) => p.data.inLanguage))]
        .sort()
        .map((l) => ({ id: l, label: blogLangLabel(l) })),
    },
    {
      key: "tag",
      label: "Topic",
      options: tags.map((t) => ({ id: t, label: `#${t}` })),
    },
  ].filter((g) => g.options.length > 0);

  const items: ListItem[] = posts.map((p) => {
    const shown = [...p.data.tags].slice(0, 3);
    const day = isoDay(p.data.pubDate);
    return {
      id: p.id,
      title: p.data.title,
      detail: p.data.description,
      meta: `${blogMonthYear(p.data.pubDate)} · ${readingTime(p.body ?? "")} min · ${blogLangLabel(p.data.inLanguage)}`,
      href: `/blog/${toAtsSlug(p.id)}`,
      date: day,
      dateEnd: day,
      facets: {
        about: aboutOf(p),
        aboutExperience: aboutExpOf(p),
        mentions: mentionsOf(p),
        author: authorOf(p),
        lang: [p.data.inLanguage],
        tag: [...p.data.tags],
      },
      badges: shown,
      badgeHrefs: shown.map((t) => `/blog/tag/${toAtsSlug(t)}`),
      hashBadges: true,
    };
  });

  return { posts, groups, items };
}

export async function getBlogTagList(tagSlug: string): Promise<{
  tagged: Awaited<ReturnType<typeof publishedPosts>>;
  groups: ListGroup[];
  items: ListItem[];
}> {
  const posts = await publishedPosts();
  const tagged = posts.filter((p) => p.data.tags.some((t) => toAtsSlug(t) === tagSlug));
  const cases = await publishedProjects();
  const expAll = await getCollection("experience");
  const skillsAll = await getCollection("skills");
  const personAll = await getCollection("person");

  const projectNameByStem = new Map(
    cases.map((c) => [c.id.split("/").pop() ?? c.id, c.data.title]),
  );
  const expNameByStem = new Map(
    expAll.map((e) => [e.id.split("/").pop() ?? e.id, e.data.roleName]),
  );
  const skillNameByStem = new Map(
    skillsAll.map((s) => [s.id.split("/").pop() ?? s.id, s.data.name]),
  );
  const personNameByStem = new Map(
    personAll.map((p) => [p.id.split("/").pop() ?? p.id, p.data.name]),
  );

  const aboutOf = (p: (typeof tagged)[number]): string[] =>
    ((p.data.about ?? []) as unknown[]).map(stemOf);
  const aboutExpOf = (p: (typeof tagged)[number]): string[] =>
    ((p.data.aboutExperience ?? []) as unknown[]).map(stemOf);
  const mentionsOf = (p: (typeof tagged)[number]): string[] =>
    ((p.data.mentions ?? []) as unknown[]).map(stemOf);
  const authorOf = (p: (typeof tagged)[number]): string[] =>
    ((p.data.author ?? []) as unknown[]).map(stemOf);

  const opt = (ids: string[], names: Map<string, string>) =>
    [...new Map(ids.map((id) => [id, { id, label: names.get(id) ?? id }] as const)).values()].sort(
      (a, b) => a.label.localeCompare(b.label),
    );

  const sentenceCase = (s: string): string =>
    s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const skillCatByStem = new Map(
    skillsAll.map((s) => [
      s.id.split("/").pop() ?? s.id,
      sentenceCase(categoryLabel(s.data.category)),
    ]),
  );

  const skillOptions = (ids: string[]): ListOption[] =>
    [
      ...new Map(
        ids.map(
          (stem) =>
            [
              stem,
              {
                id: stem,
                label: skillNameByStem.get(stem) ?? stem,
                group: skillCatByStem.get(stem) ?? "Other",
              },
            ] as const,
        ),
      ).values(),
    ].sort(
      (a, b) => (a.group ?? "").localeCompare(b.group ?? "") || a.label.localeCompare(b.label),
    );

  const groups: ListGroup[] = [
    {
      key: "about",
      label: "Project",
      options: opt(tagged.flatMap(aboutOf), projectNameByStem),
    },
    {
      key: "aboutExperience",
      label: "Experience",
      options: opt(tagged.flatMap(aboutExpOf), expNameByStem),
    },
    {
      key: "mentions",
      label: "Skill",
      options: skillOptions(tagged.flatMap(mentionsOf)),
    },
    {
      key: "author",
      label: "Author",
      options: opt(tagged.flatMap(authorOf), personNameByStem),
    },
    {
      key: "lang",
      label: "Language",
      options: [...new Set(tagged.map((p) => p.data.inLanguage))]
        .sort()
        .map((l) => ({ id: l, label: blogLangLabel(l) })),
    },
  ].filter((g) => g.options.length > 0);

  const items: ListItem[] = tagged.map((p) => {
    const shown = [...p.data.tags].slice(0, 3);
    const day = isoDay(p.data.pubDate);
    return {
      id: p.id,
      title: p.data.title,
      detail: p.data.description,
      meta: `${blogMonthYear(p.data.pubDate)} · ${readingTime(p.body ?? "")} min · ${blogLangLabel(p.data.inLanguage)}`,
      href: `/blog/${toAtsSlug(p.id)}`,
      date: day,
      dateEnd: day,
      facets: {
        about: aboutOf(p),
        aboutExperience: aboutExpOf(p),
        mentions: mentionsOf(p),
        author: authorOf(p),
        lang: [p.data.inLanguage],
      },
      badges: shown,
      badgeHrefs: shown.map((t) => `/blog/tag/${toAtsSlug(t)}`),
      hashBadges: true,
    };
  });

  return { tagged, groups, items };
}
