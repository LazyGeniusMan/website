import { z } from "astro:content";
import type { ZodTypeAny } from "astro/zod";

export const heroMeta = {
  heroCredit: z.string().max(200).optional(),
  heroSource: z.string().url().optional(),
};

export const seoBase = {
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(160),
  pubDate: z.coerce.date(),
  tags: z.array(z.string().min(1)).default([]),
  keywords: z.array(z.string()).default([]),
  inLanguage: z.string().default("id"),
  ...heroMeta,
};

const seoBaseSchema = z.object(seoBase);
export type SeoBase = (typeof seoBaseSchema)["_output"];

export function heroImageField<T extends ZodTypeAny>(image: () => T) {
  return image().optional();
}

export function logoImageField<T extends ZodTypeAny>(image: () => T) {
  return image().optional();
}

export function imagesField<T extends ZodTypeAny>(image: () => T) {
  return image().array().optional();
}

export const responsibilitiesField = z.union([z.string(), z.array(z.string().min(1))]).optional();

export function responsibilitiesToString(input: string | string[] | undefined): string | undefined {
  if (input === undefined) return undefined;
  if (Array.isArray(input)) {
    const cleaned = input.map((s) => s.trim()).filter(Boolean);
    return cleaned.length ? cleaned.join("\n") : undefined;
  }
  return input.trim() ? input : undefined;
}

export function responsibilitiesToBullets(input: string | string[] | undefined): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((s) => s.trim()).filter(Boolean);
  return input
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const LIST_IMAGE_FALLBACK_CHAIN = [
  "heroImage/image/logo",
  "organizations-logo",
  "placeholder/seal",
] as const;

export const monthPrecision = /^\d{4}-(0[1-9]|1[0-2])$/;

export const publicSlugField = z
  .string()
  .regex(/^[a-z0-9]([a-z0-9-]{0,73}[a-z0-9])?$/)
  .max(75);

export function expandMonthPrecision(month: string, tzOffset = "+07:00"): string {
  const m = monthPrecision.exec(month);
  if (!m) throw new Error(`expandMonthPrecision: expected YYYY-MM, got ${JSON.stringify(month)}`);
  const [year, mon] = month.split("-");
  return `${year}-${mon}-01T00:00:00${tzOffset}`;
}

export function toEntryJsonSchema<T extends ZodTypeAny>(schema: T) {
  if (typeof z.toJSONSchema !== "function") {
    throw new Error("toEntryJsonSchema: z.toJSONSchema missing — requires the astro/zod v4 path");
  }
  return z.toJSONSchema(schema);
}
