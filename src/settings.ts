import { sb } from "./db";
import type { Env } from "./types";

export interface SettingDef {
  key: string;
  label: string;
  help: string;
  type: "toggle" | "select" | "number" | "text";
  options?: string[];
  /** Friendlier names for the options of a select. */
  labels?: Record<string, string>;
  group: string;
}

/** Everything that can be changed from the dashboard. The config file holds the defaults; these override it. */
import { MODELS, TASKS, settingKey, type Task } from "./agents";

const MODEL_SETTINGS: SettingDef[] = (Object.keys(TASKS) as Task[]).map((t) => ({ key: settingKey(t), group: "AI models", label: TASKS[t].label, help: TASKS[t].why + " Recommended: " + MODELS[TASKS[t].def].label + ".", type: "select" as const, options: Object.keys(MODELS), labels: Object.fromEntries(Object.entries(MODELS).map(([k, m]) => [k, m.label])) }));

export const SETTINGS: SettingDef[] = [
  { key: "PAUSE_ALL", group: "Safety", label: "Pause everything", help: "Emergency stop. The bot stops replying and no promo texts go out until you switch it off.", type: "toggle" },
  { key: "BOT_MODE", group: "Bot", label: "Who the bot talks to", help: "Off: only records replies. Test: only contacts tagged bot-test. Live: every customer who got the promo.", type: "select", options: ["off", "test", "live"] },
  { key: "QUOTE_MODE", group: "Bot", label: "When a quote is ready", help: "Alert: tell the team only. Draft: make a draft quote in Jobber. Link: create it and text the customer the link.", type: "select", options: ["alert", "draft", "link"] },
  { key: "PHOTO_MODE", group: "Bot", label: "Photo handling", help: "Off, test, or live. Moves a lead to Photos Received when they send photos.", type: "select", options: ["off", "test", "live"] },
  { key: "QUO_CALL_PAUSE", group: "Bot", label: "Step back after a phone call", help: "On: if someone on the team has spoken to a customer by phone in the last 24 hours, or the customer left a voicemail, the bot does not reply to their text. It passes the conversation to the team with an alert. Needs Quo connected.", type: "select", options: ["on", "off"] },
  { key: "FLOWS_WATCH", group: "Flows", label: "Watch the flows", help: "On: every few minutes the app looks at what just happened in Jobber, GoHighLevel and Quo and writes down what each flow would have done. It only reads. Nothing is changed in any system, and no Zap is affected.", type: "select", options: ["on", "off"] },
  { key: "SENDING_ENABLED", group: "Promo texts", label: "Send approved promo texts", help: "Lets the daily sender release texts you have approved. Nothing goes out unless this is on and a daily limit is set.", type: "toggle" },
  { key: "DAILY_CAP", group: "Promo texts", label: "Promo texts per day", help: "The most promo texts sent in one day, spread across the sending window. 0 means none.", type: "number" },
  { key: "DAILY_CAP_DATES", group: "Promo texts", label: "Special limit on single days", help: "A different limit for one day, like 2026-11-27:100. Separate more with commas. Every other day uses the normal limit above.", type: "text" },
  { key: "START_ON", group: "Promo texts", label: "Do not send before (date)", help: "Year, month, day, like 2026-11-25, in Pacific time. Promo texts wait until this date even if sending is on.", type: "text" },
  { key: "PROMO_OWNER_ID", group: "Promo texts", label: "Owner for promo leads (GHL user ID)", help: "Each contact a promo is sent to gets this GHL user as its owner, replacing any owner it had. Set to Clark.", type: "text" },
  { key: "BLACKOUT_DATES", group: "Promo texts", label: "No sending on these dates", help: "Holidays and days off, Pacific time, like 2026-11-26,2026-12-25. No promo or follow up texts go out on these dates. Customers who text us still get an answer.", type: "text" },
  { key: "PROMO_DEADLINE", group: "Promo texts", label: "Offer deadline for the next texts", help: "A date like 2026-12-15. Each promo text sent from now on says the price is good through this date, and each customer is held to the date in their own text. Change it before each new batch.", type: "text" },
  { key: "BATCH_CAMPAIGN", group: "Promo texts", label: "Campaign name", help: "Which campaign the daily sender releases. Leave as it is unless you made a new one.", type: "text" },
  { key: "DASH_MODE", group: "Follow ups (Dash)", label: "Follow ups", help: "Off: Dash does nothing. Approve: Dash writes follow ups and they wait on the Approvals page for you. Auto: they send by themselves.", type: "select", options: ["off", "approve", "auto"] },
  { key: "DASH_PROMO_DAYS", group: "Follow ups (Dash)", label: "Days before following up a promo with no reply", help: "How many days after the promo text Dash waits before one follow up.", type: "number" },
  { key: "WINDOW_START", group: "Hours", label: "Start texting at (hour, 0 to 23)", help: "Pacific time. 8 means 8am.", type: "number" },
  { key: "WINDOW_END", group: "Hours", label: "Stop texting at (hour, 0 to 23)", help: "Pacific time. 20 means 8pm.", type: "number" },
  ...MODEL_SETTINGS,
];

type Row = { key: string; value: string };
let cache: { at: number; map: Record<string, string>; ready: boolean; error?: string } | null = null;

export async function loadSettings(env: Env, force = false): Promise<{ map: Record<string, string>; ready: boolean; error?: string }> {
  if (!force && cache && Date.now() - cache.at < 8000) return cache;
  try {
    const rows = await sb<Row[]>(env, "GET", "settings?select=key,value&limit=200");
    cache = { at: Date.now(), map: Object.fromEntries(rows.map((r) => [r.key, r.value])), ready: true };
  } catch (e) {
    cache = { at: Date.now(), map: {}, ready: false, error: (e as Error).message.slice(0, 240) };
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
  set("QUO_CALL_PAUSE", map.QUO_CALL_PAUSE);
  set("FLOWS_WATCH", map.FLOWS_WATCH);
  for (const t of Object.keys(TASKS) as Task[]) set(settingKey(t), map[settingKey(t)]);
  set("SENDING_ENABLED", map.SENDING_ENABLED);
  set("DAILY_CAP", map.DAILY_CAP);
  set("BATCH_CAMPAIGN", map.BATCH_CAMPAIGN);
  set("START_ON", map.START_ON);
  if (map.PROMO_DEADLINE !== undefined) o.PROMO_DEADLINE = map.PROMO_DEADLINE;
  if (map.DAILY_CAP_DATES !== undefined) o.DAILY_CAP_DATES = map.DAILY_CAP_DATES;
  set("DASH_MODE", map.DASH_MODE);
  set("DASH_PROMO_DAYS", map.DASH_PROMO_DAYS);
  if (map.BLACKOUT_DATES !== undefined) o.BLACKOUT_DATES = map.BLACKOUT_DATES;
  set("PROMO_OWNER_ID", map.PROMO_OWNER_ID);
  if (map.WINDOW_START !== undefined && map.WINDOW_START !== "") { o.QUIET_END_HOUR = map.WINDOW_START; o.BOT_START_HOUR = map.WINDOW_START; }
  if (map.WINDOW_END !== undefined && map.WINDOW_END !== "") { o.QUIET_START_HOUR = map.WINDOW_END; o.BOT_END_HOUR = map.WINDOW_END; }
  if (map.PAUSE_ALL === "true") { o.BOT_MODE = "off"; o.SENDING_ENABLED = "false"; }
  return o as unknown as Env;
}

export async function applySettings(env: Env): Promise<Env> {
  const { map } = await loadSettings(env);
  const merged = mergeSettings(env, map);
  // An AI key saved from the dashboard wins over the one set in Cloudflare.
  const out = { ...merged } as unknown as Record<string, string | undefined>;
  // Anything connected from the dashboard wins over what is set in Cloudflare.
  for (const c of CONNECTORS) for (const f of c.fields) {
    const v = await savedSecret(env, map, "SECRET_" + f.env);
    if (v) out[f.env] = v;
  }
  // The approved house voice, learned from the owner's real calls and texts.
  if (map[VOICE_ROW]) out.VOICE_PROFILE = map[VOICE_ROW];
  return out as unknown as Env;
}

// ---------- Connections: the keys for each outside system, saved from the dashboard ----------
export interface ConnField { env: string; label: string; ph: string; secret: boolean }
export interface Connector { id: string; title: string; name: string; need: boolean; help: string; fields: ConnField[] }
export const CONNECTORS: Connector[] = [
  { id: "claude", title: "AI account (Claude)", name: "Claude", need: true, help: "Create a key at console.anthropic.com under API keys, and set a monthly spending limit there. AI costs bill to that account.",
    fields: [{ env: "ANTHROPIC_API_KEY", label: "Claude API key", ph: "sk-ant-...", secret: true }] },
  { id: "ghl-dunzo", title: "GoHighLevel: Dunzo Gutters", name: "GoHighLevel", need: true, help: "In the Dunzo sub account go to Settings, Private Integrations, and create a token with contacts, conversations and opportunities access. The Location ID is on Settings, Business Profile.",
    fields: [{ env: "GHL_TOKEN_DUNZO", label: "Private integration token", ph: "pit-...", secret: true }, { env: "GHL_LOCATION_DUNZO", label: "Location ID", ph: "Location ID", secret: false }] },
  { id: "ghl-lights", title: "GoHighLevel: Santa's Lights", name: "GoHighLevel", need: true, help: "The same two things from the Santa's Lights sub account.",
    fields: [{ env: "GHL_TOKEN_LIGHTS", label: "Private integration token", ph: "pit-...", secret: true }, { env: "GHL_LOCATION_LIGHTS", label: "Location ID", ph: "Location ID", secret: false }] },
  { id: "jobber", title: "Jobber", name: "Jobber", need: true, help: "From your app in the Jobber Developer Center. After saving, press Connect for each company and approve it in Jobber.",
    fields: [{ env: "JOBBER_CLIENT_ID", label: "App client ID", ph: "Client ID", secret: false }, { env: "JOBBER_CLIENT_SECRET", label: "App client secret", ph: "Client secret", secret: true }] },
  { id: "companycam", title: "Job photos (CompanyCam)", name: "CompanyCam", need: false, help: "In CompanyCam, create a Personal Access Token (your account settings, Access Tokens). The agents only read projects and photos.",
    fields: [{ env: "COMPANYCAM_TOKEN", label: "Access token", ph: "CompanyCam access token", secret: true }] },
  { id: "quo", title: "Phone system (Quo)", name: "Quo", need: false, help: "In Quo go to Workspace Settings, then API, and generate a key (owner or admin only). The agents only read from Quo.",
    fields: [{ env: "QUO_API_KEY", label: "Quo API key", ph: "Quo API key", secret: true }] },
];

/** For the dashboard: where each value comes from. Secrets show only their last four characters. */
export async function connectionFields(rawEnv: Env, map: Record<string, string>, c: Connector) {
  const raw = rawEnv as unknown as Record<string, string | undefined>;
  return Promise.all(c.fields.map(async (f) => {
    const saved = await savedSecret(rawEnv, map, "SECRET_" + f.env);
    const v = saved || raw[f.env] || "";
    return { env: f.env, label: f.label, ph: f.ph, secret: f.secret, source: saved ? "dashboard" : raw[f.env] ? "cloudflare" : "none", shown: !v ? "" : f.secret ? "ending in " + v.slice(-4) : v };
  }));
}

// ---------- The AI key, saved from the dashboard ----------
// It is stored encrypted, is never sent back to the browser, and cannot be read or written through the normal settings route.
export const AI_KEY_ROW = "SECRET_ANTHROPIC_API_KEY";
export const QUO_KEY_ROW = "SECRET_QUO_API_KEY";
export const VOICE_ROW = "VOICE_PROFILE";
export const VOICE_DRAFT_ROW = "VOICE_DRAFT";
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function cryptoKey(env: Env): Promise<CryptoKey> {
  const seed = (env as unknown as Record<string, string | undefined>).SETTINGS_KEY || env.SUPABASE_SERVICE_KEY;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ai-key:" + seed));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(env: Env, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(env), new TextEncoder().encode(plain)));
  return "v1." + b64(iv) + "." + b64(ct);
}

export async function decryptSecret(env: Env, blob: string): Promise<string | null> {
  try {
    const [v, iv, ct] = blob.split(".");
    if (v !== "v1" || !iv || !ct) return null;
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await cryptoKey(env), unb64(ct)));
  } catch {
    return null;
  }
}

const keyCache = new Map<string, { blob: string; key: string | null }>();
export async function savedSecret(env: Env, map: Record<string, string>, row: string): Promise<string | null> {
  const blob = map[row];
  if (!blob) return null;
  if (keyCache.get(row)?.blob !== blob) keyCache.set(row, { blob, key: await decryptSecret(env, blob) });
  return keyCache.get(row)!.key;
}
const savedAiKey = (env: Env, map: Record<string, string>) => savedSecret(env, map, AI_KEY_ROW);

/** Where the Quo key comes from, and its last four characters. Never the key. */
export async function quoKeyStatus(rawEnv: Env, map: Record<string, string>): Promise<{ source: "dashboard" | "cloudflare" | "none"; ending: string | null }> {
  const saved = await savedSecret(rawEnv, map, QUO_KEY_ROW);
  if (saved) return { source: "dashboard", ending: saved.slice(-4) };
  const cf = (rawEnv as unknown as Record<string, string | undefined>).QUO_API_KEY;
  return cf ? { source: "cloudflare", ending: cf.slice(-4) } : { source: "none", ending: null };
}

/** What the dashboard may know about the AI key: where it comes from and its last four characters. Never the key. */
export async function aiKeyStatus(rawEnv: Env, map: Record<string, string>): Promise<{ source: "dashboard" | "cloudflare" | "none"; ending: string | null; broken?: boolean }> {
  if (map[AI_KEY_ROW]) {
    const k = await savedAiKey(rawEnv, map);
    return k ? { source: "dashboard", ending: k.slice(-4) } : { source: rawEnv.ANTHROPIC_API_KEY ? "cloudflare" : "none", ending: null, broken: true };
  }
  return rawEnv.ANTHROPIC_API_KEY ? { source: "cloudflare", ending: rawEnv.ANTHROPIC_API_KEY.slice(-4) } : { source: "none", ending: null };
}

export function aiKeyLooksRight(value: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,300}$/.test(value);
}

/** The value each setting has right now, for the dashboard. */
export function effectiveValues(env: Env, map: Record<string, string>): Record<string, string> {
  const e = env as unknown as Record<string, string | undefined>;
  const base: Record<string, string> = {
    PAUSE_ALL: map.PAUSE_ALL ?? "false",
    BOT_MODE: map.BOT_MODE ?? e.BOT_MODE ?? "test",
    QUOTE_MODE: map.QUOTE_MODE ?? e.QUOTE_MODE ?? "link",
    PHOTO_MODE: map.PHOTO_MODE ?? e.PHOTO_MODE ?? "test",
    QUO_CALL_PAUSE: map.QUO_CALL_PAUSE ?? e.QUO_CALL_PAUSE ?? "on",
    FLOWS_WATCH: map.FLOWS_WATCH ?? e.FLOWS_WATCH ?? "on",
    ...Object.fromEntries((Object.keys(TASKS) as Task[]).map((t) => [settingKey(t), map[settingKey(t)] ?? e[settingKey(t)] ?? TASKS[t].def])),
    SENDING_ENABLED: map.SENDING_ENABLED ?? e.SENDING_ENABLED ?? "false",
    DAILY_CAP: map.DAILY_CAP ?? e.DAILY_CAP ?? "0",
    BATCH_CAMPAIGN: map.BATCH_CAMPAIGN ?? e.BATCH_CAMPAIGN ?? "pilot-2",
    DAILY_CAP_DATES: map.DAILY_CAP_DATES ?? e.DAILY_CAP_DATES ?? "",
    START_ON: map.START_ON ?? e.START_ON ?? "",
    PROMO_DEADLINE: map.PROMO_DEADLINE ?? e.PROMO_DEADLINE ?? "",
    DASH_MODE: map.DASH_MODE ?? e.DASH_MODE ?? "off",
    DASH_PROMO_DAYS: map.DASH_PROMO_DAYS ?? e.DASH_PROMO_DAYS ?? "3",
    BLACKOUT_DATES: map.BLACKOUT_DATES ?? e.BLACKOUT_DATES ?? "",
    PROMO_OWNER_ID: map.PROMO_OWNER_ID ?? e.PROMO_OWNER_ID ?? "",
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
  if (key === "PROMO_DEADLINE") return value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : "Use a date like 2026-12-15";
  if (key === "DAILY_CAP_DATES") return value === "" || /^\d{4}-\d{2}-\d{2}:\d{1,4}(,\s*\d{4}-\d{2}-\d{2}:\d{1,4}){0,20}$/.test(value) ? null : "Use a date and a number like 2026-11-27:100";
  if (key === "BLACKOUT_DATES") return value === "" || /^\d{4}-\d{2}-\d{2}(,\s*\d{4}-\d{2}-\d{2}){0,30}$/.test(value) ? null : "Use dates like 2026-11-26, separated by commas";
  if (def.type === "text" && !/^[A-Za-z0-9_-]{1,40}$/.test(value)) return "Letters, numbers, dashes only";
  return null;
}

export async function saveSetting(env: Env, key: string, value: string): Promise<void> {
  await sb(env, "POST", "settings?on_conflict=key", { key, value, updated_at: new Date().toISOString() }, "resolution=merge-duplicates,return=minimal");
  cache = null;
}
