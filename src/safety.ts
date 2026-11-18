import type { GhlContact } from "./types";

const STOP_WORDS = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|optout|opt out|remove me|do not text|don'?t text)\b/i;

/** True if an inbound message is an opt-out. Err on the side of treating it as one. */
export function isStopMessage(text: string): boolean {
  return STOP_WORDS.test(text);
}

/** Normalise a US phone number to E.164, or null if it can't be. */
export function normalizePhone(raw?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** Is it inside the allowed send window in the contact's timezone? Window = [endHour, startHour). */
export function inSendWindow(now: Date, tz: string | undefined, startHour: number, endHour: number): boolean {
  let hour: number;
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz || "America/Los_Angeles" }).format(now),
    ) % 24;
  } catch {
    hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Los_Angeles" }).format(now)) % 24;
  }
  // allowed from endHour (e.g. 9) up to but not including startHour (e.g. 20)
  return hour >= endHour && hour < startHour;
}

/** True if the contact must not be texted: global DND, or SMS DND active/permanent in per-channel settings. */
export function isSmsDnd(c: Pick<GhlContact, "dnd" | "dndSettings">): boolean {
  if (c.dnd) return true;
  const status = c.dndSettings?.SMS?.status?.toLowerCase();
  return status === "active" || status === "permanent";
}

export interface DedupeResult {
  keep: (GhlContact & { e164: string; account: string })[];
  dropped: { noPhone: number; dnd: number; duplicate: number };
}

/** Dedupe by phone across accounts. Earlier entries win, so pass the account you want to own a contact first. */
export function dedupe(contacts: (GhlContact & { account: string })[]): DedupeResult {
  const seen = new Set<string>();
  const keep: DedupeResult["keep"] = [];
  const dropped = { noPhone: 0, dnd: 0, duplicate: 0 };
  for (const c of contacts) {
    const e164 = normalizePhone(c.phone);
    if (!e164) { dropped.noPhone++; continue; }
    if (isSmsDnd(c)) { dropped.dnd++; continue; }
    if (seen.has(e164)) { dropped.duplicate++; continue; }
    seen.add(e164);
    keep.push({ ...c, e164 });
  }
  return { keep, dropped };
}
