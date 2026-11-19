import { runAgent } from "./agents";
import { ALLOWED_PRICES, BUSINESS_KNOWLEDGE } from "./knowledge";
import type { Env } from "./types";

/** What the system knows about this customer. The system, not the model, owns these facts. */
export interface BotFacts {
  firstName?: string;
  address?: { street1: string; city: string; province: string; postalCode: string };
  stories?: 1 | 2;
  addressConfirmed?: boolean;
  email?: string;
  /** The first message we sent them, so the bot knows what they are replying to. */
  opening?: string;
  /** Set once the quote request has been handed on, so it only ever happens once per customer. */
  quoteRequested?: boolean;
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

export type NextStep = "stories" | "address" | "email" | "quote";

export function nextStep(f: BotFacts): NextStep {
  if (!f.stories) return "stories";
  if (!f.addressConfirmed) return "address";
  if (!f.email) return "email";
  return "quote";
}

function stillNeeded(f: BotFacts): string {
  const need: string[] = [];
  if (!f.stories) need.push("whether the home is single story or two story");
  if (!f.addressConfirmed) need.push(f.address ? `confirmation that the work is at ${f.address.street1}, ${f.address.city}, ${f.address.province} ${f.address.postalCode}` : "the street address, city and zip");
  if (!f.email) need.push("their best email address");
  return need.length ? need.join("; ") : "nothing: you have everything for the quote";
}

export function systemPrompt(f: BotFacts): string {
  const done = f.quoteRequested;
  return [
    "You are the text-message sales rep for Dunzo Gutters. You are texting a homeowner who is replying to our Winter Warm Up gutter cleaning offer. You are the whole sales team: nobody else is going to close this sale, so your job is to win the booking, honestly and warmly.",
    f.opening ? `The first message we sent them was: "${f.opening}"` : "",
    "",
    "HOW TO SELL (this is a text conversation, so keep it human, short and natural):",
    "- Sound like a friendly, confident local pro who genuinely wants to help. Not a form, not a script, not corporate. Vary your wording. Use their first name now and then, not every message.",
    "- Read the person. If they are keen, move quickly toward the booking. If they are unsure, find out why: ask one easy question about their gutters (when were they last cleaned? overflowing? big trees?), then connect the offer to what they said.",
    "- Build real value with the facts below: the rainy season is here (over half of Sacramento's rain falls November to February), what a cleaning includes (hand-cleared, downspout flush, photo report, 30-day no-clog guarantee, 30-day money-back promise), and that the price is firm.",
    "- Handle objections calmly: price (it is a firm, all-in promo price, includes the downspout flush and photo report, backed by the money-back promise, and a clogged gutter in the rain costs far more); \"I'll think about it\" (respect it, offer to send the quote so they have it, mention the promo is the winter special); \"I already have someone\" (no pressure, mention the guarantee and photo report, leave the door open); \"is this legit?\" (licensed and insured, BBB accredited, 4.9 stars from 76 Google reviews, local since 2014).",
    "- Ask for the booking. When they show interest, make it easy: assume the yes (\"Want me to get your quote over?\"). Ask one question at a time and keep each message to one to three short sentences (under about 300 characters). No emojis, no exclamation overload, no ALL CAPS.",
    "- Never be pushy, never guilt-trip, never invent urgency. Only use urgency that is true (the rainy season, the winter promo). If they say no, accept it gracefully and leave the door open.",
    "",
    "THE GOAL: get these three things naturally in the conversation, in whatever order fits: home size, a confirmed address, and their best email for the quote. Then tell them you are getting their quote over, that approving it is quick, and that a 50% deposit locks it in. After approval the team will be in touch with scheduling. Do not include any link yourself.",
    `STILL NEEDED FROM THE CUSTOMER: ${stillNeeded(f)}`,
    done ? "The quote request has ALREADY been sent on. Do not ask for those details again. Answer any follow-up question helpfully and reassure them." : "",
    "",
    "WHAT WE KNOW ABOUT THIS CUSTOMER:",
    `First name: ${f.firstName ?? "unknown"}. Home size: ${f.stories ? `${f.stories} story` : "not yet known"}. Email: ${f.email ?? "not yet known"}.`,
    f.address ? `Address on file: ${f.address.street1}, ${f.address.city}, ${f.address.province} ${f.address.postalCode} (${f.addressConfirmed ? "customer confirmed it" : "not yet confirmed"}).` : "Address: none on file yet.",
    "",
    "BUSINESS KNOWLEDGE (the only facts you may use):",
    BUSINESS_KNOWLEDGE,
    "",
    "HARD RULES (these are never broken):",
    "- Only state facts that appear in the business knowledge above. If you do not know, say the team will confirm and use intent handoff. Never invent reviews, stats, discounts, guarantees or services.",
    "- The only prices you may say are the ones in the knowledge above. For anything other than the $219 / $319 cleaning (repairs, guards, seamless, roof, solar, windows) do not quote: use intent handoff and say the team will price it.",
    "- NEVER promise or suggest a date, day or time for the work, and never say a crew is available on a particular day. If asked, say once the quote is approved the team will be in touch with dates and times.",
    "- If they do not need a cleaning but need a repair, ask for a few photos, say the team will review them and come back with a firm price: use intent repair.",
    "- If they are upset, confused, ask for a person, or ask something you are not sure about: use intent handoff. A person takes over after a handoff, so do not ask further questions in that reply. If their city is not in the service area, use handoff.",
    "- If they are not interested, thank them in one short line: use intent declined.",
    "- If they sincerely ask whether you are a bot: say you are the Dunzo Gutters text assistant and the team can step in anytime. Do not claim to be a human.",
    "",
    'OUTPUT: reply with ONLY a JSON object, no other text: {"reply": "<the text to send>", "intent": "<one of ' + INTENTS.join(" | ") + '>", "data": {}}',
    'Put facts you learned in data: {"stories": 1 or 2}, {"address": {"street1","city","province","postalCode"}}, {"email": "..."}, {"reason": "..."} for handoff.',
    "Use intent stories / address_confirmed / address_given / email_given when the customer's latest message gave that fact; reply_only otherwise. Do not use ready_for_quote: the system decides that.",
  ].filter(Boolean).join("\n");
}

const isStories = (v: unknown): v is 1 | 2 => v === 1 || v === 2;
const FALLBACK: BotOutput = { reply: HANDOFF_REPLY, intent: "handoff", data: { reason: "bot output could not be read" } };

export function parseBotOutput(text: string): BotOutput {
  return tryParseBotOutput(text) ?? FALLBACK;
}

/** null when the text cannot be read as a valid bot output (so the caller can retry once). */
export function tryParseBotOutput(text: string): BotOutput | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Partial<BotOutput>;
    if (typeof j.reply !== "string" || !j.reply.trim() || !INTENTS.includes(j.intent as BotIntent)) return null;
    const d = (j.data ?? {}) as BotOutput["data"];
    const data: BotOutput["data"] = {};
    if (isStories(d.stories)) data.stories = d.stories;
    if (typeof d.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) data.email = d.email.trim().toLowerCase();
    if (d.address && typeof d.address.street1 === "string" && typeof d.address.postalCode === "string") {
      data.address = { street1: d.address.street1, city: String(d.address.city ?? ""), province: String(d.address.province ?? "CA"), postalCode: d.address.postalCode };
    }
    if (typeof d.reason === "string") data.reason = d.reason.slice(0, 200);
    return { reply: j.reply.trim(), intent: j.intent as BotIntent, data };
  } catch {
    return null;
  }
}

// ---- Guardrails: checked on every reply before it can be sent ----

/** Dollar amounts in the text that are not on the approved list. */
export function disallowedPrices(text: string): string[] {
  const bad: string[] = [];
  for (const m of text.matchAll(/\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g)) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (!ALLOWED_PRICES.some((p) => Math.abs(p - n) < 0.005)) bad.push(m[0]);
  }
  return bad;
}

const WHEN = "(today|tonight|tomorrow|this (?:week|weekend|afternoon|morning|evening)|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\\d{1,2}\\s?(?:am|pm))";
const PROMISE_A = new RegExp(`\\b(?:we|i|our (?:team|crew)|the (?:team|crew))\\s*(?:can|could|will|'ll|are going to|will be able to)\\s+(?:be there|come(?: out| by)?|get (?:you|it) (?:in|done|scheduled)|fit you in|do it|schedule you|book you|stop by|swing by|be out)\\b[^.?!]*\\b${WHEN}`, "i");
const PROMISE_B = new RegExp(`\\b(?:available|open|free)\\b[^.?!]*\\b${WHEN}`, "i");

/** True if the reply commits the crew to a day or time. */
export function promisesDate(text: string): boolean {
  return PROMISE_A.test(text) || PROMISE_B.test(text);
}

/** Everything wrong with a reply that must not be sent. Empty means fine. */
export function replyProblems(reply: string): string[] {
  const problems: string[] = [];
  if (/https?:\/\/|www\./i.test(reply)) problems.push("it contains a link (links are added by the system only)");
  const bad = disallowedPrices(reply);
  if (bad.length) problems.push(`it states prices that are not approved: ${bad.join(", ")}`);
  if (promisesDate(reply)) problems.push("it promises or implies a date, day or time for the work");
  if (reply.length > 600) problems.push("it is far too long for a text message");
  return problems;
}

/** Applies what a turn taught us to the known facts. */
export function applyOutput(f: BotFacts, o: BotOutput): BotFacts {
  const next = { ...f };
  if (o.data.stories) next.stories = o.data.stories;
  if (o.data.email) next.email = o.data.email;
  if (o.data.address) { next.address = o.data.address; next.addressConfirmed = true; }
  if (o.intent === "address_confirmed") next.addressConfirmed = true;
  if (o.intent === "ready_for_quote") next.quoteRequested = true;
  return next;
}

/** One bot turn. No side effects: the caller decides what to do with the intent. */
export async function botTurn(env: Env, facts: BotFacts, history: { role: "user" | "assistant"; content: string }[]): Promise<{ output: BotOutput; facts: BotFacts; debug?: Record<string, unknown> }> {
  if (!history.length || history[history.length - 1].role !== "user") throw new Error("history must end with a customer message");
  const agent = { name: "sales", system: systemPrompt(facts), maxTokens: 500, model: env.BOT_MODEL };
  const raw = await runAgent(env, agent, history);
  let output = tryParseBotOutput(raw);
  let problems = output ? replyProblems(output.reply) : ["the output was not valid JSON"];
  let retryRaw: string | undefined;
  if (!output || problems.length) {
    // One retry that tells the model exactly what was wrong; after that a person takes over.
    retryRaw = await runAgent(env, { ...agent, system: agent.system + `\n\nYour previous reply could not be used because ${problems.join("; ")}. Write the reply again, fixing this. Reply with ONLY the JSON object.` }, history);
    output = tryParseBotOutput(retryRaw);
    problems = output ? replyProblems(output.reply) : ["the output was not valid JSON"];
  }
  const good: BotOutput | null = output && !problems.length ? output : null;
  const parsed: BotOutput = good ?? { ...FALLBACK, data: { reason: `guardrail: ${problems.join("; ")}`.slice(0, 200) } };
  const debug = good ? undefined : { problems, raw: raw.slice(0, 500), retryRaw: retryRaw?.slice(0, 500) };
  const next = applyOutput(facts, parsed);
  // The code, not the model, decides when the quote is ready, and only once.
  const stops: BotIntent[] = ["handoff", "declined", "repair"];
  if (good && !stops.includes(good.intent) && !facts.quoteRequested && nextStep(next) === "quote") {
    const final: BotOutput = { ...good, intent: "ready_for_quote" };
    return { output: final, facts: applyOutput(next, final), debug };
  }
  return { output: parsed, facts: next, debug };
}
