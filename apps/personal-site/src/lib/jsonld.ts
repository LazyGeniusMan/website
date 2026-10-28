import type {
  BlogPosting,
  BreadcrumbList,
  CollectionPage,
  CollegeOrUniversity,
  DefinedTerm,
  DefinedTermSet,
  EducationalOccupationalCredential,
  EducationalOrganization,
  EmployeeRole,
  Graph,
  ImageObject,
  ItemAvailability,
  Occupation,
  Offer,
  Organization,
  Person,
  PropertyValue,
  Role,
  SoftwareApplication,
  SoftwareSourceCode,
  Thing,
  WebPage,
  WebSite,
} from "schema-dts";
import { IMAGE_CREDITS } from "../data/credits";
import { expandMonthPrecision, responsibilitiesToString } from "./schema/base";
import type { BlogPost, Project } from "./collections";

export const SITE = "https://yansyah.my.id";
export const PERSON_ID = `${SITE}/#person`;
export const WEBSITE_ID = `${SITE}/#website`;
export const TERMSET_ID = `${SITE}/skills#termset`;

export function atsSlug(input: string): string {
  const ascii = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 75)
    .replace(/-+$/g, "");
  if (!ascii) throw new Error(`atsSlug: no slug characters in ${JSON.stringify(input)}`);
  return ascii;
}

export function collectionItemUrl(prefix: string, id: string): string {
  const stem = id.split("/").pop() ?? id;
  return abs(`/${prefix}/${atsSlug(stem)}`);
}

export function abs(path: string): string {
  if (path.startsWith("http")) return path;
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE}${path}`;
}

export function resolveSiteUrl(astroSite?: string | URL | null): string {
  if (!astroSite) return SITE;
  const s = astroSite.toString().replace(/\/$/, "");
  if (s !== SITE) throw new Error(`resolveSiteUrl: Astro.site (${s}) !== SITE (${SITE})`);
  return s;
}

export interface IdReference {
  "@id": string;
}

export function safeJsonLd(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/<\/(script)/gi, "<\\/$1")
    .replace(/<!--/g, "<\\!--");
}

export function skillTermRefs(siteUrl: string, refs: readonly unknown[]): IdReference[] {
  return (refs as (string | { id: string })[]).map((r) => {
    const raw = typeof r === "string" ? r : r.id;
    return { "@id": `${siteUrl}/skills/${atsSlug(raw.split("/").pop() ?? raw)}#term` };
  });
}

export function webpageId(path: string): string {
  const clean = path === "/" ? "/" : path;
  return `${SITE}${clean}#webpage`;
}

export function breadcrumbId(path: string): string {
  const clean = path === "/" ? "/" : path;
  return `${SITE}${clean}#breadcrumb`;
}

export function personStub(): Person {
  return { "@type": "Person", "@id": PERSON_ID } as const;
}

export function termsetStub(): DefinedTermSet {
  return { "@type": "DefinedTermSet", "@id": TERMSET_ID } as const;
}

export function websiteNode(): WebSite {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE}/`,
    name: "Andriyansyah Nurrachman",
    author: personStub(),
  };
}

export function breadcrumbNode(
  path: string,
  trail: { name: string; item: string }[],
): BreadcrumbList {
  return {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId(path),
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: abs(t.item),
    })),
  };
}

export function resolvePersonImageUrl(image: string | { src: string }): string {
  if (typeof image === "object") {
    return image.src.startsWith("http") ? image.src : abs(image.src);
  }
  if (image.startsWith("http")) return image;
  const fileName = image.split("/").pop() ?? image;
  if (fileName !== image && fileName.includes(".")) return abs(`/assets/${fileName}`);
  return abs(image);
}

export function personFullNode(data: {
  name: string;
  jobTitle?: string;
  description: string;
  url: string;
  email?: string;
  image?: string | { src: string };
  sameAs: string[];
  knowsAboutIds?: string[];
  occupationIds?: string[];
  alumniIds?: string[];
  credentialIds?: string[];
  educationIds?: string[];
  knowsLanguage?: string[];
  address?: { addressLocality?: string; addressCountry?: string };
}): Person {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: data.name,
    ...(data.jobTitle ? { jobTitle: data.jobTitle } : {}),
    description: data.description,
    url: data.url,
    ...(data.email ? { email: `mailto:${data.email}` } : {}),
    ...(data.image ? { image: resolvePersonImageUrl(data.image) } : {}),
    sameAs: data.sameAs,
    ...(data.educationIds?.length
      ? {
          hasCredential: [
            ...(data.credentialIds ?? []).map((id) => ({
              "@id": `${SITE}/certifications/${id}#credential`,
            })),
            ...data.educationIds.map((id) => ({
              "@id": `${SITE}/education/${id}#credential`,
            })),
          ],
        }
      : data.credentialIds?.length
        ? {
            hasCredential: data.credentialIds.map((id) => ({
              "@id": `${SITE}/certifications/${id}#credential`,
            })),
          }
        : {}),
    ...(data.knowsAboutIds?.length
      ? { knowsAbout: data.knowsAboutIds.map((id) => ({ "@id": `${SITE}/skills/${id}#term` })) }
      : {}),
    ...(data.occupationIds?.length
      ? {
          hasOccupation: data.occupationIds.map((id) => ({
            "@id": `${SITE}/experience/${id}#occupation`,
          })),
        }
      : {}),
    ...(data.alumniIds?.length
      ? { alumniOf: data.alumniIds.map((id) => ({ "@id": `${SITE}/organizations/${id}#org` })) }
      : {}),
    knowsLanguage: data.knowsLanguage?.length ? data.knowsLanguage : ["id", "en"],
    ...(data.address
      ? {
          address: {
            "@type": "PostalAddress",
            ...(data.address.addressLocality
              ? { addressLocality: data.address.addressLocality }
              : {}),
            ...(data.address.addressCountry ? { addressCountry: data.address.addressCountry } : {}),
          },
        }
      : {}),
  };
}

export function imageObjectNode(opts: {
  id: string;
  url: string;
  credit?: string;
  source?: string;
}): ImageObject {
  return {
    "@type": "ImageObject",
    "@id": opts.id,
    url: opts.url.startsWith("http") ? opts.url : abs(opts.url),
    ...(opts.credit ? { creator: opts.credit, creditText: opts.credit } : {}),
    ...(opts.source ? { acquireLicensePage: opts.source } : {}),
  };
}

export function heroImageNode(params: {
  heroImage: unknown;
  heroCredit?: string;
  heroSource?: string;
  pagePath: string;
}): ImageObject | null {
  const { heroImage, heroCredit, heroSource } = params;
  if (!heroImage) return null;
  let url: string;
  let fileName = "";
  const FALLBACK_IMAGE = ["image", "webp"].join(".");
  if (typeof heroImage === "string") {
    fileName = heroImage.split("/").pop() ?? "";
    url = heroImage.startsWith("http") ? heroImage : abs(`/assets/${fileName || FALLBACK_IMAGE}`);
  } else if (typeof heroImage === "object" && heroImage !== null && "src" in heroImage) {
    const src = (heroImage as { src: string }).src;
    fileName = src.split("/").pop()?.split("?")[0] ?? "";
    url = src.startsWith("http") ? src : abs(src);
  } else {
    return null;
  }
  const stem = fileName.replace(/\.[a-fA-F0-9]{6,}\./, ".");
  const creditEntry =
    IMAGE_CREDITS.find((c) => c.file === fileName) ??
    IMAGE_CREDITS.find((c) => stem === c.file) ??
    IMAGE_CREDITS.find((c) => fileName.startsWith(c.file.replace(/\.\w+$/, ".")));
  const credit = heroCredit ?? creditEntry?.credit;
  const source = heroSource ?? creditEntry?.sourceUrl;
  return imageObjectNode({
    id: `${url}#image`,
    url,
    credit,
    source,
  }) as ImageObject;
}

export function toSiteIsoDate(date: Date): string {
  return date.toISOString();
}

export function toSiteMonthIso(month: string): string {
  return expandMonthPrecision(month);
}

export function toSiteYearMonthIso(yearMonth: string): string {
  if (/^\d{4}$/.test(yearMonth)) return yearMonth;
  return expandMonthPrecision(yearMonth);
}

export function mergedKeywords(tags: unknown, keywords: unknown): string | undefined {
  const parts = [
    ...(Array.isArray(tags) ? tags : []),
    ...(Array.isArray(keywords) ? keywords : []),
  ].filter((t): t is string => typeof t === "string" && t.length > 0);
  const deduped = [...new Set(parts)];
  return deduped.length ? deduped.join(", ") : undefined;
}

export function imageIdOf(node: ImageObject | null | undefined): string | undefined {
  if (!node) return undefined;
  return (node as unknown as { "@id": string })["@id"];
}

export function personRefNode(siteUrl: string, name = "Andriyansyah Nurrachman"): Person {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name,
    url: `${siteUrl}/`,
  } satisfies Person;
}

const UNTRACKED_IMAGE_SRC = Symbol.for("astro:image-asset:raw-src");
function untrackedLogoSrc(logo: { src: string }): string {
  if (typeof logo === "object" && logo !== null && UNTRACKED_IMAGE_SRC in logo) {
    return (logo as unknown as Record<symbol, string>)[UNTRACKED_IMAGE_SRC];
  }
  return logo.src;
}
export function resolveOrganizationLogoUrl(logo: string | { src: string }): string | undefined {
  const raw = typeof logo === "object" ? untrackedLogoSrc(logo) : logo;
  if (raw.startsWith("http")) return raw;
  const clean = raw.split("?")[0].split("#")[0];
  if (raw.startsWith("/") && !/\.(jpe?g|png)$/i.test(clean)) return abs(raw);
  return undefined;
}
export function organizationNode(opts: {
  slug: string;
  siteUrl: string;
  type?: "Organization" | "CollegeOrUniversity" | "EducationalOrganization";
  name: string;
  alternateName?: string;
  description?: string;
  url?: string;
  logo?: string | { src: string };
  sameAs?: string[];
  parentStem?: string;
  department?: string | { name: string };
}): Organization | CollegeOrUniversity | EducationalOrganization {
  const deptName = typeof opts.department === "string" ? opts.department : opts.department?.name;
  const slug = atsSlug(opts.slug.split("/").pop() ?? opts.slug);
  const parentStem = opts.parentStem
    ? atsSlug(opts.parentStem.split("/").pop() ?? opts.parentStem)
    : "";
  const logoUrl = opts.logo ? resolveOrganizationLogoUrl(opts.logo) : undefined;
  return {
    "@type": opts.type ?? "Organization",
    "@id": `${opts.siteUrl}/organizations/${slug}#org`,
    name: opts.name,
    ...(opts.alternateName ? { alternateName: opts.alternateName } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.url ? { url: opts.url } : {}),
    ...(logoUrl ? { logo: logoUrl } : {}),
    ...(opts.sameAs?.length ? { sameAs: opts.sameAs } : {}),
    ...(parentStem
      ? { parentOrganization: { "@id": `${opts.siteUrl}/organizations/${parentStem}#org` } }
      : {}),
    ...(deptName ? { department: { "@type": "Organization", name: deptName } } : {}),
  } satisfies Organization | CollegeOrUniversity | EducationalOrganization;
}

export interface ProviderOrgDetails {
  name: string;
  type?: "Organization" | "CollegeOrUniversity" | "EducationalOrganization";
  url?: string;
  logo?: string | { src: string };
  sameAs?: string[];
  parentStem?: string;
}
export function providerOrgNode(
  siteUrl: string,
  stem: string,
  org: ProviderOrgDetails,
): Organization | CollegeOrUniversity | EducationalOrganization {
  const slug = atsSlug(stem.split("/").pop() ?? stem);
  const parentStem = org.parentStem
    ? atsSlug(org.parentStem.split("/").pop() ?? org.parentStem)
    : undefined;
  return organizationNode({
    slug,
    siteUrl,
    name: org.name,
    type: org.type ?? "Organization",
    ...(org.url ? { url: org.url } : {}),
    ...(org.logo ? { logo: org.logo } : {}),
    ...(org.sameAs?.length ? { sameAs: [...org.sameAs] } : {}),
    ...(parentStem ? { parentStem } : {}),
  });
}

export interface DefinedTermNodeExtra {
  additionalProperty?: PropertyValue[];
}
export function definedTermNode(opts: {
  slug: string;
  siteUrl: string;
  name: string;
  alternateName?: string;
  description: string;
  proficiencyLevel?: string;
  category?: string;
  url?: string;
  sameAs?: string[];
}): DefinedTerm & DefinedTermNodeExtra {
  const extra: PropertyValue[] = [
    ...(opts.proficiencyLevel
      ? [
          {
            "@type": "PropertyValue",
            name: "proficiencyLevel",
            value: opts.proficiencyLevel,
          } as PropertyValue,
        ]
      : []),
    ...(opts.category
      ? [{ "@type": "PropertyValue", name: "category", value: opts.category } as PropertyValue]
      : []),
  ];
  return {
    "@type": "DefinedTerm",
    "@id": `${opts.siteUrl}/skills/${atsSlug(opts.slug.split("/").pop() ?? opts.slug)}#term`,
    name: opts.name,
    ...(opts.alternateName ? { alternateName: opts.alternateName } : {}),
    description: opts.description,
    inDefinedTermSet: { "@id": `${opts.siteUrl}/skills#termset` },
    ...(opts.proficiencyLevel ? { termCode: opts.proficiencyLevel } : {}),
    ...(extra.length ? { additionalProperty: extra } : {}),
    ...(opts.url ? { url: opts.url } : {}),
    ...(opts.sameAs?.length ? { sameAs: opts.sameAs } : {}),
  } satisfies DefinedTerm & DefinedTermNodeExtra;
}

export function definedTermSetNode(opts: {
  siteUrl: string;
  name: string;
  description: string;
}): DefinedTermSet {
  return {
    "@type": "DefinedTermSet",
    "@id": `${opts.siteUrl}/skills#termset`,
    url: `${opts.siteUrl}/skills`,
    name: opts.name,
    description: opts.description,
    author: { "@id": PERSON_ID },
  } satisfies DefinedTermSet;
}

export interface OccupationNodeExtra {
  additionalProperty?: PropertyValue[];
}
export function occupationNode(opts: {
  slug: string;
  siteUrl: string;
  name: string;
  description: string;
  url?: string;
  skills?: string;
  skillsNote?: string;
  skillStems?: readonly string[];
  responsibilities?: string | string[];
}): Occupation & OccupationNodeExtra {
  const slug = atsSlug(opts.slug.split("/").pop() ?? opts.slug);
  const responsibilities = responsibilitiesToString(opts.responsibilities);
  return {
    "@type": "Occupation",
    "@id": `${opts.siteUrl}/experience/${slug}#occupation`,
    name: opts.name,
    description: opts.description,
    ...(opts.url ? { url: opts.url } : {}),
    ...(opts.skills ? { skills: opts.skills } : {}),
    ...(opts.skillStems?.length
      ? {
          skills: opts.skillStems.map((s) => ({
            "@id": `${opts.siteUrl}/skills/${atsSlug(s.split("/").pop() ?? s)}#term`,
          })),
        }
      : {}),
    ...(responsibilities ? { responsibilities } : {}),
    ...(opts.skillsNote
      ? {
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "skillsNote",
              value: opts.skillsNote,
            } as PropertyValue,
          ],
        }
      : {}),
  } satisfies Occupation & OccupationNodeExtra;
}

export function employeeRoleNode(opts: {
  slug: string;
  siteUrl: string;
  roleName: string;
  startDate: string;
  endDate?: string;
  orgSlug: string;
  url?: string;
  jobLocation?: string | { name: string };
  employmentType?: string;
}): EmployeeRole<IdReference, "worksFor"> & {
  jobLocation?: { "@type": "Place"; name: string };
  additionalProperty?: PropertyValue[];
} {
  const locName = typeof opts.jobLocation === "string" ? opts.jobLocation : opts.jobLocation?.name;
  const slug = atsSlug(opts.slug.split("/").pop() ?? opts.slug);
  const orgSlug = atsSlug(opts.orgSlug.split("/").pop() ?? opts.orgSlug);
  return {
    "@type": "EmployeeRole",
    "@id": `${opts.siteUrl}/experience/${slug}#role`,
    roleName: opts.roleName,
    startDate: toSiteMonthIso(opts.startDate),
    ...(opts.endDate ? { endDate: toSiteMonthIso(opts.endDate) } : {}),
    worksFor: { "@id": `${opts.siteUrl}/organizations/${orgSlug}#org` },
    ...(opts.url ? { url: opts.url } : {}),
    ...(locName ? { jobLocation: { "@type": "Place" as const, name: locName } } : {}),
    ...(opts.employmentType
      ? {
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "employmentType",
              value: opts.employmentType,
            } as PropertyValue,
          ],
        }
      : {}),
  } satisfies EmployeeRole<IdReference, "worksFor"> & {
    jobLocation?: { "@type": "Place"; name: string };
    additionalProperty?: PropertyValue[];
  };
}

export function contributorRoleNode(roleName: string): Role<IdReference, "contributor"> {
  return {
    "@type": "Role",
    roleName,
    contributor: { "@id": PERSON_ID },
  };
}

const ITEM_AVAILABILITY_TOKENS = new Set([
  "BackOrder",
  "Discontinued",
  "InStock",
  "InStoreOnly",
  "LimitedAvailability",
  "MadeToOrder",
  "OnlineOnly",
  "OutOfStock",
  "PreOrder",
  "PreSale",
  "Reserved",
  "SoldOut",
]);

export function isItemAvailability(value: string): value is Extract<ItemAvailability, string> {
  if (value.startsWith("https://schema.org/")) {
    return ITEM_AVAILABILITY_TOKENS.has(value.slice("https://schema.org/".length));
  }
  return ITEM_AVAILABILITY_TOKENS.has(value);
}

export function offersNode(offers: {
  price: string;
  priceCurrency?: string;
  availability?: string;
  url?: string;
}): Offer {
  return {
    "@type": "Offer",
    price: offers.price,
    priceCurrency: offers.priceCurrency ?? "IDR",
    ...(offers.availability && isItemAvailability(offers.availability)
      ? { availability: offers.availability }
      : {}),
    ...(offers.url ? { url: offers.url } : {}),
  } satisfies Offer;
}

export function licenseValue(
  license: string | { name: string; url?: string },
): string | { "@type": "CreativeWork"; name: string; url?: string } {
  if (typeof license === "string") {
    if (license.startsWith("http")) return license;
    return { "@type": "CreativeWork", name: license };
  }
  return {
    "@type": "CreativeWork",
    name: license.name,
    ...(license.url ? { url: license.url } : {}),
  };
}

export interface CredentialNodeExtra {
  additionalProperty?: PropertyValue[];
}
export function credentialNode(opts: {
  slug: string;
  siteUrl: string;
  name: string;
  description?: string;
  credentialCategory?: string;
  educationalLevel?: string;
  identifier?: string;
  dateCreated?: Date;
  expires?: Date;
  recognizedByStem?: string;
  departmentStem?: string;
  aboutStems?: readonly string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  pathPrefix?: "certifications" | "education";
}): EducationalOccupationalCredential & CredentialNodeExtra {
  const prefix = opts.pathPrefix ?? "certifications";
  const slug = atsSlug(opts.slug.split("/").pop() ?? opts.slug);
  const recognizedByStem = opts.recognizedByStem
    ? atsSlug(opts.recognizedByStem.split("/").pop() ?? opts.recognizedByStem)
    : undefined;
  const departmentStem = opts.departmentStem
    ? atsSlug(opts.departmentStem.split("/").pop() ?? opts.departmentStem)
    : undefined;
  const aboutStems = opts.aboutStems?.map((s) => atsSlug(s.split("/").pop() ?? s));
  const aboutIds = [
    ...(departmentStem ? [{ "@id": `${opts.siteUrl}/organizations/${departmentStem}#org` }] : []),
    ...(aboutStems?.map((s) => ({ "@id": `${opts.siteUrl}/skills/${s}#term` })) ?? []),
  ];
  const attendance: PropertyValue[] = [
    ...(opts.startDate
      ? [
          {
            "@type": "PropertyValue",
            name: "startDate",
            value: toSiteYearMonthIso(opts.startDate),
          } as PropertyValue,
        ]
      : []),
    ...(opts.endDate
      ? [
          {
            "@type": "PropertyValue",
            name: "endDate",
            value: toSiteYearMonthIso(opts.endDate),
          } as PropertyValue,
        ]
      : []),
  ];
  return {
    "@type": "EducationalOccupationalCredential",
    "@id": `${opts.siteUrl}/${prefix}/${slug}#credential`,
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.credentialCategory ? { credentialCategory: opts.credentialCategory } : {}),
    ...(opts.educationalLevel ? { educationalLevel: opts.educationalLevel } : {}),
    ...(opts.identifier ? { identifier: opts.identifier } : {}),
    ...(opts.dateCreated ? { dateCreated: toSiteIsoDate(opts.dateCreated) } : {}),
    ...(opts.expires ? { expires: toSiteIsoDate(opts.expires) } : {}),
    ...(opts.url ? { url: opts.url } : {}),
    ...(recognizedByStem
      ? { recognizedBy: { "@id": `${opts.siteUrl}/organizations/${recognizedByStem}#org` } }
      : {}),
    ...(aboutIds.length ? { about: aboutIds } : {}),
    ...(attendance.length ? { additionalProperty: attendance } : {}),
  } satisfies EducationalOccupationalCredential & CredentialNodeExtra;
}

export function webpageDetailNode(
  path: string,
  siteUrl: string,
  name: string,
  extra?: Record<string, unknown>,
): WebPage {
  return {
    "@type": "WebPage",
    "@id": webpageId(path),
    url: `${siteUrl}${path}`,
    name,
    isPartOf: { "@id": WEBSITE_ID },
    breadcrumb: { "@id": breadcrumbId(path) },
    ...extra,
  } satisfies WebPage;
}

export function blogIndexNode(opts: {
  path: string;
  siteUrl: string;
  name: string;
  description?: string;
  items?: readonly CollectionListItem[];
  extra?: Record<string, unknown>;
}): CollectionPage {
  return {
    "@type": "CollectionPage",
    "@id": webpageId(opts.path),
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    url: `${opts.siteUrl}${opts.path}`,
    author: { "@id": PERSON_ID },
    isPartOf: { "@id": WEBSITE_ID },
    breadcrumb: { "@id": breadcrumbId(opts.path) },
    ...(opts.items?.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: opts.items.map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: item.name,
              url: item.url,
            })),
          },
        }
      : {}),
    ...opts.extra,
  } satisfies CollectionPage;
}

export interface CollectionListItem {
  name: string;
  url: string;
}

export function collectionPageNode(opts: {
  path: string;
  siteUrl: string;
  name: string;
  description: string;
  items?: readonly CollectionListItem[];
}): CollectionPage {
  return {
    "@type": "CollectionPage",
    "@id": webpageId(opts.path),
    url: `${opts.siteUrl}${opts.path}`,
    name: opts.name,
    description: opts.description,
    author: { "@id": PERSON_ID },
    isPartOf: { "@id": WEBSITE_ID },
    breadcrumb: { "@id": breadcrumbId(opts.path) },
    ...(opts.items?.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: opts.items.map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: item.name,
              url: item.url,
            })),
          },
        }
      : {}),
  } satisfies CollectionPage;
}

export interface BlogPostingHydrated {
  authors: readonly unknown[];
  about: readonly unknown[];
  mentions: readonly unknown[];
  aboutExperience?: readonly unknown[];
}

export function blogPostingNode(
  entry: BlogPost,
  hydrated: BlogPostingHydrated,
  siteUrl: string,
  imageId?: string,
): BlogPosting {
  const aboutRefs = (entry.data.about ?? []) as { id: string }[];
  const aboutExpRefs = ((entry.data as { aboutExperience?: unknown }).aboutExperience ?? []) as {
    id: string;
  }[];
  const hydratedAboutExp = hydrated.aboutExperience ?? [];
  const mentionRefs = (entry.data.mentions ?? []) as { id: string }[];
  const authorRefs = (entry.data.author ?? []) as { id: string }[];
  if (hydrated.about.length !== aboutRefs.length) {
    throw new Error(
      `blogPostingNode: blog/${entry.id} about hydration mismatch (refs=${aboutRefs.length}, resolved=${hydrated.about.length})`,
    );
  }
  if (hydratedAboutExp.length !== aboutExpRefs.length) {
    throw new Error(
      `blogPostingNode: blog/${entry.id} aboutExperience hydration mismatch (refs=${aboutExpRefs.length}, resolved=${hydratedAboutExp.length})`,
    );
  }
  if (hydrated.mentions.length !== mentionRefs.length) {
    throw new Error(
      `blogPostingNode: blog/${entry.id} mentions hydration mismatch (refs=${mentionRefs.length}, resolved=${hydrated.mentions.length})`,
    );
  }
  if (hydrated.authors.length !== authorRefs.length) {
    throw new Error(
      `blogPostingNode: blog/${entry.id} author hydration mismatch (refs=${authorRefs.length}, resolved=${hydrated.authors.length})`,
    );
  }
  const authorList = hydrated.authors as { data?: { name?: string } }[];
  const authorNodes = authorList.map((a) => ({
    "@type": "Person" as const,
    "@id": PERSON_ID,
    name: a?.data?.name ?? "Andriyansyah Nurrachman",
    url: `${siteUrl}/`,
  }));
  const fallbackAuthor = {
    "@type": "Person" as const,
    "@id": PERSON_ID,
    name: "Andriyansyah Nurrachman",
    url: `${siteUrl}/`,
  };
  const publisherName = authorNodes[0]?.name ?? fallbackAuthor.name;
  const postSlug = atsSlug(entry.id.split("/").pop() ?? entry.id);
  const refSlug = (r: string | { id: string }): string =>
    atsSlug(typeof r === "string" ? r : (r.id.split("/").pop() ?? r.id));
  return {
    "@type": "BlogPosting",
    "@id": `${siteUrl}/blog/${postSlug}#post`,
    headline: entry.data.title,
    description: entry.data.description,
    datePublished: toSiteIsoDate(entry.data.pubDate),
    ...(entry.data.dateModified
      ? { dateModified: toSiteIsoDate(entry.data.dateModified as Date) }
      : {}),
    ...(mergedKeywords(entry.data.tags, entry.data.keywords)
      ? { keywords: mergedKeywords(entry.data.tags, entry.data.keywords) }
      : {}),
    inLanguage: (entry.data.inLanguage as string) ?? "id",
    author: authorNodes.length ? authorNodes : [fallbackAuthor],
    publisher: {
      "@type": "Organization",
      "@id": `${siteUrl}/#publisher`,
      name: publisherName,
      url: `${siteUrl}/`,
      logo: {
        "@type": "ImageObject",
        "@id": `${siteUrl}/#logo`,
        url: `${siteUrl}/favicon.svg`,
      },
    },
    ...(imageId ? { image: { "@id": imageId } } : {}),
    mainEntityOfPage: { "@id": webpageId(`/blog/${postSlug}`) },
    ...(aboutRefs.length || aboutExpRefs.length
      ? {
          about: [
            ...aboutRefs.map((r) => ({
              "@id": `${siteUrl}/projects/${refSlug(r as unknown as string | { id: string })}#project`,
            })),
            ...aboutExpRefs.map((r) => ({
              "@id": `${siteUrl}/experience/${refSlug(r as unknown as string | { id: string })}#occupation`,
            })),
          ],
        }
      : {}),
    ...(mentionRefs.length ? { mentions: skillTermRefs(siteUrl, mentionRefs) } : {}),
  } satisfies BlogPosting;
}

export interface ProjectHydrated {
  partOfName: string | null;
  partOfStem: string;
  providerStem?: string;
  langSkills: readonly unknown[];
  relatedExperience?: readonly unknown[];
}

export type ProjectNodeExtra = { result?: string };
export function projectNode(
  entry: Project,
  hydrated: ProjectHydrated,
  siteUrl: string,
  imageId?: string,
): (SoftwareSourceCode | SoftwareApplication) & ProjectNodeExtra {
  const data = entry.data;
  const langRefs = (data.programmingLanguage ?? []) as { id: string }[];
  if (hydrated.langSkills.length !== langRefs.length) {
    throw new Error(
      `projectNode: projects/${entry.id} programmingLanguage hydration mismatch (refs=${langRefs.length}, resolved=${hydrated.langSkills.length})`,
    );
  }
  const sameAsAll = (data.sameAs ?? []) as string[];
  const sameAs = [...new Set(sameAsAll.filter((s) => s !== data.url && s !== data.codeRepository))];
  const stemOf = (r: string | { id: string }): string =>
    atsSlug(typeof r === "string" ? r : (r.id.split("/").pop() ?? r.id));
  const projectSlug = atsSlug(entry.id.split("/").pop() ?? entry.id);
  const langSkillIds = langRefs.map((r) => stemOf(r as unknown as string | { id: string }));
  const providerRef = (data as { provider?: { id: string } | string }).provider;
  const providerStemFromEntry = providerRef
    ? atsSlug(
        (typeof providerRef === "string" ? providerRef : providerRef.id).split("/").pop() ?? "",
      )
    : "";
  const providerStem = hydrated.providerStem
    ? atsSlug(hydrated.providerStem.split("/").pop() ?? hydrated.providerStem)
    : providerStemFromEntry;
  const expRefs = ((data as { relatedExperience?: unknown }).relatedExperience ?? []) as {
    id: string;
  }[];
  const hydratedRelated = hydrated.relatedExperience ?? [];
  if (hydratedRelated.length !== expRefs.length) {
    throw new Error(
      `projectNode: projects/${entry.id} relatedExperience hydration mismatch (refs=${expRefs.length}, resolved=${hydratedRelated.length})`,
    );
  }

  const rawOffers = (data as { offers?: unknown }).offers;
  const offersObject =
    rawOffers && typeof rawOffers === "object"
      ? (rawOffers as Parameters<typeof offersNode>[0])
      : null;
  const offersString = typeof rawOffers === "string" ? rawOffers : null;
  const rawLicense = (data as { license?: unknown }).license as
    | string
    | { name: string; url?: string }
    | undefined;
  const description = [data.description, offersString, data.outcome]
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .join("\n\n");
  const base = {
    "@type": data.type,
    "@id": `${siteUrl}/projects/${projectSlug}#project`,
    name: data.title,
    description,
    url: data.url ?? `${siteUrl}/projects/${projectSlug}`,
    ...(data.codeRepository ? { codeRepository: data.codeRepository } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...("applicationCategory" in data && data.applicationCategory
      ? { applicationCategory: data.applicationCategory }
      : {}),
    ...("operatingSystem" in data && data.operatingSystem
      ? { operatingSystem: data.operatingSystem }
      : {}),
    ...(typeof data.isAccessibleForFree === "boolean"
      ? { isAccessibleForFree: data.isAccessibleForFree }
      : {}),
    ...(rawLicense ? { license: licenseValue(rawLicense) } : {}),
    ...(offersObject ? { offers: offersNode(offersObject) } : {}),
    ...(data.role ? { contributor: contributorRoleNode(data.role) } : {}),
    ...(data.verificationStatus
      ? { creativeWorkStatus: data.verificationStatus === "verified" ? "Verified" : "Unverified" }
      : {}),
    ...(data.issn ? { issn: data.issn } : {}),
    ...(providerStem
      ? { provider: { "@id": `${siteUrl}/organizations/${providerStem}#org` } }
      : {}),
    ...(hydrated.partOfName
      ? {
          isPartOf: {
            "@id": `${siteUrl}/organizations/${atsSlug(hydrated.partOfStem.split("/").pop() ?? hydrated.partOfStem)}#org`,
          },
        }
      : {}),
    ...(expRefs.length
      ? {
          about: expRefs.map((r) => ({
            "@id": `${siteUrl}/experience/${stemOf(r as unknown as string | { id: string })}#occupation`,
          })),
        }
      : {}),
    ...(langSkillIds.length
      ? {
          programmingLanguage: langSkillIds.map((id) => ({
            "@id": `${siteUrl}/skills/${atsSlug(id.split("/").pop() ?? id)}#term`,
          })),
        }
      : {}),
    author: [
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: "Andriyansyah Nurrachman",
        url: `${siteUrl}/`,
      },
    ],
    datePublished: toSiteIsoDate(data.pubDate),
    ...(data.dateCreated ? { dateCreated: toSiteIsoDate(data.dateCreated as Date) } : {}),
    ...(data.dateModified ? { dateModified: toSiteIsoDate(data.dateModified as Date) } : {}),
    ...(mergedKeywords(data.tags, data.keywords)
      ? { keywords: mergedKeywords(data.tags, data.keywords) }
      : {}),
    inLanguage: (data.inLanguage as string) ?? "id",
    ...(imageId ? { image: { "@id": imageId } } : {}),
    ...(data.disambiguatingDescription
      ? { disambiguatingDescription: data.disambiguatingDescription }
      : {}),
  } satisfies SoftwareSourceCode | SoftwareApplication;
  return {
    ...base,
    ...(data.outcome ? { result: data.outcome } : {}),
  };
}

export type GraphNodes = Graph["@graph"];

export function projectStubNode(
  siteUrl: string,
  id: string,
  title: string,
  type: "SoftwareSourceCode" | "SoftwareApplication",
) {
  const slug = atsSlug(id.split("/").pop() ?? id);
  return {
    "@type": type,
    "@id": `${siteUrl}/projects/${slug}#project`,
    url: `${siteUrl}/projects/${slug}`,
    name: title,
  } as const;
}

export function occupationStubNode(siteUrl: string, slug: string, name: string) {
  const norm = atsSlug(slug.split("/").pop() ?? slug);
  return {
    "@type": "Occupation" as const,
    "@id": `${siteUrl}/experience/${norm}#occupation`,
    url: `${siteUrl}/experience/${norm}`,
    name,
  };
}

export function blogPostingStubNode(siteUrl: string, id: string, title: string) {
  const slug = atsSlug(id.split("/").pop() ?? id);
  return {
    "@type": "BlogPosting" as const,
    "@id": `${siteUrl}/blog/${slug}#post`,
    url: `${siteUrl}/blog/${slug}`,
    headline: title,
    author: [
      {
        "@type": "Person" as const,
        "@id": PERSON_ID,
        name: "Andriyansyah Nurrachman",
        url: `${siteUrl}/`,
      },
    ],
    publisher: {
      "@type": "Organization" as const,
      "@id": `${siteUrl}/#publisher`,
      name: "Andriyansyah Nurrachman",
      url: `${siteUrl}/`,
      logo: {
        "@type": "ImageObject" as const,
        "@id": `${siteUrl}/#logo`,
        url: `${siteUrl}/favicon.svg`,
      },
    },
  };
}

function graphRank(node: Thing): number {
  const t = (node as { "@type"?: unknown })["@type"];
  if (t === "WebSite") return 0;
  if (
    t === "WebPage" ||
    t === "AboutPage" ||
    t === "CollectionPage" ||
    t === "ProfilePage" ||
    t === "ContactPage"
  )
    return 1;
  if (t === "BreadcrumbList") return 3;
  return 2;
}
export function toGraph(nodes: readonly Thing[]): GraphNodes {
  const seen = new Set<string>();
  const deduped = nodes.filter((n) => {
    const id = (n as { "@id"?: unknown })["@id"];
    if (typeof id !== "string") return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return deduped
    .map((node, index) => ({ node, index }))
    .sort((a, b) => graphRank(a.node) - graphRank(b.node) || a.index - b.index)
    .map((e) => e.node);
}
