import type { ImageMetadata } from "astro";
import { getCollection } from "astro:content";
import { categoryLabel, toAtsSlug } from "../collections";
import { ORG_LOGO_BY_STEM } from "../orgLogos";
import { ymToIsoDay } from "./dates";
import type { ListGroup, ListItem, ListOption } from "./types";

export const EDUCATION_PATH = "/education";
export const EDUCATION_PAGE_SIZE = 6;

export type EducationEntry = Awaited<ReturnType<typeof getEducationEntries>>[number];

async function getEducationEntries() {
  return getCollection("education");
}

const stemOf = (ref: unknown): string => {
  const raw = typeof ref === "string" ? ref : (ref as { id: string }).id;
  return raw.split("/").pop() ?? raw;
};

export const eduYear = (ym?: string): string => {
  if (!ym) return "";
  if (/^\d{4}$/.test(ym)) return ym;
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const eduRangeOf = (e: EducationEntry): string =>
  [eduYear(e.data.startDate), e.data.endDate ? eduYear(e.data.endDate) : "Present"]
    .filter(Boolean)
    .join(" – ");

export const eduLevelOf = (e: EducationEntry): string =>
  typeof e.data.educationalLevel === "string" && e.data.educationalLevel.length > 0
    ? e.data.educationalLevel
    : "Degree";

export const eduIdOf = (e: EducationEntry): string =>
  toAtsSlug(e.data.publicSlug ?? e.id.split("/").pop() ?? e.id);

export const eduDeptStemOf = (e: EducationEntry): string | null =>
  e.data.department ? stemOf(e.data.department) : null;

export const eduSkillStemsOf = (e: EducationEntry): string[] =>
  ((e.data.about ?? []) as unknown[]).map((r) => stemOf(r as { id: string }));

export async function getEducationThumbSources(
  eduAll: EducationEntry[],
): Promise<Map<string, { src: ImageMetadata; alt: string }>> {
  const orgsAll = await getCollection("organizations");
  const orgByStem = new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o]));
  const orgNameByStem = new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o.data.name]));
  const out = new Map<string, { src: ImageMetadata; alt: string }>();
  for (const e of eduAll) {
    const stem = stemOf(e.data.recognizedBy);
    const bundled = stem ? ORG_LOGO_BY_STEM[stem] : undefined;
    const orgEntryLogo = stem
      ? (orgByStem.get(stem)?.data as unknown as { logo?: ImageMetadata } | undefined)?.logo
      : undefined;
    const orgLogo = bundled ?? orgEntryLogo;
    if (orgLogo) {
      out.set(eduIdOf(e), { src: orgLogo, alt: `${orgNameByStem.get(stem) ?? stem} logo` });
      continue;
    }
    const data = e.data as unknown as { logo?: ImageMetadata; heroImage?: ImageMetadata };
    if (data.logo) {
      out.set(eduIdOf(e), { src: data.logo, alt: `${e.data.name} logo` });
      continue;
    }
    if (data.heroImage) {
      out.set(eduIdOf(e), { src: data.heroImage, alt: `${e.data.name} thumbnail` });
      continue;
    }
  }
  return out;
}

export async function getEducationList(): Promise<{
  eduAll: EducationEntry[];
  groups: ListGroup[];
  items: ListItem[];
  orgNameOf: (stem: string) => string;
  skillNameByStem: Map<string, string>;
}> {
  const unsorted = await getEducationEntries();
  const eduAll = [...unsorted].sort((a, b) => {
    const sa = a.data.startDate ?? "";
    const sb = b.data.startDate ?? "";
    if (sa === sb) return a.id.localeCompare(b.id);
    if (!sa) return 1;
    if (!sb) return -1;
    return sa < sb ? 1 : -1;
  });
  const orgsAll = await getCollection("organizations");
  const skillsAll = await getCollection("skills");
  const orgByStem = new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o]));
  const orgNameOf = (stem: string): string => orgByStem.get(stem)?.data.name ?? stem;
  const skillNameByStem = new Map(
    skillsAll.map((s) => [s.id.split("/").pop() ?? s.id, s.data.name]),
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
        eduAll.flatMap(eduSkillStemsOf).map(
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
      key: "issuer",
      label: "Institution",
      options: [
        ...new Map(
          eduAll
            .map((e) => stemOf(e.data.recognizedBy))
            .map((stem) => [stem, { id: stem, label: orgNameOf(stem) }] as const),
        ).values(),
      ].sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      key: "department",
      label: "Department",
      options: [
        ...new Map(
          eduAll
            .map(eduDeptStemOf)
            .filter((s): s is string => !!s)
            .map((stem) => [stem, { id: stem, label: orgNameOf(stem) }] as const),
        ).values(),
      ].sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      key: "level",
      label: "Level",
      options: [
        ...new Map(
          eduAll.map((e) => eduLevelOf(e)).map((lv) => [lv, { id: lv, label: lv }] as const),
        ).values(),
      ].sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      key: "skill",
      label: "Skill",
      options: skillOptions(),
    },
  ].filter((g) => g.options.length > 0);

  const items: ListItem[] = eduAll.map((e) => {
    const stem = stemOf(e.data.recognizedBy);
    const deptStem = eduDeptStemOf(e);
    const skills = eduSkillStemsOf(e);
    const level = eduLevelOf(e);
    return {
      id: eduIdOf(e),
      title: e.data.name,
      detail: (e.data.description ?? e.data.name).slice(0, 140),
      meta: [level, orgNameOf(stem), deptStem ? orgNameOf(deptStem) : "", eduRangeOf(e)]
        .filter(Boolean)
        .join(" · "),
      href: `/education/${eduIdOf(e)}`,
      date: e.data.startDate ? ymToIsoDay(e.data.startDate) : undefined,
      dateEnd: e.data.endDate ? ymToIsoDay(e.data.endDate) : null,
      facets: {
        issuer: [stem],
        department: deptStem ? [deptStem] : [],
        level: [level],
        skill: skills,
      },
      badges: [
        ...(e.data.educationalLevel ? [e.data.educationalLevel] : []),
        ...skills.slice(0, 3).map((s) => skillNameByStem.get(s) ?? s),
      ],
      badgeHrefs: [
        ...(e.data.educationalLevel ? [null] : []),
        ...skills.slice(0, 3).map((s) => `/skills/${toAtsSlug(s)}`),
      ],
      hashBadges: false,
    };
  });

  return { eduAll, groups, items, orgNameOf, skillNameByStem };
}
