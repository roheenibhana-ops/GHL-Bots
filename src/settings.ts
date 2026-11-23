import { sb } from "./db";
import type { Env } from "./types";

export interface SettingDef {
  key: string;
  label: string;
  help: string;
  type: "toggle" | "select" | "number" | "text";
  options?: string[];
  group: string;
}

/** Everything that can be changed from the dashboard. The config file holds the defaults; these override it. */
export const SETTINGS: SettingDef[] = [
  { key: "PAUSE_ALL", group: "Safety", label: "Pause everything", help: "Emergency stop. The bot stops replying and no promo texts go out until you switch it off.", type: "toggle" },
  { key: "BOT_MODE", group: "Bot", label: "Who the bot talks to", help: "Off: only records replies. Test: only contacts tagged bot-test. Live: every customer who got the promo.", type: "select", options: ["off", "test", "live"] },
  { key: "QUOTE_MODE", group: "Bot", label: "When a quote is ready", help: "Alert: tell the team only. Draft: make a draft quote in Jobber. Link: create it and text the customer the link.", type: "select", options: ["alert", "draft", "link"] },
  { key: "PHOTO_MODE", group: "Bot", label: "Photo handling", help: "Off, test, or live. Moves a lead to Photos Received when they send photos.", type: "select", options: ["off", "test", "live"] },
  { key: "SENDING_ENABLED", group: "Promo texts", label: "Send approved promo texts", help: "Lets the daily sender release texts you have approved. Nothing goes out unless this is on and a daily limit is set.", type: "toggle" },
  { key: "DAILY_CAP", group: "Promo texts", label: "Promo texts per day", help: "The most promo texts sent in one day, spread across the sending window. 0 means none.", type: "number" },
  { key: "BATCH_CAMPAIGN", group: "Promo texts", label: "Campaign name", help: "Which campaign the daily sender releases. Leave as it is unless you made a new one.", type: "text" },
  { key: "WINDOW_START", group: "Hours", label: "Start texting at (hour, 0 to 23)", help: "Pacific time. 8 means 8am.", type: "number" },
  { key: "WINDOW_END", group: "Hours", label: "Stop texting at (hour, 0 to 23)", help: "Pacific time. 20 means 8pm.", type: "number" },
];

type Row = { key: string; value: string };
let cache: { at: number; map: Record<string, string>; ready: boolean } | null = null;

export async function loadSettings(env: Env, force = false): Promise<{ map: Record<string, string>; ready: boolean }> {
  if (!force && cache && Date.now() - cache.at < 8000) return cache;
  try {
    const rows = await sb<Row[]>(env, "GET", "settings?select=key,value&limit=200");
    cache = { at: Date.now(), map: Object.fromEntries(rows.map((r) => [r.key, r.value])), ready: true };
  } catch {
    cache = { at: Date.now(), map: {}, ready: false };
  }
  return cache;
}

/** Pure: the environment with dashboard settings laid over it. */
export function mergeSettings(env: Env, map: Record<string, string>): Env {
  const o = { ...env } as unknown as Record<string, string>;
  const set = (k: string, v: string | undefined) => { if (v !== undefined && v !== "") o[k] = v; };
  set("BOT_MODE", map.BOT_MODE);
  set("QUOTE_MODE", map.QUOTE_MODE);
  set("PHOTO_MODE", map.PHOTO_MODE);
  set("SENDING_ENABLED", map.SENDING_ENABLED);
  set("DAILY_CAP", map.DAILY_CAP);
  set("BATCH_CAMPAIGN", map.BATCH_CAMPAIGN);
  if (map.WINDOW_START !== undefined && map.WINDOW_START !== "") { o.QUIET_END_HOUR = map.WINDOW_START; o.BOT_START_HOUR = map.WINDOW_START; }
  if (map.WINDOW_END !== undefined && map.WINDOW_END !== "") { o.QUIET_START_HOUR = map.WINDOW_END; o.BOT_END_HOUR = map.WINDOW_END; }
  if (map.PAUSE_ALL === "true") { o.BOT_MODE = "off"; o.SENDING_ENABLED = "false"; }
  return o as unknown as Env;
}

export async function applySettings(env: Env): Promise<Env> {
  const { map } = await loadSettings(env);
  return mergeSettings(env, map);
}

/** The value each setting has right now, for the dashboard. */
export function effectiveValues(env: Env, map: Record<string, string>): Record<string, string> {
  const e = env as unknown as Record<string, string | undefined>;
  const base: Record<string, string> = {
    PAUSE_ALL: map.PAUSE_ALL ?? "false",
    BOT_MODE: map.BOT_MODE ?? e.BOT_MODE ?? "test",
    QUOTE_MODE: map.QUOTE_MODE ?? e.QUOTE_MODE ?? "link",
    PHOTO_MODE: map.PHOTO_MODE ?? e.PHOTO_MODE ?? "test",
    SENDING_ENABLED: map.SENDING_ENABLED ?? e.SENDING_ENABLED ?? "false",
    DAILY_CAP: map.DAILY_CAP ?? e.DAILY_CAP ?? "0",
    BATCH_CAMPAIGN: map.BATCH_CAMPAIGN ?? e.BATCH_CAMPAIGN ?? "pilot-2",
    WINDOW_START: map.WINDOW_START ?? e.BOT_START_HOUR ?? "8",
    WINDOW_END: map.WINDOW_END ?? e.BOT_END_HOUR ?? "20",
  };
  return base;
}

export function validSetting(key: string, value: string): string | null {
  const def = SETTINGS.find((s) => s.key === key);
  if (!def) return "Unknown setting";
  if (def.type === "toggle" && value !== "true" && value !== "false") return "Must be on or off";
  if (def.type === "select" && !def.options!.includes(value)) return "Not an allowed option";
  if (def.type === "number") {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > (key.startsWith("WINDOW") ? 23 : 5000)) return "Out of range";
  }
  if (def.type === "text" && !/^[A-Za-z0-9_-]{1,40}$/.test(value)) return "Letters, numbers, dashes only";
  return null;
}

export async function saveSetting(env: Env, key: string, value: string): Promise<void> {
  await sb(env, "POST", "settings?on_conflict=key", { key, value, updated_at: new Date().toISOString() }, "resolution=merge-duplicates,return=minimal");
  cache = null;
}
