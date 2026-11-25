import { runAgent } from "./agents";
import { isBlackout } from "./batch";
import { plainPunctuation, replyProblems, type BotFacts } from "./bot";
import { sb } from "./db";
import { credsFor, getContact, sendSms } from "./ghl";
import { deadlineFor, deadlinePassed, formatDeadline } from "./deadline";
import { voiceBlock } from "./voice";
import { dialsText, HOUSE_VOICE, loadAgent, type Dials } from "./playbook";
import { inSendWindow, isSmsDnd } from "./safety";
import { quoteStatuses } from "./stats";
import type { Account, Env } from "./types";

export const DASH_CAMPAIGN = "followup";
const DAY = 86_400_000;
const NEVER_TEXT_TAGS = ["bot-paused", "bot-needs-human", "bot-opted-out", "bot-declined"];

type Promo = { contact_id: string; account: Account; contact_name: string | null; phone_e164: string | null; timezone: string | null; sent_at: string | null };
type Msg = { contact_id: string; direction: "inbound" | "outbound"; campaign: string; status: string; body: string | null; created_at: string; sent_at?: string | null };
type Conv = { contact_id: string; account: Account; status: string; facts: (BotFacts & { approvedAt?: string; dashHoldUntil?: number }) | null };

export interface Target { kind: "promo" | "quote"; contactId: string; account: Account; name: string | null; phone: string | null; timezone: string | null; nth: number }

/**
 * Who Dash should follow up today. Pure, so it can be tested.
 * Promo: one follow up, a few days after the offer, only if they never replied.
 * Quote: up to two follow ups after a quote went out, only while the customer is quiet and the quote is not approved.
 */
export function pickTargets(o: { promos: Promo[]; convs: Conv[]; msgs: Msg[]; now: number; promoDays: number; maxQuoteFollowUps: number }): Target[] {
  const by = new Map<string, Msg[]>();
  for (const m of o.msgs) { if (!by.has(m.contact_id)) by.set(m.contact_id, []); by.get(m.contact_id)!.push(m); }
  const when = (m: Msg) => new Date(m.sent_at ?? m.created_at).getTime();
  const out: Target[] = [];
  const convBy = new Map(o.convs.map((c) => [c.contact_id, c]));

  for (const p of o.promos) {
    if (!p.sent_at) continue;
    const sent = new Date(p.sent_at).getTime();
    if (o.now - sent < o.promoDays * DAY || o.now - sent > 14 * DAY) continue;
    const ms = by.get(p.contact_id) ?? [];
    if (ms.some((m) => m.direction === "inbound" && when(m) > sent)) continue; // they answered: Gus has it
    if (ms.some((m) => m.campaign === DASH_CAMPAIGN)) continue; // already followed up, or one is waiting
    if (convBy.has(p.contact_id)) continue; // a conversation exists, so this is not a silent lead
    out.push({ kind: "promo", contactId: p.contact_id, account: p.account, name: p.contact_name, phone: p.phone_e164, timezone: p.timezone, nth: 1 });
  }

  for (const c of o.convs) {
    const f = c.facts ?? {};
    if (c.status !== "active" || !f.quoteId || f.approvedAt) continue;
    if (f.dashHoldUntil && f.dashHoldUntil > o.now) continue; // they asked for time: leave them be
    const ms = (by.get(c.contact_id) ?? []).filter((m) => ["sent", "received"].includes(m.status)).sort((a, b) => when(a) - when(b));
    const last = ms[ms.length - 1];
    if (!last || last.direction !== "outbound") continue; // the customer spoke last: Gus answers, not Dash
    // After a hold (they asked for time) the clock starts when the hold ends, so they are not forgotten.
    const quiet = f.dashHoldUntil ? Math.max(20 * 3_600_000, o.now - f.dashHoldUntil) : o.now - when(last);
    if (quiet < 20 * 3_600_000 || quiet > 7 * DAY) continue;
    const all = by.get(c.contact_id) ?? [];
    const done = all.filter((m) => m.campaign === DASH_CAMPAIGN && m.status === "sent").length;
    if (done >= o.maxQuoteFollowUps) continue;
    if (all.some((m) => m.campaign === DASH_CAMPAIGN && ["pending_approval", "approved", "sending"].includes(m.status))) continue; // one is already waiting
    out.push({ kind: "quote", contactId: c.contact_id, account: c.account, name: f.firstName ?? null, phone: null, timezone: null, nth: done + 1 });
  }
  return out;
}

const OFFER = "The offer: one time gutter cleaning, $219 for a single story home or $319 for two stories, with a 50% deposit when the quote is approved online. It includes hand cleared gutters, a downspout flush, a photo report and a 30 day no clog guarantee. Over half of Sacramento's rain falls November to February.";

export async function writeFollowUp(env: Env, t: { kind: "promo" | "quote"; firstName?: string | null; nth: number; history: string[]; stories?: number; deadline?: string | null }, override?: { instructions: string; dials: Dials }): Promise<{ text: string; problems: string[]; skip?: boolean }> {
  const live = override ?? (await loadAgent(env, "dash"));
  const system = [
    "You write ONE short follow up text message for Dunzo Gutters to a customer who has gone quiet.",
    HOUSE_VOICE,
    voiceBlock(env.VOICE_PROFILE),
    "HOW YOU FOLLOW UP (set by the owner and editable):",
    live.instructions,
    dialsText(live.dials),
    "FIXED RULES: one text, one or two short sentences, under 240 characters. Never repeat a line that is already in the conversation. Never invent urgency, deadlines, discounts or prices. If a deadline is given below you may mention it once, plainly, as helpful information and never as pressure. About when the clean happens, say only that the team will be in touch to schedule the job, and never name a month or date for it. The only prices you may mention are in the offer below. No links. Never promise a day or time. Never guilt them for not replying. Make it easy to say not now. Plain text only, no quotation marks around it, no emojis.",
    OFFER,
    t.deadline && formatDeadline(t.deadline) && !deadlinePassed(t.deadline) ? `DEADLINE for this customer: the price is good through ${formatDeadline(t.deadline)}. Approving the quote by then locks it in.` : "There is no deadline to mention for this customer.",
  ].filter(Boolean).join("\n");
  const situation = t.kind === "promo"
    ? `SITUATION: we texted ${t.firstName || "this customer"} the offer a few days ago and they have not replied. This is the one and only follow up. Give them one new, genuinely useful reason to look at it, and ask one easy question (for example whether the home is one story or two).`
    : `SITUATION: ${t.firstName || "this customer"} asked for a quote${t.stories ? ` for a ${t.stories} story home` : ""}, we texted them the quote link, and they have gone quiet. This is follow up number ${t.nth}. Do not resend or mention a link. Check in like a mate would, add something new, and make it easy to ask a question or say not now. IMPORTANT: if the customer's last messages say they want to wait, will get back to us, are thinking it over, or gave a reason and a rough time (for example waiting for the leaves to drop), do NOT nudge them: reply with only the single word SKIP.`;
  const convo = t.history.length ? "THE CONVERSATION SO FAR:\n" + t.history.join("\n") : "There has been no conversation beyond our first text.";
  const raw = await runAgent(env, { name: "dash", system, maxTokens: 300, model: env.BOT_MODEL }, [{ role: "user", content: `${situation}\n\n${convo}\n\nWrite the follow up text.` }]);
  if (/^\W*skip\W*$/i.test(raw)) return { text: "", problems: [], skip: true };
  const text = plainPunctuation(raw.replace(/^["'\s]+|["'\s]+$/g, ""));
  const problems = replyProblems(text);
  if (text.length > 300) problems.push("it is too long");
  return { text, problems };
}

const mode = (env: Env) => (env.DASH_MODE === "approve" || env.DASH_MODE === "auto" ? env.DASH_MODE : "off");

/** Runs from the cron: writes a few new follow ups, and sends the approved ones. Does nothing unless Dash is switched on. */
export async function runDash(env: Env): Promise<Record<string, unknown>> {
  if (mode(env) === "off") return { skipped: "Dash is off" };
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);
  if (isBlackout(env.BLACKOUT_DATES, today)) return { skipped: "day off" };
  if (!inSendWindow(now, "America/Los_Angeles", Number(env.BOT_END_HOUR), Number(env.BOT_START_HOUR))) return { skipped: "outside sending hours" };
  const result = { drafted: 0, sent: 0, skipped: 0 };
  const enc = encodeURIComponent;
  const campaign = env.BATCH_CAMPAIGN ?? "pilot-2";
  const since = new Date(now.getTime() - 16 * DAY).toISOString();

  // ---- 1. Send what has been approved (at most two a run) ----
  const ready = await sb<{ id: string; account: Account; contact_id: string; body: string; created_at: string; segment: string | null }[]>(env, "GET", `messages?campaign=eq.${DASH_CAMPAIGN}&status=eq.approved&order=created_at.asc&limit=2&select=id,account,contact_id,body,created_at,segment`);
  for (const m of ready) {
    const claimed = await sb<{ id: string }[]>(env, "PATCH", `messages?id=eq.${m.id}&status=eq.approved`, { status: "sending" }, "return=representation");
    if (!claimed.length) continue;
    try {
      const creds = credsFor(env, m.account);
      const c = await getContact(creds, m.contact_id);
      const tags = (c.tags ?? []).map((x) => x.toLowerCase());
      const replied = await sb<{ id: string }[]>(env, "GET", `messages?contact_id=eq.${enc(m.contact_id)}&direction=eq.inbound&created_at=gt.${enc(m.created_at)}&select=id&limit=1`);
      const [conv] = await sb<Conv[]>(env, "GET", `conversations?contact_id=eq.${enc(m.contact_id)}&select=contact_id,account,status,facts&limit=1`);
      const stop = isSmsDnd(c) || NEVER_TEXT_TAGS.some((x) => tags.includes(x)) || replied.length > 0 || conv?.status === "closed" || conv?.status === "handed_off" || !!conv?.facts?.approvedAt;
      if (stop) { await sb(env, "PATCH", `messages?id=eq.${m.id}`, { status: "skipped" }, "return=minimal"); result.skipped++; continue; }
      await sendSms(creds, m.contact_id, m.body);
      await sb(env, "PATCH", `messages?id=eq.${m.id}`, { status: "sent", sent_at: new Date().toISOString() }, "return=minimal");
      result.sent++;
    } catch { await sb(env, "PATCH", `messages?id=eq.${m.id}`, { status: "failed" }, "return=minimal"); }
  }

  // ---- 2. Write new ones (at most two a run) ----
  const [promos, convs] = await Promise.all([
    sb<Promo[]>(env, "GET", `messages?campaign=eq.${enc(campaign)}&status=eq.sent&sent_at=gte.${since}&order=sent_at.asc&limit=200&select=contact_id,account,contact_name,phone_e164,timezone,sent_at`),
    sb<Conv[]>(env, "GET", "conversations?status=eq.active&select=contact_id,account,status,facts&order=updated_at.desc&limit=200"),
  ]);
  const ids = [...new Set([...promos.map((p) => p.contact_id), ...convs.filter((c) => c.facts?.quoteId).map((c) => c.contact_id)])].slice(0, 150);
  if (!ids.length) return result;
  const msgs = await sb<Msg[]>(env, "GET", `messages?contact_id=in.(${ids.map(enc).join(",")})&status=neq.archived&order=created_at.asc&limit=2000&select=contact_id,direction,campaign,status,body,created_at,sent_at`);
  let targets = pickTargets({ promos, convs, msgs, now: now.getTime(), promoDays: Number(env.DASH_PROMO_DAYS ?? 3), maxQuoteFollowUps: 2 });

  // A quote follow up only makes sense while the quote is still waiting in Jobber.
  const quoteIds = targets.filter((t) => t.kind === "quote").map((t) => convs.find((c) => c.contact_id === t.contactId)?.facts?.quoteId).filter((x): x is string => !!x);
  const st = quoteIds.length ? await quoteStatuses(env, quoteIds.slice(0, 10)) : {};
  targets = targets.filter((t) => { if (t.kind !== "quote") return true; const q = convs.find((c) => c.contact_id === t.contactId)?.facts?.quoteId; const s = q ? st[q] : undefined; return !s || s === "awaiting_response" || s === "unknown"; });

  for (const t of targets.slice(0, 2)) {
    const conv = convs.find((c) => c.contact_id === t.contactId);
    const history = msgs.filter((m) => m.contact_id === t.contactId && m.body && ["sent", "received"].includes(m.status)).slice(-12).map((m) => `${m.direction === "inbound" ? "CUSTOMER" : "US"}: ${(m.body ?? "").replace(/https?:\/\/\S+/g, "[link]").slice(0, 260)}`);
    const first = (t.name ?? conv?.facts?.firstName ?? "").split(" ")[0];
    const opening = msgs.find((m) => m.contact_id === t.contactId && m.direction === "outbound" && m.campaign === campaign)?.body;
    const w = await writeFollowUp(env, { kind: t.kind, firstName: first, nth: t.nth, history, stories: conv?.facts?.stories, deadline: deadlineFor(opening, env.PROMO_DEADLINE) });
    if (w.skip && conv) {
      // The customer asked for time. Hold off for a week instead of checking again every few minutes.
      await sb(env, "PATCH", `conversations?contact_id=eq.${enc(t.contactId)}`, { facts: { ...(conv.facts ?? {}), dashHoldUntil: now.getTime() + 7 * DAY } }, "return=minimal").catch(() => undefined);
      result.skipped++;
      continue;
    }
    if (w.problems.length || !w.text) { result.skipped++; continue; }
    const body = t.kind === "promo" ? `${w.text} Reply STOP to opt out.` : w.text;
    const src = promos.find((p) => p.contact_id === t.contactId);
    await sb(env, "POST", "messages", { account: t.account, contact_id: t.contactId, direction: "outbound", body, status: mode(env) === "auto" ? "approved" : "pending_approval", campaign: DASH_CAMPAIGN, segment: t.kind, contact_name: t.name ?? src?.contact_name ?? first ?? null, phone_e164: t.phone ?? src?.phone_e164 ?? null, timezone: t.timezone ?? src?.timezone ?? null }, "return=minimal");
    result.drafted++;
  }
  return result;
}
