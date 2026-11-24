import { describe, expect, it } from "vitest";
import { buildTranscripts, outcomeOf, parseCoach } from "../src/coach";

const conv = (id: string, status: string, facts: object) => ({ contact_id: id, account: "dunzo", status, facts, updated_at: "2026-11-24T00:00:00Z" });
const msg = (id: string, direction: "inbound" | "outbound", body: string, campaign = "bot") => ({ contact_id: id, direction, campaign, body, created_at: "2026-11-24T00:00:00Z" });

describe("coach", () => {
  it("labels how each conversation ended", () => {
    expect(outcomeOf({ status: "active", facts: { approvedAt: "x" } as never })).toMatch(/WON/);
    expect(outcomeOf({ status: "closed", facts: {} as never })).toMatch(/LOST/);
    expect(outcomeOf({ status: "active", facts: { quoteId: "q" } as never })).toMatch(/quote sent/);
  });
  it("builds transcripts, hides links and emails, and skips conversations with no customer reply", () => {
    const t = buildTranscripts(
      [conv("a", "active", { quoteId: "q" }), conv("b", "active", {})],
      [msg("a", "outbound", "Hi, promo"), msg("a", "inbound", "my email is sam@example.com"), msg("a", "outbound", "Here https://x.co/1", "bot"), msg("b", "outbound", "Hi, promo")],
    );
    expect(t).toHaveLength(1);
    expect(t[0]).toContain("CUSTOMER: my email is [email]");
    expect(t[0]).toContain("[link]");
    expect(t[0]).not.toContain("sam@example.com");
  });
  it("reads the coach's reply and caps the suggestions", () => {
    const r = parseCoach('Sure. {"summary":"ok","working":["a"],"notWorking":[],"suggestions":[{"change":"c1","why":"w","evidence":"e"},{"change":"c2"},{"change":"c3"},{"change":"c4"},{"change":"c5"}]}');
    expect(r?.suggestions).toHaveLength(5);
    expect(parseCoach("no json here")).toBeNull();
  });
});
