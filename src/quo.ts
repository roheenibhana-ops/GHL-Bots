import type { Env } from "./types";

/** Quo (the phone system, formerly OpenPhone). Read only: nothing here sends or changes anything in Quo. */
const BASE = "https://api.quo.com";
const VERSION = "2026-03-30";

export const quoKey = (env: Env): string | undefined => (env as unknown as Record<string, string | undefined>).QUO_API_KEY || undefined;

export async function quoGet<T>(env: Env, path: string, params: Record<string, string | number | undefined> = {}, key = quoKey(env)): Promise<T> {
  if (!key) throw new Error("Quo is not connected. Add the Quo API key in Settings.");
  const q = Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${encodeURIComponent(k).replace(/%5B/g, "[").replace(/%5D/g, "]")}=${encodeURIComponent(String(v))}`).join("&");
  let res: Response;
  // Quo allows 10 requests a second. When it says slow down, wait as long as it asks and try again.
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`${BASE}${path}${q ? "?" + q : ""}`, { headers: { Authorization: key, "Quo-Api-Version": VERSION } });
    if (res.status !== 429 || attempt >= 3) break;
    const wait = Math.min(Math.max(Number(res.headers.get("retry-after")) || 1, 1), 5);
    await new Promise((r) => setTimeout(r, wait * 1000 + 200));
  }
  if (!res.ok) throw new Error(`Quo ${path} -> ${res.status}: ${(await res.text()).slice(0, 240)}`);
  return (await res.json()) as T;
}

export interface QuoUser { id: string; email?: string; firstName?: string | null; lastName?: string | null; role?: string }
export interface QuoMessage { id: string; from: string; to: string[]; text: string; conversationId: string; direction: "incoming" | "outgoing"; userId?: string | null; phoneNumberId?: string | null; status?: string; createdAt: string }
export interface QuoCall {
  id: string; direction: "incoming" | "outgoing"; status: string; duration: number; createdAt: string; answeredAt?: string | null;
  participants?: { phoneNumber: string; actorId?: string | null }[];
  answeredBy?: string | null; initiatedBy?: string | null; aiHandled?: unknown;
  summary?: { status: string; summary?: string[] | null; nextSteps?: string[] | null; title?: string | null };
  voicemail?: { status: string; duration?: number | null; transcript?: string | null };
}
export interface QuoTranscript { status: string; startTime: string; duration: number; dialogue: { content: string; start: number; end: number; identifier?: string | null; actorId?: string | null }[] }
type Page<T> = { data: T[]; nextCursor?: string | null };

/** Checks a key by asking Quo who is in the workspace. Used before a key is saved. */
export async function quoCheckKey(key: string): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${BASE}/users?limit=1`, { headers: { Authorization: key, "Quo-Api-Version": VERSION } }).catch(() => null);
  return { ok: !!res?.ok, status: res?.status ?? 0 };
}

export const quoUsers = async (env: Env) => (await quoGet<Page<QuoUser>>(env, "/users", { limit: 50 })).data;

/** Up to `pages` pages of 50, newest first. */
async function pages<T>(env: Env, path: string, params: Record<string, string | number | undefined>, max: number): Promise<T[]> {
  const out: T[] = [];
  let after: string | undefined;
  for (let i = 0; i < max; i++) {
    const p = await quoGet<Page<T>>(env, path, { ...params, limit: 50, after });
    out.push(...p.data);
    if (!p.nextCursor) break;
    after = p.nextCursor;
  }
  return out;
}

/** One chunk of a long read, with the cursor to carry on from. */
export async function quoChunk<T>(env: Env, path: string, params: Record<string, string | number | undefined>, after: string | undefined, maxPages: number): Promise<{ items: T[]; next: string | null }> {
  const items: T[] = [];
  let cur = after;
  for (let i = 0; i < maxPages; i++) {
    const p = await quoGet<Page<T>>(env, path, { ...params, limit: 50, after: cur });
    items.push(...p.data);
    if (!p.nextCursor) return { items, next: null };
    cur = p.nextCursor;
  }
  return { items, next: cur ?? null };
}
export interface QuoNumber { id: string; name?: string | null; phoneNumber?: string; formattedNumber?: string | null }
export const quoNumbers = async (env: Env) => (await quoGet<Page<QuoNumber>>(env, "/phone-numbers", { limit: 50 })).data;

export const quoMessages = (env: Env, o: { sinceIso?: string; maxPages: number }) => pages<QuoMessage>(env, "/messages", { "createdAt[gt]": o.sinceIso }, o.maxPages);
export const quoCalls = (env: Env, o: { sinceIso?: string; participant?: string; maxPages: number }) => pages<QuoCall>(env, "/calls", { include: "summary,voicemail", "createdAt[gte]": o.sinceIso, participant: o.participant }, o.maxPages);
export const quoTranscript = async (env: Env, callId: string) => (await quoGet<Page<QuoTranscript>>(env, `/calls/${encodeURIComponent(callId)}/transcripts`, { limit: 10 })).data;

/** A short note on recent phone calls with one customer, for the agent's briefing. Empty when there is nothing or Quo is not connected. */
export function callNotes(calls: QuoCall[], now = Date.now()): string {
  const lines: string[] = [];
  for (const c of calls.slice(0, 5)) {
    const days = Math.max(0, Math.round((now - new Date(c.createdAt).getTime()) / 86_400_000));
    const when = days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
    const what = c.voicemail?.transcript ? `left us a voicemail: UNTRUSTED "${c.voicemail.transcript.slice(0, 220)}"`
      : c.summary?.summary?.length ? `call summary: UNTRUSTED "${c.summary.summary.join(" ").slice(0, 320)}"`
      : ["missed", "no-answer", "abandoned", "busy"].includes(c.status) ? (c.direction === "incoming" ? "they called and nobody picked up" : "we called and they did not pick up")
      : `${c.direction === "incoming" ? "they called us" : "we called them"} and spoke for about ${Math.max(1, Math.round(c.duration / 60))} min`;
    lines.push(`- ${when}: ${what}`);
  }
  return lines.join("\n");
}

export async function customerCallNotes(env: Env, e164: string): Promise<string> {
  if (!quoKey(env)) return "";
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  return callNotes(await quoCalls(env, { participant: e164, sinceIso: since, maxPages: 1 }));
}
