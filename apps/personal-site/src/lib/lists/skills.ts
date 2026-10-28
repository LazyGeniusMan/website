import type { ImageMetadata } from "astro";
import { getCollection } from "astro:content";
import {
  categoryLabel,
  proficiencyLabel,
  publishedPosts,
  publishedProjects,
  toAtsSlug,
} from "../collections";
import type { ListGroup, ListItem } from "./types";

export async function getSkillThumbSources(
  skills: SkillEntry[],
): Promise<Map<string, { src: ImageMetadata; alt: string }>> {
  const out = new Map<string, { src: ImageMetadata; alt: string }>();
  for (const s of skills) {
    const data = s.data as unknown as { logo?: ImageMetadata; heroImage?: ImageMetadata };
    const src = data.logo ?? data.heroImage;
    if (src) out.set(s.id, { src, alt: `${s.data.name} logo` });
  }
  return out;
}

export const SKILLS_PATH = "/skills";
export const SKILLS_PAGE_SIZE = 6;

export const truncateDetail = (s: string, max = 140): string => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > 80 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.trimEnd()}…`;
};

export type SkillEntry = Awaited<ReturnType<typeof getSkillEntries>>[number];

async function getSkillEntries() {
  return getCollection("skills");
}

const stemOf = (ref: unknown): string => {
  const raw = typeof ref === "string" ? ref : (ref as { id: string }).id;
  return raw.split("/").pop() ?? raw;
};

export interface SkillRelation {
  label: string;
  href: string;
}

export interface SkillRelations {
  projects: SkillRelation[];
  roles: SkillRelation[];
  posts: SkillRelation[];
  credentials: SkillRelation[];
  education: SkillRelation[];
}

export interface SkillTotals {
  skills: number;
  projects: number;
  roles: number;
  posts: number;
  credentials: number;
  education: number;
}

export async function getSkillsList(): Promise<{
  skillsAll: SkillEntry[];
  groups: ListGroup[];
  items: ListItem[];
  catOf: (s: SkillEntry) => string;
  profOf: (s: SkillEntry) => string;
  relatedOf: (s: SkillEntry) => SkillRelations;
  countsOf: (s: SkillEntry) => string;
  totals: SkillTotals;
}> {
  const skillsAll = await getSkillEntries();
  const projectsAll = await publishedProjects();
  const experienceAll = await getCollection("experience");
  const postsAll = await publishedPosts();
  const credentialsAll = await getCollection("credentials");
  const educationAll = await getCollection("education");

  const skillStemOf = (s: SkillEntry): string => s.id.split("/").pop() ?? s.id;

  const matchSkill = (refs: unknown, stem: string, id: string): boolean =>
    ((refs ?? []) as unknown[]).map(stemOf).some((s) => s === stem || s === id);

  const catOf = (s: SkillEntry): string => categoryLabel(s.data.category);
  const profOf = (s: SkillEntry): string =>
    s.data.proficiencyLevel ? proficiencyLabel(s.data.proficiencyLevel) : "Other";

  const skillsForProject = (stem: string, id: string): string[] =>
    projectsAll
      .filter((p) => matchSkill(p.data.programmingLanguage, stem, id))
      .map((p) => stemOf(p.id));
  const rolesForSkill = (stem: string, id: string): string[] =>
    experienceAll
      .filter(
        (e) =>
          matchSkill(e.data.skills, stem, id) ||
          matchSkill((e.data.occupation as { skills?: unknown } | undefined)?.skills, stem, id),
      )
      .map((e) => stemOf(e.id));
  const postsForSkill = (stem: string, id: string): string[] =>
    postsAll.filter((p) => matchSkill(p.data.mentions, stem, id)).map((p) => stemOf(p.id));
  const credentialsForSkill = (stem: string, id: string): string[] =>
    credentialsAll.filter((c) => matchSkill(c.data.about, stem, id)).map((c) => stemOf(c.id));
  const educationForSkill = (stem: string, id: string): string[] =>
    educationAll.filter((e) => matchSkill(e.data.about, stem, id)).map((e) => stemOf(e.id));

  const credentialPublicSlug = (stem: string): string => {
    const c = credentialsAll.find((e) => stemOf(e.id) === stem);
    const pub = (c?.data as { publicSlug?: string } | undefined)?.publicSlug;
    return pub ?? stem;
  };

  const opt = (ids: string[], names: Map<string, string>) =>
    [...new Map(ids.map((id) => [id, { id, label: names.get(id) ?? id }] as const)).values()].sort(
      (a, b) => a.label.localeCompare(b.label),
    );

  const projectNameByStem = new Map(projectsAll.map((p) => [stemOf(p.id), p.data.title]));
  const roleNameByStem = new Map(experienceAll.map((e) => [stemOf(e.id), e.data.roleName]));
  const postNameByStem = new Map(postsAll.map((p) => [stemOf(p.id), p.data.title]));
  const credentialNameByStem = new Map(credentialsAll.map((c) => [stemOf(c.id), c.data.name]));
  const educationSlugOf = (stem: string): string => {
    const e = educationAll.find((entry) => stemOf(entry.id) === stem);
    const pub = (e?.data as { publicSlug?: string } | undefined)?.publicSlug;
    return toAtsSlug(pub ?? stem);
  };
  const educationNameByStem = new Map(educationAll.map((e) => [stemOf(e.id), e.data.name]));

  const groups: ListGroup[] = [
    {
      key: "project",
      label: "Used in projects",
      options: opt(
        projectsAll
          .filter((p) => ((p.data.programmingLanguage ?? []) as unknown[]).length > 0)
          .map((p) => stemOf(p.id)),
        projectNameByStem,
      ),
    },
    {
      key: "role",
      label: "Used in roles",
      options: opt(
        experienceAll
          .filter(
            (e) =>
              ((e.data.skills ?? []) as unknown[]).length > 0 ||
              (((e.data.occupation as { skills?: unknown } | undefined)?.skills ?? []) as unknown[])
                .length > 0,
          )
          .map((e) => stemOf(e.id)),
        roleNameByStem,
      ),
    },
    {
      key: "post",
      label: "Mentioned in posts",
      options: opt(
        postsAll
          .filter((p) => ((p.data.mentions ?? []) as unknown[]).length > 0)
          .map((p) => stemOf(p.id)),
        postNameByStem,
      ),
    },
    {
      key: "credential",
      label: "Assessed by credentials",
      options: opt(
        credentialsAll
          .filter((c) => ((c.data.about ?? []) as unknown[]).length > 0)
          .map((c) => stemOf(c.id)),
        credentialNameByStem,
      ),
    },
    {
      key: "education",
      label: "Taught in education",
      options: opt(
        educationAll
          .filter((e) => ((e.data.about ?? []) as unknown[]).length > 0)
          .map((e) => stemOf(e.id)),
        educationNameByStem,
      ),
    },
  ].filter((g) => g.options.length > 0);

  const relatedOf = (s: SkillEntry): SkillRelations => {
    const stem = skillStemOf(s);
    const projectStems = skillsForProject(stem, s.id);
    const roleStems = rolesForSkill(stem, s.id);
    const postStems = postsForSkill(stem, s.id);
    const credentialStems = credentialsForSkill(stem, s.id);
    const educationStems = educationForSkill(stem, s.id);
    return {
      projects: projectStems.map((st) => ({
        label: projectNameByStem.get(st) ?? st,
        href: `/projects/${toAtsSlug(st)}`,
      })),
      roles: roleStems.map((st) => ({
        label: roleNameByStem.get(st) ?? st,
        href: `/experience/${toAtsSlug(st)}`,
      })),
      posts: postStems.map((st) => ({
        label: postNameByStem.get(st) ?? st,
        href: `/blog/${toAtsSlug(st)}`,
      })),
      credentials: credentialStems.map((st) => ({
        label: credentialNameByStem.get(st) ?? st,
        href: `/certifications/${toAtsSlug(credentialPublicSlug(st))}`,
      })),
      education: educationStems.map((st) => ({
        label: educationNameByStem.get(st) ?? st,
        href: `/education/${educationSlugOf(st)}`,
      })),
    };
  };

  const countsOf = (s: SkillEntry): string => {
    const r = relatedOf(s);
    const parts: string[] = [];
    if (r.projects.length > 0)
      parts.push(`${r.projects.length} ${r.projects.length === 1 ? "project" : "projects"}`);
    if (r.roles.length > 0)
      parts.push(`${r.roles.length} ${r.roles.length === 1 ? "role" : "roles"}`);
    if (r.posts.length > 0)
      parts.push(`${r.posts.length} ${r.posts.length === 1 ? "post" : "posts"}`);
    if (r.credentials.length > 0)
      parts.push(
        `${r.credentials.length} ${r.credentials.length === 1 ? "credential" : "credentials"}`,
      );
    if (r.education.length > 0)
      parts.push(
        `${r.education.length} ${r.education.length === 1 ? "education record" : "education records"}`,
      );
    return parts.join(" · ");
  };

  const items: ListItem[] = [...skillsAll]
    .sort((a, b) => a.data.name.localeCompare(b.data.name))
    .map((s) => {
      const stem = skillStemOf(s);
      const rel = relatedOf(s);
      const top: SkillRelation[] = [
        ...rel.projects.slice(0, 1),
        ...rel.roles.slice(0, 1),
        ...rel.posts.slice(0, 1),
        ...rel.credentials.slice(0, 1),
        ...rel.education.slice(0, 1),
      ].slice(0, 3);
      return {
        id: s.id,
        title: s.data.name,
        detail: truncateDetail(s.data.description ?? s.data.name),
        meta: [catOf(s), profOf(s)].filter(Boolean).join(" · "),
        href: `/skills/${toAtsSlug(s.id)}`,
        facets: {
          project: skillsForProject(stem, s.id),
          role: rolesForSkill(stem, s.id),
          post: postsForSkill(stem, s.id),
          credential: credentialsForSkill(stem, s.id),
          education: educationForSkill(stem, s.id),
        },
        badges: top.map((t) => t.label),
        badgeHrefs: top.map((t) => t.href),
        hashBadges: false,
      };
    });

  const totals: SkillTotals = (() => {
    const hrefs = (pick: (r: SkillRelations) => SkillRelation[]): Set<string> =>
      new Set([...skillsAll].flatMap((s) => pick(relatedOf(s)).map((t) => t.href)));
    return {
      skills: skillsAll.length,
      projects: hrefs((r) => r.projects).size,
      roles: hrefs((r) => r.roles).size,
      posts: hrefs((r) => r.posts).size,
      credentials: hrefs((r) => r.credentials).size,
      education: hrefs((r) => r.education).size,
    };
  })();

  return { skillsAll, groups, items, catOf, profOf, relatedOf, countsOf, totals };
}
