import { describe, expect, it } from "vitest";
import { pacificMsSinceMidnight, planBatch } from "../src/batch";

const H = 3_600_000;
const base = { cap: 100, sentToday: 0, startHour: 9, endHour: 20, maxPerRun: 8 };

describe("planBatch", () => {
  it("sends nothing outside the window", () => {
    expect(planBatch({ ...base, msSinceMidnight: 8 * H })).toBe(0);
    expect(planBatch({ ...base, msSinceMidnight: 20 * H })).toBe(0);
  });
  it("spreads the cap over the remaining runs", () => {
    expect(planBatch({ ...base, msSinceMidnight: 9 * H })).toBe(2);
  });
  it("stops at the cap and never exceeds the per run max", () => {
    expect(planBatch({ ...base, sentToday: 100, msSinceMidnight: 12 * H })).toBe(0);
    expect(planBatch({ ...base, msSinceMidnight: 19.9 * H })).toBe(8);
  });
  it("sends nothing when cap is zero", () => {
    expect(planBatch({ ...base, cap: 0, msSinceMidnight: 12 * H })).toBe(0);
  });
});

describe("pacificMsSinceMidnight", () => {
  it("handles daylight saving", () => {
    expect(pacificMsSinceMidnight(new Date("2026-07-01T16:30:00Z"))).toBe(9.5 * H);
    expect(pacificMsSinceMidnight(new Date("2026-12-01T17:30:00Z"))).toBe(9.5 * H);
  });
});
