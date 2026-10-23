import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";
import {
  heroImageField,
  heroMeta,
  imagesField,
  logoImageField,
  monthPrecision,
  publicSlugField,
  responsibilitiesField,
  seoBase,
} from "./lib/schema/base";

const url = z.string().url();

const employmentTypeEnum = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "TEMPORARY",
  "INTERN",
  "VOLUNTEER",
  "PER_DIEM",
  "OTHER",
]);

const yearMonth = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/);

const person = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/person" }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string().min(1),
        alternateName: z.string().optional(),
        jobTitle: z.string().optional(),
        description: z.string().min(1),
        url,
        email: z.string().email().optional(),
        logo: logoImageField(image),
        image: heroImageField(image),
        images: imagesField(image),
        sameAs: z.array(url).default([]),
        knowsAbout: z.array(reference("skills")).default([]),
        hasOccupation: z.array(reference("experience")).default([]),
        alumniOf: z.array(reference("organizations")).default([]),
        hasCredential: z.array(reference("credentials")).default([]),
        knowsLanguage: z.array(z.string()).default(["id", "en"]),
        address: z
          .object({
            addressLocality: z.string().optional(),
            addressCountry: z.string().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
});

const skills = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/skills" }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string().min(1),
        alternateName: z.string().optional(),
        description: z.string().optional(),
        proficiencyLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
        category: z.enum(["Thinking", "Process", "Technical", "Tools"]).optional(),
        url: url.optional(),
        sameAs: z.array(url).default([]),
        logo: logoImageField(image),
        heroImage: heroImageField(image),
        images: imagesField(image),
        ...heroMeta,
      })
      .strict(),
});

const organizations = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/organizations" }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string().min(1),
        alternateName: z.string().optional(),
        description: z.string().optional(),
        type: z
          .enum(["Organization", "CollegeOrUniversity", "EducationalOrganization"])
          .default("Organization"),
        url: url.optional(),
        logo: logoImageField(image),
        heroImage: heroImageField(image),
        images: imagesField(image),
        ...heroMeta,
        sameAs: z.array(url).default([]),
        parentOrganization: reference("organizations").optional(),
        department: z.union([z.string(), z.object({ name: z.string().min(1) })]).optional(),
      })
      .strict(),
});

const experience = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/experience" }),
  schema: ({ image }) =>
    z
      .object({
        roleName: z.string().min(1),
        description: z.string().min(1),
        url: url.optional(),
        startDate: z.string().regex(monthPrecision),
        endDate: z.string().regex(monthPrecision).optional(),
        worksFor: reference("organizations"),
        skills: z.array(reference("skills")).default([]),
        jobLocation: z.union([z.string(), z.object({ name: z.string().min(1) })]).optional(),
        employmentType: employmentTypeEnum.optional(),
        relatedProjects: z.array(reference("projects")).default([]),
        logo: logoImageField(image),
        heroImage: heroImageField(image),
        images: imagesField(image),
        ...heroMeta,
        occupation: z
          .object({
            name: z.string().min(1),
            description: z.string().optional(),
            skills: z.array(reference("skills")).default([]),
            skillsNote: z.string().optional(),
            responsibilities: responsibilitiesField,
          })
          .strict()
          .optional(),
      })
      .strict(),
});

const credentials = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/credentials" }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        credentialCategory: z
          .enum(["degree", "certificate", "certification", "badge", "license"])
          .optional(),
        educationalLevel: z.string().optional(),
        about: z.array(reference("skills")).default([]),
        recognizedBy: reference("organizations").optional(),
        dateCreated: z.coerce.date().optional(),
        validUntil: z.coerce.date().optional(),
        credentialId: z.string().optional(),
        url: url.optional(),
        publicSlug: publicSlugField.optional(),
        logo: logoImageField(image),
        heroImage: heroImageField(image),
        images: imagesField(image),
        ...heroMeta,
      })
      .strict(),
});

const education = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/education" }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        educationalLevel: z.string().optional(),
        credentialCategory: z.enum(["degree"]).default("degree"),
        recognizedBy: reference("organizations"),
        department: reference("organizations").optional(),
        about: z.array(reference("skills")).default([]),
        startDate: yearMonth.optional(),
        endDate: yearMonth.optional(),
        url: url.optional(),
        publicSlug: publicSlugField.optional(),
        logo: logoImageField(image),
        heroImage: heroImageField(image),
        images: imagesField(image),
        ...heroMeta,
      })
      .strict(),
});

const licenseField = z
  .union([url, z.object({ name: z.string().min(1), url: url.optional() }).strict()])
  .optional();

const offersField = z
  .union([
    z.string(),
    z
      .object({
        price: z.string(),
        priceCurrency: z.string().default("IDR"),
        availability: z.string().optional(),
        url: url.optional(),
      })
      .strict(),
  ])
  .optional();

const projectBase = {
  ...seoBase,
  dateCreated: z.coerce.date().optional(),
  dateModified: z.coerce.date().optional(),
  startDate: z.string().regex(monthPrecision).optional(),
  endDate: z.string().regex(monthPrecision).optional(),
  draft: z.boolean().default(false),
  url: url.optional(),
  codeRepository: url.optional(),
  sameAs: z.array(url).default([]),
  programmingLanguage: z.array(reference("skills")).default([]),
  author: z.array(reference("person")).default([]),
  provider: reference("organizations").optional(),
  isPartOf: reference("organizations").optional(),
  role: z.string().max(120).optional(),
  outcome: z.string().max(200).optional(),
  license: licenseField,
  issn: z.string().optional(),
  isAccessibleForFree: z.boolean().optional(),
  disambiguatingDescription: z.string().optional(),
  relatedExperience: z.array(reference("experience")).default([]),
  verificationStatus: z.enum(["verified", "unverified"]).optional(),
};

const softwareSourceCode = z
  .object({
    type: z.literal("SoftwareSourceCode"),
    ...projectBase,
    applicationCategory: z.string().optional(),
    operatingSystem: z.string().optional(),
  })
  .strict();

const softwareApplication = z
  .object({
    type: z.literal("SoftwareApplication"),
    ...projectBase,
    applicationCategory: z.string().optional(),
    operatingSystem: z.string().optional(),
    offers: offersField,
  })
  .strict();

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.discriminatedUnion("type", [
      softwareSourceCode.extend({
        logo: logoImageField(image),
        heroImage: heroImageField(image),
        images: imagesField(image),
      }),
      softwareApplication.extend({
        logo: logoImageField(image),
        heroImage: heroImageField(image),
        images: imagesField(image),
      }),
    ]),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z
      .object({
        ...seoBase,
        dateModified: z.coerce.date().optional(),
        draft: z.boolean().default(false),
        logo: logoImageField(image),
        heroImage: heroImageField(image),
        images: imagesField(image),
        author: z.array(reference("person")).default([]),
        about: z.array(reference("projects")).default([]),
        aboutExperience: z.array(reference("experience")).default([]),
        mentions: z.array(reference("skills")).default([]),
        publisher: reference("person").optional(),
      })
      .strict(),
});

export const collections = {
  person,
  skills,
  organizations,
  experience,
  education,
  credentials,
  projects,
  blog,
};
