import { describe, expect, it } from "vitest";
import { renderMessage } from "../src/pilot";
import { classify } from "../src/segments";

describe("classify", () => {
  it("customers", () => expect(classify(["Lights Won", "website lead"])).toBe("customer"));
  it("lost", () => expect(classify(["lights lost", "ride-the-wave"])).toBe("lost"));
  it("excludes gutter pipeline and active leads over won/lost", () => {
    expect(classify(["lights won", "gutter cleaning"])).toBe("excluded");
    expect(classify(["lights lost", "new lead 2026"])).toBe("excluded");
    expect(classify(["phone-engaged-positive", "lights won"])).toBe("excluded");
  });
  it("ignores quote-nurture-paused", () => expect(classify(["quote-nurture-paused", "lights lost"])).toBe("lost"));
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
