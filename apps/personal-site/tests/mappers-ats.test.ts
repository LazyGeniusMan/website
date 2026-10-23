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

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, definedTermNode, occupationNode, safeJsonLd, toGraph } from "../src/lib/jsonld";
import { DISPLAY, credentialDisplay, toAtsSlug } from "../src/lib/collections";

const here = dirname(fileURLToPath(import.meta.url));

describe("safeJsonLd (P1 boundary)", () => {
  it("serializes a Graph payload with @context intact", () => {
    const out = safeJsonLd({ "@context": "https://schema.org", "@graph": [] });
    expect(out).toContain('"@context":"https://schema.org"');
  });

  it("neutralizes </script in string values (any case) without breaking JSON", () => {
    const payload = {
      "@context": "https://schema.org",
      "@graph": [{ description: "a</script><script>b</SCRIPT>c" }],
    };
    const out = safeJsonLd(payload);
    expect(out).not.toMatch(/<\/script/i);
    expect(JSON.parse(out.replace(/<\\\//g, "</"))).toEqual(payload);
    expect(out).toContain("<\\/script");
  });

  it("neutralizes <!-- sequences", () => {
    const out = safeJsonLd({ note: "<!-- hi" });
    expect(out).not.toContain("<!--");
    expect(out).toContain("<\\!--");
  });
});

describe("toGraph dedupe + order (P1 collector)", () => {
  const node = (type: string, id?: string) =>
    ({ "@type": type, ...(id ? { "@id": id } : {}) }) as never;

  it("drops later duplicates by @id, keeping the first (full) node", () => {
    const full = { "@type": "Person", "@id": `${SITE}/#person`, name: "A" };
    const stub = { "@type": "Person", "@id": `${SITE}/#person` };
    const out = toGraph([full, stub] as never[]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(full);
  });

  it("orders WebSite → page → entities → BreadcrumbList regardless of input order", () => {
    const out = toGraph([
      node("BreadcrumbList", `${SITE}/#b`),
      node("Person", `${SITE}/#person`),
      node("CollectionPage", `${SITE}/x#webpage`),
      node("WebSite", `${SITE}/#website`),
    ]);
    expect(out.map((n) => (n as { "@type": string })["@type"])).toEqual([
      "WebSite",
      "CollectionPage",
      "Person",
      "BreadcrumbList",
    ]);
  });

  it("keeps @id-less inline helpers (Role contributor nodes) in stable order", () => {
    const a = node("Role");
    const b = node("Role");
    const out = toGraph([a, b]);
    expect(out).toHaveLength(2);
  });
});

describe("DefinedTerm zero-loss (§4 rows 6-7)", () => {
  it("emits termCode + inDefinedTermSet + additionalProperty for proficiency/category", () => {
    const n = definedTermNode({
      slug: "python",
      siteUrl: SITE,
      name: "Python",
      description: "Lang",
      proficiencyLevel: "advanced",
      category: "Tool",
    });
    expect(n.termCode).toBe("advanced");
    expect(n.inDefinedTermSet).toEqual({ "@id": `${SITE}/skills#termset` });
    const ap = (n.additionalProperty ?? []) as { name: string; value: string }[];
    expect(ap).toContainEqual({
      "@type": "PropertyValue",
      name: "proficiencyLevel",
      value: "advanced",
    });
    expect(ap).toContainEqual({ "@type": "PropertyValue", name: "category", value: "Tool" });
  });

  it("omits additionalProperty entirely when both are absent", () => {
    const n = definedTermNode({ slug: "x", siteUrl: SITE, name: "X", description: "X" });
    expect("additionalProperty" in n).toBe(false);
    expect("termCode" in n).toBe(false);
  });
});

describe("Occupation skillsNote (§4 row 12)", () => {
  it("rides additionalProperty and leaves description clean", () => {
    const n = occupationNode({
      slug: "e",
      siteUrl: SITE,
      name: "N",
      description: "Base description",
      skillsNote: "free-text notes",
    });
    expect(n.description).toBe("Base description");
    expect(n.additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "skillsNote", value: "free-text notes" },
    ]);
  });
});

describe("ATS decoupling layer (§5.3-5.4)", () => {
  it("DISPLAY covers every emitted @type family with ATS words only", () => {
    expect(DISPLAY.Occupation).toBe("Work Experience");
    expect(DISPLAY.EducationalOccupationalCredential).toBe("Certifications");
    expect(DISPLAY.DefinedTerm).toBe("Skills");
    for (const v of Object.values(DISPLAY)) {
      expect(v).not.toMatch(/knowsAbout|hasOccupation|alumniOf|roleName|codeRepository/);
    }
  });

  it("credentialDisplay branches degree → Education", () => {
    expect(credentialDisplay("degree")).toBe("Education");
    expect(credentialDisplay("certification")).toBe("Certifications");
    expect(credentialDisplay(undefined)).toBe("Certifications");
  });

  it("toAtsSlug is identity on current ids and normalizes the rest", () => {
    expect(toAtsSlug("tunaya")).toBe("tunaya");
    expect(toAtsSlug("feb-unpad")).toBe("feb-unpad");
    expect(toAtsSlug("  Hello, World!  ")).toBe("hello-world");
    expect(toAtsSlug("Samsat — Cerdas kelas A")).toBe("samsat-cerdas-kelas-a");
    expect(toAtsSlug("AWS Solutions Architect")).toBe("aws-solutions-architect");
    expect(() => toAtsSlug("---")).toThrow();
  });

  it("jsonld.ts never imports the DISPLAY presentation map (boundary)", () => {
    const src = readFileSync(join(here, "..", "src", "lib", "jsonld.ts"), "utf8");
    expect(src).not.toMatch(/DISPLAY|toAtsSlug|credentialDisplay/);
  });
});

describe("Unification boundaries (F2/F4/F7)", () => {
  it("every Person node goes through personFullNode (no inline forks)", () => {
    for (const page of ["cv.astro", "about.astro"]) {
      const t = readFileSync(join(here, "..", "src", "pages", page), "utf8");
      expect(t, page).toContain("personFullNode(");
      expect(t, page).not.toMatch(/"@type":\s*"Person"/);
    }
    const home = readFileSync(join(here, "..", "src", "pages", "index.astro"), "utf8");
    expect(home, "index.astro").toMatch(/personRefNode\(|personStub\(/);
    expect(home, "index.astro").not.toContain("personFullNode(");
    expect(home, "index.astro").not.toMatch(/"@type":\s*"Person"/);
  });

  it("page nodes carry H1-matching names (F4 signal)", () => {
    const cv = readFileSync(join(here, "..", "src", "pages", "cv.astro"), "utf8");
    expect(cv).toContain('name: "Curriculum Vitae"');
    const about = readFileSync(join(here, "..", "src", "pages", "about.astro"), "utf8");
    expect(about).toContain('name: "About"');
    const lib = readFileSync(join(here, "..", "src", "lib", "jsonld.ts"), "utf8");
    expect(lib).toMatch(/webpageDetailNode\(\s*path: string,\s*siteUrl: string,\s*name: string/);
  });

  it("about dateModified is content-driven, never the build clock", () => {
    const t = readFileSync(join(here, "..", "src", "pages", "about.astro"), "utf8");
    expect(t).not.toContain("new Date().toISOString()");
    expect(t).toContain("maxContentDate");
  });
});
