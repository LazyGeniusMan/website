import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("astro:content", async () => {
  const { z } = await import("astro/zod");
  const ref = () => z.object({ id: z.string().min(1), collection: z.string().min(1) });
  return {
    z,
    defineCollection: (c: unknown) => c,
    reference: ref,
    getCollection: () => {
      throw new Error("unit scope: getCollection is unavailable, pass hydrated fixtures");
    },
    getEntries: () => {
      throw new Error("unit scope: getEntries is unavailable, pass hydrated fixtures");
    },
  };
});

vi.mock("astro/loaders", () => ({
  glob: () => ({}),
}));

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { z } from "astro/zod";
import { collections } from "../src/content.config";
import {
  abs,
  blogIndexNode,
  blogPostingNode,
  breadcrumbNode,
  collectionPageNode,
  contributorRoleNode,
  credentialNode,
  definedTermNode,
  definedTermSetNode,
  employeeRoleNode,
  heroImageNode,
  imageObjectNode,
  isItemAvailability,
  licenseValue,
  mergedKeywords,
  occupationNode,
  offersNode,
  organizationNode,
  personFullNode,
  personRefNode,
  projectNode,
  providerOrgNode,
  resolveOrganizationLogoUrl,
  resolvePersonImageUrl,
  toGraph,
  toSiteIsoDate,
  toSiteMonthIso,
  toSiteYearMonthIso,
  webpageDetailNode,
  webpageId,
  websiteNode,
  type BlogPostingHydrated,
  type ProjectHydrated,
} from "../src/lib/jsonld";
import type { BlogPost, Project } from "../src/lib/collections";
import { SITE } from "../src/lib/jsonld";
import { expandMonthPrecision, toEntryJsonSchema } from "../src/lib/schema/base";

const schemaAnchor = z.object({});

function toDraft7(schema: z.core.$ZodType): Record<string, unknown> {
  const raw = z.toJSONSchema(schema, { unrepresentable: "any", target: "draft-07" });
  return normalizeDefaults(raw) as Record<string, unknown>;
}

function normalizeDefaults(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(normalizeDefaults);
  if (schema && typeof schema === "object") {
    const s = schema as Record<string, unknown>;
    const out: Record<string, unknown> = { ...s };
    for (const key of ["anyOf", "oneOf", "allOf"]) {
      if (Array.isArray(s[key])) out[key] = (s[key] as unknown[]).map(normalizeDefaults);
    }
    if (s["properties"] && typeof s["properties"] === "object") {
      const props = s["properties"] as Record<string, unknown>;
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) next[k] = normalizeDefaults(v);
      out["properties"] = next;
      if (Array.isArray(s["required"])) {
        const required = (s["required"] as string[]).filter((k) => {
          const p = next[k];
          return !(p && typeof p === "object" && "default" in (p as Record<string, unknown>));
        });
        if (required.length > 0) out["required"] = required;
        else delete out["required"];
      }
    }
    if (s["items"]) out["items"] = normalizeDefaults(s["items"]);
    return out;
  }
  return schema;
}

function ajvFor(schema: z.core.$ZodType) {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv.compile(toDraft7(schema));
}

const imageStub = () => z.string();

type RuntimeSchema = typeof schemaAnchor;
function asSchema(s: unknown): RuntimeSchema {
  if (typeof s === "function") {
    const fn = s as unknown as (ctx: { image: () => unknown }) => RuntimeSchema;
    return fn({ image: imageStub });
  }
  return s as unknown as RuntimeSchema;
}

const blogSchema = asSchema(collections.blog.schema);
const projectSchema = asSchema(collections.projects.schema);

function entry<T>(id: string, collection: string, data: unknown): T {
  return { id, collection, data } as unknown as T;
}

const blogData = {
  title: "Notes on process",
  description: "Short notes on BPMN and automation.",
  pubDate: "2026-02-01",
  tags: ["bpmn"],
  keywords: ["bpmn"],
  heroImage: "/assets/bandung.webp",
  heroCredit: "Owner archive",
  author: [{ id: "person/andriyansyah", collection: "person" }],
  about: [{ id: "projects/tunaya", collection: "projects" }],
  mentions: [{ id: "skills/bpmn", collection: "skills" }],
  publisher: { id: "person/andriyansyah", collection: "person" },
};

const hydratedBlog: BlogPostingHydrated = {
  authors: [{}],
  about: [{}],
  mentions: [{}],
};

const sourceData = {
  type: "SoftwareSourceCode",
  title: "Tunaya",
  description: "Watches project URLs for drift.",
  pubDate: "2024-03-15",
  draft: false,
  tags: ["automation"],
  url: "https://tunaya.example.com",
  codeRepository: "https://github.com/example/tunaya",
  sameAs: ["https://github.com/example/tunaya"],
  programmingLanguage: [{ id: "skills/typescript", collection: "skills" }],
  author: [{ id: "person/andriyansyah", collection: "person" }],
};

const appData = {
  ...sourceData,
  type: "SoftwareApplication",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
};

const hydratedProject: ProjectHydrated = {
  partOfName: null,
  partOfStem: "unpad",
  langSkills: [{}],
};

const ID_RE = /^https:\/\/yansyah\.my\.id\/[^?#\s]*#\S+$/;
const TZ_RE = /(Z|[+-]\d{2}:\d{2})$/;

function expectAbsoluteFragmentId(id: unknown) {
  expect(typeof id).toBe("string");
  expect(id as string).toMatch(ID_RE);
}

function expectUrlNotId(node: { "@id"?: unknown; url?: unknown }) {
  if (node.url !== undefined && node["@id"] !== undefined) {
    expect(node.url).not.toBe(node["@id"]);
    expect(typeof node.url).toBe("string");
  }
}

describe("toEntryJsonSchema (M1 pin)", () => {
  it("is exported and converts a date-free layer schema", () => {
    expect(typeof toEntryJsonSchema).toBe("function");
    const json = toEntryJsonSchema(asSchema(collections.skills.schema));
    expect(json).toMatchObject({ type: "object" });
  });
});

describe("entry schemas (ajv vs z.toJSONSchema)", () => {
  it("accepts a representative blog entry and rejects unknown keys", () => {
    const validate = ajvFor(blogSchema);
    expect(validate(blogData)).toBe(true);
    expect(validate({ ...blogData, bogus: 1 })).toBe(false);
  });

  it("accepts both project variants", () => {
    expect(ajvFor(projectSchema)(sourceData)).toBe(true);
    expect(ajvFor(projectSchema)(appData)).toBe(true);
    expect(ajvFor(projectSchema)({ ...sourceData, type: "Nope" })).toBe(false);
  });

  it("accepts experience month-precision inputs and rejects bad months", () => {
    const validate = ajvFor(asSchema(collections.experience.schema));
    const base = {
      roleName: "Operator",
      description: "Ran the line.",
      startDate: "2024-03",
      worksFor: { id: "organizations/unpad", collection: "organizations" },
    };
    expect(validate(base)).toBe(true);
    expect(validate({ ...base, startDate: "2024-3" })).toBe(false);
  });

  it("accepts person/skill/organization/credential entries", () => {
    expect(
      ajvFor(asSchema(collections.person.schema))({
        name: "Andriyansyah Nurrachman",
        description: "Designs operating models.",
        url: "https://yansyah.my.id/",
        sameAs: ["https://github.com/example"],
        knowsAbout: [{ id: "skills/bpmn", collection: "skills" }],
        hasOccupation: [{ id: "experience/freelance-2024", collection: "experience" }],
        alumniOf: [{ id: "organizations/unpad", collection: "organizations" }],
        hasCredential: [{ id: "credentials/efset", collection: "credentials" }],
      }),
    ).toBe(true);
    expect(
      ajvFor(asSchema(collections.skills.schema))({
        name: "BPMN",
        description: "Process notation.",
      }),
    ).toBe(true);
    expect(
      ajvFor(asSchema(collections.organizations.schema))({
        name: "Unpad",
        type: "CollegeOrUniversity",
        url: "https://unpad.ac.id",
      }),
    ).toBe(true);
    expect(
      ajvFor(asSchema(collections.credentials.schema))({
        name: "EFSET",
        dateCreated: "2024-01-15",
      }),
    ).toBe(true);
  });

  it("enforces .strict() on layer schemas", () => {
    expect(() =>
      asSchema(collections.person.schema).parse({
        name: "X",
        description: "Y",
        url: "https://yansyah.my.id/",
        bogus: 1,
      }),
    ).toThrow();
    expect(() => blogSchema.parse({ ...blogData, bogus: 1 })).toThrow();
  });

  it("keeps verificationStatus default-free (R1: no silent verified)", () => {
    const parsed = projectSchema.parse(sourceData) as { verificationStatus?: unknown };
    expect(parsed.verificationStatus).toBeUndefined();
  });
});

describe("builder outputs", () => {
  const blogEntry = entry<BlogPost>("my-post", "blog", blogSchema.parse(blogData));
  const sourceEntry = entry<Project>("tunaya", "projects", projectSchema.parse(sourceData));

  it("blogPostingNode emits absolute fragment @ids, tz dates, inline author/publisher", () => {
    const node = blogPostingNode(blogEntry, hydratedBlog, SITE);
    expectAbsoluteFragmentId(node["@id"]);
    expect(node.datePublished).toMatch(TZ_RE);
    expect(node.author).toEqual([
      {
        "@type": "Person",
        "@id": `${SITE}/#person`,
        name: "Andriyansyah Nurrachman",
        url: `${SITE}/`,
      },
    ]);
    expect(node.publisher).toEqual({
      "@type": "Organization",
      "@id": `${SITE}/#publisher`,
      name: "Andriyansyah Nurrachman",
      url: `${SITE}/`,
      logo: {
        "@type": "ImageObject",
        "@id": `${SITE}/#logo`,
        url: `${SITE}/favicon.svg`,
      },
    });
    expect(node.mainEntityOfPage).toEqual({ "@id": webpageId("/blog/my-post") });
  });

  it("blogPostingNode throws on hydration mismatch instead of emitting dangling refs", () => {
    expect(() => blogPostingNode(blogEntry, { ...hydratedBlog, about: [] }, SITE)).toThrow(
      /hydration mismatch/,
    );
  });

  it("projectNode emits distinct url/@id, tz dates, inline author", () => {
    for (const data of [sourceData, appData]) {
      const e = entry<Project>("tunaya", "projects", projectSchema.parse(data));
      const node = projectNode(e, hydratedProject, SITE);
      expectAbsoluteFragmentId(node["@id"]);
      expectUrlNotId(node as { "@id"?: unknown; url?: unknown });
      expect(node.datePublished).toMatch(TZ_RE);
      expect(node.author).toEqual([
        {
          "@type": "Person",
          "@id": `${SITE}/#person`,
          name: "Andriyansyah Nurrachman",
          url: `${SITE}/`,
        },
      ]);
    }
  });

  it("projectNode throws on programmingLanguage hydration mismatch", () => {
    expect(() => projectNode(sourceEntry, { ...hydratedProject, langSkills: [] }, SITE)).toThrow(
      /hydration mismatch/,
    );
  });

  it("expands YYYY-MM to first-of-month +07:00 and rejects bare months", () => {
    expect(expandMonthPrecision("2024-03")).toBe("2024-03-01T00:00:00+07:00");
    expect(toSiteMonthIso("2024-03")).toBe("2024-03-01T00:00:00+07:00");
    expect(() => expandMonthPrecision("2024-3")).toThrow(/YYYY-MM/);
    const role = employeeRoleNode({
      slug: "freelance-2024",
      siteUrl: SITE,
      roleName: "Operator",
      startDate: "2024-03",
      orgSlug: "unpad",
    });
    expect(role.startDate).toBe("2024-03-01T00:00:00+07:00");
    expectAbsoluteFragmentId(role["@id"]);
  });

  it("index nodes emit mainEntity ItemList with position+url+name", () => {
    const items = [
      { name: "First", url: `${SITE}/blog/first` },
      { name: "Second", url: `${SITE}/blog/second` },
    ];
    for (const node of [
      blogIndexNode({ path: "/blog", siteUrl: SITE, name: "N", items }),
      collectionPageNode({
        path: "/projects",
        siteUrl: SITE,
        name: "P",
        description: "D",
        items,
      }),
    ]) {
      const main = (node as { mainEntity?: unknown }).mainEntity as {
        "@type"?: string;
        itemListElement?: { position?: unknown; name?: unknown; url?: unknown }[];
      };
      expect(main["@type"]).toBe("ItemList");
      expect(main.itemListElement).toHaveLength(2);
      main.itemListElement!.forEach((li, i) => {
        expect(li.position).toBe(i + 1);
        expect(li.url).toMatch(/^https:\/\//);
        expect(typeof li.name).toBe("string");
      });
    }
    expect(
      blogIndexNode({ path: "/blog", siteUrl: SITE, name: "N" }) as { mainEntity?: unknown },
    ).not.toHaveProperty("mainEntity");
  });

  it("toSiteIsoDate keeps UTC tz designator", () => {
    expect(toSiteIsoDate(new Date("2026-02-01T00:00:00Z"))).toMatch(TZ_RE);
  });

  it("ImageObject urls are absolute https", () => {
    const node = imageObjectNode({ id: `${SITE}/assets/x.webp#image`, url: "/assets/x.webp" });
    expect(node.url).toMatch(/^https:\/\//);
    expectAbsoluteFragmentId(node["@id"]);
    const hero = heroImageNode({ heroImage: "/assets/bandung.webp", pagePath: "/blog" });
    expect(hero?.url).toMatch(/^https:\/\//);
    expect(heroImageNode({ heroImage: null, pagePath: "/" })).toBeNull();
  });

  it("page/detail nodes keep @id absolute with fragment and url distinct", () => {
    for (const node of [
      webpageDetailNode("/blog", SITE, "Blog"),
      blogIndexNode({ path: "/blog", siteUrl: SITE, name: "Notes" }),
      collectionPageNode({ path: "/projects", siteUrl: SITE, name: "P", description: "D" }),
      definedTermNode({ slug: "bpmn", siteUrl: SITE, name: "BPMN", description: "Notation." }),
      definedTermSetNode({ siteUrl: SITE, name: "S", description: "D" }),
      occupationNode({ slug: "s", siteUrl: SITE, name: "N", description: "D" }),
      organizationNode({ slug: "unpad", siteUrl: SITE, name: "Unpad" }),
      personRefNode(SITE),
      websiteNode(),
      breadcrumbNode("/blog", [{ name: "Blog", item: "/blog" }]),
    ]) {
      expectAbsoluteFragmentId((node as { "@id"?: unknown })["@id"]);
      expectUrlNotId(node as { "@id"?: unknown; url?: unknown });
    }
  });

  it("abs leaves absolute urls alone and prefixes site origin otherwise", () => {
    expect(abs("https://example.com/x")).toBe("https://example.com/x");
    expect(abs("/assets/x.webp")).toBe(`${SITE}/assets/x.webp`);
  });

  it("toGraph passes nodes through as the single collector payload", () => {
    const nodes = [websiteNode(), breadcrumbNode("/", [{ name: "Home", item: "/" }])];
    expect(toGraph(nodes)).toHaveLength(2);
  });
});

describe("M1 adapters (zero-loss mapping)", () => {
  it("mergedKeywords merges tags+keywords deduped, drops when empty", () => {
    expect(mergedKeywords(["bpmn"], ["bpmn"])).toBe("bpmn");
    expect(mergedKeywords(["a", "b"], ["b", "c"])).toBe("a, b, c");
    expect(mergedKeywords([], [])).toBeUndefined();
    expect(mergedKeywords(["a"], undefined)).toBe("a");
  });

  it("licenseValue keeps URL strings, wraps names/objects as CreativeWork", () => {
    expect(licenseValue("https://www.apache.org/licenses/LICENSE-2.0")).toBe(
      "https://www.apache.org/licenses/LICENSE-2.0",
    );
    expect(licenseValue("MIT")).toEqual({ "@type": "CreativeWork", name: "MIT" });
    expect(licenseValue({ name: "MIT", url: "https://opensource.org/licenses/MIT" })).toEqual({
      "@type": "CreativeWork",
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    });
  });

  it("offersNode emits Offer with guarded availability", () => {
    expect(offersNode({ price: "0", priceCurrency: "IDR" })).toEqual({
      "@type": "Offer",
      price: "0",
      priceCurrency: "IDR",
    });
    expect(offersNode({ price: "0", availability: "https://schema.org/InStock" })).toMatchObject({
      availability: "https://schema.org/InStock",
    });
    expect(offersNode({ price: "0", availability: "whenever" })).not.toHaveProperty("availability");
    expect(isItemAvailability("InStock")).toBe(true);
    expect(isItemAvailability("whenever")).toBe(false);
  });

  it("contributorRoleNode qualifies the author link with roleName", () => {
    expect(contributorRoleNode("Backend engineer")).toEqual({
      "@type": "Role",
      roleName: "Backend engineer",
      contributor: { "@id": `${SITE}/#person` },
    });
  });

  it("credentialNode maps credentialId→identifier and validUntil→expires", () => {
    const node = credentialNode({
      slug: "efset",
      siteUrl: SITE,
      name: "EFSET",
      credentialCategory: "certificate",
      identifier: "RYEP6e",
      expires: new Date("2027-01-01T00:00:00Z"),
      recognizedByStem: "rutgers-university",
    });
    expect(node["@id"]).toBe(`${SITE}/certifications/efset#credential`);
    expect(node.identifier).toBe("RYEP6e");
    expect(node.expires).toMatch(/2027-01-01/);
    expect(node.recognizedBy).toEqual({
      "@id": `${SITE}/organizations/rutgers-university#org`,
    });
    expect(node).not.toHaveProperty("credentialId");
    expect(node).not.toHaveProperty("validUntil");
  });

  it("credentialNode supports the education pathPrefix", () => {
    const node = credentialNode({
      slug: "unpad-informatics",
      siteUrl: SITE,
      name: "Bachelor of Accounting",
      credentialCategory: "degree",
      recognizedByStem: "unpad",
      departmentStem: "feb-unpad",
      pathPrefix: "education",
    });
    expect(node["@id"]).toBe(`${SITE}/education/unpad-informatics#credential`);
    expect(node.about).toEqual([{ "@id": `${SITE}/organizations/feb-unpad#org` }]);
  });

  it("toSiteYearMonthIso keeps YYYY, expands YYYY-MM", () => {
    expect(toSiteYearMonthIso("2018")).toBe("2018");
    expect(toSiteYearMonthIso("2024-03")).toBe("2024-03-01T00:00:00+07:00");
  });

  it("employeeRoleNode keeps the role/worksFor core, normalizes jobLocation (§4 row 10)", () => {
    const role = employeeRoleNode({
      slug: "s",
      siteUrl: SITE,
      roleName: "R",
      startDate: "2024-03",
      orgSlug: "unpad",
      jobLocation: "Bandung, Indonesia",
    });
    expect(role.worksFor).toEqual({ "@id": `${SITE}/organizations/unpad#org` });
    expect(role.jobLocation).toEqual({ "@type": "Place", name: "Bandung, Indonesia" });
    expect(role).not.toHaveProperty("employmentType");
    const bare = employeeRoleNode({
      slug: "s",
      siteUrl: SITE,
      roleName: "R",
      startDate: "2024-03",
      orgSlug: "unpad",
    });
    expect(bare).not.toHaveProperty("jobLocation");
  });

  it("occupationNode carries skillsNote as additionalProperty and stubs skillStems", () => {
    const node = occupationNode({
      slug: "s",
      siteUrl: SITE,
      name: "N",
      description: "D",
      skillsNote: "BPMN, DMN.",
      skillStems: ["bpmn"],
    });
    expect(node.description).toBe("D");
    expect(node.additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "skillsNote", value: "BPMN, DMN." },
    ]);
    expect(node.skills).toEqual([{ "@id": `${SITE}/skills/bpmn#term` }]);
  });

  it("definedTermNode emits termCode/url/sameAs", () => {
    const node = definedTermNode({
      slug: "bpmn",
      siteUrl: SITE,
      name: "BPMN",
      description: "Notation.",
      proficiencyLevel: "expert",
      url: "https://www.omg.org/spec/BPMN/",
    });
    expect(node.termCode).toBe("expert");
    expect(node.url).toBe("https://www.omg.org/spec/BPMN/");
    expect(node).not.toHaveProperty("sameAs");
  });

  it("organizationNode normalizes department string→object (§4 row 9)", () => {
    const str = organizationNode({
      slug: "digits",
      siteUrl: SITE,
      name: "DIGITS",
      department: "Research Center",
    }) as unknown as Record<string, unknown>;
    expect(str["department"]).toEqual({ "@type": "Organization", name: "Research Center" });
    const obj = organizationNode({
      slug: "x",
      siteUrl: SITE,
      name: "X",
      department: { name: "Dept" },
    }) as unknown as Record<string, unknown>;
    expect(obj["department"]).toEqual({ "@type": "Organization", name: "Dept" });
    const bare = organizationNode({
      slug: "feb-unpad",
      siteUrl: SITE,
      name: "FEB",
      parentStem: "unpad",
    }) as unknown as Record<string, unknown>;
    expect(bare).not.toHaveProperty("department");
    expect(bare["parentOrganization"]).toEqual({ "@id": `${SITE}/organizations/unpad#org` });
  });

  it("projectNode folds offers-string/outcome into description, role into contributor", () => {
    const e = entry<Project>(
      "tunaya",
      "projects",
      projectSchema.parse({
        ...appData,
        role: "Backend engineer",
        outcome: "Shipped.",
        offers: "Free tier",
        verificationStatus: "unverified",
      }),
    );
    const node = projectNode(e, hydratedProject, SITE);
    expect(node.description).toContain("Free tier");
    expect(node.description).toContain("Shipped.");
    expect(node.contributor).toMatchObject({ "@type": "Role", roleName: "Backend engineer" });
    expect(node.creativeWorkStatus).toBe("Unverified");
    expect(node).not.toHaveProperty("offers");
    expect(node.result).toBe("Shipped.");
  });

  it("P0-1: personFullNode never emits a ../ traversal image URL", () => {
    expect(resolvePersonImageUrl("../../assets/portrait.png")).toBe(`${SITE}/assets/portrait.png`);
    expect(resolvePersonImageUrl("/assets/portrait.png")).toBe(`${SITE}/assets/portrait.png`);
    expect(resolvePersonImageUrl("https://example.com/p.png")).toBe("https://example.com/p.png");
    expect(resolvePersonImageUrl({ src: "/_astro/portrait.HASH.png" })).toBe(
      `${SITE}/_astro/portrait.HASH.png`,
    );
    const node = personFullNode({
      name: "Andriyansyah Nurrachman",
      description: "D",
      url: `${SITE}/`,
      image: "../../assets/portrait.png",
      sameAs: [],
    }) as unknown as Record<string, unknown>;
    expect(node["image"]).toBe(`${SITE}/assets/portrait.png`);
    expect(node["image"] as string).not.toContain("..");
  });

  it("F4: webpageDetailNode requires a name on the WebPage root", () => {
    const node = webpageDetailNode("/cv", SITE, "Curriculum Vitae") as unknown as Record<
      string,
      unknown
    >;
    expect(node["name"]).toBe("Curriculum Vitae");
    expectAbsoluteFragmentId(node["@id"]);
    expectUrlNotId(node as { "@id"?: unknown; url?: unknown });
  });

  it("F2: personFullNode emits PostalAddress only when address is passed", () => {
    const base = {
      name: "Andriyansyah Nurrachman",
      description: "D",
      url: `${SITE}/`,
      sameAs: [`${SITE}/`],
    };
    const withAddress = personFullNode({
      ...base,
      address: { addressLocality: "Bandung", addressCountry: "ID" },
    }) as unknown as Record<string, unknown>;
    expect(withAddress["address"]).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Bandung",
      addressCountry: "ID",
    });
    const bare = personFullNode({ ...base }) as unknown as Record<string, unknown>;
    expect(bare).not.toHaveProperty("address");
  });

  it("P0-2: organizationNode emits leaf @types, defaulting to Organization", () => {
    const asRecord = (n: unknown) => n as unknown as Record<string, unknown>;
    expect(asRecord(organizationNode({ slug: "x", siteUrl: SITE, name: "X" }))["@type"]).toBe(
      "Organization",
    );
    expect(
      asRecord(
        organizationNode({ slug: "unpad", siteUrl: SITE, type: "CollegeOrUniversity", name: "U" }),
      )["@type"],
    ).toBe("CollegeOrUniversity");
    expect(
      asRecord(
        organizationNode({
          slug: "feb-unpad",
          siteUrl: SITE,
          type: "EducationalOrganization",
          name: "F",
        }),
      )["@type"],
    ).toBe("EducationalOrganization");
  });

  it("P1: blogPostingNode emits every hydrated author, not authors[0] only", () => {
    const twoAuthorData = {
      ...blogData,
      author: [
        { id: "person/andriyansyah", collection: "person" },
        { id: "person/andriyansyah", collection: "person" },
      ],
    };
    const e = entry<BlogPost>("duo", "blog", blogSchema.parse(twoAuthorData));
    const node = blogPostingNode(
      e,
      {
        authors: [{ data: { name: "Author One" } }, { data: { name: "Author Two" } }],
        about: [{}],
        mentions: [{}],
      } as unknown as BlogPostingHydrated,
      SITE,
    );
    const authors = node.author as unknown[];
    expect(authors).toHaveLength(2);
    expect(authors).toMatchObject([{ name: "Author One" }, { name: "Author Two" }]);
    for (const a of authors as { "@id"?: unknown }[]) expect(a["@id"]).toBe(`${SITE}/#person`);
  });

  it("P0-3: projectNode emits provider alongside isPartOf", () => {
    const withProvider = entry<Project>(
      "treats",
      "projects",
      projectSchema.parse({
        ...sourceData,
        provider: { id: "organizations/navcore", collection: "organizations" },
      }),
    );
    const node = projectNode(withProvider, hydratedProject, SITE) as unknown as Record<
      string,
      unknown
    >;
    expect(node["provider"]).toEqual({ "@id": `${SITE}/organizations/navcore#org` });
    const bareEntry = entry<Project>("home-ops", "projects", projectSchema.parse(sourceData));
    const bare = projectNode(bareEntry, hydratedProject, SITE) as unknown as Record<
      string,
      unknown
    >;
    expect(bare).not.toHaveProperty("provider");
    const overridden = projectNode(
      withProvider,
      { ...hydratedProject, providerStem: "digits" },
      SITE,
    ) as unknown as Record<string, unknown>;
    expect(overridden["provider"]).toEqual({ "@id": `${SITE}/organizations/digits#org` });
  });
});

describe("zero-loss carriers (acceptance §1) + sparse-relation adapters (§4)", () => {
  it("employeeRoleNode carries every employmentType verbatim via additionalProperty", () => {
    for (const value of [
      "FULL_TIME",
      "PART_TIME",
      "CONTRACTOR",
      "TEMPORARY",
      "INTERN",
      "VOLUNTEER",
      "PER_DIEM",
      "OTHER",
    ]) {
      const role = employeeRoleNode({
        slug: "s",
        siteUrl: SITE,
        roleName: "R",
        startDate: "2024-03",
        orgSlug: "unpad",
        employmentType: value,
      }) as unknown as Record<string, unknown>;
      expect(role["additionalProperty"]).toEqual([
        { "@type": "PropertyValue", name: "employmentType", value },
      ]);
      expect(role).not.toHaveProperty("employmentType");
    }
    const bare = employeeRoleNode({
      slug: "s",
      siteUrl: SITE,
      roleName: "R",
      startDate: "2024-03",
      orgSlug: "unpad",
    }) as unknown as Record<string, unknown>;
    expect(bare).not.toHaveProperty("additionalProperty");
    expect(bare).not.toHaveProperty("employmentType");
  });

  it("credentialNode carries education attendance years via additionalProperty", () => {
    const node = credentialNode({
      slug: "unpad-informatics",
      siteUrl: SITE,
      name: "Bachelor of Accounting",
      credentialCategory: "degree",
      recognizedByStem: "unpad",
      departmentStem: "feb-unpad",
      startDate: "2018",
      endDate: "2023",
      pathPrefix: "education",
    }) as unknown as Record<string, unknown>;
    expect(node["additionalProperty"]).toEqual([
      { "@type": "PropertyValue", name: "startDate", value: "2018" },
      { "@type": "PropertyValue", name: "endDate", value: "2023" },
    ]);
    expect(node).not.toHaveProperty("startDate");
    expect(node).not.toHaveProperty("endDate");
    const monthRange = credentialNode({
      slug: "x",
      siteUrl: SITE,
      name: "X",
      startDate: "2024-03",
      endDate: "2024-06",
    }) as unknown as Record<string, unknown>;
    expect(monthRange["additionalProperty"]).toEqual([
      { "@type": "PropertyValue", name: "startDate", value: "2024-03-01T00:00:00+07:00" },
      { "@type": "PropertyValue", name: "endDate", value: "2024-06-01T00:00:00+07:00" },
    ]);
    const bare = credentialNode({ slug: "y", siteUrl: SITE, name: "Y" }) as unknown as Record<
      string,
      unknown
    >;
    expect(bare).not.toHaveProperty("additionalProperty");
  });

  it("credentialNode merges departmentStem and aboutStems (never else-if drops)", () => {
    const node = credentialNode({
      slug: "z",
      siteUrl: SITE,
      name: "Z",
      departmentStem: "feb-unpad",
      aboutStems: ["bpmn", "dmn"],
    }) as unknown as Record<string, unknown>;
    expect(node["about"]).toEqual([
      { "@id": `${SITE}/organizations/feb-unpad#org` },
      { "@id": `${SITE}/skills/bpmn#term` },
      { "@id": `${SITE}/skills/dmn#term` },
    ]);
  });

  it("definedTermNode carries raw category via additionalProperty beside termCode", () => {
    for (const [category, proficiencyLevel] of [
      ["Process", "expert"],
      ["Thinking", "advanced"],
      ["Technical", "intermediate"],
      ["Tools", "beginner"],
    ]) {
      const node = definedTermNode({
        slug: "bpmn",
        siteUrl: SITE,
        name: "BPMN",
        description: "Notation.",
        proficiencyLevel,
        category,
      }) as unknown as Record<string, unknown>;
      expect(node["termCode"]).toBe(proficiencyLevel);
      expect(node["additionalProperty"]).toEqual([
        { "@type": "PropertyValue", name: "proficiencyLevel", value: proficiencyLevel },
        { "@type": "PropertyValue", name: "category", value: category },
      ]);
      expect(node).not.toHaveProperty("proficiencyLevel");
      expect(node).not.toHaveProperty("category");
    }
  });

  it("organizationNode passes logo through; providerOrgNode builds the provider stub", () => {
    const withLogo = organizationNode({
      slug: "rutgers",
      siteUrl: SITE,
      type: "CollegeOrUniversity",
      name: "Rutgers",
      url: "https://www.rutgers.edu/",
      logo: "https://www.rutgers.edu/logo.png",
      sameAs: ["https://www.rutgers.edu/"],
    }) as unknown as Record<string, unknown>;
    expect(withLogo["logo"]).toBe("https://www.rutgers.edu/logo.png");
    expect(withLogo["@type"]).toBe("CollegeOrUniversity");
    const stub = providerOrgNode(SITE, "freelance", { name: "Freelance" }) as unknown as Record<
      string,
      unknown
    >;
    expect(stub).toEqual({
      "@type": "Organization",
      "@id": `${SITE}/organizations/freelance#org`,
      name: "Freelance",
    });
    const full = providerOrgNode(SITE, "navcore", {
      name: "PT Navcore Nextology",
      url: "https://navcore.example.com",
      logo: "https://navcore.example.com/logo.png",
      sameAs: ["https://navcore.example.com"],
      parentStem: "unpad",
    }) as unknown as Record<string, unknown>;
    expect(full["logo"]).toBe("https://navcore.example.com/logo.png");
    expect(full["parentOrganization"]).toEqual({ "@id": `${SITE}/organizations/unpad#org` });
  });

  it("resolveOrganizationLogoUrl omits site-local raster originals so dist keeps no raw PNG/JPG", () => {
    expect(resolveOrganizationLogoUrl("https://www.rutgers.edu/logo.png")).toBe(
      "https://www.rutgers.edu/logo.png",
    );
    expect(resolveOrganizationLogoUrl({ src: "/_astro/logo-digits.RR6BNzaV.png" })).toBeUndefined();
    expect(resolveOrganizationLogoUrl("../../assets/logo-digits.png")).toBeUndefined();
    expect(resolveOrganizationLogoUrl({ src: "/_astro/logo-digits.ABC123.webp" })).toBe(
      `${SITE}/_astro/logo-digits.ABC123.webp`,
    );
    const local = organizationNode({
      slug: "digits",
      siteUrl: SITE,
      name: "Center for Digital Innovation Studies (DIGITS) Unpad",
      logo: { src: "/_astro/logo-digits.RR6BNzaV.png" },
    }) as unknown as Record<string, unknown>;
    expect(local).not.toHaveProperty("logo");
  });

  it("resolveOrganizationLogoUrl never fires the tracked src getter (keeps raw originals out of dist)", () => {
    let reads = 0;
    const tracked = {};
    Object.defineProperty(tracked, "src", {
      enumerable: true,
      get() {
        reads++;
        return "/_astro/logo-digits.RR6BNzaV.png";
      },
    });
    Object.defineProperty(tracked, Symbol.for("astro:image-asset:raw-src"), {
      get: () => "/_astro/logo-digits.RR6BNzaV.png",
    });
    expect(resolveOrganizationLogoUrl(tracked as { src: string })).toBeUndefined();
    expect(reads).toBe(0);
  });

  it("projectNode emits offers objects as Offer nodes (priceCurrency default IDR)", () => {
    const e = entry<Project>(
      "kinaia",
      "projects",
      projectSchema.parse({
        ...appData,
        offers: { price: "0", availability: "https://schema.org/InStock" },
      }),
    );
    const node = projectNode(e, hydratedProject, SITE) as unknown as Record<string, unknown>;
    expect(node["offers"]).toEqual({
      "@type": "Offer",
      price: "0",
      priceCurrency: "IDR",
      availability: "https://schema.org/InStock",
    });
    expect(node["description"]).not.toContain("0");
    const guarded = entry<Project>(
      "kinaia",
      "projects",
      projectSchema.parse({ ...appData, offers: { price: "9", availability: "whenever" } }),
    );
    const guardedNode = projectNode(guarded, hydratedProject, SITE) as unknown as Record<
      string,
      unknown
    >;
    expect(guardedNode["offers"]).toEqual({
      "@type": "Offer",
      price: "9",
      priceCurrency: "IDR",
    });
  });

  it("blogPostingNode maps about→project @ids and mentions→skill @ids", () => {
    const blogEntry = entry<BlogPost>("my-post", "blog", blogSchema.parse(blogData));
    const node = blogPostingNode(blogEntry, hydratedBlog, SITE) as unknown as Record<
      string,
      unknown
    >;
    expect(node["about"]).toEqual([{ "@id": `${SITE}/projects/tunaya#project` }]);
    expect(node["mentions"]).toEqual([{ "@id": `${SITE}/skills/bpmn#term` }]);
    expect(node).not.toHaveProperty("tags");
    expect(node).not.toHaveProperty("title");
    expect(node).not.toHaveProperty("pubDate");
  });
});
