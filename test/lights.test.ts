import { describe, expect, it } from "vitest";
import { disallowedPrices, replyProblems } from "../src/bot";
import { SITE_LINKS } from "../src/knowledge";

describe("Santa's Lights knowledge", () => {
  it("allows links on both company sites and nothing else", () => {
    expect(SITE_LINKS).toContain("https://santaslightssacramento.com/virtual-design");
    expect(SITE_LINKS).toContain("https://dunzogutters.com/pricing");
    expect(replyProblems("Try the visualizer https://santaslightssacramento.com/virtual-design")).toEqual([]);
    expect(replyProblems("See https://santaslightssacramento.com/not-a-page").length).toBeGreaterThan(0);
  });
  it("allows the published Lights prices and blocks invented ones", () => {
    expect(disallowedPrices("Christmas lights start from $799, permanent from $2,999, packages $1,200 to $2,000")).toEqual([]);
    expect(disallowedPrices("I can do your house for $1,350")).toEqual(["$1,350"]);
  });
});

import { isLightsReferral } from "../src/lights";
describe("lights referral detection", () => {
  it("recognises a Lights handoff reason", () => {
    expect(isLightsReferral("lights interest")).toBe(true);
    expect(isLightsReferral("Wants Christmas lights quote")).toBe(true);
    expect(isLightsReferral("angry customer")).toBe(false);
    expect(isLightsReferral(undefined)).toBe(false);
  });
});
