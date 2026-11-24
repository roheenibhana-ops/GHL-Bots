import { describe, expect, it } from "vitest";
import { weekFacts } from "../src/director";

const since = "2026-11-17T00:00:00Z";
const conv = (id: string, account: "dunzo" | "lights", status: string, facts: object, at = "2026-11-23T10:00:00Z") => ({ contact_id: id, account, status, facts, updated_at: at });
const msg = (direction: "inbound" | "outbound", campaign: string, account: "dunzo" | "lights" = "dunzo", status = "sent") => ({ direction, status, campaign, account, created_at: "2026-11-23T10:00:00Z" });

describe("weekFacts", () => {
  it("counts only real activity from the last week", () => {
    const f = weekFacts(
      [msg("outbound", "pilot-2"), msg("outbound", "pilot-2"), msg("outbound", "bot"), msg("inbound", "bot"), msg("outbound", "human"), msg("outbound", "test")],
      [conv("a", "dunzo", "active", { stories: 1, addressConfirmed: true, email: "a@x.co", quoteId: "q" }), conv("b", "dunzo", "handed_off", { stories: 2 }), conv("old", "dunzo", "active", { quoteId: "z" }, "2026-10-01T00:00:00Z")],
      since, null,
    );
    expect(f.texts).toEqual({ promoSent: 2, botReplies: 1, teamReplies: 1, customerReplies: 1 });
    expect(f.conversationsActiveThisWeek).toBe(2);
    expect(f.stages).toMatchObject({ choseHomeSize: 2, confirmedAddress: 1, gaveEmail: 1, quotesCreated: 1, withTheTeam: 1 });
  });
  it("can be limited to one company", () => {
    const f = weekFacts([msg("inbound", "bot", "lights")], [conv("l", "lights", "active", {})], since, "dunzo");
    expect(f.texts.customerReplies).toBe(0);
    expect(f.conversationsActiveThisWeek).toBe(0);
  });
});
