import { describe, expect, it } from "vitest";
import { cleanName, renderMessage } from "../src/pilot";
import { classify, looksLikeTestRecord } from "../src/segments";

describe("classify", () => {
  it("customers", () => expect(classify(["Lights Won", "website lead"])).toBe("customer"));
  it("lost", () => expect(classify(["lights lost", "ride-the-wave"])).toBe("lost"));
  it("excludes gutter pipeline and active leads over won/lost", () => {
    expect(classify(["lights won", "gutter cleaning"])).toBe("excluded");
    expect(classify(["lights lost", "new lead 2026"])).toBe("excluded");
    expect(classify(["phone-engaged-positive", "lights won"])).toBe("excluded");
  });
  it("ignores quote-nurture-paused", () => expect(classify(["quote-nurture-paused", "lights lost"])).toBe("lost"));
  it("excludes cold Facebook ad leads", () => {
    expect(classify(["lights lost", "early bird lights 2026"])).toBe("excluded");
    expect(classify(["lights won", "facebook funnel leads"])).toBe("excluded");
  });
  it("other", () => expect(classify(["quote sent"])).toBe("other"));
});

describe("renderMessage", () => {
  it("fills name and brand, appends STOP line when missing", () => {
    expect(renderMessage("Hi {firstName}, it's {brand}.", "Sam", "lights")).toBe("Hi Sam, it's the Santa's Lights team. Reply STOP to opt out.");
  });
  it("keeps an existing STOP line and falls back to 'there'", () => {
    expect(renderMessage("Hi {firstName}. Reply STOP to opt out", undefined, "dunzo")).toBe("Hi there. Reply STOP to opt out");
  });
});

describe("cleanName", () => {
  it("fixes all-caps and all-lower, keeps mixed case", () => {
    expect(cleanName("JOHN")).toBe("John");
    expect(cleanName("mary-ann")).toBe("Mary-Ann");
    expect(cleanName("O'BRIEN")).toBe("O'Brien");
    expect(cleanName("McDonald")).toBe("McDonald");
    expect(cleanName("  kecia & stan ")).toBe("Kecia & Stan");
    expect(cleanName(undefined)).toBe("");
  });
});

describe("looksLikeTestRecord", () => {
  it("flags dummy records, not real names", () => {
    expect(looksLikeTestRecord({ firstName: "Vic", lastName: "Testing 1234" })).toBe(true);
    expect(looksLikeTestRecord({ firstName: "Demo", lastName: "Customer" })).toBe(true);
    expect(looksLikeTestRecord({ firstName: "Sam", email: "test@example.com" })).toBe(true);
    expect(looksLikeTestRecord({ firstName: "Tess", lastName: "Contesta", email: "tess@gmail.com" })).toBe(false);
    expect(looksLikeTestRecord({ firstName: "Sam", lastName: "Lee" })).toBe(false);
  });
});
