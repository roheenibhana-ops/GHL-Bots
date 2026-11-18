import { describe, expect, it } from "vitest";
import { dedupe, inSendWindow, isStopMessage, normalizePhone } from "../src/safety";

describe("isStopMessage", () => {
  it.each(["STOP", "stop", " Stop.", "unsubscribe", "do not text me"])("catches %s", (t) => {
    expect(isStopMessage(t)).toBe(true);
  });
  it("ignores normal replies", () => {
    expect(isStopMessage("Yes, how much?")).toBe(false);
    expect(isStopMessage("bus stop is near my house")).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("handles common formats", () => {
    expect(normalizePhone("(916) 555-0123")).toBe("+19165550123");
    expect(normalizePhone("1-916-555-0123")).toBe("+19165550123");
    expect(normalizePhone("+19165550123")).toBe("+19165550123");
  });
  it("rejects junk", () => {
    expect(normalizePhone("555")).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});

describe("inSendWindow", () => {
  it("allows 10am Pacific, blocks 9pm Pacific", () => {
    expect(inSendWindow(new Date("2026-06-10T17:00:00Z"), "America/Los_Angeles", 20, 9)).toBe(true);
    expect(inSendWindow(new Date("2026-06-11T04:00:00Z"), "America/Los_Angeles", 20, 9)).toBe(false);
  });
});

describe("dedupe", () => {
  it("drops dnd, no-phone and duplicates across accounts", () => {
    const r = dedupe([
      { id: "1", account: "lights", phone: "9165550123" },
      { id: "2", account: "dunzo", phone: "(916) 555-0123" },
      { id: "3", account: "lights", phone: "9165550999", dnd: true },
      { id: "4", account: "lights" },
    ]);
    expect(r.keep.map((c) => c.id)).toEqual(["1"]);
    expect(r.dropped).toEqual({ noPhone: 1, dnd: 1, duplicate: 1 });
  });
});
