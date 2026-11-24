import { runAgent } from "./agents";
import { sb } from "./db";
import { conversationMessages, credsFor, searchConversations } from "./ghl";
import type { BotFacts } from "./bot";
import type { Env } from "./types";

type Conv = { contact_id: string; account: string; status: string; facts: (BotFacts & { approvedAt?: string }) | null; updated_at: string };
type Msg = { contact_id: string; direction: "inbound" | "outbound"; campaign: string; body: string | null; created_at: string };

export interface CoachReport { conversations: number; summary: string; working: string[]; notWorking: string[]; suggestions: { change: string; why: string; evidence: string }[]; note?: string }

/** How a conversation ended, in plain words, so the coach can compare what won with what lost. */
export function outcomeOf(c: Pick<Conv, "status" | "facts">): string {
  const f = c.facts ?? {};
  if (f.approvedAt) return "WON: quote approved";
  if (f.quoteId) return "quote sent, not approved yet";
  if (c.status === "handed_off") return "handed to the team";
  if (c.status === "closed") return "LOST: closed without a quote";
  return "still open, no quote yet";
}

/** Turns stored messages into short transcripts. Pure, so it can be tested. Customer names are reduced to "Customer". */
export function buildTranscripts(convs: Conv[], msgs: Msg[], max = 25): string[] {
  const by = new Map<string, Msg[]>();
  for (const m of msgs) { if (!by.has(m.contact_id)) by.set(m.contact_id, []); by.get(m.contact_id)!.push(m); }
  const out: string[] = [];
  for (const c of convs) {
    const ms = (by.get(c.contact_id) ?? []).filter((m) => m.body);
    if (ms.filter((m) => m.direction === "inbound").length < 1) continue;
    const lines = ms.slice(-24).map((m) => `${m.direction === "inbound" ? "CUSTOMER" : m.campaign === "human" ? "TEAM" : "BOT"}: ${(m.body ?? "").replace(/https?:\/\/\S+/g, "[link]").replace(/\S+@\S+/g, "[email]").slice(0, 320)}`);
    out.push(`--- Conversation ${out.length + 1} (outcome: ${outcomeOf(c)})\n${lines.join("\n")}`);
    if (out.length >= max) break;
  }
  return out;
}

const SYSTEM = `You are a sales coach reviewing real text conversations between a company's text agent and its customers. Your job is to help the agent get better, using only what is in the transcripts.

Rules:
- Use ONLY the transcripts you are given. Never invent a conversation, a quote or a number. If there are too few conversations to see a pattern, say so plainly and suggest less.
- Compare conversations that ended well with ones that did not, and look for what the agent did differently.
- Look for: where customers went quiet, questions the agent answered badly or could not answer, moments it sounded like a script or a company instead of a mate, moments it failed to name what the customer shared, missed chances to ask for the booking, and anything that worked well and should happen more.
- Each suggestion must be a change to how the agent behaves, written as a plain request that could be given to someone editing its instructions. Principles, never sample lines to copy. At most four suggestions, the most valuable first.
- Never suggest inventing urgency or discounts, promising dates, hiding that it is automated, ignoring a no or a STOP, or pressuring anyone.
- The owner has decided how the agent handles being automated, so do not suggest changing it: it does not announce that it is automated, and if a customer asks or brings it up it acknowledges it honestly, offers a person if they want one, and carries on. It never denies it.
- Reply with ONE JSON object and nothing else: {"summary": "two or three plain sentences", "working": ["..."], "notWorking": ["..."], "suggestions": [{"change": "the request", "why": "one sentence", "evidence": "which conversation and what happened, quoted briefly"}]}`;

export function parseCoach(raw: string): Omit<CoachReport, "conversations"> | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Partial<CoachReport>;
    const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 8) : []);
    const sug = (Array.isArray(j.suggestions) ? j.suggestions : []).filter((s) => s && typeof s.change === "string").slice(0, 5).map((s) => ({ change: String(s.change).slice(0, 600), why: String(s.why ?? "").slice(0, 300), evidence: String(s.evidence ?? "").slice(0, 400) }));
    return { summary: String(j.summary ?? "").slice(0, 900), working: arr(j.working), notWorking: arr(j.notWorking), suggestions: sug };
  } catch { return null; }
}

export async function coachReview(env: Env, days = 14): Promise<CoachReport> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [convs, msgs] = await Promise.all([
    sb<Conv[]>(env, "GET", `conversations?updated_at=gte.${since}&account=eq.dunzo&order=updated_at.desc&select=contact_id,account,status,facts,updated_at&limit=60`),
    sb<Msg[]>(env, "GET", `messages?created_at=gte.${since}&account=eq.dunzo&status=in.(sent,received)&order=created_at.asc&select=contact_id,direction,campaign,body,created_at&limit=1500`),
  ]);
  const transcripts = buildTranscripts(convs, msgs);
  if (!transcripts.length) return { conversations: 0, summary: "There are no customer conversations in this period yet, so there is nothing to learn from.", working: [], notWorking: [], suggestions: [] };
  const raw = await runAgent(env, { name: "coach", system: SYSTEM, maxTokens: 1800, model: env.BOT_MODEL }, [{ role: "user", content: `Here are ${transcripts.length} conversations from the last ${days} days.\n\n${transcripts.join("\n\n")}\n\nReview them.` }]);
  const parsed = parseCoach(raw);
  if (!parsed) throw new Error("The coach's review could not be read. Try again.");
  return { conversations: transcripts.length, ...parsed, note: transcripts.length < 8 ? "This is a small sample, so treat the findings as early signals, not proven patterns." : undefined };
}

// ---------- Head start: learn from the conversations already in GHL ----------

const HISTORY_NOTE = `
These transcripts come from the company's existing conversation history, before the new agent took over. TEAM lines are real people at the company (the owner Clark and his staff). OLD BOT lines are an older automated system. CUSTOMER lines are customers.
Learn from the people: what Clark and the team do that moves a customer forward or wins the job, how they handle price, timing, worries and silence, and what customers most often ask. Also note where the old bot let customers down, so the new agent avoids it. Every suggestion must be a change for the NEW agent.`;

/** One page of GHL history as transcripts. Names, numbers, emails and links are removed before anything is read. */
export async function historyPage(env: Env, before?: number): Promise<{ transcripts: string[]; next?: number }> {
  const creds = credsFor(env, "dunzo");
  const convs = await searchConversations(creds, 24, before);
  const out: string[] = [];
  for (const c of convs) {
    const msgs = (await conversationMessages(creds, c.id, 50)).reverse().filter((m) => m.body);
    const first = (c.fullName ?? "").split(" ")[0];
    const clean = (t: string) => {
      let x = t.replace(/https?:\/\/\S+/g, "[link]").replace(/\S+@\S+/g, "[email]").replace(/[A-Za-z0-9._+-]+%40[A-Za-z0-9.-]+/g, "[email]").replace(/\+?\d[\d\s().-]{8,}\d/g, "[phone]");
      if (first && first.length > 1) x = x.split(first).join("[name]");
      return x.replace(/\s+/g, " ").slice(0, 300);
    };
    const real = msgs.filter((m) => m.direction === "inbound" && !/You reached Santa/i.test(m.body ?? ""));
    if (real.length < 2) continue;
    const lines = msgs.filter((m) => !/^Opportunity (created|updated)/i.test(m.body ?? "")).slice(-22).map((m) => `${m.direction === "inbound" ? "CUSTOMER" : m.userId ? "TEAM" : "OLD BOT"}: ${clean(m.body ?? "")}`);
    const won = msgs.some((m) => /thank you for approving/i.test(m.body ?? ""));
    out.push(`--- Conversation ${out.length + 1} (outcome: ${won ? "WON: quote approved" : "unknown"})\n${lines.join("\n")}`);
  }
  return { transcripts: out, next: convs.length ? convs[convs.length - 1].lastMessageDate : undefined };
}

export async function coachHistory(env: Env, before?: number): Promise<CoachReport & { next?: number }> {
  const { transcripts, next } = await historyPage(env, before);
  if (!transcripts.length) return { conversations: 0, summary: "", working: [], notWorking: [], suggestions: [], next };
  const raw = await runAgent(env, { name: "coach", system: SYSTEM + HISTORY_NOTE, maxTokens: 1800, model: env.BOT_MODEL }, [{ role: "user", content: `Here are ${transcripts.length} conversations from the company's history.\n\n${transcripts.join("\n\n")}\n\nReview them.` }]);
  const parsed = parseCoach(raw);
  if (!parsed) throw new Error("The coach's review could not be read. Try again.");
  return { conversations: transcripts.length, ...parsed, next };
}

/** Boils several batch reviews down into one short list of the most valuable changes. */
export async function coachMerge(env: Env, batches: { summary: string; working: string[]; notWorking: string[]; suggestions: { change: string; why: string; evidence: string }[] }[], total: number): Promise<CoachReport> {
  const system = SYSTEM.replace("reviewing real text conversations", "combining several reviews of real text conversations") + "\nYou are given several batch reviews of the same company's conversations. Merge them: keep what shows up more than once or is clearly most valuable, drop repeats, and keep real evidence from the batches. At most five suggestions.";
  const raw = await runAgent(env, { name: "coach", system, maxTokens: 2000, model: env.BOT_MODEL }, [{ role: "user", content: "Batch reviews:\n" + JSON.stringify(batches).slice(0, 60000) + "\n\nMerge them into one review." }]);
  const parsed = parseCoach(raw.replace(/"suggestions"/, '"suggestions"'));
  if (!parsed) throw new Error("The combined review could not be read. Try again.");
  return { conversations: total, ...parsed };
}
