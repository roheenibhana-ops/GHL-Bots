import { describe, expect, it } from "vitest";
import { contentProblems, seasonNote } from "../src/content";

describe("marketing copy checks", () => {
  it("passes real prices and approved links", () => {
    expect(contentProblems("Gutter cleaning is $219 this winter. Details: https://dunzogutters.com/gutter-cleaning")).toEqual([]);
  });
  it("blocks invented prices and links", () => {
    expect(contentProblems("Only $99 this week!").length).toBeGreaterThan(0);
    expect(contentProblems("Visit https://example.com/offer").length).toBeGreaterThan(0);
  });
  it("describes the season for each company", () => {
    const nov = new Date("2026-11-25T18:00:00Z");
    expect(seasonNote(nov, "dunzo")).toMatch(/rainy season/);
    expect(seasonNote(nov, "lights")).toMatch(/Christmas lighting season/);
    expect(seasonNote(new Date("2026-08-10T18:00:00Z"), "lights")).toMatch(/calendar/);
  });
});
