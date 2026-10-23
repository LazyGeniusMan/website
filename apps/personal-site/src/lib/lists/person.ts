import type { ImageMetadata } from "astro";
import { getCollection } from "astro:content";
import {
  categoryLabel,
  employmentTypeLabel,
  getResume,
  jobLocationName,
  proficiencyLabel,
  publishedPosts,
  publishedProjects,
  roleFallback,
  toAtsSlug,
} from "../collections";
import { ORG_LOGO_BY_STEM } from "../orgLogos";
import { isoDay, ymToIsoDay } from "./dates";
import type { ListGroup, ListItem } from "./types";

export type PersonFacetKey = "org" | "skill" | "exp" | "project";

export type PersonKind =
  | "skill"
  | "experience"
  | "education"
  | "credential"
  | "project"
  | "post"
  | "org";

export interface PersonItem extends ListItem {
  kind: PersonKind;
  stem: string;
  facets: Record<PersonFacetKey, string[]>;
  text: string;
  group?: string;
}

export interface PersonSection {
  key: string;
  title: string;
  blurb: string;
  items: PersonItem[];
}

export interface PersonFilterIndex {
  facets: Record<PersonFacetKey, string[]>;
  date?: string;
  dateEnd?: string | null;
  text: string;
}

const stemOf = (ref: unknown): string => {
  const raw = typeof ref === "string" ? ref : (ref as { id: string }).id;
  return raw.split("/").pop() ?? raw;
};

const stemsOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).map(stemOf);
};

const entryStem = (id: string): string => id.split("/").pop() ?? id;

const indexKey = (kind: PersonKind, stem: string): string => `${kind}:${stem}`;

const textOf = (parts: (string | undefined | null)[]): string =>
  parts
    .filter((p): p is string => !!p)
    .join(" ")
    .toLowerCase();

const monthYear = (ym: string): string => {
  if (/^\d{4}$/.test(ym)) return ym;
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
};

const rangeOf = (s?: string, e?: string): string => {
  if (!s) return "";
  return `${monthYear(s)} – ${e ? monthYear(e) : "Present"}`;
};

const emptyFacets = (): Record<PersonFacetKey, string[]> => ({
  org: [],
  skill: [],
  exp: [],
  project: [],
});

export async function getPersonRelations(): Promise<{
  personId: string;
  personName: string;
  groups: ListGroup[];
  sections: PersonSection[];
  thumbs: Map<string, { src: ImageMetadata; alt: string }>;
  index: Map<string, PersonFilterIndex>;
  counts: {
    skills: number;
    experience: number;
    credentials: number;
    projects: number;
    posts: number;
  };
  dateMin: string | null;
  dateMax: string | null;
}> {
  const resume = await getResume();
  const projectsAll = await publishedProjects();
  const postsAll = await publishedPosts();
  const orgsAll = await getCollection("organizations");

  const orgByStem = new Map(orgsAll.map((o) => [entryStem(o.id), o]));
  const orgName = (stem: string): string => orgByStem.get(stem)?.data.name ?? stem;
  const skillByStem = new Map(resume.skills.map((s) => [entryStem(s.id), s]));
  const skillName = (stem: string): string => skillByStem.get(stem)?.data.name ?? stem;
  const expByStem = new Map(resume.experience.map((e) => [entryStem(e.id), e]));
  const expStems = new Set(expByStem.keys());

  const expSkillStems = (expId: string): string[] => {
    const e = expByStem.get(expId);
    if (!e) return [];
    return [
      ...new Set([
        ...stemsOf(e.data.skills),
        ...stemsOf((e.data.occupation as { skills?: unknown } | undefined)?.skills),
      ]),
    ];
  };

  const relatedProjects = projectsAll.filter((p) => {
    const stem = entryStem(p.id);
    if (((p.data.author ?? []) as unknown[]).map(stemOf).includes("andriyansyah")) return true;
    const relExp = stemsOf((p.data as { relatedExperience?: unknown }).relatedExperience);
    if (relExp.some((s) => expStems.has(s))) return true;
    return resume.experience.some((e) =>
      stemsOf((e.data as { relatedProjects?: unknown }).relatedProjects).includes(stem),
    );
  });
  const relatedProjectStems = new Set(relatedProjects.map((p) => entryStem(p.id)));

  const projectsOfExp = new Map<string, string[]>();
  for (const e of resume.experience) {
    const stem = entryStem(e.id);
    const out = new Set<string>();
    for (const s of stemsOf((e.data as { relatedProjects?: unknown }).relatedProjects)) {
      if (relatedProjectStems.has(s)) out.add(s);
    }
    for (const p of relatedProjects) {
      const relExp = stemsOf((p.data as { relatedExperience?: unknown }).relatedExperience);
      if (relExp.includes(stem)) out.add(entryStem(p.id));
    }
    projectsOfExp.set(stem, [...out]);
  }

  const personSkillStems = new Set(resume.skills.map((s) => entryStem(s.id)));
  const relatedPosts = postsAll.filter((p) => {
    const data = p.data as {
      author?: unknown;
      about?: unknown;
      aboutExperience?: unknown;
      mentions?: unknown;
    };
    if (stemsOf(data.author).includes("andriyansyah")) return true;
    if (stemsOf(data.aboutExperience).some((s) => expStems.has(s))) return true;
    if (stemsOf(data.about).some((s) => relatedProjectStems.has(s))) return true;
    if (stemsOf(data.mentions).some((s) => personSkillStems.has(s))) return true;
    return false;
  });

  const expsOfSkill = new Map<string, string[]>();
  const projectsOfSkill = new Map<string, string[]>();
  for (const s of resume.skills) {
    const stem = entryStem(s.id);
    expsOfSkill.set(
      stem,
      resume.experience
        .filter((e) => expSkillStems(entryStem(e.id)).includes(stem))
        .map((e) => entryStem(e.id)),
    );
    projectsOfSkill.set(
      stem,
      relatedProjects
        .filter((p) => stemsOf(p.data.programmingLanguage).includes(stem))
        .map((p) => entryStem(p.id)),
    );
  }

  const credSlugOf = (stem: string): string => {
    const c = resume.credentials.find((cc) => entryStem(cc.id) === stem);
    const pub = (c?.data as { publicSlug?: string } | undefined)?.publicSlug;
    return toAtsSlug(pub ?? stem);
  };

  const thumbs = new Map<string, { src: ImageMetadata; alt: string }>();
  const putThumb = (id: string, src: ImageMetadata | undefined, alt: string): void => {
    if (src) thumbs.set(id, { src, alt });
  };
  const orgThumb = (stem: string): ImageMetadata | undefined => {
    if (ORG_LOGO_BY_STEM[stem]) return ORG_LOGO_BY_STEM[stem];
    const logo = (orgByStem.get(stem)?.data as { logo?: ImageMetadata } | undefined)?.logo;
    return logo;
  };

  const skillItems: PersonItem[] = resume.skills.map((s) => {
    const stem = entryStem(s.id);
    const id = indexKey("skill", stem);
    const facets = emptyFacets();
    facets.skill = [stem];
    facets.exp = expsOfSkill.get(stem) ?? [];
    facets.project = projectsOfSkill.get(stem) ?? [];
    const badges = [
      ...(expsOfSkill.get(stem) ?? [])
        .slice(0, 1)
        .map((st) => expByStem.get(st)?.data.roleName ?? st),
      ...(projectsOfSkill.get(stem) ?? [])
        .slice(0, 2)
        .map((st) => relatedProjects.find((p) => entryStem(p.id) === st)?.data.title ?? st),
    ].slice(0, 3);
    const item: PersonItem = {
      id,
      kind: "skill",
      stem,
      title: s.data.name,
      detail: s.data.description ?? s.data.name,
      meta: [
        categoryLabel(s.data.category),
        s.data.proficiencyLevel ? proficiencyLabel(s.data.proficiencyLevel) : "",
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/skills/${toAtsSlug(stem)}`,
      facets,
      text: textOf([
        s.data.name,
        s.data.alternateName,
        s.data.description,
        categoryLabel(s.data.category),
      ]),
      group: categoryLabel(s.data.category),
      badges,
      badgeHrefs: badges.map(() => null),
    };
    const logo = (s.data as { logo?: ImageMetadata }).logo;
    putThumb(id, logo, `${s.data.name} logo`);
    return item;
  });

  const experienceItems: PersonItem[] = resume.experience.map((e) => {
    const stem = entryStem(e.id);
    const id = indexKey("experience", stem);
    const orgStem = stemOf(e.data.worksFor);
    const skills = expSkillStems(stem);
    const projects = projectsOfExp.get(stem) ?? [];
    const facets = emptyFacets();
    facets.org = [orgStem];
    facets.skill = skills;
    facets.exp = [stem];
    facets.project = projects;
    const emp = employmentTypeLabel(e.data.employmentType);
    const loc = jobLocationName(e.data.jobLocation);
    const item: PersonItem = {
      id,
      kind: "experience",
      stem,
      title: e.data.roleName,
      detail: `${orgName(orgStem)}${emp ? ` · ${emp}` : ""}${loc ? ` · ${loc}` : ""}. ${e.data.description}`,
      meta: rangeOf(e.data.startDate, e.data.endDate),
      href: `/experience/${toAtsSlug(stem)}`,
      facets,
      date: ymToIsoDay(e.data.startDate),
      dateEnd: e.data.endDate ? ymToIsoDay(e.data.endDate) : null,
      text: textOf([
        e.data.roleName,
        orgName(orgStem),
        e.data.description,
        e.data.occupation?.skillsNote,
        skills.map(skillName).join(" "),
      ]),
      badges: skills.slice(0, 3).map(skillName),
      badgeHrefs: skills.slice(0, 3).map((s) => `/skills/${toAtsSlug(s)}`),
    };
    putThumb(id, orgThumb(orgStem), `${orgName(orgStem)} logo`);
    return item;
  });

  const educationItems: PersonItem[] = [];
  const eduEntry = resume.education.entry;
  if (eduEntry) {
    const stem = entryStem(eduEntry.id);
    const id = indexKey("education", stem);
    const orgStem = stemOf(eduEntry.data.recognizedBy);
    const deptStem = eduEntry.data.department ? stemOf(eduEntry.data.department) : "";
    const about = stemsOf(eduEntry.data.about);
    const facets = emptyFacets();
    facets.org = [orgStem, ...(deptStem && deptStem !== orgStem ? [deptStem] : [])];
    facets.skill = about;
    const deptName = deptStem ? orgName(deptStem) : "";
    const item: PersonItem = {
      id,
      kind: "education",
      stem,
      title: eduEntry.data.name,
      detail:
        `${orgName(orgStem)}${deptName ? ` · ${deptName}` : ""}. ${eduEntry.data.description ?? ""}`.trim(),
      meta: `${eduEntry.data.credentialCategory === "degree" ? "Degree" : "Education"}${eduEntry.data.educationalLevel ? ` · ${eduEntry.data.educationalLevel}` : ""} · ${rangeOf(eduEntry.data.startDate, eduEntry.data.endDate)}`,
      href: `/education/${toAtsSlug((eduEntry.data as { publicSlug?: string }).publicSlug ?? stem)}`,
      facets,
      date: eduEntry.data.startDate ? ymToIsoDay(eduEntry.data.startDate) : undefined,
      dateEnd: eduEntry.data.endDate ? ymToIsoDay(eduEntry.data.endDate) : null,
      text: textOf([eduEntry.data.name, orgName(orgStem), deptName, eduEntry.data.description]),
      badges: about.slice(0, 3).map(skillName),
      badgeHrefs: about.slice(0, 3).map((s) => `/skills/${toAtsSlug(s)}`),
    };
    putThumb(id, orgThumb(orgStem), `${orgName(orgStem)} logo`);
    educationItems.push(item);
  }
  const alumniStems = ((resume.person.data.alumniOf ?? []) as unknown[]).map(stemOf);
  for (const stem of alumniStems) {
    const id = indexKey("org", stem);
    const org = orgByStem.get(stem);
    const facets = emptyFacets();
    facets.org = [stem];
    const item: PersonItem = {
      id,
      kind: "org",
      stem,
      title: org?.data.name ?? stem,
      detail: [org?.data.alternateName, org?.data.type].filter(Boolean).join(" · ") || "Alma mater",
      meta: "Alma mater",
      href: `/organizations/${toAtsSlug(stem)}`,
      facets,
      text: textOf([org?.data.name, org?.data.alternateName, org?.data.description]),
      badges: [],
      badgeHrefs: [],
    };
    putThumb(id, orgThumb(stem), `${org?.data.name ?? stem} logo`);
    educationItems.push(item);
  }

  const projectItems: PersonItem[] = relatedProjects.map((p) => {
    const stem = entryStem(p.id);
    const id = indexKey("project", stem);
    const provRef = (p.data.provider ?? p.data.isPartOf) as unknown;
    const provStem = provRef ? stemOf(provRef) : "";
    const langs = stemsOf(p.data.programmingLanguage);
    const relExp = [
      ...new Set([
        ...stemsOf((p.data as { relatedExperience?: unknown }).relatedExperience).filter((s) =>
          expStems.has(s),
        ),
        ...resume.experience
          .filter((e) => (projectsOfExp.get(entryStem(e.id)) ?? []).includes(stem))
          .map((e) => entryStem(e.id)),
      ]),
    ];
    const facets = emptyFacets();
    if (provStem) facets.org = [provStem];
    facets.skill = langs;
    facets.exp = relExp;
    facets.project = [stem];
    const start = (p.data as { startDate?: string }).startDate;
    const end = (p.data as { endDate?: string }).endDate;
    const item: PersonItem = {
      id,
      kind: "project",
      stem,
      title: p.data.title,
      detail: p.data.description,
      meta: [
        roleFallback(p.data.role),
        provStem ? orgName(provStem) : "",
        start ? rangeOf(start, end) : String(p.data.pubDate.getFullYear()),
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/projects/${toAtsSlug(stem)}`,
      facets,
      date: isoDay(p.data.pubDate),
      dateEnd: end ? ymToIsoDay(end) : null,
      text: textOf([
        p.data.title,
        provStem ? orgName(provStem) : "",
        p.data.description,
        p.data.outcome,
      ]),
      badges: langs.slice(0, 3).map(skillName),
      badgeHrefs: langs.slice(0, 3).map((s) => `/skills/${toAtsSlug(s)}`),
    };
    const own =
      (p.data as { heroImage?: ImageMetadata; logo?: ImageMetadata }).heroImage ??
      (p.data as { logo?: ImageMetadata }).logo;
    if (own) putThumb(id, own, `${p.data.title} thumbnail`);
    else if (provStem) putThumb(id, orgThumb(provStem), `${orgName(provStem)} logo`);
    return item;
  });

  const postItems: PersonItem[] = relatedPosts.map((p) => {
    const stem = entryStem(p.id);
    const id = indexKey("post", stem);
    const data = p.data as { about?: unknown; aboutExperience?: unknown; mentions?: unknown };
    const aboutProj = stemsOf(data.about).filter((s) => relatedProjectStems.has(s));
    const aboutExp = stemsOf(data.aboutExperience).filter((s) => expStems.has(s));
    const mentions = stemsOf(data.mentions).filter((s) => personSkillStems.has(s));
    const facets = emptyFacets();
    facets.skill = mentions;
    facets.exp = aboutExp;
    facets.project = aboutProj;
    const item: PersonItem = {
      id,
      kind: "post",
      stem,
      title: p.data.title,
      detail: (p.data.description ?? "").slice(0, 160),
      meta: isoDay(p.data.pubDate),
      href: `/blog/${toAtsSlug(stem)}`,
      facets,
      date: isoDay(p.data.pubDate),
      text: textOf([p.data.title, p.data.description, ...(p.data.tags ?? [])]),
      badges: (p.data.tags ?? []).slice(0, 3),
      badgeHrefs: (p.data.tags ?? []).slice(0, 3).map(() => null),
      hashBadges: true,
    };
    const own =
      (p.data as { heroImage?: ImageMetadata; logo?: ImageMetadata }).heroImage ??
      (p.data as { logo?: ImageMetadata }).logo;
    putThumb(id, own, `${p.data.title} thumbnail`);
    return item;
  });

  const credentialItems: PersonItem[] = resume.credentials.map((c) => {
    const stem = entryStem(c.id);
    const id = indexKey("credential", stem);
    const issuerStem = c.data.recognizedBy ? stemOf(c.data.recognizedBy) : "";
    const about = stemsOf(c.data.about);
    const facets = emptyFacets();
    if (issuerStem) facets.org = [issuerStem];
    facets.skill = about;
    const year =
      c.data.dateCreated instanceof Date && !Number.isNaN(+c.data.dateCreated)
        ? String(c.data.dateCreated.getFullYear())
        : "";
    const item: PersonItem = {
      id,
      kind: "credential",
      stem,
      title: c.data.name,
      detail: [c.data.description, issuerStem ? `Recognized by ${orgName(issuerStem)}` : ""]
        .filter(Boolean)
        .join(". "),
      meta: [c.data.credentialCategory, c.data.educationalLevel, year].filter(Boolean).join(" · "),
      href: `/certifications/${credSlugOf(stem)}`,
      facets,
      date:
        c.data.dateCreated instanceof Date && !Number.isNaN(+c.data.dateCreated)
          ? isoDay(c.data.dateCreated)
          : undefined,
      dateEnd:
        c.data.validUntil instanceof Date && !Number.isNaN(+c.data.validUntil)
          ? isoDay(c.data.validUntil)
          : null,
      text: textOf([c.data.name, c.data.description, issuerStem ? orgName(issuerStem) : ""]),
      badges: about.slice(0, 3).map(skillName),
      badgeHrefs: about.slice(0, 3).map((s) => `/skills/${toAtsSlug(s)}`),
    };
    putThumb(
      id,
      issuerStem ? orgThumb(issuerStem) : undefined,
      `${issuerStem ? orgName(issuerStem) : c.data.name} logo`,
    );
    return item;
  });

  const byLabel = (a: { label: string }, b: { label: string }): number =>
    a.label.localeCompare(b.label);

  const byGroupLabel = (
    a: { label: string; group?: string },
    b: { label: string; group?: string },
  ): number => (a.group ?? "").localeCompare(b.group ?? "") || a.label.localeCompare(b.label);

  const sentenceCase = (s: string): string =>
    s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const orgStems = new Set<string>();
  for (const items of [experienceItems, educationItems, projectItems, credentialItems]) {
    for (const it of items) for (const s of it.facets.org) orgStems.add(s);
  }
  const expName = (stem: string): string => expByStem.get(stem)?.data.roleName ?? stem;
  const projectName = (stem: string): string =>
    relatedProjects.find((p) => entryStem(p.id) === stem)?.data.title ?? stem;

  const groups: ListGroup[] = [
    {
      key: "org",
      label: "Organization",
      options: [...orgStems].map((s) => ({ id: s, label: orgName(s) })).sort(byLabel),
    },
    {
      key: "skill",
      label: "Skill",
      options: resume.skills
        .map((s) => ({
          id: entryStem(s.id),
          label: s.data.name,
          group: sentenceCase(categoryLabel(s.data.category)),
        }))
        .sort(byGroupLabel),
    },
    {
      key: "exp",
      label: "Work experience",
      options: [...expStems].map((s) => ({ id: s, label: expName(s) })).sort(byLabel),
    },
    {
      key: "project",
      label: "Project",
      options: [...relatedProjectStems]
        .map((s) => ({ id: s, label: projectName(s) }))
        .sort(byLabel),
    },
  ].filter((g) => g.options.length > 0);

  const sections: PersonSection[] = [
    {
      key: "skills",
      title: "Skills",
      blurb: `Knows about ${skillItems.length} topics. Each name links to its detail page.`,
      items: skillItems,
    },
    {
      key: "experience",
      title: "Work Experience",
      blurb: `${experienceItems.length} roles. Each role links to its detail page, its organization, and its skills.`,
      items: experienceItems,
    },
    {
      key: "education",
      title: "Education",
      blurb: "Degree plus alma mater organizations.",
      items: educationItems,
    },
    {
      key: "projects",
      title: "Projects",
      blurb: `${projectItems.length} projects tied to this record through authorship or role links.`,
      items: projectItems,
    },
    {
      key: "writing",
      title: "Writing",
      blurb: `${postItems.length} posts tied to this record through authorship or topic links.`,
      items: postItems,
    },
    {
      key: "certifications",
      title: "Certifications",
      blurb: `${credentialItems.length} credentials. Each item links to its detail page or verification link.`,
      items: credentialItems,
    },
  ].filter((s) => s.items.length > 0);

  const index = new Map<string, PersonFilterIndex>();
  for (const sec of sections) {
    for (const it of sec.items) {
      index.set(it.id, {
        facets: it.facets,
        date: it.date,
        dateEnd: it.dateEnd ?? null,
        text: it.text,
      });
    }
  }

  const days = [...index.values()]
    .flatMap((v) => [v.date, v.dateEnd].filter((d): d is string => !!d))
    .sort();
  const personEntry = resume.person;

  return {
    personId: entryStem(personEntry.id),
    personName: personEntry.data.name,
    groups,
    sections,
    thumbs,
    index,
    counts: {
      skills: skillItems.length,
      experience: experienceItems.length,
      credentials: credentialItems.length,
      projects: projectItems.length,
      posts: postItems.length,
    },
    dateMin: days[0] ?? null,
    dateMax: days[days.length - 1] ?? null,
  };
}
