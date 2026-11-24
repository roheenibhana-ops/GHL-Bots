import { describe, expect, it } from "vitest";
import { pickTargets } from "../src/chaser";

const now = new Date("2026-11-28T17:00:00Z").getTime();
const promo = (id: string, sent: string) => ({ contact_id: id, account: "dunzo" as const, contact_name: "Dave", phone_e164: "+19165550100", timezone: null, sent_at: sent });
const msg = (id: string, direction: "inbound" | "outbound", campaign: string, at: string, status = direction === "inbound" ? "received" : "sent") => ({ contact_id: id, direction, campaign, status, body: "x", created_at: at, sent_at: direction === "outbound" ? at : null });
const conv = (id: string, facts: object, status = "active") => ({ contact_id: id, account: "dunzo" as const, status, facts });
const pick = (o: object) => pickTargets({ promos: [], convs: [], msgs: [], now, promoDays: 3, maxQuoteFollowUps: 2, ...o });

describe("who Dash follows up", () => {
  it("nudges a promo with no reply after three days, once", () => {
    const p = [promo("a", "2026-11-24T16:20:00Z")];
    expect(pick({ promos: p, msgs: [msg("a", "outbound", "pilot-2", "2026-11-24T16:20:00Z")] })).toMatchObject([{ kind: "promo", contactId: "a" }]);
    expect(pick({ promos: [promo("a", "2026-11-27T16:20:00Z")] })).toEqual([]); // too soon
    expect(pick({ promos: p, msgs: [msg("a", "inbound", "bot", "2026-11-25T10:00:00Z")] })).toEqual([]); // they replied
    expect(pick({ promos: p, msgs: [msg("a", "outbound", "followup", "2026-11-27T16:00:00Z")] })).toEqual([]); // already nudged
  });
  it("chases a quiet quote, at most twice, and never when the customer spoke last", () => {
    const c = [conv("q", { quoteId: "Q1", firstName: "Sam" })];
    const base = [msg("q", "inbound", "bot", "2026-11-26T10:00:00Z"), msg("q", "outbound", "bot", "2026-11-26T10:01:00Z")];
    expect(pick({ convs: c, msgs: base })).toMatchObject([{ kind: "quote", contactId: "q", nth: 1 }]);
    expect(pick({ convs: c, msgs: [...base, msg("q", "inbound", "bot", "2026-11-27T10:00:00Z")] })).toEqual([]);
    expect(pick({ convs: c, msgs: [...base, msg("q", "outbound", "followup", "2026-11-27T10:00:00Z")] })).toMatchObject([{ nth: 2 }]);
    expect(pick({ convs: c, msgs: [...base, msg("q", "outbound", "followup", "2026-11-26T12:00:00Z"), msg("q", "outbound", "followup", "2026-11-27T12:00:00Z")] })).toEqual([]);
    expect(pick({ convs: [conv("q", { quoteId: "Q1", approvedAt: "x" })], msgs: base })).toEqual([]);
    expect(pick({ convs: [conv("q", { quoteId: "Q1" }, "handed_off")], msgs: base })).toEqual([]);
  });
  it("leaves a quote alone for the first 20 hours", () => {
    expect(pick({ convs: [conv("q", { quoteId: "Q1" })], msgs: [msg("q", "outbound", "bot", "2026-11-28T10:00:00Z")] })).toEqual([]);
  });
});

describe("customers who asked for time", () => {
  const old = [msg("w", "outbound", "bot", "2026-11-15T17:00:00Z")]; // quote sent 13 days ago
  it("leaves them alone during the hold and comes back when it ends", () => {
    expect(pick({ convs: [conv("w", { quoteId: "Q1", dashHoldUntil: now + 86_400_000 })], msgs: old })).toEqual([]);
    expect(pick({ convs: [conv("w", { quoteId: "Q1", dashHoldUntil: now - 3_600_000 })], msgs: old }).map((t) => t.contactId)).toEqual(["w"]);
  });
});
