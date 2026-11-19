import { describe, expect, it } from "vitest";
import { assess, recentOrActiveJobs, type JClient } from "../src/check";

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
