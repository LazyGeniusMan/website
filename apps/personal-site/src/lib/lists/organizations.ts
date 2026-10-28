import type { ImageMetadata } from "astro";
import { getCollection } from "astro:content";
import { orgSlugOf, orgStemOf, publishedProjects, toAtsSlug } from "../collections";
import { ORG_LOGO_BY_STEM } from "../orgLogos";
import type { ListGroup, ListItem } from "./types";

export const ORGANIZATIONS_PATH = "/organizations";
export const ORGANIZATIONS_PAGE_SIZE = 6;

export type OrganizationEntry = Awaited<ReturnType<typeof getOrganizationEntries>>[number];

export async function getOrganizationThumbSources(
  orgs: OrganizationEntry[],
): Promise<Map<string, { src: ImageMetadata; alt: string }>> {
  const out = new Map<string, { src: ImageMetadata; alt: string }>();
  for (const o of orgs) {
    const stem = orgStemOf(o.id);
    const bundled = (ORG_LOGO_BY_STEM as Record<string, ImageMetadata | undefined>)[stem];
    const entryLogo = (o.data as unknown as { logo?: ImageMetadata }).logo;
    const entryHero = (o.data as unknown as { heroImage?: ImageMetadata }).heroImage;
    const src = entryLogo ?? entryHero ?? bundled;
    if (src) out.set(o.id, { src, alt: `${o.data.name} logo` });
  }
  return out;
}

async function getOrganizationEntries() {
  return getCollection("organizations");
}

export const orgTypeLabel = (t?: string): string =>
  t === "CollegeOrUniversity"
    ? "College or university"
    : t === "EducationalOrganization"
      ? "Faculty or school"
      : t === "Organization"
        ? "Organization"
        : t || "Organization";

export async function getOrganizationsList(): Promise<{
  sorted: OrganizationEntry[];
  groups: ListGroup[];
  items: ListItem[];
  parentNameOf: (o: OrganizationEntry) => string | null;
  deptNameOf: (o: OrganizationEntry) => string | null;
  parentStemOf: (o: OrganizationEntry) => string | null;
  countsOf: (o: OrganizationEntry) => string;
}> {
  const orgsAll = await getOrganizationEntries();
  const expAll = await getCollection("experience");
  const projectsAll = await publishedProjects();
  const credsAll = await getCollection("credentials");
  const eduAll = await getCollection("education");
  const sorted = [...orgsAll].sort((a, b) => a.data.name.localeCompare(b.data.name));
  const byStem = new Map(orgsAll.map((o) => [orgStemOf(o.id), o]));

  const parentStemOf = (o: OrganizationEntry): string | null => {
    const parent = o.data.parentOrganization as unknown as string | { id: string } | undefined;
    return parent ? orgStemOf(parent) : null;
  };
  const parentNameOf = (o: OrganizationEntry): string | null => {
    const stem = parentStemOf(o);
    return stem ? (byStem.get(stem)?.data.name ?? stem) : null;
  };
  const deptNameOf = (o: OrganizationEntry): string | null => {
    const dept = o.data.department as unknown as string | { name: string } | undefined;
    if (!dept) return null;
    return typeof dept === "string" ? dept : (dept.name ?? null);
  };

  const expStemsForOrg = (stem: string): string[] =>
    expAll
      .filter((e) => orgStemOf(e.data.worksFor as unknown as string | { id: string }) === stem)
      .map((e) => e.id.split("/").pop() ?? e.id);
  const projectStemsForOrg = (stem: string): string[] =>
    projectsAll
      .filter((p) => {
        const prov = (p.data.provider ?? p.data.isPartOf) as unknown as
          | string
          | { id: string }
          | undefined;
        return !!prov && orgStemOf(prov) === stem;
      })
      .map((p) => p.id.split("/").pop() ?? p.id);
  const credentialStemsForOrg = (stem: string): string[] =>
    credsAll
      .filter((c) => {
        const rec = c.data.recognizedBy as unknown as string | { id: string } | undefined;
        return !!rec && orgStemOf(rec) === stem;
      })
      .map((c) => c.id.split("/").pop() ?? c.id);
  const educationStemsForOrg = (stem: string): string[] =>
    eduAll
      .filter(
        (e) =>
          orgStemOf(e.data.recognizedBy) === stem ||
          (e.data.department ? orgStemOf(e.data.department) === stem : false),
      )
      .map((e) => e.id.split("/").pop() ?? e.id);

  const expNameByStem = new Map(
    expAll.map((e) => [e.id.split("/").pop() ?? e.id, e.data.roleName]),
  );
  const projectNameByStem = new Map(
    projectsAll.map((p) => [p.id.split("/").pop() ?? p.id, p.data.title]),
  );
  const credentialNameByStem = new Map(
    credsAll.map((c) => [c.id.split("/").pop() ?? c.id, c.data.name]),
  );
  const credentialSlugOf = (stem: string): string => {
    const c = credsAll.find((e) => (e.id.split("/").pop() ?? e.id) === stem);
    const pub = (c?.data as { publicSlug?: string } | undefined)?.publicSlug;
    return toAtsSlug(pub ?? stem);
  };
  const educationNameByStem = new Map(
    eduAll.map((e) => [e.id.split("/").pop() ?? e.id, e.data.name]),
  );
  const educationSlugOf = (stem: string): string => {
    const e = eduAll.find((entry) => (entry.id.split("/").pop() ?? entry.id) === stem);
    const pub = (e?.data as { publicSlug?: string } | undefined)?.publicSlug;
    return toAtsSlug(pub ?? stem);
  };

  const opt = (ids: string[], names: Map<string, string>) =>
    [...new Map(ids.map((id) => [id, { id, label: names.get(id) ?? id }] as const)).values()].sort(
      (a, b) => a.label.localeCompare(b.label),
    );

  const groups: ListGroup[] = [
    {
      key: "type",
      label: "Type",
      options: [
        ...new Map(
          sorted.map(
            (o) =>
              [
                o.data.type ?? "Organization",
                { id: o.data.type ?? "Organization", label: orgTypeLabel(o.data.type) },
              ] as const,
          ),
        ).values(),
      ].sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      key: "parent",
      label: "Parent organization",
      options: [
        ...new Map(
          sorted
            .map(parentStemOf)
            .filter((s): s is string => !!s)
            .map(
              (stem) => [stem, { id: stem, label: byStem.get(stem)?.data.name ?? stem }] as const,
            ),
        ).values(),
      ].sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      key: "experience",
      label: "Experience at organization",
      options: opt(
        sorted.flatMap((o) => expStemsForOrg(orgStemOf(o.id))),
        expNameByStem,
      ),
    },
    {
      key: "project",
      label: "Project with organization",
      options: opt(
        sorted.flatMap((o) => projectStemsForOrg(orgStemOf(o.id))),
        projectNameByStem,
      ),
    },
    {
      key: "credential",
      label: "Credential from organization",
      options: opt(
        sorted.flatMap((o) => credentialStemsForOrg(orgStemOf(o.id))),
        credentialNameByStem,
      ),
    },
    {
      key: "education",
      label: "Education at organization",
      options: opt(
        sorted.flatMap((o) => educationStemsForOrg(orgStemOf(o.id))),
        educationNameByStem,
      ),
    },
  ].filter((g) => g.options.length > 0);

  const countsOf = (o: OrganizationEntry): string => {
    const stem = orgStemOf(o.id);
    const parts: string[] = [];
    const nExp = expStemsForOrg(stem).length;
    const nProj = projectStemsForOrg(stem).length;
    const nCred = credentialStemsForOrg(stem).length;
    const nEdu = educationStemsForOrg(stem).length;
    if (nExp > 0) parts.push(`${nExp} ${nExp === 1 ? "role" : "roles"}`);
    if (nProj > 0) parts.push(`${nProj} ${nProj === 1 ? "project" : "projects"}`);
    if (nCred > 0) parts.push(`${nCred} ${nCred === 1 ? "credential" : "credentials"}`);
    if (nEdu > 0) parts.push(`${nEdu} education ${nEdu === 1 ? "record" : "records"}`);
    return parts.join(" · ");
  };

  const items: ListItem[] = sorted.map((o) => {
    const slug = orgSlugOf(o);
    const stem = orgStemOf(o.id);
    const parentStem = parentStemOf(o);
    const parentName = parentNameOf(o);
    const dept = deptNameOf(o);
    const expStems = expStemsForOrg(stem);
    const projStems = projectStemsForOrg(stem);
    const credStems = credentialStemsForOrg(stem);
    const eduStems = educationStemsForOrg(stem);
    const top: { label: string; href: string }[] = [
      ...expStems.slice(0, 1).map((s) => ({
        label: expNameByStem.get(s) ?? s,
        href: `/experience/${toAtsSlug(s)}`,
      })),
      ...projStems.slice(0, 1).map((s) => ({
        label: projectNameByStem.get(s) ?? s,
        href: `/projects/${toAtsSlug(s)}`,
      })),
      ...credStems.slice(0, 1).map((s) => ({
        label: credentialNameByStem.get(s) ?? s,
        href: `/certifications/${credentialSlugOf(s)}`,
      })),
      ...eduStems.slice(0, 1).map((s) => ({
        label: educationNameByStem.get(s) ?? s,
        href: `/education/${educationSlugOf(s)}`,
      })),
    ].slice(0, 3);
    const counts = countsOf(o);
    return {
      id: slug,
      title: o.data.name,
      detail: [o.data.alternateName, orgTypeLabel(o.data.type)].filter(Boolean).join(" · "),
      meta: [parentName ? `Part of ${parentName}` : "Top-level", dept, counts]
        .filter(Boolean)
        .join(" · "),
      href: `/organizations/${slug}`,
      facets: {
        type: [o.data.type ?? "Organization"],
        parent: parentStem ? [parentStem] : [],
        experience: expStems,
        project: projStems,
        credential: credStems,
        education: educationStemsForOrg(stem),
      },
      badges: top.length > 0 ? top.map((t) => t.label) : [orgTypeLabel(o.data.type)],
      badgeHrefs: top.length > 0 ? top.map((t) => t.href) : [],
      hashBadges: false,
    };
  });

  return { sorted, groups, items, parentNameOf, deptNameOf, parentStemOf, countsOf };
}
