import { runAgent } from "./agents";
import { quoCalls, quoMessages, quoTranscript, quoUsers, type QuoCall, type QuoMessage, type QuoTranscript, type QuoUser } from "./quo";
import type { Env } from "./types";

/** The block added to every agent once a voice has been approved. The safety rules always come after it and win. */
export function voiceBlock(profile: string | undefined): string {
  const p = (profile ?? "").trim();
  if (!p) return "";
  return "HOW THE OWNER REALLY TALKS TO CUSTOMERS (learned from his own calls and texts). Match this manner so you sound like one of his team. It describes habits, not lines: never reuse a phrase word for word, and every rule further down still wins.\n" + p;
}

const name = (u?: QuoUser) => [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "Team";

/** Real text conversations, as plain transcripts. Only conversations where a person on the team actually wrote something. Pure. */
export function textSamples(msgs: QuoMessage[], users: QuoUser[], onlyUserId?: string, maxChars = 42_000): { text: string; conversations: number; teamMessages: number } {
  const by = new Map<string, QuoMessage[]>();
  for (const m of msgs) if (m.text?.trim()) by.set(m.conversationId, [...(by.get(m.conversationId) ?? []), m]);
  const who = new Map(users.map((u) => [u.id, u]));
  const blocks: string[] = [];
  let total = 0, team = 0;
  for (const list of by.values()) {
    const mine = list.filter((m) => m.direction === "outgoing" && m.userId && (!onlyUserId || m.userId === onlyUserId) && m.text.trim().length > 12);
    if (!mine.length) continue; // automated or one sided: nothing to learn about how a person writes
    const lines = list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-14).map((m) => `${m.direction === "outgoing" ? (m.userId ? `TEAM (${name(who.get(m.userId))})` : "AUTOMATED") : "CUSTOMER"}: ${m.text.replace(/\s+/g, " ").slice(0, 400)}`);
    const block = lines.join("\n");
    if (total + block.length > maxChars) break;
    blocks.push(block); total += block.length; team += mine.length;
  }
  return { text: blocks.join("\n\n---\n\n"), conversations: blocks.length, teamMessages: team };
}

/** One phone call as a transcript. Pure. */
export function callSample(call: QuoCall, parts: QuoTranscript[], users: QuoUser[], maxChars = 5500): string {
  const who = new Map(users.map((u) => [u.id, u]));
  const lines = parts.flatMap((p) => p.dialogue ?? []).map((d) => `${d.actorId ? `TEAM (${name(who.get(d.actorId))})` : "CUSTOMER"}: ${d.content.replace(/\s+/g, " ")}`);
  const body = lines.join("\n").slice(0, maxChars);
  return body ? `PHONE CALL (${call.direction}, ${Math.round(call.duration / 60)} min)\n${body}` : "";
}

export interface VoiceStudy { voice: string; notes: string; studiedAt: string; texts: number; conversations: number; calls: number; who: string }

export function parseStudy(raw: string): { voice: string; notes: string } {
  const [a, ...rest] = raw.split(/\n-{3,}\n/);
  const clean = (s: string) => s.replace(/^\s*(VOICE|NOTES)[^\n]*\n/i, "").trim();
  return { voice: clean(a ?? ""), notes: clean(rest.join("\n---\n")) };
}

/** Reads recent real texts and calls from Quo and distils how the owner talks. Saves nothing: the caller stores it as a draft for approval. */
export async function studyVoice(env: Env, o: { userId?: string; days?: number } = {}): Promise<VoiceStudy> {
  const since = new Date(Date.now() - (o.days ?? 120) * 86_400_000).toISOString();
  const [users, msgs, calls] = await Promise.all([quoUsers(env), quoMessages(env, { sinceIso: since, maxPages: 8 }), quoCalls(env, { sinceIso: since, maxPages: 2 })]);
  const texts = textSamples(msgs, users, o.userId);
  // The longest real conversations teach the most.
  const talk = calls.filter((c) => c.duration >= 90 && !c.aiHandled && (!o.userId || c.answeredBy === o.userId || c.initiatedBy === o.userId)).sort((a, b) => b.duration - a.duration).slice(0, 10);
  const scripts = (await Promise.all(talk.map(async (c) => callSample(c, await quoTranscript(env, c.id).catch(() => []), users)))).filter(Boolean);
  if (!texts.conversations && !scripts.length) throw new Error("Quo returned no conversations written by a person in that period, so there is nothing to learn from yet.");
  const who = o.userId ? name(users.find((u) => u.id === o.userId)) : "the whole team";
  const system = [
    "You study how a small home services business really talks to its customers, from its own text messages and phone calls, so that its AI text agents can sound like one of the team.",
    `Study the lines marked TEAM${o.userId ? ` (${who})` : ""}. Lines marked CUSTOMER are context. Ignore lines marked AUTOMATED.`,
    "Write two parts, separated by a line containing only ---",
    "PART 1, the voice. At most 300 words of plain short paragraphs or simple dashes. Describe HABITS, never lines to copy: how they open and close, how long their messages are, how formal or loose, the kind of words and local flavour, how they use humour, how they show they listened, how they talk about price and handle pushback, how they ask for the job, what they never do. Do not quote any message. Do not include any customer's name, phone, address or personal details. Do not include prices, offers or promises: those are set elsewhere.",
    "PART 2, notes for the owner. At most 200 words. The questions and objections customers raise most, what seems to win jobs, and anything the team says that an AI agent should NOT copy (for example promising dates). Again no customer details.",
    "Use plain punctuation with no em dashes. Write nothing before part 1 and nothing after part 2.",
  ].join("\n");
  const content = [texts.text ? "TEXT CONVERSATIONS\n\n" + texts.text : "", scripts.length ? "PHONE CALLS\n\n" + scripts.join("\n\n---\n\n") : ""].filter(Boolean).join("\n\n=====\n\n");
  const raw = await runAgent(env, { name: "voice", system, maxTokens: 1400, model: env.BOT_MODEL }, [{ role: "user", content }]);
  const parsed = parseStudy(raw);
  if (parsed.voice.length < 80) throw new Error("The study did not produce a usable voice. Try again.");
  return { ...parsed, studiedAt: new Date().toISOString(), texts: texts.teamMessages, conversations: texts.conversations, calls: scripts.length, who };
}
