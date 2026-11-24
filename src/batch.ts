import { sb } from "./db";
import { addTags, credsFor, getContact, sendSms, updateContact } from "./ghl";
import { setStage } from "./stages";
import { isSmsDnd, normalizePhone } from "./safety";
import { assess } from "./check";
import { findClientsByPhones } from "./jobber";
import { plainPunctuation } from "./bot";
import type { Account, Env } from "./types";

/** Milliseconds since midnight in Sacramento (Pacific time), including daylight saving. */
export function pacificMsSinceMidnight(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour12: false, hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return (((get("hour") % 24) * 60 + get("minute")) * 60 + get("second")) * 1000;
}

/**
 * How many campaign texts to send in this 10-minute run, so the day's cap is spread evenly across the sending window.
 * Returns 0 outside the window or once the cap has been reached.
 */
export function planBatch(o: { cap: number; sentToday: number; msSinceMidnight: number; startHour: number; endHour: number; maxPerRun: number }): number {
  if (o.cap <= 0 || o.sentToday >= o.cap) return 0;
  const start = o.startHour * 3_600_000;
  const end = o.endHour * 3_600_000;
  if (o.msSinceMidnight < start || o.msSinceMidnight >= end) return 0;
  const runsLeft = Math.max(1, Math.floor((end - o.msSinceMidnight) / 600_000));
  return Math.min(o.maxPerRun, Math.ceil((o.cap - o.sentToday) / runsLeft));
}

/** True when today (a Pacific date, YYYY-MM-DD) is on the list of days with no sending. */
export function isBlackout(list: string | undefined, today: string): boolean {
  return (list ?? "").split(",").map((x) => x.trim()).includes(today);
}

const NEVER_TEXT_TAGS = ["bot-paused", "bot-needs-human", "bot-opted-out"];

type Row = { id: string; account: Account; contact_id: string; body: string };

/** Sends today's share of approved campaign texts. Does nothing unless sending is enabled and a daily cap is set. */
export async function runDailyBatch(env: Env): Promise<Record<string, unknown>> {
  if (env.SENDING_ENABLED !== "true") return { skipped: "campaign sending is off" };
  const cap = Number(env.DAILY_CAP ?? 0);
  if (!(cap > 0)) return { skipped: "DAILY_CAP is not set" };
  const campaign = env.BATCH_CAMPAIGN ?? "pilot-2";
  const now = new Date();
  // Nothing goes out before the start date (Pacific), so sending can be switched on the night before.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);
  if (env.START_ON && today < env.START_ON) return { skipped: `waiting for the start date ${env.START_ON}` };
  if (isBlackout(env.BLACKOUT_DATES, today)) return { skipped: `no sending today (${today} is a day off)` };
  const ms = pacificMsSinceMidnight(now);
  const dayStart = new Date(now.getTime() - ms).toISOString();
  const enc = encodeURIComponent(campaign);

  const sentToday = (await sb<{ id: string }[]>(env, "GET", `messages?campaign=eq.${enc}&status=eq.sent&sent_at=gte.${dayStart}&select=id&limit=2000`)).length;
  const n = planBatch({ cap, sentToday, msSinceMidnight: ms, startHour: Number(env.QUIET_END_HOUR), endHour: Number(env.QUIET_START_HOUR), maxPerRun: Number(env.BATCH_MAX_PER_RUN ?? 8) });
  if (n === 0) return { skipped: "nothing due this run", sentToday, cap };

  const rows = await sb<Row[]>(env, "GET", `messages?campaign=eq.${enc}&status=eq.approved&order=created_at.asc&limit=${n}&select=id,account,contact_id,body`);
  const result = { sent: 0, skipped: 0, held: 0, failed: 0, sentToday, cap };
  for (const m of rows) {
    // Claim first: only one run can ever send a given message.
    const claimed = await sb<{ id: string }[]>(env, "PATCH", `messages?id=eq.${m.id}&status=eq.approved`, { status: "sending" }, "return=representation");
    if (!claimed.length) continue;
    try {
      const creds = credsFor(env, m.account);
      const c = await getContact(creds, m.contact_id);
      const tags = (c.tags ?? []).map((t) => t.toLowerCase());
      if (isSmsDnd(c) || NEVER_TEXT_TAGS.some((t) => tags.includes(t))) {
        await sb(env, "PATCH", `messages?id=eq.${m.id}`, { status: "skipped" }, "return=minimal");
        result.skipped++;
        continue;
      }
      // Always look in Jobber right before sending: no promo to someone with an open quote, an existing cleaning quote, or a recent or unfinished job.
      const phone = normalizePhone(c.phone);
      if (m.account === "dunzo" && phone) {
        const found = await findClientsByPhones(env, "dunzo", [phone]);
        const a = assess(found.get(phone) ?? [], phone);
        if (a.found && (a.openQuotes > 0 || a.cleaningQuotes > 0 || a.recentJobs > 0)) {
          await sb(env, "PATCH", `messages?id=eq.${m.id}`, { status: "held" }, "return=minimal");
          result.held++;
          continue;
        }
      }
      const text = plainPunctuation(m.body);
      await sendSms(creds, m.contact_id, text);
      if (text !== m.body) await sb(env, "PATCH", `messages?id=eq.${m.id}`, { body: text }, "return=minimal");
      await sb(env, "PATCH", `messages?id=eq.${m.id}`, { status: "sent", sent_at: new Date().toISOString() }, "return=minimal");
      if (env.BOT_TAG) await addTags(creds, m.contact_id, [env.BOT_TAG]).catch(() => undefined);
      if (env.PROMO_OWNER_ID && !c.assignedTo) await updateContact(creds, m.contact_id, { assignedTo: env.PROMO_OWNER_ID }).catch(() => undefined);
      await setStage(env, m.account, m.contact_id, "New Lead");
      result.sent++;
    } catch {
      await sb(env, "PATCH", `messages?id=eq.${m.id}`, { status: "failed" }, "return=minimal");
      result.failed++;
    }
  }
  return result;
}

/** Marks the oldest N pending drafts as approved, ready for the batch sender. */
export async function approveBatch(env: Env, campaign: string, count: number): Promise<number> {
  const enc = encodeURIComponent(campaign);
  const rows = await sb<{ id: string }[]>(env, "GET", `messages?campaign=eq.${enc}&status=eq.pending_approval&order=created_at.asc&limit=${Math.max(0, Math.min(count, 1000))}&select=id`);
  if (!rows.length) return 0;
  await sb(env, "PATCH", `messages?id=in.(${rows.map((r) => r.id).join(",")})&status=eq.pending_approval`, { status: "approved" }, "return=minimal");
  return rows.length;
}

/** Puts every approved but not yet sent draft back to waiting. The emergency brake. */
export async function unapproveAll(env: Env, campaign: string): Promise<void> {
  await sb(env, "PATCH", `messages?campaign=eq.${encodeURIComponent(campaign)}&status=eq.approved`, { status: "pending_approval" }, "return=minimal");
}
