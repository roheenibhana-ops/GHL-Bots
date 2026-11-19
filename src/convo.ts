import { botTurn, type BotFacts } from "./bot";
import { sb } from "./db";
import { addNote, addTags, credsFor, getContact, sendSms, setDnd, setEmail, upsertByPhone } from "./ghl";
import { createGutterQuote, linkMessage } from "./quote";
import { inSendWindow, isStopMessage, normalizePhone } from "./safety";
import type { Account, Env } from "./types";

export interface InboundPayload { contactId?: string; locationId?: string; body?: string; direction?: string; firstName?: string; phone?: string; attachments?: unknown }
type Row = { direction: "inbound" | "outbound"; body: string };

/**
 * Turns stored messages into what the bot sees: the offer we sent is the "opening",
 * everything after the customer's first reply is the conversation. It always ends on a customer message.
 */
export function buildHistory(rows: Row[]): { opening?: string; history: { role: "user" | "assistant"; content: string }[] } {
  const first = rows.findIndex((r) => r.direction === "inbound");
  if (first === -1) return { history: [] };
  const before = rows.slice(0, first).filter((r) => r.direction === "outbound");
  const opening = before.length ? before[before.length - 1].body : undefined;
  const history: { role: "user" | "assistant"; content: string }[] = [];
  for (const r of rows.slice(first)) {
    const role = r.direction === "inbound" ? ("user" as const) : ("assistant" as const);
    const last = history[history.length - 1];
    if (last && last.role === role) last.content += `\n${r.body}`;
    else history.push({ role, content: r.body });
  }
  if (history[history.length - 1].role !== "user") return { opening, history: [] }; // nothing new to answer
  return { opening, history };
}

const lc = (tags?: string[]) => (tags ?? []).map((t) => t.toLowerCase());

export const MEDIA_TEXT = "[sent a photo or attachment]";

/**
 * The customer's message as text. A picture-only message arrives with an empty body, so it becomes MEDIA_TEXT.
 * Returns null for the literal word null, which is what GHL's Test workflow button sends (no real message).
 */
export function inboundText(body?: string, attachments?: unknown): string | null {
  const b = (body ?? "").trim();
  if (b && b.toLowerCase() !== "null") return b;
  const hasAttach = Array.isArray(attachments) ? attachments.length > 0 : typeof attachments === "string" && !["", "null", "[]", "undefined"].includes(attachments.trim().toLowerCase());
  if (hasAttach) return MEDIA_TEXT;
  return b === "" ? MEDIA_TEXT : null;
}

/** Alerts the team by text (if ALERT_PHONE is set). Never throws: an alert failure must not break the customer's reply. */
export async function alertTeam(env: Env, text: string): Promise<void> {
  const phone = normalizePhone(env.ALERT_PHONE);
  if (!phone) return;
  try {
    const creds = credsFor(env, "dunzo");
    const { contact } = await upsertByPhone(creds, phone);
    await sendSms(creds, contact.id, text.slice(0, 320));
  } catch { /* logged by the caller's note; alerts are best effort */ }
}

async function sendReply(env: Env, account: Account, contactId: string, text: string, tz: string | undefined, phone: string | undefined, name: string | undefined): Promise<"sent" | "queued"> {
  const inWindow = inSendWindow(new Date(), tz, Number(env.BOT_END_HOUR), Number(env.BOT_START_HOUR));
  const base = { account, contact_id: contactId, direction: "outbound", body: text, campaign: "bot", timezone: tz ?? null, phone_e164: phone ?? null, contact_name: name ?? null };
  if (!inWindow) {
    await sb(env, "POST", "messages", { ...base, status: "queued_hours" }, "return=minimal");
    return "queued";
  }
  await sendSms(credsFor(env, account), contactId, text);
  await sb(env, "POST", "messages", { ...base, status: "sent", sent_at: new Date().toISOString() }, "return=minimal");
  return "sent";
}

/** Handles one inbound reply. dryRun reads and decides but sends, tags and creates nothing. */
export async function handleInbound(env: Env, p: InboundPayload, dryRun = false) {
  const log: Record<string, unknown> = {};
  if (env.BOT_MODE === "off") return { skipped: "bot is off" };
  const body = inboundText(p.body, p.attachments);
  if (!p.contactId || !body || p.direction === "outbound") return { skipped: "no customer message" };
  const account: Account = p.locationId === env.GHL_LOCATION_DUNZO ? "dunzo" : "lights";
  const creds = credsFor(env, account);

  // 1. Opt-outs come first, for everyone, in every mode.
  if (isStopMessage(body)) {
    if (!dryRun) {
      await setDnd(creds, p.contactId);
      await addTags(creds, p.contactId, ["bot-opted-out"]);
      await sb(env, "POST", "optouts", { account, contact_id: p.contactId }, "resolution=ignore-duplicates,return=minimal");
      await sb(env, "POST", "conversations?on_conflict=contact_id", { contact_id: p.contactId, account, status: "closed", updated_at: new Date().toISOString() }, "resolution=merge-duplicates,return=minimal");
    }
    return { optedOut: true };
  }
  // The bot speaks as Dunzo Gutters, so it only handles the Dunzo account for now.
  if (account !== "dunzo") return { skipped: "lights account is not handled by the bot yet" };

  const contact = await getContact(creds, p.contactId);
  const tags = lc(contact.tags);
  if (env.BOT_MODE === "test" && !tags.includes("bot-test")) return { skipped: "test mode: contact is not tagged bot-test" };
  const who = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "A customer";
  if (tags.includes("bot-paused") || tags.includes("bot-needs-human")) {
    if (!dryRun) {
      await sb(env, "POST", "messages", { account, contact_id: p.contactId, direction: "inbound", body, status: "received", campaign: "bot" }, "return=minimal");
      await alertTeam(env, `${who} replied while the team has the conversation: ${body.slice(0, 120)}`);
    }
    return { skipped: "a human has this conversation (bot-paused or bot-needs-human)" };
  }

  // 2. Ignore a duplicate delivery of the same message.
  const since = new Date(Date.now() - 120_000).toISOString();
  const dup = await sb<{ id: string }[]>(env, "GET", `messages?contact_id=eq.${encodeURIComponent(p.contactId)}&direction=eq.inbound&body=eq.${encodeURIComponent(body)}&created_at=gte.${since}&select=id&limit=1`);
  if (dup.length) return { skipped: "duplicate delivery" };
  if (!dryRun) await sb(env, "POST", "messages", { account, contact_id: p.contactId, direction: "inbound", body, status: "received", campaign: "bot" }, "return=minimal");

  // 3. What we know so far.
  const [conv] = await sb<{ facts: BotFacts; status: string }[]>(env, "GET", `conversations?contact_id=eq.${encodeURIComponent(p.contactId)}&select=facts,status&limit=1`);
  if (conv?.status === "closed" || conv?.status === "handed_off") {
    if (conv.status === "handed_off" && !dryRun) await alertTeam(env, `${who} replied while the team has the conversation: ${body.slice(0, 120)}`);
    return { skipped: `conversation is ${conv.status}` };
  }
  const rows = await sb<Row[]>(env, "GET", `messages?contact_id=eq.${encodeURIComponent(p.contactId)}&status=in.(sent,received)&order=created_at.asc&select=direction,body&limit=40`);
  const built = buildHistory(rows.concat(dryRun ? [{ direction: "inbound" as const, body }] : []));
  if (!built.history.length) return { skipped: "nothing new to answer" };
  const facts: BotFacts = {
    ...(conv?.facts ?? {}),
    firstName: contact.firstName || p.firstName,
    opening: built.opening ?? conv?.facts?.opening,
    address: conv?.facts?.address ?? (contact.address1 && contact.postalCode ? { street1: contact.address1, city: contact.city ?? "", province: contact.state ?? "CA", postalCode: contact.postalCode } : undefined),
  };

  // 4. Ask the bot.
  const { output, facts: next } = await botTurn(env, facts, built.history);
  Object.assign(log, { intent: output.intent, reply: output.reply, facts: { stories: next.stories, addressConfirmed: next.addressConfirmed, email: next.email } });
  if (dryRun) return log;

  const status = ["handoff", "repair"].includes(output.intent) ? "handed_off" : output.intent === "declined" ? "closed" : "active";
  await sb(env, "POST", "conversations?on_conflict=contact_id", { contact_id: p.contactId, account, facts: next, status, updated_at: new Date().toISOString() }, "resolution=merge-duplicates,return=minimal");

  let followUp = ""; // a second text (the quote link) sent right after the bot's reply
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Customer";
  const summary = `${name}${next.stories ? `, ${next.stories} story` : ""}${next.address ? `, ${next.address.street1}` : ""}${next.email ? `, ${next.email}` : ""}`;
  if (output.intent === "handoff") {
    await addTags(creds, p.contactId, ["bot-needs-human"]);
    await addNote(creds, p.contactId, `Lead bot handed this over. Reason: ${output.data.reason ?? "unclear"}. Their last message: "${body.slice(0, 200)}"`);
    await alertTeam(env, `Bot needs a human: ${name}. "${body.slice(0, 120)}"`);
  } else if (output.intent === "repair") {
    await addTags(creds, p.contactId, ["bot-needs-human", "needs-repair-quote"]);
    await addNote(creds, p.contactId, `Repair request. Asked for photos. Their message: "${body.slice(0, 200)}"`);
    await alertTeam(env, `Repair enquiry: ${name}. Bot asked for photos. "${body.slice(0, 100)}"`);
  } else if (output.intent === "declined") {
    await addTags(creds, p.contactId, ["bot-declined"]);
  } else if (output.intent === "ready_for_quote") {
    if (next.email && !contact.email) await setEmail(creds, p.contactId, next.email).catch(() => undefined);
    await addTags(creds, p.contactId, ["bot-quote-ready"]);
    let link = "";
    if (env.QUOTE_MODE === "link" && next.stories && next.address && next.email) {
      try {
        const phone = normalizePhone(contact.phone ?? p.phone);
        if (!phone) throw new Error("no valid phone");
        const q = await createGutterQuote(env, { phone, firstName: contact.firstName ?? "", lastName: contact.lastName, email: next.email, address: next.address, stories: next.stories }, true, true);
        if ("quote" in q && q.quote?.clientHubUri) {
          followUp = linkMessage(next.email, next.stories, q.quote.clientHubUri);
          link = ` Quote #${q.quote.quoteNumber} created and the link was texted to the customer: ${q.quote.jobberWebUri}`;
          await addTags(creds, p.contactId, ["bot-quote-sent"]);
        } else {
          link = ` NEEDS A HUMAN: Jobber could not create it automatically (${q.plan.problems.join("; ") || "unknown"}). Please create and send the quote by hand.`;
        }
      } catch (e) { link = ` NEEDS A HUMAN: Jobber quote failed (${(e as Error).message.slice(0, 120)}). Please create and send the quote by hand.`; }
    }
    if (env.QUOTE_MODE === "draft" && next.stories && next.address) {
      try {
        const phone = normalizePhone(contact.phone ?? p.phone);
        if (!phone) throw new Error("no valid phone");
        const q = await createGutterQuote(env, { phone, firstName: contact.firstName ?? "", lastName: contact.lastName, email: next.email, address: next.address, stories: next.stories }, true, false);
        if ("quote" in q && q.quote) link = ` Draft quote #${q.quote.quoteNumber}: ${q.quote.jobberWebUri}`;
        else link = ` (Jobber needs a human: ${q.plan.problems.join("; ") || "could not create"})`;
      } catch (e) { link = ` (Jobber quote failed: ${(e as Error).message.slice(0, 100)})`; }
    }
    await addNote(creds, p.contactId, `Quote ready to send: ${summary}.${link}`);
    await alertTeam(env, `Quote ready to send: ${summary}.${link}`);
  }

  const phone = normalizePhone(contact.phone ?? p.phone) ?? undefined;
  log.delivery = await sendReply(env, account, p.contactId, output.reply, contact.timezone, phone, name);
  if (followUp) log.linkDelivery = await sendReply(env, account, p.contactId, followUp, contact.timezone, phone, name);
  return log;
}

/** Sends replies that were held for the morning, once the contact's local window opens. Called from the cron. */
export async function sendQueuedReplies(env: Env): Promise<number> {
  if (env.BOT_MODE === "off") return 0;
  const rows = await sb<{ id: string; account: Account; contact_id: string; body: string; timezone: string | null }[]>(
    env, "GET", "messages?status=eq.queued_hours&order=created_at.asc&limit=20&select=id,account,contact_id,body,timezone");
  let sent = 0;
  for (const m of rows) {
    if (!inSendWindow(new Date(), m.timezone ?? undefined, Number(env.BOT_END_HOUR), Number(env.BOT_START_HOUR))) continue;
    await sb(env, "PATCH", `messages?id=eq.${m.id}&status=eq.queued_hours`, { status: "sending" }, "return=minimal");
    try {
      await sendSms(credsFor(env, m.account), m.contact_id, m.body);
      await sb(env, "PATCH", `messages?id=eq.${m.id}`, { status: "sent", sent_at: new Date().toISOString() }, "return=minimal");
      sent++;
    } catch {
      await sb(env, "PATCH", `messages?id=eq.${m.id}`, { status: "failed" }, "return=minimal");
    }
  }
  return sent;
}
