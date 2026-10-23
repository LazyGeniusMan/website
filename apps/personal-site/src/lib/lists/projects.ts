import type { ImageMetadata } from "astro";
import { getCollection } from "astro:content";
import {
  categoryLabel,
  publishedProjects,
  roleFallback,
  toAtsSlug,
  verificationLabel,
} from "../collections";
import { ORG_LOGO_BY_STEM } from "../orgLogos";
import { isoDay, ymToIsoDay } from "./dates";
import type { ListGroup, ListItem, ListOption } from "./types";

export const projectMonthYear = (d: Date): string =>
  d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export async function getProjectThumbSources(
  cases: ProjectEntry[],
): Promise<Map<string, { src: ImageMetadata; alt: string }>> {
  const orgsAll = await getCollection("organizations");
  const orgNameByStem = new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o.data.name]));
  const out = new Map<string, { src: ImageMetadata; alt: string }>();
  for (const c of cases) {
    const data = c.data as unknown as { logo?: ImageMetadata; heroImage?: ImageMetadata };
    if (data.heroImage) {
      out.set(c.id, { src: data.heroImage, alt: `${c.data.title} thumbnail` });
      continue;
    }
    if (data.logo) {
      out.set(c.id, { src: data.logo, alt: `${c.data.title} logo` });
      continue;
    }
    const ref = (c.data.provider ?? c.data.isPartOf) as unknown as
      | { id: string }
      | string
      | undefined;
    const stem = ref ? stemOf(ref) : "";
    const logo = stem ? ORG_LOGO_BY_STEM[stem] : undefined;
    if (logo) {
      out.set(c.id, { src: logo, alt: `${orgNameByStem.get(stem) ?? stem} logo` });
    }
  }
  return out;
}

export const PROJECTS_PATH = "/projects";
export const PROJECTS_PAGE_SIZE = 6;

export type ProjectEntry = Awaited<ReturnType<typeof publishedProjects>>[number];

const stemOf = (ref: unknown): string => {
  const raw = typeof ref === "string" ? ref : (ref as { id: string }).id;
  return raw.split("/").pop() ?? raw;
};

export function projectDateRange(data: {
  pubDate: Date;
  dateCreated?: Date;
  startDate?: string;
  endDate?: string;
}): { date: string; dateEnd: string | null } {
  const starts = [isoDay(data.pubDate)];
  if (data.dateCreated) starts.push(isoDay(data.dateCreated));
  if (data.startDate) starts.push(ymToIsoDay(data.startDate));
  starts.sort();
  return {
    date: starts[0],
    dateEnd: data.endDate ? ymToIsoDay(data.endDate) : null,
  };
}

export async function getProjectsList(): Promise<{
  cases: ProjectEntry[];
  groups: ListGroup[];
  items: ListItem[];
  projectCount: number;
  providerOf: (c: ProjectEntry) => { stem: string; name: string } | null;
  partOfOf: (c: ProjectEntry) => { stem: string; name: string } | null;
  skillNamesOf: (c: ProjectEntry) => string[];
}> {
  const cases = await publishedProjects();
  const projectCount = cases.length;
  const skillsAll = await getCollection("skills");
  const orgsAll = await getCollection("organizations");
  const expAll = await getCollection("experience");
  const personAll = await getCollection("person");

  const skillNameByStem = new Map(
    skillsAll.map((s) => [s.id.split("/").pop() ?? s.id, s.data.name]),
  );
  const orgByStem = new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o]));

  const orgNameOf = (stem: string): string => orgByStem.get(stem)?.data.name ?? stem;

  const providerOf = (c: ProjectEntry): { stem: string; name: string } | null => {
    const ref = c.data.provider as unknown as { id: string } | string | undefined;
    if (!ref) return null;
    const stem = stemOf(ref);
    return { stem, name: orgNameOf(stem) };
  };

  const partOfOf = (c: ProjectEntry): { stem: string; name: string } | null => {
    const ref = c.data.isPartOf as unknown as { id: string } | string | undefined;
    if (!ref) return null;
    const stem = stemOf(ref);
    return { stem, name: orgNameOf(stem) };
  };

  const orgOf = (c: ProjectEntry): { stem: string; name: string } | null =>
    providerOf(c) ?? partOfOf(c);

  const skillStemsOf = (c: ProjectEntry): string[] =>
    ((c.data.programmingLanguage ?? []) as unknown[]).map(stemOf);

  const expStemsOf = (c: ProjectEntry): string[] =>
    ((c.data.relatedExperience ?? []) as unknown[]).map(stemOf);

  const tagStemsOf = (c: ProjectEntry): string[] => [...c.data.tags];

  const skillNamesOf = (c: ProjectEntry): string[] =>
    skillStemsOf(c).map((s) => skillNameByStem.get(s) ?? s);

  const sentenceCase = (s: string): string =>
    s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const skillCatByStem = new Map(
    skillsAll.map((s) => [
      s.id.split("/").pop() ?? s.id,
      sentenceCase(categoryLabel(s.data.category)),
    ]),
  );

  const skillOptions = (): ListOption[] =>
    [...skillsAll]
      .map((s): ListOption => {
        const id = s.id.split("/").pop() ?? s.id;
        return {
          id,
          label: s.data.name,
          group: skillCatByStem.get(id) ?? "Other",
        };
      })
      .sort(
        (a, b) => (a.group ?? "").localeCompare(b.group ?? "") || a.label.localeCompare(b.label),
      );

  const opt = (ids: string[], names: Map<string, string>) =>
    [...new Map(ids.map((id) => [id, { id, label: names.get(id) ?? id }] as const)).values()].sort(
      (a, b) => a.label.localeCompare(b.label),
    );

  const authorStemsOf = (c: ProjectEntry): string[] =>
    ((c.data.author ?? []) as unknown[]).map(stemOf);

  const partOfStemsOf = (c: ProjectEntry): string[] => {
    const p = partOfOf(c);
    return p ? [p.stem] : [];
  };

  const providerStemsOf = (c: ProjectEntry): string[] => {
    const p = providerOf(c);
    return p ? [p.stem] : [];
  };

  const personNameByStem = new Map(
    personAll.map((p) => [p.id.split("/").pop() ?? p.id, p.data.name]),
  );

  const groups: ListGroup[] = [
    {
      key: "skill",
      label: "Skills",
      options: skillOptions(),
    },
    {
      key: "provider",
      label: "Provider",
      options: opt(
        cases.flatMap(providerStemsOf),
        new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o.data.name])),
      ),
    },
    {
      key: "author",
      label: "Author",
      options: opt(cases.flatMap(authorStemsOf), personNameByStem),
    },
    {
      key: "isPartOf",
      label: "Part of",
      options: opt(
        cases.flatMap(partOfStemsOf),
        new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o.data.name])),
      ),
    },
    {
      key: "relatedExperience",
      label: "Related experience",
      options: opt(
        cases.flatMap(expStemsOf),
        new Map(expAll.map((e) => [e.id.split("/").pop() ?? e.id, e.data.roleName])),
      ),
    },
    {
      key: "tag",
      label: "Topic",
      options: opt(
        cases.flatMap(tagStemsOf),
        new Map(cases.flatMap(tagStemsOf).map((t) => [t, `#${t}`] as const)),
      ),
    },
  ].filter((g) => g.options.length > 0);

  const items: ListItem[] = cases.map((c) => {
    const langs = skillStemsOf(c);
    const org = orgOf(c);
    const exps = expStemsOf(c);
    const shown = [...c.data.tags].slice(0, 3);
    const { date, dateEnd } = projectDateRange(c.data);
    const langNames = langs.map((s) => skillNameByStem.get(s) ?? s);
    const verified = c.data.verificationStatus ? verificationLabel(c.data.verificationStatus) : "";
    return {
      id: c.id,
      title: c.data.title,
      detail: c.data.outcome ?? c.data.description,
      meta: [
        roleFallback(c.data.role),
        org?.name,
        projectMonthYear(c.data.pubDate),
        langNames.length ? langNames.join(", ") : "",
        verified,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/projects/${toAtsSlug(c.id)}`,
      date,
      dateEnd,
      facets: {
        skill: langs,
        provider: providerStemsOf(c),
        author: authorStemsOf(c),
        isPartOf: partOfStemsOf(c),
        relatedExperience: exps,
        tag: tagStemsOf(c),
      },
      badges: shown,
      badgeHrefs: shown.map(() => null),
      hashBadges: true,
    };
  });

  return { cases, groups, items, providerOf, partOfOf, skillNamesOf, projectCount };
}

export type ProjectsList = Awaited<ReturnType<typeof getProjectsList>>;
