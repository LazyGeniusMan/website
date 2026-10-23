import { describe, expect, it } from "vite-plus/test";
import { hueOf, initialsOf, monogramOf } from "../src/lib/monogram";

describe("monogram helpers", () => {
  it("derives two-letter initials from the first two words", () => {
    expect(initialsOf("Rutgers University")).toBe("RU");
    expect(initialsOf("Python")).toBe("P");
    expect(initialsOf("PT GITS Indonesia")).toBe("PG");
  });

  it("returns a stable hue in range for any name", () => {
    for (const name of [
      "Python",
      "EF Standard English Test (EF SET)",
      "Website for DIGITS Unpad",
    ]) {
      const hue = hueOf(name);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
      expect(hueOf(name)).toBe(hue);
    }
  });

  it("builds a tile with matching bg/fg hues", () => {
    const tile = monogramOf("Navcore");
    expect(tile.initials).toBe("N");
    expect(tile.bg).toBe(`hsl(${tile.hue} 28% 20%)`);
    expect(tile.fg).toBe(`hsl(${tile.hue} 65% 90%)`);
  });
});
