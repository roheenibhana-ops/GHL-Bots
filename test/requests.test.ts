import { expect, it } from "vitest";
import { assess } from "../src/check";

it("holds someone who has just sent a booking request", () => {
  const now = new Date("2026-11-28T18:00:00Z").getTime();
  const c = (requests: { requestStatus: string; createdAt: string }[]) => [{ id: "1", name: "Pat", phones: [{ number: "+19165550100" }], quotes: { nodes: [] }, jobs: { totalCount: 0, nodes: [] }, requests: { nodes: requests } }];
  expect(assess(c([{ requestStatus: "new", createdAt: "2026-11-25T17:00:00Z" }]), "+19165550100", now).recentRequests).toBe(1);
  expect(assess(c([{ requestStatus: "new", createdAt: "2026-06-01T17:00:00Z" }]), "+19165550100", now).recentRequests).toBe(0);
  expect(assess(c([{ requestStatus: "archived", createdAt: "2026-11-25T17:00:00Z" }]), "+19165550100", now).recentRequests).toBe(0);
  expect(assess(c([]), "+19165550100", now).recentRequests).toBe(0);
});
