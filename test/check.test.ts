import { describe, expect, it } from "vitest";
import { assess, isActiveQuote, recentOrActiveJobs, type JClient } from "../src/check";

const client = (phone: string, statuses: string[], jobs = 0): JClient => ({
  id: "c1", name: "Sam Lee",
  phones: [{ number: phone, normalizedPhoneNumber: null }],
  quotes: { nodes: statuses.map((quoteStatus) => ({ quoteStatus })) },
  jobs: { totalCount: jobs },
});

describe("assess", () => {
  it("finds an exact phone match and counts open quotes", () => {
    const a = assess([client("(916) 555-0123", ["awaiting_response", "archived"], 2)], "+19165550123");
    expect(a).toMatchObject({ found: true, openQuotes: 1, jobs: 2 });
  });
  it("ignores fuzzy search hits that are not the same number", () => {
    expect(assess([client("(916) 555-9999", ["draft"])], "+19165550123").found).toBe(false);
  });
  it("converted and archived quotes are not open", () => {
    expect(assess([client("9165550123", ["converted", "archived"])], "+19165550123").openQuotes).toBe(0);
  });
  it("no clients means not found", () => {
    expect(assess([], "+19165550123")).toMatchObject({ found: false, openQuotes: 0, jobs: 0 });
  });
});

describe("recentOrActiveJobs", () => {
  const now = Date.parse("2026-11-19T00:00:00Z");
  const c = (nodes: { jobStatus: string; completedAt: string | null }[]): JClient => ({ ...client("9165550123", []), jobs: { totalCount: nodes.length, nodes } });
  it("holds unfinished jobs and jobs completed within 90 days", () => {
    expect(recentOrActiveJobs(c([{ jobStatus: "upcoming", completedAt: null }]), now)).toBe(1);
    expect(recentOrActiveJobs(c([{ jobStatus: "requires_invoicing", completedAt: "2026-10-20T00:00:00Z" }]), now)).toBe(1);
  });
  it("does not hold older completed or archived jobs", () => {
    expect(recentOrActiveJobs(c([{ jobStatus: "archived", completedAt: null }]), now)).toBe(0);
    expect(recentOrActiveJobs(c([{ jobStatus: "active", completedAt: "2026-03-01T00:00:00Z" }]), now)).toBe(0);
  });
  it("no job details means nothing to hold", () => expect(recentOrActiveJobs(client("9165550123", []), now)).toBe(0));
});

describe("isActiveQuote", () => {
  const now = Date.parse("2026-11-19T00:00:00Z");
  it("awaiting response counts only if sent within 30 days", () => {
    expect(isActiveQuote({ quoteStatus: "awaiting_response", sentAt: "2026-11-01T00:00:00Z" }, now)).toBe(true);
    expect(isActiveQuote({ quoteStatus: "awaiting_response", sentAt: "2026-08-01T00:00:00Z" }, now)).toBe(false);
  });
  it("draft, changes requested and approved are always live", () => {
    for (const s of ["draft", "changes_requested", "approved"]) expect(isActiveQuote({ quoteStatus: s, sentAt: "2025-01-01T00:00:00Z" }, now)).toBe(true);
  });
  it("archived and converted are never active; unknown age stays safe", () => {
    expect(isActiveQuote({ quoteStatus: "archived" }, now)).toBe(false);
    expect(isActiveQuote({ quoteStatus: "converted" }, now)).toBe(false);
    expect(isActiveQuote({ quoteStatus: "awaiting_response" }, now)).toBe(true);
  });
  it("assess reports stale quotes separately from active ones", () => {
    const c = { id: "c", name: "A", phones: [{ number: "9165550123" }], quotes: { nodes: [{ quoteStatus: "awaiting_response", sentAt: "2026-01-01T00:00:00Z" }] }, jobs: { totalCount: 0 } };
    expect(assess([c as never], "+19165550123", now)).toMatchObject({ openQuotes: 0, staleQuotes: 1 });
  });
});
