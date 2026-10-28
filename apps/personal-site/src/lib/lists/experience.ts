import type { ImageMetadata } from "astro";
import { getCollection } from "astro:content";
import {
  categoryLabel,
  employmentTypeLabel,
  jobLocationName,
  publishedProjects,
  toAtsSlug,
} from "../collections";
import { ORG_LOGO_BY_STEM } from "../orgLogos";
import { ymToIsoDay } from "./dates";
import type { ListGroup, ListItem, ListOption } from "./types";

export const EXPERIENCE_PATH = "/experience";
export const EXPERIENCE_PAGE_SIZE = 6;

export type ExperienceEntry = Awaited<ReturnType<typeof getExperienceEntries>>[number];

async function getExperienceEntries() {
  return getCollection("experience");
}

const stemOf = (ref: unknown): string => {
  const raw = typeof ref === "string" ? ref : (ref as { id: string }).id;
  return raw.split("/").pop() ?? raw;
};

export async function getExperienceThumbSources(
  entries: ExperienceEntry[],
): Promise<Map<string, { src: ImageMetadata; alt: string }>> {
  const orgsAll = await getCollection("organizations");
  const orgNameByStem = new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o.data.name]));
  const out = new Map<string, { src: ImageMetadata; alt: string }>();
  for (const e of entries) {
    const stem = stemOf(e.data.worksFor);
    const orgLogo = stem ? ORG_LOGO_BY_STEM[stem] : undefined;
    if (orgLogo) {
      out.set(e.id, { src: orgLogo, alt: `${orgNameByStem.get(stem) ?? stem} logo` });
      continue;
    }
    const data = e.data as unknown as { logo?: ImageMetadata; heroImage?: ImageMetadata };
    if (data.logo) {
      out.set(e.id, { src: data.logo, alt: `${e.data.roleName} logo` });
      continue;
    }
    if (data.heroImage) {
      out.set(e.id, { src: data.heroImage, alt: `${e.data.roleName} thumbnail` });
      continue;
    }
  }
  return out;
}

export const experienceMonthYear = (ym: string): string => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
};

export const experienceRange = (s: string, e?: string): string =>
  `${experienceMonthYear(s)} – ${e ? experienceMonthYear(e) : "Present"}`;

export async function getExperienceList(): Promise<{
  sorted: ExperienceEntry[];
  groups: ListGroup[];
  items: ListItem[];
  roleCount: number;
  orgNameOf: (e: ExperienceEntry) => { stem: string; name: string };
  skillStemsOf: (e: ExperienceEntry) => string[];
  skillNameByStem: Map<string, string>;
  rangeOf: (e: ExperienceEntry) => string;
}> {
  const expAll = await getExperienceEntries();
  const orgsAll = await getCollection("organizations");
  const skillsAll = await getCollection("skills");
  const projectsAll = await publishedProjects();
  const orgById = new Map(orgsAll.map((o) => [o.id, o]));
  const orgByStem = new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o]));
  const skillNameByStem = new Map(
    skillsAll.map((s) => [s.id.split("/").pop() ?? s.id, s.data.name]),
  );
  const projectNameByStem = new Map(
    projectsAll.map((p) => [p.id.split("/").pop() ?? p.id, p.data.title]),
  );

  const sorted = [...expAll].sort((a, b) => (a.data.startDate < b.data.startDate ? 1 : -1));
  const roleCount = sorted.length;

  const rangeOf = (e: ExperienceEntry): string => experienceRange(e.data.startDate, e.data.endDate);

  const orgNameOf = (e: ExperienceEntry): { stem: string; name: string } => {
    const ref = e.data.worksFor as unknown as { id: string } | string;
    const stem = stemOf(ref);
    const org = orgByStem.get(stem) ?? orgById.get(stem);
    return { stem, name: org?.data.name ?? stem };
  };

  const skillStemsOf = (e: ExperienceEntry): string[] => {
    const top = ((e.data.skills ?? []) as unknown[]).map(stemOf);
    const occ = ((e.data.occupation?.skills ?? []) as unknown[]).map(stemOf);
    return [...new Set([...top, ...occ])];
  };

  const projectStemsOf = (e: ExperienceEntry): string[] =>
    ((e.data.relatedProjects ?? []) as unknown[]).map(stemOf);

  const typeOf = (e: ExperienceEntry): string =>
    typeof e.data.employmentType === "string" && e.data.employmentType.length > 0
      ? e.data.employmentType
      : "OTHER";

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

  const skillOptions = (): ListOption[] =>
    [
      ...new Map(
        sorted.flatMap(skillStemsOf).map(
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
      key: "org",
      label: "Organization",
      options: [
        ...new Map(
          sorted.map((e) => {
            const o = orgNameOf(e);
            return [o.stem, { id: o.stem, label: o.name }] as const;
          }),
        ).values(),
      ].sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      key: "type",
      label: "Employment type",
      options: [
        ...new Map(
          sorted
            .map((e) => typeOf(e))
            .map((t) => [t, { id: t, label: employmentTypeLabel(t) }] as const),
        ).values(),
      ].sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      key: "project",
      label: "Project",
      options: opt(sorted.flatMap(projectStemsOf), projectNameByStem),
    },
    {
      key: "skill",
      label: "Skill",
      options: skillOptions(),
    },
  ].filter((g) => g.options.length > 0);

  const items: ListItem[] = sorted.map((e) => {
    const org = orgNameOf(e);
    const stems = skillStemsOf(e);
    const projs = projectStemsOf(e);
    const typeLabel = employmentTypeLabel(e.data.employmentType);
    const loc = jobLocationName(e.data.jobLocation);
    const shown = stems.slice(0, 3);
    return {
      id: e.id,
      title: e.data.roleName,
      detail: [org.name, typeLabel, loc].filter(Boolean).join(" · "),
      meta: rangeOf(e),
      href: `/experience/${toAtsSlug(e.id)}`,
      date: ymToIsoDay(e.data.startDate),
      dateEnd: e.data.endDate ? ymToIsoDay(e.data.endDate) : null,
      facets: { org: [org.stem], type: [typeOf(e)], project: projs, skill: stems },
      badges: shown.map((s) => skillNameByStem.get(s) ?? s),
      badgeHrefs: shown.map((s) => `/skills/${toAtsSlug(s)}`),
      hashBadges: false,
    };
  });

  return { sorted, groups, items, roleCount, orgNameOf, skillStemsOf, skillNameByStem, rangeOf };
}
