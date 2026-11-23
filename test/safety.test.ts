import { describe, expect, it } from "vitest";
import { dedupe, inSendWindow, isSmsDnd, isStopMessage, normalizePhone } from "../src/safety";

import { isStopMessage as isStopAnywhere } from "../src/safety";
describe("opt out phrases anywhere", () => {
  it("catches natural opt outs", () => {
    for (const t of ["why are you texting me, take me off your list", "please stop texting me", "dont contact me again", "leave me alone", "can you unsubscribe me"]) expect(isStopAnywhere(t)).toBe(true);
  });
  it("does not catch normal chat", () => {
    for (const t of ["1", "yes that is my address", "can you stop by tomorrow", "what does the quote include"]) expect(isStopAnywhere(t)).toBe(false);
  });
});

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

describe("isSmsDnd", () => {
  it("blocks global DND and active/permanent SMS DND, allows inactive or none", () => {
    expect(isSmsDnd({ dnd: true })).toBe(true);
    expect(isSmsDnd({ dndSettings: { SMS: { status: "active" } } })).toBe(true);
    expect(isSmsDnd({ dndSettings: { SMS: { status: "permanent" } } })).toBe(true);
    expect(isSmsDnd({ dndSettings: { SMS: { status: "inactive" } } })).toBe(false);
    expect(isSmsDnd({ dndSettings: { Email: { status: "active" } } })).toBe(false);
    expect(isSmsDnd({})).toBe(false);
  });
});

import { botAllowed } from "../src/safety";

describe("botAllowed", () => {
  it("test people are allowed in test and live, never when off", () => {
    expect(botAllowed("test", "winter promo", ["bot-test"])).toBe(true);
    expect(botAllowed("live", "winter promo", ["Bot-Test"])).toBe(true);
    expect(botAllowed("off", "winter promo", ["bot-test"])).toBe(false);
  });
  it("campaign contacts are only allowed when live", () => {
    expect(botAllowed("test", "winter promo", ["Winter Promo"])).toBe(false);
    expect(botAllowed("live", "winter promo", ["Winter Promo"])).toBe(true);
  });
  it("everyone else is never touched, even when live", () => {
    expect(botAllowed("live", "winter promo", ["dunzo won"])).toBe(false);
    expect(botAllowed("live", undefined, ["winter promo"])).toBe(false);
  });
});
