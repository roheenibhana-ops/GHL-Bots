import { expect, it } from "vitest";
import { AGENT_FLOWS, AGENT_TEXT, FLOWS, planClient, planJob, planNewLead, planPhotos, planQuoMessage, planQuote } from "../src/flows";

const p = { name: "Pat Smith", phone: "+19165550100", email: "pat@example.com", address: "12 Oak St, Sacramento, CA" };
const since = "2026-11-25T10:00:00Z";

it("has a flow for every Zap", () => {
  expect(FLOWS).toHaveLength(28);
  expect(new Set(FLOWS.map((f) => f.key + f.account)).size).toBe(28);
  for (const f of FLOWS) { expect(f.zap.length).toBeGreaterThan(5); expect(f.steps.length).toBeGreaterThan(0); }
});

it("plans quotes the way the Zaps do", () => {
  const q = { id: "q1", quoteNumber: "1055", quoteStatus: "awaiting_response", sentAt: "2026-11-25T11:00:00Z", updatedAt: "2026-11-25T11:00:00Z", total: 219, items: [{ name: "Gutter cleaning", totalPrice: 219 }], person: p };
  const sent = planQuote("dunzo", q, since);
  expect(sent.map((x) => x.flow)).toEqual(["quote_sent", "ag_followup"]);
  expect(sent[0].stage).toBe("Quote Sent");
  expect(sent[0].steps.join(" ")).toContain("Quote Number1055");
  expect(planQuote("dunzo", { ...q, sentAt: "2026-11-20T11:00:00Z" }, since)).toEqual([]); // sent before this look
  expect(planQuote("lights", { ...q, quoteStatus: "approved" }, since).map((x) => x.flow)).toEqual(["quote_sent", "ag_followup", "sb_quote", "quote_approved", "ag_approved", "sb_sold"]);
});

it("does not mark a finished customer as lost, unlike the Zap", () => {
  const j = { id: "j1", jobNumber: 77, jobStatus: "archived", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-25T12:00:00Z", completedAt: "2026-11-24T20:00:00Z", total: 219, person: p };
  const done = planJob("dunzo", j, since, "requires_invoicing").find((x) => x.flow === "archived_lost")!;
  expect(done.stage).toBeUndefined();
  expect(done.steps.join(" ")).toContain("STOP");
  const dead = planJob("dunzo", { ...j, completedAt: null }, since, "upcoming").find((x) => x.flow === "archived_lost")!;
  expect(dead.stage).toBe("Lost");
  expect(dead.steps.join(" ")).toContain("dunzo lost");
  expect(planJob("dunzo", j, since, "archived")).toEqual([]); // nothing changed since the last look
});

it("plans jobs, clients, new leads and texts", () => {
  const j = { id: "j2", jobNumber: 78, jobStatus: "upcoming", createdAt: "2026-11-25T11:00:00Z", updatedAt: "2026-11-25T11:00:00Z", completedAt: null, total: 319, person: p };
  expect(planJob("dunzo", j, since).map((x) => x.flow)).toEqual(["job_created"]);
  expect(planJob("dunzo", { ...j, createdAt: "2026-11-01T00:00:00Z", jobStatus: "unscheduled" }, since, "upcoming")[0].stage).toBe("Job Unscheduled");
  expect(planJob("lights", { ...j, createdAt: "2026-11-01T00:00:00Z", completedAt: "2026-11-25T12:00:00Z" }, since, "upcoming").map((x) => x.flow)).toEqual(["job_completed", "sb_installed"]);
  expect(planClient("dunzo", { id: "c1", createdAt: "2026-11-25T11:00:00Z", updatedAt: "2026-11-25T11:00:00Z", person: p }, since).map((x) => x.flow)).toEqual(["cc_project"]);
  expect(planClient("dunzo", { id: "c1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-11-25T11:00:00Z", person: p }, since).map((x) => x.flow)).toEqual(["contact_update"]);
  expect(planNewLead("lights", { id: "o1", changedAt: "2026-11-25T11:00:00Z", person: p, tags: ["website lead"] }).steps[1]).toContain("website lead");
  expect(planQuoMessage("dunzo", { id: "m1", direction: "incoming", text: "yes please", other: "+19165550100", createdAt: since }).flow).toBe("quo_in");
});

it("rebuilds every GoHighLevel agent, and plans what each would send", () => {
  expect(AGENT_FLOWS.filter((f) => f.account === "dunzo")).toHaveLength(5); // 6 GHL agents, two merged into one
  expect(AGENT_FLOWS.filter((f) => f.account === "lights")).toHaveLength(6); // 7 GHL agents, two merged into one
  for (const f of AGENT_FLOWS) { expect(f.kind).toBe("agent"); expect(f.ours).toBeTruthy(); }
  const lead = { id: "o1", changedAt: "2026-11-25T11:00:00Z", person: p, tags: ["website lead"] };
  expect(planPhotos("dunzo", lead).steps.join(" ")).toContain(AGENT_TEXT.dunzo.photoRequest);
  expect(planPhotos("lights", { ...lead, tags: ["ai visualizer"] }).steps[0]).toContain("STOP");
  expect(planPhotos("dunzo", { ...lead, tags: ["winter promo"] }).steps[0]).toContain("STOP");
  expect(planPhotos("dunzo", { ...lead, tags: ["photos received"] }).steps.join(" ")).toContain("No message");
  const q = { id: "q9", quoteNumber: "7", quoteStatus: "approved", sentAt: null, updatedAt: "2026-11-25T11:00:00Z", total: 219, items: [], person: p };
  const ap = planQuote("lights", q, since).find((x) => x.flow === "ag_approved")!;
  expect(ap.steps[1]).toContain("Hi Pat, this is the Santa's Lights team. Thank you for approving your lighting quote!");
  // customer wording keeps to the house rules: signed as the team, never as a named person
  expect(JSON.stringify(AGENT_TEXT)).not.toMatch(/Clark/);
});
