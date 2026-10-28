import { getCollection, getEntries, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;
export type Project = CollectionEntry<"projects">;
export type Person = CollectionEntry<"person">;
export type Skill = CollectionEntry<"skills">;
export type Organization = CollectionEntry<"organizations">;
export type Experience = CollectionEntry<"experience">;
export type Education = CollectionEntry<"education">;
export type Credential = CollectionEntry<"credentials">;

export function isPublished<T extends { data: { draft: boolean; pubDate: Date } }>(
  entry: T,
  now = new Date(),
): boolean {
  return !entry.data.draft && entry.data.pubDate.getTime() <= now.getTime();
}

export async function publishedPosts(now = new Date()): Promise<BlogPost[]> {
  const all: BlogPost[] = await getCollection("blog");
  return all.filter((p) => isPublished(p, now)).sort((a, b) => +b.data.pubDate - +a.data.pubDate);
}

export async function publishedProjects(now = new Date()): Promise<Project[]> {
  const all: Project[] = await getCollection("projects");
  return all.filter((p) => isPublished(p, now)).sort((a, b) => +b.data.pubDate - +a.data.pubDate);
}

export function readingTime(text: string, wpm = 200): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wpm));
}

export function relatedPosts<
  T extends {
    id: string;
    data: {
      tags: string[];
      pubDate: Date;
      about?: unknown;
      aboutExperience?: unknown;
    } & Record<string, unknown>;
  },
>(post: T, pool: T[], limit = 2): T[] {
  const tags = new Set(post.data.tags);
  const aboutStems = new Set(refStems(post.data.about));
  const aboutExpStems = new Set(refStems(post.data.aboutExperience));
  if (tags.size === 0 && aboutStems.size === 0 && aboutExpStems.size === 0) return [];
  const score = (p: T): number => {
    let s = 0;
    for (const t of p.data.tags) if (tags.has(t)) s += 1;
    for (const stem of refStems(p.data.about)) if (aboutStems.has(stem)) s += 2;
    for (const stem of refStems(p.data.aboutExperience)) if (aboutExpStems.has(stem)) s += 2;
    return s;
  };
  return pool
    .filter((p) => p.id !== post.id && score(p) > 0)
    .sort((a, b) => score(b) - score(a) || +b.data.pubDate - +a.data.pubDate)
    .slice(0, limit);
}

function refStem(ref: string | { id: string }): string {
  const raw = typeof ref === "string" ? ref : ref.id;
  return raw.split("/").pop() ?? raw;
}

function refStems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return (value as (string | { id: string })[]).map(refStem);
}

export async function resolveExperienceProjects(exp: Experience): Promise<Project[]> {
  const refs = ((exp.data as { relatedProjects?: unknown }).relatedProjects ?? []) as never[];
  if (refs.length === 0) return [];
  let resolved: unknown[];
  try {
    resolved = await getEntries(refs);
  } catch (e) {
    throw new Error(`experience/${exp.id}: unresolvable relatedProjects ref`, { cause: e });
  }
  if (resolved.length !== refs.length || resolved.some((r) => !r)) {
    throw new Error(
      `experience/${exp.id}: dangling relatedProjects ref (refs=${refs.length}, resolved=${resolved.filter(Boolean).length})`,
    );
  }
  return resolved as Project[];
}

export async function resolveProjectExperience(proj: Project): Promise<Experience[]> {
  const refs = ((proj.data as { relatedExperience?: unknown }).relatedExperience ?? []) as never[];
  if (refs.length === 0) return [];
  let resolved: unknown[];
  try {
    resolved = await getEntries(refs);
  } catch (e) {
    throw new Error(`projects/${proj.id}: unresolvable relatedExperience ref`, { cause: e });
  }
  if (resolved.length !== refs.length || resolved.some((r) => !r)) {
    throw new Error(
      `projects/${proj.id}: dangling relatedExperience ref (refs=${refs.length}, resolved=${resolved.filter(Boolean).length})`,
    );
  }
  return resolved as Experience[];
}

export async function resolvePostExperience(post: BlogPost): Promise<Experience[]> {
  const refs = ((post.data as { aboutExperience?: unknown }).aboutExperience ?? []) as never[];
  if (refs.length === 0) return [];
  let resolved: unknown[];
  try {
    resolved = await getEntries(refs);
  } catch (e) {
    throw new Error(`blog/${post.id}: unresolvable aboutExperience ref`, { cause: e });
  }
  if (resolved.length !== refs.length || resolved.some((r) => !r)) {
    throw new Error(
      `blog/${post.id}: dangling aboutExperience ref (refs=${refs.length}, resolved=${resolved.filter(Boolean).length})`,
    );
  }
  return resolved as Experience[];
}

export async function getProjectsForExperience(
  expIdOrEntry: string | Experience,
): Promise<Project[]> {
  const expId = typeof expIdOrEntry === "string" ? expIdOrEntry : expIdOrEntry.id;
  const stem = expId.split("/").pop() ?? expId;
  const stored =
    typeof expIdOrEntry === "string"
      ? await (async () => {
          const all = await getCollection("experience");
          const found = all.find((e) => e.id === expId || e.id.endsWith(`/${stem}`));
          return found ? resolveExperienceProjects(found) : [];
        })()
      : await resolveExperienceProjects(expIdOrEntry);
  const allProjects = await publishedProjects();
  const reverse = allProjects.filter((p) =>
    refStems((p.data as { relatedExperience?: unknown }).relatedExperience).some(
      (s) => s === stem || s === expId,
    ),
  );
  const byId = new Map<string, Project>();
  for (const p of [...stored, ...reverse]) byId.set(p.id, p);
  return [...byId.values()].sort((a, b) => +b.data.pubDate - +a.data.pubDate);
}

export async function getExperienceForProject(
  projIdOrEntry: string | Project,
): Promise<Experience[]> {
  const projId = typeof projIdOrEntry === "string" ? projIdOrEntry : projIdOrEntry.id;
  const stem = projId.split("/").pop() ?? projId;
  const stored =
    typeof projIdOrEntry === "string"
      ? await (async () => {
          const all = await publishedProjects();
          const found = all.find((p) => p.id === projId || p.id.endsWith(`/${stem}`));
          return found ? resolveProjectExperience(found) : [];
        })()
      : await resolveProjectExperience(projIdOrEntry);
  const allExp = await getCollection("experience");
  const reverse = allExp.filter((e) =>
    refStems((e.data as { relatedProjects?: unknown }).relatedProjects).some(
      (s) => s === stem || s === projId || projId.endsWith(`/${s}`),
    ),
  );
  const byId = new Map<string, Experience>();
  for (const e of [...stored, ...reverse]) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => (a.data.startDate < b.data.startDate ? 1 : -1));
}

export async function getPostsForExperience(expId: string): Promise<BlogPost[]> {
  const stem = expId.split("/").pop() ?? expId;
  const posts = await publishedPosts();
  return posts.filter((p) =>
    refStems((p.data as { aboutExperience?: unknown }).aboutExperience).some(
      (s) => s === stem || s === expId,
    ),
  );
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Contract",
  TEMPORARY: "Temporary",
  INTERN: "Internship",
  VOLUNTEER: "Volunteer",
  PER_DIEM: "Per diem",
  OTHER: "Other",
};

export function employmentTypeLabel(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  return EMPLOYMENT_TYPE_LABELS[value] ?? value;
}

export function jobLocationName(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof (value as { name?: unknown }).name === "string") {
    return (value as { name: string }).name;
  }
  return "";
}

const PROFICIENCY_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

export function proficiencyLabel(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  return PROFICIENCY_LABELS[value] ?? PROFICIENCY_LABELS[value.toLowerCase()] ?? value;
}

const CATEGORY_LABELS: Record<string, string> = {
  Tool: "Tools",
  Tools: "Tools",
  Technical: "Technical Skills",
  Thinking: "Core Competencies",
  Process: "Process",
};

export function categoryLabel(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "Other";
  return CATEGORY_LABELS[value] ?? value;
}

export const DISPLAY = {
  Person: "About",
  Occupation: "Work Experience",
  EducationalOccupationalCredential: "Certifications",
  DefinedTerm: "Skills",
  SoftwareSourceCode: "Projects",
  SoftwareApplication: "Projects",
  BlogPosting: "Blog",
  Organization: "About",
  CollectionPage: "Browse",
} as const;

export type DisplayType = keyof typeof DISPLAY;

export function credentialDisplay(credentialCategory: unknown): string {
  return credentialCategory === "degree" ? "Education" : DISPLAY.EducationalOccupationalCredential;
}

export function toAtsSlug(input: string): string {
  const ascii = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 75)
    .replace(/-+$/g, "");
  if (!ascii) throw new Error(`toAtsSlug: no slug characters in ${JSON.stringify(input)}`);
  return ascii;
}

const VERIFICATION_LABELS: Record<string, string> = {
  verified: "Verification: Verified",
  unverified: "Verification: Unverified",
};

export function verificationLabel(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  return VERIFICATION_LABELS[value] ?? value;
}

export function roleFallback(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) return value;
  return "Project";
}

export function allTags<T extends { data: { tags: string[] } }>(posts: T[]): string[] {
  return [...new Set(posts.flatMap((p) => p.data.tags))].sort();
}

function blogAuthorRefs(p: BlogPost): { id: string }[] {
  const author = (p.data as { author?: { id: string }[] }).author ?? [];
  return author as unknown as { id: string }[];
}

export async function resolveBlogAuthors(p: BlogPost) {
  const refs = blogAuthorRefs(p);
  if (refs.length === 0) return [];
  let resolved;
  try {
    resolved = await getEntries(refs as never);
  } catch (e) {
    throw new Error(`resolveBlogAuthors: blog/${p.id} has unresolvable author ref`, {
      cause: e,
    });
  }
  if (resolved.length !== refs.length || resolved.some((r) => !r)) {
    throw new Error(
      `resolveBlogAuthors: blog/${p.id} has dangling author ref (refs=${refs.length}, resolved=${resolved.filter(Boolean).length})`,
    );
  }
  return resolved;
}

export async function getPostsForProject(projectId: string): Promise<BlogPost[]> {
  const posts = await publishedPosts();
  return posts.filter((p) =>
    ((p.data.about ?? []) as { id: string }[]).some((r) => {
      const id = typeof r === "string" ? r : r.id;
      return id === projectId || id.endsWith(`/${projectId}`) || id === projectId.split("/").pop();
    }),
  );
}

export async function getProjectsForSkill(skillId: string): Promise<Project[]> {
  const all = await publishedProjects();
  const norm = skillId.split("/").pop() ?? skillId;
  return all.filter((p) =>
    ((p.data.programmingLanguage ?? []) as { id: string }[]).some((r) => {
      const id = typeof r === "string" ? r : r.id;
      return id === skillId || id === norm || id.endsWith(`/${norm}`);
    }),
  );
}

export async function getExperienceForSkill(skillId: string): Promise<Experience[]> {
  const all = await getCollection("experience");
  const norm = skillId.split("/").pop() ?? skillId;
  const matchRefs = (value: unknown): boolean =>
    ((value ?? []) as { id: string }[]).some((r) => {
      const id = typeof r === "string" ? r : r.id;
      return id === skillId || id === norm || id.endsWith(`/${norm}`);
    });
  return all.filter(
    (e) =>
      matchRefs(e.data.skills) ||
      matchRefs((e.data.occupation as { skills?: unknown } | undefined)?.skills),
  );
}

export async function getPostsForSkill(skillId: string): Promise<BlogPost[]> {
  const all = await publishedPosts();
  const norm = skillId.split("/").pop() ?? skillId;
  return all.filter((p) =>
    ((p.data.mentions ?? []) as { id: string }[]).some((r) => {
      const id = typeof r === "string" ? r : r.id;
      return id === skillId || id === norm || id.endsWith(`/${norm}`);
    }),
  );
}

export async function getCredentialsForSkill(skillId: string): Promise<Credential[]> {
  const all = await getCollection("credentials");
  const norm = skillId.split("/").pop() ?? skillId;
  return all.filter((c) =>
    ((c.data.about ?? []) as { id: string }[]).some((r) => {
      const id = typeof r === "string" ? r : r.id;
      return id === skillId || id === norm || id.endsWith(`/${norm}`);
    }),
  );
}

export async function getEducationForSkill(skillId: string): Promise<Education[]> {
  const all = await getCollection("education");
  const norm = skillId.split("/").pop() ?? skillId;
  return all.filter((e) =>
    ((e.data.about ?? []) as { id: string }[]).some((r) => {
      const id = typeof r === "string" ? r : r.id;
      return id === skillId || id === norm || id.endsWith(`/${norm}`);
    }),
  );
}

export async function getProjectsForOrg(orgId: string): Promise<Project[]> {
  const all = await publishedProjects();
  const norm = orgId.split("/").pop() ?? orgId;
  const match = (ref: unknown): boolean => {
    if (!ref) return false;
    const id = typeof ref === "string" ? ref : (ref as { id: string }).id;
    return id === orgId || id === norm || id.endsWith(`/${norm}`);
  };
  return all.filter((p) => match(p.data.provider) || match(p.data.isPartOf));
}

export interface Resume {
  person: Person;
  experience: Experience[];
  education: { entry: Education | null; org: Organization | null; department: Organization | null };
  skills: Skill[];
  credentials: Credential[];
  projects: Project[];
}

export function orgAncestorNames(
  orgs: Organization[],
  start: { data: { parentOrganization?: unknown } },
): string[] {
  const byId = new Map(orgs.map((o) => [o.id, o]));
  const byStem = new Map(orgs.map((o) => [o.id.split("/").pop() ?? o.id, o]));
  const out: string[] = [];
  let ref = start.data.parentOrganization as { id: string } | string | undefined;
  const seen = new Set<string>();
  while (ref) {
    const raw = typeof ref === "string" ? ref : ref.id;
    const stem = raw.split("/").pop() ?? raw;
    if (seen.has(stem)) throw new Error(`orgAncestorNames: parent cycle at ${stem}`);
    seen.add(stem);
    const found = byStem.get(stem) ?? byId.get(raw);
    if (!found) throw new Error(`orgAncestorNames: dangling parentOrganization ref ${raw}`);
    out.push(found.data.name);
    ref = found.data.parentOrganization as { id: string } | string | undefined;
  }
  return out;
}

export async function getResume(): Promise<Resume> {
  const [persons, expAll, eduAll, skillsAll, credsAll, projsAll, orgsAll] = await Promise.all([
    getCollection("person"),
    getCollection("experience"),
    getCollection("education"),
    getCollection("skills"),
    getCollection("credentials"),
    publishedProjects(),
    getCollection("organizations"),
  ]);
  const person = persons.find((p) => p.id === "andriyansyah") ?? persons[0];
  if (!person) throw new Error("getResume: no person entry (andriyansyah missing)");
  const byId = <T extends { id: string }>(list: T[], id: string): T | undefined =>
    list.find((e) => e.id === id || e.id.endsWith(`/${id}`));
  const resolveIds = <T extends { id: string }>(list: T[], refs: { id: string }[]): T[] => {
    const out: T[] = [];
    for (const r of refs) {
      const id = typeof r === "string" ? r : (r as { id: string }).id;
      const norm = id.split("/").pop() ?? id;
      const found = byId(list, norm) ?? byId(list, id);
      if (found) out.push(found);
    }
    return out;
  };
  const personData = person.data as {
    hasOccupation?: { id: string }[];
    knowsAbout?: { id: string }[];
    hasCredential?: { id: string }[];
    alumniOf?: { id: string }[];
  };
  const assertAllResolved = (kind: string, refs: { id: string }[], resolved: unknown[]) => {
    if (resolved.length !== refs.length) {
      throw new Error(
        `getResume: person/${person.id} has dangling ${kind} ref (refs=${refs.length}, resolved=${resolved.length})`,
      );
    }
  };
  const experience = personData.hasOccupation?.length
    ? resolveIds(expAll, personData.hasOccupation)
    : [...expAll].sort((a, b) => (b.data.startDate > a.data.startDate ? 1 : -1));
  if (personData.hasOccupation?.length) {
    assertAllResolved("hasOccupation", personData.hasOccupation, experience);
  }
  experience.sort((a, b) => (a.data.startDate < b.data.startDate ? 1 : -1));
  const skills = personData.knowsAbout?.length
    ? resolveIds(skillsAll, personData.knowsAbout)
    : skillsAll;
  if (personData.knowsAbout?.length) {
    assertAllResolved("knowsAbout", personData.knowsAbout, skills);
  }
  const credentials = personData.hasCredential?.length
    ? resolveIds(credsAll, personData.hasCredential)
    : credsAll;
  if (personData.hasCredential?.length) {
    assertAllResolved("hasCredential", personData.hasCredential, credentials);
  }
  const alumni = personData.alumniOf ?? [];
  const alumniResolved = alumni.length > 0 ? resolveIds(orgsAll, alumni) : [];
  if (alumni.length > 0) assertAllResolved("alumniOf", alumni, alumniResolved);
  const eduEntry = [...eduAll].sort((a, b) => (a.id < b.id ? -1 : 1))[0] ?? null;
  const refStem = (ref: unknown): string | null => {
    if (!ref) return null;
    const raw = typeof ref === "string" ? ref : (ref as { id: string }).id;
    return raw.split("/").pop() ?? raw;
  };
  const eduOrgStem = eduEntry ? refStem(eduEntry.data.recognizedBy) : null;
  const eduDeptStem = eduEntry ? refStem(eduEntry.data.department) : null;
  if (eduEntry) {
    const stems = [eduOrgStem, eduDeptStem].filter((s): s is string => !!s);
    const resolved = resolveIds(
      orgsAll,
      stems.map((s) => ({ id: s })),
    );
    if (resolved.length !== stems.length) {
      throw new Error(`getResume: education/${eduEntry.id} has dangling org ref`);
    }
  }
  let eduOrg: Organization | null = null;
  if (eduOrgStem) eduOrg = byId(orgsAll, eduOrgStem) ?? null;
  if (!eduOrg) {
    if (alumniResolved.length > 0) eduOrg = alumniResolved[0] ?? null;
    else eduOrg = byId(orgsAll, "unpad") ?? null;
  }
  let dept: Organization | null = null;
  if (eduDeptStem) dept = byId(orgsAll, eduDeptStem) ?? null;
  if (!dept) dept = byId(orgsAll, "feb-unpad") ?? null;
  return {
    person,
    experience,
    education: { entry: eduEntry, org: eduOrg, department: dept },
    skills,
    credentials,
    projects: projsAll,
  };
}

export type TimelineKind = "experience" | "project" | "blog" | "education" | "credential";
export type TimelinePrecision = "year" | "month" | "day";

export interface TimelineItem {
  kind: TimelineKind;
  id: string;
  title: string;
  href: string;
  start: string;
  startPrecision: TimelinePrecision;
  end: string | null;
  endPrecision: TimelinePrecision | null;
  ongoing: boolean;
  note?: string;
  verificationStatus?: "verified" | "unverified";
}

export interface TimelineInputItem {
  kind: TimelineKind;
  id: string;
  title: string;
  href: string;
  start: string | Date;
  end?: string | Date | null;
  ongoing?: boolean;
  verificationStatus?: "verified" | "unverified";
  experienceRefs?: string[];
}

export function normalizeTimelineDate(value: string | Date): {
  iso: string;
  precision: TimelinePrecision;
} {
  if (value instanceof Date) {
    if (Number.isNaN(+value)) throw new Error("normalizeTimelineDate: invalid Date");
    return { iso: value.toISOString().slice(0, 10), precision: "day" };
  }
  const raw = value.trim();
  if (/^\d{4}$/.test(raw)) return { iso: `${raw}-01-01`, precision: "year" };
  const m = raw.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (m) {
    return m[3]
      ? { iso: `${m[1]}-${m[2]}-${m[3]}`, precision: "day" }
      : { iso: `${m[1]}-${m[2]}-01`, precision: "month" };
  }
  const d = new Date(raw);
  if (Number.isNaN(+d))
    throw new Error(`normalizeTimelineDate: unparseable date ${JSON.stringify(value)}`);
  return { iso: d.toISOString().slice(0, 10), precision: "day" };
}

function monthsBetween(fromIso: string, toIso: string): number {
  const [fy, fm] = fromIso.split("-").map(Number);
  const [ty, tm] = toIso.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

const TIMELINE_KIND_RANK: Record<TimelineKind, number> = {
  education: 0,
  experience: 1,
  project: 2,
  blog: 3,
  credential: 4,
};

export function buildTimeline(
  items: TimelineInputItem[],
  experienceEnds: ReadonlyMap<string, string> = new Map(),
): TimelineItem[] {
  const out: TimelineItem[] = items.map((item) => {
    const start = normalizeTimelineDate(item.start);
    const endRaw = item.end ?? null;
    const end = endRaw == null ? null : normalizeTimelineDate(endRaw);
    const refs = (item.experienceRefs ?? []).map((r) => r.split("/").pop() ?? r);
    const notes: string[] = [];
    if (refs.length > 1) {
      notes.push(`Retrospective: origin ${refs[0]}, written during ${refs.slice(1).join(", ")}.`);
    }
    const originEnd = refs.length > 0 ? experienceEnds.get(refs[0] as string) : undefined;
    if (originEnd && start.iso > originEnd) {
      const n = monthsBetween(originEnd, start.iso);
      notes.push(
        `Continuation: published ${n} mo after ${refs[0]} ended (${originEnd.slice(0, 7)} → ${start.iso.slice(0, 7)}); concurrent-overlap rules do not apply.`,
      );
    }
    return {
      kind: item.kind,
      id: item.id,
      title: item.title,
      href: item.href,
      start: start.iso,
      startPrecision: start.precision,
      end: end?.iso ?? null,
      endPrecision: end?.precision ?? null,
      ongoing: item.ongoing ?? false,
      ...(notes.length > 0 ? { note: notes.join(" ") } : {}),
      ...(item.verificationStatus ? { verificationStatus: item.verificationStatus } : {}),
    };
  });
  out.sort(
    (a, b) =>
      (a.start < b.start ? -1 : a.start > b.start ? 1 : 0) ||
      TIMELINE_KIND_RANK[a.kind] - TIMELINE_KIND_RANK[b.kind] ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return out;
}

const timelineStem = (ref: unknown): string => {
  const raw = typeof ref === "string" ? ref : (ref as { id: string }).id;
  return raw.split("/").pop() ?? raw;
};

export async function getTimeline(now = new Date()): Promise<TimelineItem[]> {
  const [expAll, projAll, postAll, eduAll, credAll] = await Promise.all([
    getCollection("experience"),
    getCollection("projects"),
    getCollection("blog"),
    getCollection("education"),
    getCollection("credentials"),
  ]);
  const expEnds = new Map<string, string>();
  for (const e of expAll) {
    if (e.data.endDate) expEnds.set(timelineStem(e.id), normalizeTimelineDate(e.data.endDate).iso);
  }
  const items: TimelineInputItem[] = [
    ...expAll.map((e): TimelineInputItem => {
      const stem = timelineStem(e.id);
      return {
        kind: "experience",
        id: stem,
        title: e.data.roleName,
        href: `/experience/${toAtsSlug(stem)}`,
        start: e.data.startDate,
        end: e.data.endDate ?? null,
        ongoing: !e.data.endDate,
      };
    }),
    ...projAll
      .filter((p) => isPublished(p as { data: { draft: boolean; pubDate: Date } }, now))
      .map((p): TimelineInputItem => {
        const stem = timelineStem(p.id);
        return {
          kind: "project",
          id: stem,
          title: p.data.title,
          href: `/projects/${toAtsSlug(stem)}`,
          start:
            (p.data as { startDate?: string | Date }).startDate ??
            p.data.dateCreated ??
            p.data.pubDate,
          verificationStatus: p.data.verificationStatus,
          experienceRefs: refStems((p.data as { relatedExperience?: unknown }).relatedExperience),
        };
      }),
    ...postAll
      .filter((p) => isPublished(p, now))
      .map((p): TimelineInputItem => {
        const stem = timelineStem(p.id);
        return {
          kind: "blog",
          id: stem,
          title: p.data.title,
          href: `/blog/${toAtsSlug(stem)}`,
          start: p.data.pubDate,
          experienceRefs: refStems((p.data as { aboutExperience?: unknown }).aboutExperience),
        };
      }),
    ...eduAll
      .filter((e) => e.data.startDate ?? e.data.endDate)
      .map((e): TimelineInputItem => {
        const stem = timelineStem(e.id);
        const slug = (() => {
          try {
            return toAtsSlug((e.data as { publicSlug?: string }).publicSlug ?? stem);
          } catch {
            return toAtsSlug(stem);
          }
        })();
        return {
          kind: "education",
          id: stem,
          title: e.data.name,
          href: `/education/${slug}`,
          start: (e.data.startDate ?? e.data.endDate) as string,
          end: e.data.startDate ? (e.data.endDate ?? null) : null,
        };
      }),
    ...credAll
      .filter((c) => c.data.dateCreated ?? c.data.validUntil)
      .map((c): TimelineInputItem => {
        const stem = timelineStem(c.id);
        const slug = (() => {
          try {
            return toAtsSlug(c.data.publicSlug ?? stem);
          } catch {
            return stem;
          }
        })();
        return {
          kind: "credential",
          id: stem,
          title: c.data.name,
          href: `/certifications/${slug}`,
          start: (c.data.dateCreated ?? c.data.validUntil) as Date,
        };
      }),
  ];
  return buildTimeline(items, expEnds);
}

export function orgStemOf(ref: unknown): string {
  const raw = typeof ref === "string" ? ref : (ref as { id: string }).id;
  return raw.split("/").pop() ?? raw;
}

export function orgSlugOf(org: Organization): string {
  return toAtsSlug(org.id.split("/").pop() ?? org.id);
}

export async function getChildOrgs(orgIdOrEntry: string | Organization): Promise<Organization[]> {
  const stem =
    typeof orgIdOrEntry === "string" ? orgStemOf(orgIdOrEntry) : orgStemOf(orgIdOrEntry.id);
  const all = await getCollection("organizations");
  return all
    .filter((o) => {
      const parent = o.data.parentOrganization as unknown as string | { id: string } | undefined;
      return !!parent && orgStemOf(parent) === stem;
    })
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function getExperienceForOrg(orgId: string): Promise<Experience[]> {
  const stem = orgStemOf(orgId);
  const all = await getCollection("experience");
  return all
    .filter((e) => orgStemOf(e.data.worksFor as unknown as string | { id: string }) === stem)
    .sort((a, b) => (a.data.startDate < b.data.startDate ? 1 : -1));
}

export async function getCredentialsForOrg(orgId: string): Promise<Credential[]> {
  const stem = orgStemOf(orgId);
  const all = await getCollection("credentials");
  return all
    .filter((c) => {
      const rec = c.data.recognizedBy as unknown as string | { id: string } | undefined;
      return !!rec && orgStemOf(rec) === stem;
    })
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function getEducationForOrg(orgId: string): Promise<Education[]> {
  const stem = orgStemOf(orgId);
  const all = await getCollection("education");
  return all
    .filter((e) => {
      const rec = orgStemOf(e.data.recognizedBy);
      const dept = e.data.department ? orgStemOf(e.data.department) : null;
      return rec === stem || dept === stem;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
