import type { ImageMetadata } from "astro";
import { getCollection } from "astro:content";
import { categoryLabel, credentialDisplay, toAtsSlug } from "../collections";
import { ORG_LOGO_BY_STEM } from "../orgLogos";
import { isoDay } from "./dates";
import type { ListGroup, ListItem, ListOption } from "./types";

export const CERTIFICATIONS_PATH = "/certifications";
export const CERTIFICATIONS_PAGE_SIZE = 6;

export type CredentialEntry = Awaited<ReturnType<typeof getCredentialEntries>>[number];

async function getCredentialEntries() {
  return getCollection("credentials");
}

const stemOf = (ref: unknown): string => {
  const raw = typeof ref === "string" ? ref : (ref as { id: string }).id;
  return raw.split("/").pop() ?? raw;
};

export const certSlugOf = (c: CredentialEntry): string =>
  toAtsSlug(c.data.publicSlug ?? stemOf(c.id));

export const certCategoryOf = (c: CredentialEntry): string =>
  typeof c.data.credentialCategory === "string" && c.data.credentialCategory.length > 0
    ? c.data.credentialCategory
    : "certificate";

export const certCategoryLabel = (c: string): string =>
  c === "degree" ? "Education" : c.charAt(0).toUpperCase() + c.slice(1);

export const certYearOf = (c: CredentialEntry): string =>
  c.data.dateCreated ? (c.data.dateCreated as Date).getFullYear().toString() : "";

export const certMonthYear = (d: Date): string =>
  d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export async function getCertThumbSources(
  creds: CredentialEntry[],
): Promise<Map<string, { src: ImageMetadata; alt: string }>> {
  const orgsAll = await getCollection("organizations");
  const orgByStem = new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o]));
  const orgNameByStem = new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o.data.name]));
  const out = new Map<string, { src: ImageMetadata; alt: string }>();
  for (const c of creds) {
    const rec = c.data.recognizedBy as unknown as { id: string } | string | undefined;
    const stem = rec ? stemOf(rec) : "";
    const bundled = stem ? ORG_LOGO_BY_STEM[stem] : undefined;
    const orgEntryLogo = stem
      ? (orgByStem.get(stem)?.data as unknown as { logo?: ImageMetadata } | undefined)?.logo
      : undefined;
    const orgLogo = bundled ?? orgEntryLogo;
    if (orgLogo) {
      out.set(c.id, { src: orgLogo, alt: `${orgNameByStem.get(stem) ?? stem} logo` });
      continue;
    }
    const data = c.data as unknown as { logo?: ImageMetadata; heroImage?: ImageMetadata };
    if (data.logo) {
      out.set(c.id, { src: data.logo, alt: `${c.data.name} logo` });
      continue;
    }
    if (data.heroImage) {
      out.set(c.id, { src: data.heroImage, alt: `${c.data.name} thumbnail` });
      continue;
    }
  }
  return out;
}

export async function getCertificationsList(): Promise<{
  credsAll: CredentialEntry[];
  groups: ListGroup[];
  items: ListItem[];
  issuerOf: (c: CredentialEntry) => { stem: string; name: string } | null;
  aboutOf: (c: CredentialEntry) => string[];
  skillNameByStem: Map<string, string>;
}> {
  const unsorted = await getCredentialEntries();
  const credsAll = [...unsorted].sort((a, b) => {
    const at = a.data.dateCreated ? +(a.data.dateCreated as Date) : 0;
    const bt = b.data.dateCreated ? +(b.data.dateCreated as Date) : 0;
    return bt - at || a.data.name.localeCompare(b.data.name);
  });
  const orgsAll = await getCollection("organizations");
  const skillsAll = await getCollection("skills");
  const orgByStem = new Map(orgsAll.map((o) => [o.id.split("/").pop() ?? o.id, o]));
  const skillNameByStem = new Map(
    skillsAll.map((s) => [s.id.split("/").pop() ?? s.id, s.data.name]),
  );

  const issuerOf = (c: CredentialEntry): { stem: string; name: string } | null => {
    const rec = c.data.recognizedBy as unknown as { id: string } | string | undefined;
    if (!rec) return null;
    const stem = stemOf(rec);
    return { stem, name: orgByStem.get(stem)?.data.name ?? stem };
  };
  const aboutOf = (c: CredentialEntry): string[] =>
    ((c.data.about ?? []) as unknown[]).map((r) => stemOf(r as { id: string }));

  const hasVerifiable = credsAll.some((c) => !!c.data.url);
  const hasReference = credsAll.some((c) => !c.data.url);

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
        credsAll.flatMap(aboutOf).map(
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
      key: "category",
      label: "Category",
      options: [
        ...new Map(
          credsAll
            .map((c) => certCategoryOf(c))
            .map((cat) => [cat, { id: cat, label: certCategoryLabel(cat) }] as const),
        ).values(),
      ].sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      key: "issuer",
      label: "Issuer",
      options: [
        ...new Map(
          credsAll
            .map(issuerOf)
            .filter((i): i is NonNullable<typeof i> => !!i)
            .map((i) => [i.stem, { id: i.stem, label: i.name }] as const),
        ).values(),
      ].sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      key: "skill",
      label: "Skill",
      options: skillOptions(),
    },
    ...(hasVerifiable || hasReference
      ? [
          {
            key: "verify",
            label: "Verification",
            options: [
              ...(hasVerifiable ? [{ id: "verifiable", label: "Verifiable" } as const] : []),
              ...(hasReference ? [{ id: "reference", label: "Reference only" } as const] : []),
            ],
          },
        ]
      : []),
  ].filter((g) => g.options.length > 0);

  const items: ListItem[] = credsAll.map((c) => {
    const issuer = issuerOf(c);
    const about = aboutOf(c);
    const shown = about.slice(0, 3);
    const monthYear = c.data.dateCreated
      ? certMonthYear(c.data.dateCreated as Date)
      : certYearOf(c);
    return {
      id: c.id,
      title: c.data.name,
      detail: [
        credentialDisplay(c.data.credentialCategory),
        issuer ? `Recognized by ${issuer.name}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      meta: [
        monthYear,
        c.data.credentialId ? `ID ${c.data.credentialId}` : "",
        c.data.url ? "Verifiable" : "",
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/certifications/${certSlugOf(c)}`,
      date: c.data.dateCreated ? isoDay(c.data.dateCreated as Date) : undefined,
      dateEnd: c.data.validUntil ? isoDay(c.data.validUntil as Date) : null,
      facets: {
        category: [certCategoryOf(c)],
        issuer: issuer ? [issuer.stem] : [],
        skill: about,
        verify: [c.data.url ? "verifiable" : "reference"],
      },
      badges: shown.map((s) => skillNameByStem.get(s) ?? s),
      badgeHrefs: shown.map((s) => `/skills/${toAtsSlug(s)}`),
      hashBadges: false,
    };
  });

  return { credsAll, groups, items, issuerOf, aboutOf, skillNameByStem };
}
