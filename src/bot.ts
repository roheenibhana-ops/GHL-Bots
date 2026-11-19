import { runAgent } from "./agents";
import type { Env } from "./types";

/** What the bot already knows about this customer. The system, not the model, owns these facts. */
export interface BotFacts {
  firstName?: string;
  /** Address on file for this contact, if any. */
  address?: { street1: string; city: string; province: string; postalCode: string };
  stories?: 1 | 2;
  addressConfirmed?: boolean;
  email?: string;
  /** The first message we sent them, so the bot knows what they are replying to. */
  opening?: string;
}

export type BotIntent =
  | "reply_only" | "stories" | "address_confirmed" | "address_given" | "email_given"
  | "repair" | "handoff" | "declined" | "ready_for_quote";

export interface BotOutput {
  reply: string;
  intent: BotIntent;
  data: { stories?: 1 | 2; address?: BotFacts["address"]; email?: string; reason?: string };
}

const INTENTS: BotIntent[] = ["reply_only", "stories", "address_confirmed", "address_given", "email_given", "repair", "handoff", "declined", "ready_for_quote"];

export const HANDOFF_REPLY = "Thanks, let me get someone from the team to help with that. We'll be in touch shortly.";

export function systemPrompt(f: BotFacts): string {
  const known = [
    f.firstName ? `Customer first name: ${f.firstName}` : "Customer first name: unknown",
    f.address ? `Address on file: ${f.address.street1}, ${f.address.city}, ${f.address.province} ${f.address.postalCode} (${f.addressConfirmed ? "customer CONFIRMED it" : "not yet confirmed"})` : "Address on file: none yet",
    `Home size: ${f.stories ? `${f.stories} story` : "not yet known"}`,
    `Email for the quote: ${f.email ?? "not yet known"}`,
  ].join("\n");
  return [
    "You are the text-message assistant for Dunzo Gutters, a gutter cleaning company in the Sacramento area. You reply to people who answered our offer text.",
    f.opening ? `The first message we sent them was: "${f.opening}"` : "",
    "",
    "THE OFFER: one-time gutter cleaning, $219 for a single-story home or $319 for a two-story home. When the customer approves the quote they pay a 50% deposit online.",
    "",
    "YOUR JOB, in order:",
    "1. If they want the cleaning, find out single story (1) or two story (2). A reply of just \"1\" or \"2\" means that.",
    "2. Confirm the address we have on file (if any) is where the work is. If none, ask for the street address, city and zip.",
    "3. Ask for the best email address for their quote. It is needed for them to open the quote.",
    "4. When you know the home size, the confirmed address and an email, use intent ready_for_quote. Say you're sending the quote now. Do NOT include any link yourself.",
    "",
    "KNOWN SO FAR:",
    known,
    "",
    "HARD RULES:",
    "- Never promise or suggest dates, times or availability. If asked, say the team will be in touch with dates and times once the quote is approved.",
    "- Only quote the two prices above. Do not invent prices, discounts or services. Anything else (roofs, gutter guards, repairs pricing, other services) goes to the team: use intent handoff.",
    "- If they say they do not need a cleaning but need a REPAIR, ask them to send a few photos of the problem, say the team will review them and come back with a price. Use intent repair.",
    "- If they are unsure or ask questions you can answer from the offer (what is included, how payment works), answer briefly, then steer back to the next step.",
    "- If they are upset, confused, ask for a person, or ask anything you are not sure about: use intent handoff.",
    "- If they say they are not interested, thank them politely in one short line and use intent declined. Do not push.",
    "- Never mention that you are an AI unless asked directly; if asked, say you're the Dunzo Gutters text assistant and the team can step in anytime.",
    "",
    "STYLE: warm, plain-spoken, short (one to three sentences, under 300 characters). No emojis. No corporate language. Ask one question at a time.",
    "",
    'OUTPUT: reply with ONLY a JSON object, no other text: {"reply": "<text to send>", "intent": "<one of ' + INTENTS.join(" | ") + '>", "data": {}}',
    'Put facts you learned in data: {"stories": 1 or 2}, {"address": {"street1","city","province","postalCode"}}, {"email": "..."}, {"reason": "..."} for handoff.',
    "Use intent stories / address_confirmed / address_given / email_given when the customer's latest message gave that fact; reply_only when it did not change a fact.",
  ].filter(Boolean).join("\n");
}

const isStories = (v: unknown): v is 1 | 2 => v === 1 || v === 2;

/** Parses the model's JSON. Anything malformed becomes a safe handoff: we never send junk to a customer. */
export function parseBotOutput(text: string): BotOutput {
  const fallback: BotOutput = { reply: HANDOFF_REPLY, intent: "handoff", data: { reason: "bot output could not be read" } };
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return fallback;
  try {
    const j = JSON.parse(m[0]) as Partial<BotOutput>;
    if (typeof j.reply !== "string" || !j.reply.trim() || !INTENTS.includes(j.intent as BotIntent)) return fallback;
    const d = (j.data ?? {}) as BotOutput["data"];
    const data: BotOutput["data"] = {};
    if (isStories(d.stories)) data.stories = d.stories;
    if (typeof d.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) data.email = d.email.trim().toLowerCase();
    if (d.address && typeof d.address.street1 === "string" && typeof d.address.postalCode === "string") {
      data.address = { street1: d.address.street1, city: String(d.address.city ?? ""), province: String(d.address.province ?? "CA"), postalCode: d.address.postalCode };
    }
    if (typeof d.reason === "string") data.reason = d.reason.slice(0, 200);
    let reply = j.reply.trim();
    if (reply.length > 480) reply = reply.slice(0, 477) + "...";
    if (/https?:\/\//i.test(reply)) return { ...fallback, data: { reason: "bot tried to send a link" } }; // links are added by the system only
    return { reply, intent: j.intent as BotIntent, data };
  } catch {
    return fallback;
  }
}

/** Applies what a turn taught us to the known facts. */
export function applyOutput(f: BotFacts, o: BotOutput): BotFacts {
  const next = { ...f };
  if (o.data.stories) next.stories = o.data.stories;
  if (o.data.email) next.email = o.data.email;
  if (o.data.address) { next.address = o.data.address; next.addressConfirmed = true; }
  if (o.intent === "address_confirmed") next.addressConfirmed = true;
  return next;
}

/** One bot turn. No side effects: the caller decides what to do with the intent. */
export async function botTurn(env: Env, facts: BotFacts, history: { role: "user" | "assistant"; content: string }[]): Promise<{ output: BotOutput; facts: BotFacts }> {
  if (!history.length || history[history.length - 1].role !== "user") throw new Error("history must end with a customer message");
  const text = await runAgent(env, { name: "conversation", system: systemPrompt(facts), maxTokens: 500 }, history);
  const output = parseBotOutput(text);
  return { output, facts: applyOutput(facts, output) };
}
