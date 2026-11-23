import { describe, expect, it } from "vitest";
import { mergeSettings, validSetting } from "../src/settings";
import { buildInbox, stageOf } from "../src/dash";
import type { Env } from "../src/types";

const env = { BOT_MODE: "test", SENDING_ENABLED: "false", QUIET_START_HOUR: "20", QUIET_END_HOUR: "8", BOT_START_HOUR: "8", BOT_END_HOUR: "20", DAILY_CAP: "0" } as unknown as Env;

describe("dashboard settings", () => {
  it("lays dashboard values over the config file", () => {
    const e = mergeSettings(env, { BOT_MODE: "live", DAILY_CAP: "100", SENDING_ENABLED: "true", WINDOW_START: "9", WINDOW_END: "19" }) as unknown as Record<string, string>;
    expect(e.BOT_MODE).toBe("live");
    expect(e.DAILY_CAP).toBe("100");
    expect(e.QUIET_END_HOUR).toBe("9");
    expect(e.BOT_END_HOUR).toBe("19");
  });
  it("pause everything overrides the rest", () => {
    const e = mergeSettings(env, { BOT_MODE: "live", SENDING_ENABLED: "true", PAUSE_ALL: "true" }) as unknown as Record<string, string>;
    expect(e.BOT_MODE).toBe("off");
    expect(e.SENDING_ENABLED).toBe("false");
  });
  it("leaves the config alone when nothing is saved", () => {
    expect(mergeSettings(env, {})).toMatchObject({ BOT_MODE: "test", SENDING_ENABLED: "false" });
  });
  it("rejects bad values", () => {
    expect(validSetting("BOT_MODE", "banana")).not.toBeNull();
    expect(validSetting("WINDOW_END", "25")).not.toBeNull();
    expect(validSetting("PAUSE_ALL", "true")).toBeNull();
    expect(validSetting("DAILY_CAP", "100")).toBeNull();
    expect(validSetting("NOPE", "1")).not.toBeNull();
  });
});

describe("inbox", () => {
  const conv = (id: string, status: string, facts: object) => ({ contact_id: id, account: "dunzo" as const, status, facts, updated_at: "2026-11-24T10:00:00Z" });
  it("labels the stage and flags customers who are waiting", () => {
    expect(stageOf({ status: "active", facts: { stories: 1 } })).toBe("Chose home size");
    expect(stageOf({ status: "active", facts: { quoteId: "q" } })).toBe("Quote sent");
    const rows = buildInbox(
      [conv("a", "active", { firstName: "Ann" }), conv("b", "active", { firstName: "Bo" })],
      [
        { contact_id: "a", direction: "inbound", status: "received", campaign: "bot", body: "hi", created_at: "2026-11-24T11:00:00Z" },
        { contact_id: "b", direction: "outbound", status: "sent", campaign: "bot", body: "yo", created_at: "2026-11-24T10:30:00Z" },
      ],
    );
    expect(rows[0]).toMatchObject({ name: "Ann", waiting: true });
    expect(rows[1]).toMatchObject({ name: "Bo", waiting: false });
  });
});
