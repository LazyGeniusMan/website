import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { parse } from "node-html-parser";

const dist = process.env.JSONLD_DIST ?? join(fileURLToPath(new URL("..", import.meta.url)), "dist");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}

function rel(p: string): string {
  return relative(dist, p).split(sep).join("/");
}

interface PageGraph {
  path: string;
  types: string[];
}

function loadGraphs(): PageGraph[] {
  if (!existsSync(join(dist, "index.html"))) {
    throw new Error(`L3: ${dist}/index.html missing — run vp run build first`);
  }
  const pages: PageGraph[] = [];
  for (const file of walk(dist)) {
    const root = parse(readFileSync(file, "utf8"));
    const scripts = root
      .querySelectorAll("script")
      .filter((s) => s.getAttribute("type") === "application/ld+json");
    const path = rel(file);
    if (/^(go|profile)\//.test(path)) {
      expect(scripts, `${path}: redirect page must have no JSON-LD`).toHaveLength(0);
      continue;
    }
    expect(scripts, `${path}: exactly one JSON-LD script`).toHaveLength(1);
    const payload = JSON.parse(scripts[0]?.text ?? "") as {
      "@context"?: unknown;
      "@graph"?: { "@type"?: unknown; "@id"?: unknown }[];
    };
    expect(payload["@context"], `${path}: @context`).toBe("https://schema.org");
    expect(
      Array.isArray(payload["@graph"]) && payload["@graph"].length > 0,
      `${path}: non-empty @graph`,
    ).toBe(true);
    const types = (payload["@graph"] ?? []).map((n) => {
      expect(typeof n["@type"], `${path}: every node has a @type`).toBe("string");
      expect(typeof n["@id"], `${path}: every node has an @id`).toBe("string");
      return n["@type"] as string;
    });
    pages.push({ path, types: [...new Set(types)].sort() });
  }
  return pages.sort((a, b) => (a.path < b.path ? -1 : 1));
}

function expectation(path: string): { required: string[]; allow: string[] } {
  const req = (required: string[], allow: string[] = []) => ({ required, allow });
  if (path === "index.html")
    return req(
      ["BreadcrumbList", "CollectionPage", "Person", "WebSite"],
      ["DefinedTermSet", "EducationalOccupationalCredential", "ImageObject", "ItemList"],
    );
  if (path === "about/index.html")
    return req(
      ["BreadcrumbList", "Person", "ProfilePage", "WebSite"],
      [
        "CollegeOrUniversity",
        "EducationalOccupationalCredential",
        "EducationalOrganization",
        "ImageObject",
        "Organization",
      ],
    );
  if (path === "contact/index.html")
    return req(["BreadcrumbList", "ContactPage", "Person", "WebSite"], ["ImageObject"]);
  if (path === "cv/index.html") return req(["BreadcrumbList", "Person", "ProfilePage", "WebSite"]);
  if (path === "cv-filtered/index.html")
    return req(["BreadcrumbList", "Person", "ProfilePage", "WebSite"]);
  if (path === "404.html") return req(["WebPage", "WebSite"]);
  if (path === "blog/index.html")
    return req(["BreadcrumbList", "CollectionPage", "Person", "WebSite"], ["ImageObject"]);
  if (path.startsWith("blog/tag/"))
    return req(["BreadcrumbList", "CollectionPage", "Person", "WebSite"]);
  if (path.startsWith("blog/"))
    return req(["BlogPosting", "BreadcrumbList", "Person", "WebPage", "WebSite"], ["ImageObject"]);
  if (path === "projects/index.html")
    return req(["BreadcrumbList", "CollectionPage", "Person", "WebSite"]);
  if (path.startsWith("projects/"))
    return {
      required: ["BreadcrumbList", "Person", "WebPage", "WebSite"],
      allow: [
        "BlogPosting",
        "CollegeOrUniversity",
        "EducationalOrganization",
        "ImageObject",
        "Organization",
        "Role",
        "SoftwareApplication",
        "SoftwareSourceCode",
      ],
    };
  if (path === "skills/index.html")
    return req(["BreadcrumbList", "CollectionPage", "DefinedTermSet", "Person", "WebSite"]);
  if (path.startsWith("skills/"))
    return req(
      ["BreadcrumbList", "DefinedTerm", "DefinedTermSet", "Person", "WebPage", "WebSite"],
      [
        "EducationalOccupationalCredential",
        "ImageObject",
        "Occupation",
        "SoftwareApplication",
        "SoftwareSourceCode",
      ],
    );
  if (path === "experience/index.html")
    return req(["BreadcrumbList", "CollectionPage", "Person", "WebSite"]);
  if (path.startsWith("experience/"))
    return {
      required: ["BreadcrumbList", "EmployeeRole", "Occupation", "Person", "WebPage", "WebSite"],
      allow: [
        "CollegeOrUniversity",
        "EducationalOrganization",
        "ImageObject",
        "Organization",
        "SoftwareApplication",
        "SoftwareSourceCode",
      ],
    };
  if (path === "certifications/index.html")
    return req(
      ["BreadcrumbList", "CollectionPage", "EducationalOccupationalCredential", "WebSite"],
      ["CollegeOrUniversity", "EducationalOrganization", "Organization"],
    );
  if (path.startsWith("certifications/"))
    return req(
      ["BreadcrumbList", "EducationalOccupationalCredential", "WebPage", "WebSite"],
      ["CollegeOrUniversity", "EducationalOrganization", "ImageObject", "Organization"],
    );
  if (path === "education/index.html")
    return req(
      ["BreadcrumbList", "CollectionPage", "EducationalOccupationalCredential", "WebSite"],
      ["CollegeOrUniversity", "EducationalOrganization", "Organization"],
    );
  if (path.startsWith("education/"))
    return req(
      ["BreadcrumbList", "EducationalOccupationalCredential", "WebPage", "WebSite"],
      ["CollegeOrUniversity", "EducationalOrganization", "ImageObject", "Organization"],
    );
  if (path === "organizations/index.html")
    return req(
      ["BreadcrumbList", "CollectionPage", "WebSite"],
      ["CollegeOrUniversity", "EducationalOrganization", "Organization"],
    );
  if (path.startsWith("organizations/"))
    return req(
      ["BreadcrumbList", "Person", "WebPage", "WebSite"],
      [
        "CollegeOrUniversity",
        "EducationalOccupationalCredential",
        "EducationalOrganization",
        "ImageObject",
        "Occupation",
        "Organization",
        "SoftwareApplication",
        "SoftwareSourceCode",
      ],
    );
  throw new Error(`L3: no route expectation for ${path} — extend expectation() deliberately`);
}

describe("rendered JSON-LD contract (L3)", () => {
  const pages = loadGraphs();

  it("covers the published tree (verify-jsonld-ids floors are not lowered)", () => {
    expect(pages.length).toBeGreaterThanOrEqual(10);
  });

  it("matches required @types per route with no unexpected types", () => {
    for (const { path, types } of pages) {
      const { required, allow } = expectation(path);
      const allowed = new Set([...required, ...allow]);
      for (const t of required) expect(types, `${path} requires ${t}`).toContain(t);
      for (const t of types) expect(allowed.has(t), `${path} unexpected @type ${t}`).toBe(true);
      if (path.startsWith("experience/") && path !== "experience/index.html") {
        expect(
          types.includes("Organization") ||
            types.includes("CollegeOrUniversity") ||
            types.includes("EducationalOrganization"),
          `${path} needs an org leaf type`,
        ).toBe(true);
      }
      if (path.startsWith("projects/") && path !== "projects/index.html") {
        expect(
          types.includes("SoftwareSourceCode") || types.includes("SoftwareApplication"),
          `${path} needs a project type`,
        ).toBe(true);
      }
      if (path.startsWith("organizations/") && path !== "organizations/index.html") {
        expect(
          types.includes("Organization") ||
            types.includes("CollegeOrUniversity") ||
            types.includes("EducationalOrganization"),
          `${path} needs an org leaf type`,
        ).toBe(true);
      }
      if (path.startsWith("education/") && path !== "education/index.html") {
        expect(
          types.includes("EducationalOccupationalCredential"),
          `${path} needs a credential leaf type`,
        ).toBe(true);
      }
    }
  });

  it("pins the route-to-types map (snapshot)", () => {
    expect(Object.fromEntries(pages.map((p) => [p.path, p.types]))).toMatchSnapshot();
  });
});
