import { expect, it } from "vitest";
import { capForDate } from "../src/batch";
import { validSetting } from "../src/settings";

it("uses a special limit only on its own day", () => {
  expect(capForDate(20, "2026-11-27:100", "2026-11-27")).toBe(100);
  expect(capForDate(20, "2026-11-27:100", "2026-11-28")).toBe(20);
  expect(capForDate(20, "2026-11-27:100, 2026-12-01:50", "2026-12-01")).toBe(50);
  expect(capForDate(20, undefined, "2026-11-27")).toBe(20);
  expect(validSetting("DAILY_CAP_DATES", "2026-11-27:100")).toBeNull();
  expect(validSetting("DAILY_CAP_DATES", "friday 100")).not.toBeNull();
});
