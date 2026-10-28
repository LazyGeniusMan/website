export const RETIRED_TYPES = new Set(["FAQPage", "HowTo", "SearchAction"]);

export const KNOWN_TYPES = new Set([
  "WebSite",
  "WebPage",
  "ProfilePage",
  "ContactPage",
  "CollectionPage",
  "AboutPage",
  "BreadcrumbList",
  "ListItem",
  "ItemList",
  "Person",
  "Organization",
  "CollegeOrUniversity",
  "EducationalOrganization",
  "DefinedTerm",
  "DefinedTermSet",
  "Occupation",
  "EmployeeRole",
  "Role",
  "SoftwareSourceCode",
  "SoftwareApplication",
  "BlogPosting",
  "EducationalOccupationalCredential",
  "ImageObject",
  "PropertyValue",
  "PostalAddress",
  "Place",
  "Offer",
  "CreativeWork",
]);

export const LINKABLE_TYPES = new Set([
  "WebSite",
  "WebPage",
  "ProfilePage",
  "ContactPage",
  "CollectionPage",
  "BreadcrumbList",
  "Person",
  "Organization",
  "CollegeOrUniversity",
  "EducationalOrganization",
  "DefinedTerm",
  "DefinedTermSet",
  "Occupation",
  "EmployeeRole",
  "SoftwareSourceCode",
  "SoftwareApplication",
  "BlogPosting",
  "EducationalOccupationalCredential",
  "ImageObject",
]);

export const KNOWN_PROPS = new Set([
  "name",
  "alternateName",
  "url",
  "description",
  "disambiguatingDescription",
  "author",
  "image",
  "sameAs",
  "knowsAbout",
  "hasOccupation",
  "alumniOf",
  "hasCredential",
  "knowsLanguage",
  "address",
  "addressLocality",
  "addressCountry",
  "jobTitle",
  "email",
  "identifier",
  "credentialCategory",
  "educationalLevel",
  "credentialId",
  "dateCreated",
  "expires",
  "datePublished",
  "dateModified",
  "recognizedBy",
  "about",
  "mentions",
  "startDate",
  "endDate",
  "roleName",
  "role",
  "worksFor",
  "jobLocation",
  "employmentType",
  "contributor",
  "creativeWorkStatus",
  "issn",
  "provider",
  "isPartOf",
  "programmingLanguage",
  "keywords",
  "inLanguage",
  "headline",
  "description",
  "publisher",
  "logo",
  "mainEntityOfPage",
  "mainEntity",
  "breadcrumb",
  "isPartOf",
  "itemListElement",
  "position",
  "item",
  "result",
  "department",
  "parentOrganization",
  "creditText",
  "creator",
  "acquireLicensePage",
  "primaryImageOfPage",
  "termCode",
  "inDefinedTermSet",
  "additionalProperty",
  "value",
  "proficiencyLevel",
  "category",
  "offers",
  "price",
  "priceCurrency",
  "availability",
  "license",
  "codeRepository",
  "applicationCategory",
  "operatingSystem",
  "isAccessibleForFree",
  "skills",
  "skillsNote",
  "responsibilities",
  "title",
]);

const BARE_YM = /^\d{4}-(0[1-9]|1[0-2])$/;

function isObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function checkGraphPayload(payload, label = "page") {
  const errs = [];
  const graph = payload?.["@graph"];
  if (!Array.isArray(graph)) {
    return [`${label}: missing @graph array`];
  }
  for (const node of graph) {
    if (!isObject(node)) {
      errs.push(`${label}: non-object node`);
      continue;
    }
    const type = node["@type"];
    const id = node["@id"];
    if (typeof type !== "string") {
      errs.push(`${label}: missing @type`);
      continue;
    }
    if (RETIRED_TYPES.has(type)) {
      errs.push(`${label}: retired type ${type} present`);
    } else if (!KNOWN_TYPES.has(type)) {
      errs.push(`${label}: unknown term ${type}`);
    }
    if (LINKABLE_TYPES.has(type) && typeof id !== "string") {
      errs.push(`${label}: ${type} must not be a blank node (missing @id)`);
    }
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("@")) continue;
      if (!KNOWN_PROPS.has(k)) {
        errs.push(`${label}: unknown property ${k} on ${type}`);
        continue;
      }
      if (k === "author") {
        const vals = Array.isArray(v) ? v : [v];
        for (const a of vals) {
          if (typeof a === "string") {
            errs.push(`${label}: author must be an object ref, got string`);
          }
        }
      }
      if (
        (k === "datePublished" ||
          k === "dateModified" ||
          k === "dateCreated" ||
          k === "expires" ||
          k === "startDate" ||
          k === "endDate") &&
        typeof v === "string" &&
        BARE_YM.test(v)
      ) {
        errs.push(`${label}: bare YYYY-MM forbidden for ${k}=${v}`);
      }
      if (k === "logo") {
        if (typeof v === "string" && !v.startsWith("https://")) {
          errs.push(`${label}: logo must be absolute https URL, got ${v}`);
        }
      }
      if (k === "department" && isObject(v)) {
        if (typeof v["@id"] !== "string" && typeof v["name"] !== "string") {
          errs.push(`${label}: department must not be a blank node (needs @id or name)`);
        }
      }
    }
  }
  return errs;
}

function extractGraphs(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      out.push(JSON.parse(m[1]));
    } catch {
      out.push({ __parseError: true, raw: m[1].slice(0, 200) });
    }
  }
  return out;
}

async function main() {
  const { readdirSync, readFileSync, existsSync } = await import("node:fs");
  const path = await import("node:path");
  const dist = process.env.JSONLD_DIST ?? path.join(process.cwd(), "dist");
  if (!existsSync(path.join(dist, "index.html"))) {
    console.error(`verify-jsonld-vocab: ${dist}/index.html missing — run build first`);
    process.exit(1);
  }
  const walk = (d, acc = []) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, acc);
      else if (p.endsWith(".html")) acc.push(p);
    }
    return acc;
  };
  let failures = 0;
  for (const file of walk(dist)) {
    const rel = file.slice(dist.length + 1);
    if (/^(go|profile)(\/|\\|$)/.test(rel)) continue;
    const html = readFileSync(file, "utf8");
    for (const payload of extractGraphs(html)) {
      if (payload.__parseError) {
        console.error(`${rel}: ld+json parse error`);
        failures++;
        continue;
      }
      const errs = checkGraphPayload(payload, rel);
      for (const e of errs) console.error(e);
      failures += errs.length;
    }
  }
  if (failures > 0) {
    console.error(`verify-jsonld-vocab: ${failures} error(s)`);
    process.exit(1);
  }
  console.log("verify-jsonld-vocab: ok");
}

const invoked = process.argv[1]?.endsWith("verify-jsonld-vocab.mjs");
if (invoked) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
