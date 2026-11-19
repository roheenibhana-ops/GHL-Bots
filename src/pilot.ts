import { sb } from "./db";
import { credsFor, searchContacts } from "./ghl";
import { dedupe } from "./safety";
import { classify, looksLikeTestRecord, type Segment } from "./segments";
import type { Account, Env } from "./types";

const BRAND = { lights: "the Santa's Lights team", dunzo: "Dunzo Gutters" } as const;

/** "JOHN" or "john" becomes "John". Mixed-case names (McDonald, DeShawn) are left alone. */
export function cleanName(raw: string | undefined): string {
  const n = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!n) return "";
  if (n !== n.toUpperCase() && n !== n.toLowerCase()) return n;
  return n.toLowerCase().replace(/(^|[\s\-'’])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function renderMessage(template: string, firstName: string | undefined, account: "lights" | "dunzo"): string {
  const name = cleanName(firstName) || "there";
  let text = template.replaceAll("{firstName}", name).replaceAll("{brand}", BRAND[account]);
  if (!/stop/i.test(text)) text += " Reply STOP to opt out.";
  return text;
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export interface PilotOptions {
  /** The GHL account this campaign runs from. One account per campaign. */
  account: Account;
  campaign: string;
  size: number;
  template: string;
  pagesPerAccount: number;
  /** Preview only: pick and render messages but save nothing. */
  dryRun?: boolean;
}

/** Builds a pilot campaign: pulls contacts, drops DND/dupes/excluded, samples a mix, queues drafts for approval. Sends nothing. */
export async function createPilot(env: Env, o: PilotOptions) {
  if (/\[OFFER\]|\[X\]/i.test(o.template)) throw new Error("Template still contains a placeholder like [OFFER]. Fill in the real offer.");
  if (!o.template.includes("{firstName}")) throw new Error("Template should include {firstName}.");

  const all: Parameters<typeof dedupe>[0] = [];
  const creds = credsFor(env, o.account);
  for (let page = 1; page <= o.pagesPerAccount; page++) {
    const { contacts } = await searchContacts(creds, { page, pageLimit: 100 });
    if (!contacts?.length) break;
    all.push(...contacts.map((c) => ({ ...c, account: o.account })));
  }
  const { keep, dropped } = dedupe(all);

  const already = await sb<{ contact_id: string }[]>(env, "GET", `messages?campaign=eq.${encodeURIComponent(o.campaign)}&select=contact_id`);
  const taken = new Set(already.map((r) => r.contact_id));

  const buckets: Record<Segment, typeof keep> = { customer: [], lost: [], excluded: [], other: [] };
  for (const c of keep) {
    if (taken.has(c.id) || looksLikeTestRecord(c)) continue;
    buckets[classify(c.tags, o.account)].push(c);
  }

  const half = Math.floor(o.size / 2);
  const customers = shuffle(buckets.customer).slice(0, half);
  const lost = shuffle(buckets.lost).slice(0, o.size - customers.length);
  // Top up from everyone else who passed the filters, if customers and lost leads don't reach the target size.
  const others = shuffle(buckets.other).slice(0, Math.max(0, o.size - customers.length - lost.length));
  const picked = [
    ...customers.map((c) => ({ c, segment: "customer" as const })),
    ...lost.map((c) => ({ c, segment: "lost" as const })),
    ...others.map((c) => ({ c, segment: "other" as const })),
  ];

  const rows = picked.map(({ c, segment }) => ({
    account: c.account,
    contact_id: c.id,
    direction: "outbound",
    body: renderMessage(o.template, c.firstName, c.account as "lights" | "dunzo"),
    status: "pending_approval",
    campaign: o.campaign,
    segment,
    contact_name: [c.firstName, c.lastName].filter(Boolean).join(" ") || null,
    timezone: c.timezone ?? null,
    phone_e164: c.e164,
  }));
  if (rows.length && !o.dryRun) await sb(env, "POST", "messages", rows, "return=minimal");

  const count = (seg: string, acct: string) => rows.filter((r) => r.segment === seg && r.account === acct).length;
  return {
    campaign: o.campaign,
    dryRun: !!o.dryRun,
    queued: o.dryRun ? 0 : rows.length,
    wouldQueue: rows.length,
    pool: { customer: buckets.customer.length, lost: buckets.lost.length, excluded: buckets.excluded.length, other: buckets.other.length },
    dropped,
    mix: {
      customer: { lights: count("customer", "lights"), dunzo: count("customer", "dunzo") },
      lost: { lights: count("lost", "lights"), dunzo: count("lost", "dunzo") },
      other: { lights: count("other", "lights"), dunzo: count("other", "dunzo") },
    },
    sample: rows.slice(0, o.dryRun ? 6 : 3).map((r) => ({ account: r.account, segment: r.segment, body: r.body })),
  };
}
