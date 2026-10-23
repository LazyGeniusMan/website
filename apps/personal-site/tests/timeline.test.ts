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

import { buildTimeline, normalizeTimelineDate } from "../src/lib/collections";

describe("normalizeTimelineDate", () => {
  it("maps YYYY to year precision at Jan 1", () => {
    expect(normalizeTimelineDate("2018")).toEqual({ iso: "2018-01-01", precision: "year" });
  });
  it("maps YYYY-MM to month precision at the 1st", () => {
    expect(normalizeTimelineDate("2022-06")).toEqual({ iso: "2022-06-01", precision: "month" });
  });
  it("keeps full dates at day precision", () => {
    expect(normalizeTimelineDate(new Date("2024-11-20T00:00:00Z"))).toEqual({
      iso: "2024-11-20",
      precision: "day",
    });
  });
});

describe("buildTimeline", () => {
  it("sorts chronologically and preserves concurrent overlaps", () => {
    const out = buildTimeline([
      { kind: "experience", id: "navcore-2023", title: "Navcore", href: "/x", start: "2023-06" },
      { kind: "experience", id: "digits-2020", title: "DIGITS", href: "/x", start: "2020-07" },
      {
        kind: "experience",
        id: "makers-designer-2022",
        title: "Designer",
        href: "/x",
        start: "2022-06",
      },
    ]);
    expect(out.map((i) => i.id)).toEqual(["digits-2020", "makers-designer-2022", "navcore-2023"]);
  });

  it("flags the SSS +7mo continuation without an overlap error", () => {
    const out = buildTimeline(
      [
        {
          kind: "project",
          id: "website-for-student-study-service-2021",
          title: "SSS site",
          href: "/x",
          start: new Date("2021-09-01T00:00:00Z"),
          experienceRefs: ["sss-2021"],
        },
      ],
      new Map([["sss-2021", "2021-02-01"]]),
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.note).toContain("7 mo");
    expect(out[0]?.note).toContain("sss-2021");
  });

  it("annotates the retrospective dual-link pattern", () => {
    const out = buildTimeline([
      {
        kind: "blog",
        id: "chart-of-accounts",
        title: "CoA",
        href: "/x",
        start: new Date("2024-11-20T00:00:00Z"),
        experienceRefs: ["makers-designer-2022", "navcore-2023"],
      },
    ]);
    expect(out[0]?.note).toContain("Retrospective");
    expect(out[0]?.note).toContain("makers-designer-2022");
  });

  it("passes verificationStatus through (tunaya badge)", () => {
    const out = buildTimeline([
      {
        kind: "project",
        id: "tunaya",
        title: "tunaya",
        href: "/x",
        start: new Date("2025-09-22T00:00:00Z"),
        verificationStatus: "unverified",
        experienceRefs: ["freelance-2024"],
      },
    ]);
    expect(out[0]?.verificationStatus).toBe("unverified");
  });

  it("leaves in-range items note-free", () => {
    const out = buildTimeline(
      [
        {
          kind: "blog",
          id: "small-scripts-automation",
          title: "Scripts",
          href: "/x",
          start: new Date("2025-03-15T00:00:00Z"),
          experienceRefs: ["navcore-2023"],
        },
      ],
      new Map([["navcore-2023", "2025-06-01"]]),
    );
    expect(out[0]?.note).toBeUndefined();
  });
});
