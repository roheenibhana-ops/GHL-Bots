import { describe, expect, it } from "vitest";
import { summarize, type CampaignRows } from "../src/stats";

const rows: CampaignRows = {
  outbound: [
    { contact_id: "a", status: "sent" }, { contact_id: "b", status: "sent" }, { contact_id: "c", status: "sent" }, { contact_id: "d", status: "sent" },
    { contact_id: "e", status: "pending_approval" }, { contact_id: "f", status: "held" },
  ],
  inboundContacts: ["a", "a", "b", "c", "zzz"],
  conversations: [
    { contact_id: "a", status: "active", facts: { stories: 2, addressConfirmed: true, email: "a@x.co", quoteRequested: true, quoteId: "Q1" } },
    { contact_id: "b", status: "handed_off", facts: { stories: 1 } },
    { contact_id: "c", status: "closed", facts: {} },
    { contact_id: "zzz", status: "active", facts: { stories: 1 } },
  ],
  optedOut: ["c", "nobody"],
  quoteStatus: { Q1: "approved" },
};

describe("summarize", () => {
  const s = summarize(rows);
  it("counts texts by status and only people who were actually sent the promo", () => {
    expect(s.texts).toMatchObject({ sent: 4, pending_approval: 1, held: 1 });
  });
  it("reply rate ignores replies from people outside the campaign", () => {
    expect(s.replies).toEqual({ replied: 3, replyRate: "75%" });
  });
  it("builds the funnel and counts approvals from Jobber", () => {
    expect(s.funnel).toMatchObject({ conversations: 3, chosenHomeSize: 2, confirmedAddress: 1, gaveEmail: 1, quotesCreated: 1, quotesApproved: 1 });
    expect(s.funnel.approvalRateOfReplies).toBe("33%");
  });
  it("reports outcomes and STOP requests inside the campaign only", () => {
    expect(s.outcomes).toEqual({ handedToTeam: 1, closed: 1, stopRequests: 1 });
  });
  it("handles an empty campaign without dividing by zero", () => {
    const e = summarize({ outbound: [], inboundContacts: [], conversations: [], optedOut: [], quoteStatus: {} });
    expect(e.replies.replyRate).toBe("n/a");
  });
});
