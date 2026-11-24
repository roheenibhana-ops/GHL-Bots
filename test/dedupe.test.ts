import { expect, it } from "vitest";
import { duplicateDrafts } from "../src/pilot";

it("removes only spare drafts, never anything sent or approved", () => {
  const r = (id: string, contact_id: string, status: string, created_at: string) => ({ id, contact_id, status, created_at });
  expect(duplicateDrafts([
    r("1", "a", "sent", "2026-11-24"), r("2", "a", "pending_approval", "2026-11-25"),
    r("3", "b", "pending_approval", "2026-11-24"), r("4", "b", "pending_approval", "2026-11-25"),
    r("5", "c", "pending_approval", "2026-11-25"),
    r("6", "d", "approved", "2026-11-24"), r("7", "d", "held", "2026-11-25"),
  ]).sort()).toEqual(["2", "4"]);
});
