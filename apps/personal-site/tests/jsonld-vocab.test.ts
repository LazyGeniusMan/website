import { describe, expect, it } from "vite-plus/test";
import {
  KNOWN_PROPS,
  KNOWN_TYPES,
  LINKABLE_TYPES,
  RETIRED_TYPES,
  checkGraphPayload,
} from "../scripts/verify-jsonld-vocab.mjs";

function payload(graph: unknown[]) {
  return { "@context": "https://schema.org", "@graph": graph };
}

const person = { "@type": "Person", "@id": "https://yansyah.my.id/#person", name: "Y" };

describe("vocab tripwires (L4 negative)", () => {
  it("fails retired SearchAction/FAQPage/HowTo presence", () => {
    expect([...RETIRED_TYPES].sort((a, b) => (a < b ? -1 : 1))).toEqual([
      "FAQPage",
      "HowTo",
      "SearchAction",
    ]);
    for (const type of RETIRED_TYPES) {
      const errs = checkGraphPayload(
        payload([{ "@type": type, "@id": `https://yansyah.my.id/#${type.toLowerCase()}` }]),
        "tripwire",
      );
      expect(errs, type).toMatchObject([expect.stringContaining(`retired type ${type}`)]);
    }
  });

  it("fails unknown terms, unknown props, bad ranges, blank linkables", () => {
    expect(
      checkGraphPayload(payload([{ "@type": "Nope", "@id": "https://yansyah.my.id/#x" }]), "t"),
    ).toMatchObject([expect.stringContaining("unknown term")]);
    expect(checkGraphPayload(payload([{ ...person, bogusProp: 1 }]), "t")).toMatchObject([
      expect.stringContaining("unknown property"),
    ]);
    expect(checkGraphPayload(payload([{ ...person, author: "Just A Name" }]), "t")).toMatchObject([
      expect.stringContaining("must be an object ref"),
    ]);
    expect(
      checkGraphPayload(payload([{ ...person, datePublished: "2024-03" }]), "t"),
    ).toMatchObject([expect.stringContaining("bare YYYY-MM forbidden")]);
    expect(
      checkGraphPayload(payload([{ "@type": "Organization", name: "No id org" }]), "t"),
    ).toMatchObject([expect.stringContaining("must not be a blank node")]);
  });

  it("allows publisher logo as ImageObject or https URL (M3 L4 allowlist)", () => {
    expect(KNOWN_PROPS.has("logo")).toBe(true);
    const org = {
      "@type": "Organization",
      "@id": "https://yansyah.my.id/#publisher",
      name: "Y",
      url: "https://yansyah.my.id/",
      logo: {
        "@type": "ImageObject",
        "@id": "https://yansyah.my.id/#logo",
        url: "https://yansyah.my.id/favicon.svg",
      },
    };
    expect(checkGraphPayload(payload([org]), "logo")).toEqual([]);
    expect(
      checkGraphPayload(payload([{ ...org, logo: "https://yansyah.my.id/favicon.svg" }]), "logo"),
    ).toEqual([]);
    expect(checkGraphPayload(payload([{ ...org, logo: "/favicon.svg" }]), "logo")).toMatchObject([
      expect.stringContaining("must be absolute https"),
    ]);
  });

  it("allows department-inline orgs (§4 row 9) but still fails other blank linkables", () => {
    const withDept = {
      "@type": "Organization",
      "@id": "https://yansyah.my.id/organizations/digits#org",
      name: "DIGITS",
      department: { "@type": "Organization", name: "Research Center" },
    };
    expect(checkGraphPayload(payload([withDept]), "dept")).toEqual([]);
    const deptNoName = {
      "@type": "Organization",
      "@id": "https://yansyah.my.id/organizations/digits#org",
      name: "DIGITS",
      department: { "@type": "Organization" },
    };
    const deptErrs = checkGraphPayload(payload([deptNoName]), "dept");
    expect(deptErrs.length).toBeGreaterThanOrEqual(1);
    expect(deptErrs[0]).toContain("must not be a blank node");
    expect(KNOWN_PROPS.has("jobLocation")).toBe(true);
  });

  it("keeps F2/F3/F4 extensions green: address, result, jobLocation, page names", () => {
    expect(KNOWN_PROPS.has("result")).toBe(true);
    expect(KNOWN_PROPS.has("jobLocation")).toBe(true);
    const withResult = {
      "@type": "SoftwareSourceCode",
      "@id": "https://yansyah.my.id/projects/tunaya#project",
      name: "Tunaya",
      result: "Shipped.",
    };
    expect(checkGraphPayload(payload([withResult]), "f3-result")).toEqual([]);
    const withJobLocation = {
      "@type": "EmployeeRole",
      "@id": "https://yansyah.my.id/experience/x#role",
      roleName: "R",
      startDate: "2024-03-01T00:00:00+07:00",
      worksFor: { "@id": "https://yansyah.my.id/organizations/unpad#org" },
      jobLocation: { "@type": "Place", name: "Bandung, Indonesia" },
    };
    expect(checkGraphPayload(payload([withJobLocation]), "f3-joblocation")).toEqual([]);
    const withAddress = {
      ...person,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bandung",
        addressCountry: "ID",
      },
    };
    expect(checkGraphPayload(payload([withAddress]), "f2-address")).toEqual([]);
    const cvPage = {
      "@type": "WebPage",
      "@id": "https://yansyah.my.id/cv#webpage",
      url: "https://yansyah.my.id/cv",
      name: "Curriculum Vitae",
    };
    expect(checkGraphPayload(payload([cvPage]), "f4-cv")).toEqual([]);
    const profile = {
      "@type": "ProfilePage",
      "@id": "https://yansyah.my.id/about#webpage",
      url: "https://yansyah.my.id/about",
      name: "About",
      dateModified: "2026-10-01T00:00:00+07:00",
    };
    expect(checkGraphPayload(payload([profile]), "f4-profile")).toEqual([]);
  });

  it("passes the clean site vocabulary surface", () => {
    expect(KNOWN_TYPES.size).toBeGreaterThanOrEqual(20);
    expect(KNOWN_PROPS.size).toBeGreaterThanOrEqual(50);
    expect(LINKABLE_TYPES.has("PostalAddress")).toBe(false);
    expect(
      checkGraphPayload(
        payload([
          person,
          {
            "@type": "WebPage",
            "@id": "https://yansyah.my.id/blog#webpage",
            url: "https://yansyah.my.id/blog",
            author: { "@id": "https://yansyah.my.id/#person" },
            datePublished: "2026-02-01T00:00:00+07:00",
            inLanguage: "id",
          },
        ]),
        "clean",
      ),
    ).toEqual([]);
  });
});
