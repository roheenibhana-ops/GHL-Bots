import { describe, expect, it } from "vitest";
import { deadlineFor, deadlineNote, deadlinePassed, formatDeadline } from "../src/deadline";
import { systemPrompt } from "../src/bot";

describe("promo deadlines", () => {
  const now = new Date("2026-11-24T18:00:00Z");
  it("formats the date and the note", () => {
    expect(formatDeadline("2026-12-15")).toBe("December 15");
    expect(deadlineNote("2026-12-15")).toBe("Price good through December 15.");
    expect(deadlineNote("")).toBe("");
    expect(formatDeadline("15 Dec")).toBeNull();
  });
  it("holds each customer to the date in the text they were sent", () => {
    expect(deadlineFor("Hi Al... Price good through December 22. Reply STOP to opt out.", "2026-12-15", now)).toBe("2026-12-22");
    expect(deadlineFor("Hi Al... Reply STOP to opt out.", "2026-12-15", now)).toBe("2026-12-15");
    expect(deadlineFor("Hi Al... Reply STOP to opt out.", "", now)).toBeNull();
    expect(deadlineFor("Price good through January 10.", "", new Date("2026-12-20T00:00:00Z"))).toBe("2027-01-10");
  });
  it("knows when it has passed, in Sacramento time", () => {
    expect(deadlinePassed("2026-12-15", new Date("2026-12-16T07:00:00Z"))).toBe(false); // still the 15th in Sacramento
    expect(deadlinePassed("2026-12-15", new Date("2026-12-16T09:00:00Z"))).toBe(true);
  });
  it("tells the agent the right thing and never mentions scheduling into January", () => {
    const p = systemPrompt({ firstName: "Al", deadline: "2026-12-15" } as never);
    expect(p).toContain("good through December 15");
    expect(p).not.toMatch(/into January/);
    expect(systemPrompt({ firstName: "Al" } as never)).toContain("No end date has been set");
  });
});
