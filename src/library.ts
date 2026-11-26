import { runAgent } from "./agents";
import { sb, sbAll } from "./db";
import { quoChunk, quoNumbers, quoTranscript, quoUsers, type QuoCall, type QuoMessage, type QuoNumber } from "./quo";
import { callSample } from "./voice";
import { historyPage } from "./coach";
import type { Account, Env } from "./types";

/**
 * The library: what the business has learned from its own real conversations.
 * Thousands of texts and calls are read in batches, each batch is boiled down, and the batches are merged into one
 * playbook per company. The owner switches a playbook on, and from then on every agent draws on it.
 */
export interface Extract { voice: string[]; questions: string[]; objections: string[]; wins: string[]; phrases: string[]; ideas: string[]; avoid: string[] }
export interface Playbook {
  voice: string;
  questions: { q: string; about: string }[];
  objections: { o: string; works: string }[];
  phrases: string[];
  ideas: string[];
  avoid: string[];
  builtAt?: string;
  from?: { batches: number; messages: number; calls: number; conversations?: number };
}
export interface LibState { since?: string; msgCursor?: string | null; msgDone?: boolean; msgSeen: number; teamSeen: number; callCursor?: string | null; callsDone?: boolean; callsSeen: number; callsRead: number; ghl?: Partial<Record<Account, { before?: number; done?: boolean; seen: number; used: number }>>; batches: number; startedAt: string; finishedAt?: string; numbers?: Record<string, Account | "both">; users?: Record<string, string> }

const COMPANIES: Account[] = ["dunzo", "lights"];
const NAME = { dunzo: "Dunzo Gutters", lights: "Santa's Lights" } as const;
const enc = encodeURIComponent;

/** Which company a Quo phone line belongs to, from its name. Pure. */
export function companyOf(n: QuoNumber): Account | "both" {
  const t = (n.name ?? "").toLowerCase();
  if (/light|santa|christmas|xmas/.test(t)) return "lights";
  if (/dunzo|gutter/.test(t)) return "dunzo";
  return "both";
}

/** Text conversations as plain transcripts, each labelled with its company. Only ones where a person on the team wrote. Pure. */
export function conversationBlocks(msgs: QuoMessage[], numbers: Record<string, Account | "both">, users: Record<string, string>, maxChars = 46_000): { text: string; conversations: number; team: number } {
  const by = new Map<string, QuoMessage[]>();
  for (const m of msgs) if (m.text?.trim()) by.set(m.conversationId, [...(by.get(m.conversationId) ?? []), m]);
  const blocks: string[] = [];
  let total = 0, team = 0;
  for (const list of by.values()) {
    const mine = list.filter((m) => m.direction === "outgoing" && m.userId && m.text.trim().length > 12);
    if (!mine.length) continue;
    const co = numbers[list[0].phoneNumberId ?? ""] ?? "both";
    const lines = list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-16).map((m) => `${m.direction === "outgoing" ? (m.userId ? `TEAM (${users[m.userId] ?? "Team"})` : "AUTOMATED") : "CUSTOMER"}: ${m.text.replace(/\s+/g, " ").slice(0, 380)}`);
    const block = `[${co === "both" ? "COMPANY UNKNOWN" : NAME[co].toUpperCase()}]\n` + lines.join("\n");
    if (total + block.length > maxChars) break;
    blocks.push(block); total += block.length; team += mine.length;
  }
  return { text: blocks.join("\n\n---\n\n"), conversations: blocks.length, team };
}

const EMPTY: Extract = { voice: [], questions: [], objections: [], wins: [], phrases: [], ideas: [], avoid: [] };
const strs = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim().slice(0, 240)).slice(0, max) : []);

export function parseExtract(raw: string): Record<Account, Extract> {
  const m = raw.match(/\{[\s\S]*\}/);
  let j: Record<string, Record<string, unknown>> = {};
  try { j = m ? JSON.parse(m[0]) : {}; } catch { j = {}; }
  const one = (o: Record<string, unknown> | undefined): Extract => ({ voice: strs(o?.voice, 12), questions: strs(o?.questions, 25), objections: strs(o?.objections, 15), wins: strs(o?.wins, 12), phrases: strs(o?.phrases, 25), ideas: strs(o?.ideas, 15), avoid: strs(o?.avoid, 12) });
  return { dunzo: one(j.dunzo), lights: one(j.lights) };
}
const isEmpty = (e: Extract) => Object.values(e).every((v) => !v.length);

const EXTRACT_SYSTEM = [
  "You study the real text messages and phone calls of two sister home service companies in Sacramento: Dunzo Gutters (gutter cleaning, repairs, guards, installs) and Santa's Lights (Christmas and permanent lighting). Your notes will teach the companies' AI agents: the sales agents who text customers, and the marketing agents who write social posts, Google posts and newsletters.",
  "Each conversation is labelled with its company. If it says COMPANY UNKNOWN, work it out from what is discussed, and skip it if you cannot tell.",
  "Lines marked TEAM are a real person on the team. CUSTOMER lines are customers. Ignore AUTOMATED lines. Lines marked OLD BOT were written by an earlier automated assistant: never learn the voice from them, but do note in avoid where it let a customer down.",
  "Reply with ONLY a JSON object of this shape, with one entry per company:",
  '{"dunzo": {"voice": [], "questions": [], "objections": [], "wins": [], "phrases": [], "ideas": [], "avoid": []}, "lights": {...same keys...}}',
  "voice: habits in how the TEAM talks (openers, length, tone, how they handle price and pushback, how they ask for the job). Describe habits in your own words. Never quote a message.",
  "questions: the real questions customers asked, each as one plain question in the customer's kind of wording.",
  "objections: the reasons customers hesitated or said no, each with what the team did that seemed to help, if anything.",
  "wins: what was happening in conversations that ended in a booked job or a happy customer.",
  "phrases: short everyday phrases customers use to describe their problem or what they want (a few words each). These help marketing speak the customer's language.",
  "ideas: ideas for helpful social posts or articles that would answer what these customers were asking or worrying about.",
  "avoid: things the team said or did that an AI agent should NOT copy, such as promising a day, quoting a price off the cuff, or blaming someone.",
  "Rules: never include a customer's name, phone number, address, email or anything that identifies a person. Never record prices, discounts or dates as facts. Use plain punctuation with no em dashes. Leave a list empty if there is nothing real to put in it. Only write what is actually in the conversations.",
].join("\n");

async function getState(env: Env): Promise<{ id: number; body: LibState } | null> {
  const rows = await sb<{ id: number; body: LibState }[]>(env, "GET", "library?kind=eq.state&select=id,body&order=id.desc&limit=1");
  return rows[0] ?? null;
}
async function putState(env: Env, id: number | null, body: LibState): Promise<void> {
  if (id) await sb(env, "PATCH", `library?id=eq.${id}`, { body }, "return=minimal");
  else await sb(env, "POST", "library", { company: "all", kind: "state", body }, "return=minimal");
}

export async function libraryStatus(env: Env) {
  const st = await getState(env);
  const rows = await sbAll<{ company: string; kind: string; n: number; body: Playbook; created_at: string }>(env, "library?kind=in.(playbook,live)&select=company,kind,n,body,created_at&order=id.desc");
  const pick = (c: Account, kind: string) => rows.find((r) => r.company === c && r.kind === kind)?.body ?? null;
  return { state: st?.body ? { ...st.body, numbers: undefined, users: undefined } : null, companies: COMPANIES.map((c) => ({ company: c, name: NAME[c], draft: pick(c, "playbook"), live: pick(c, "live") })) };
}

/** Starts a study. A fresh one reads everything; a top up only reads what is new since the last one. */
export async function libraryStart(env: Env, fresh: boolean): Promise<LibState> {
  const prev = await getState(env);
  const [numbers, users] = [await quoNumbers(env), await quoUsers(env)];
  const body: LibState = {
    since: !fresh && prev?.body.finishedAt ? prev.body.startedAt : undefined,
    msgCursor: null, callCursor: null, msgSeen: 0, teamSeen: 0, callsSeen: 0, callsRead: 0, batches: fresh ? 0 : prev?.body.batches ?? 0, startedAt: new Date().toISOString(),
    numbers: Object.fromEntries(numbers.map((n) => [n.id, companyOf(n)])),
    users: Object.fromEntries(users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(" ") || "Team"])),
  };
  if (fresh) await sb(env, "DELETE", "library?kind=in.(batch,state)", undefined, "return=minimal");
  await putState(env, fresh ? null : prev?.id ?? null, body);
  return body;
}

async function saveBatch(env: Env, st: LibState, source: string, raw: string, counts: Record<string, number>): Promise<void> {
  const ex = parseExtract(raw);
  const rows = COMPANIES.filter((c) => !isEmpty(ex[c])).map((c) => ({ company: c, kind: "batch", n: st.batches, body: { source, ...counts, ...ex[c] } }));
  if (rows.length) await sb(env, "POST", "library", rows, "return=minimal");
  st.batches++;
}

/** Reads the next chunk of Quo and boils it down. Call it again and again until done is true. */
export async function libraryStep(env: Env, maxMessages = 20_000, maxGhl = 1500): Promise<{ done: boolean; state: LibState }> {
  const row = await getState(env);
  if (!row) throw new Error("No study has been started.");
  const st = row.body;
  if (st.finishedAt) return { done: true, state: st };
  const numbers = st.numbers ?? {}, users = st.users ?? {};
  if (!st.msgDone) {
    const chunk = await quoChunk<QuoMessage>(env, "/messages", { "createdAt[gt]": st.since }, st.msgCursor ?? undefined, 7);
    const blocks = conversationBlocks(chunk.items, numbers, users);
    if (blocks.conversations) await saveBatch(env, st, "texts", await runAgent(env, { name: "library", system: EXTRACT_SYSTEM, maxTokens: 2600, model: env.BOT_MODEL }, [{ role: "user", content: "TEXT CONVERSATIONS\n\n" + blocks.text }]), { messages: chunk.items.length, team: blocks.team });
    st.msgSeen += chunk.items.length; st.teamSeen += blocks.team; st.msgCursor = chunk.next;
    if (!chunk.next || st.msgSeen >= maxMessages) st.msgDone = true;
  } else if (!st.callsDone) {
    const chunk = await quoChunk<QuoCall>(env, "/calls", { include: "summary,voicemail", "createdAt[gte]": st.since }, st.callCursor ?? undefined, 2);
    const talk = chunk.items.filter((c) => c.duration >= 75 && !c.aiHandled).sort((a, b) => b.duration - a.duration).slice(0, 9);
    const scripts: string[] = [];
    const userList = Object.entries(users).map(([id, n]) => ({ id, firstName: n }));
    for (const c of talk) { const t = callSample(c, await quoTranscript(env, c.id).catch(() => []), userList, 5200); if (t) scripts.push(t); }
    if (scripts.length) await saveBatch(env, st, "calls", await runAgent(env, { name: "library", system: EXTRACT_SYSTEM, maxTokens: 2600, model: env.BOT_MODEL }, [{ role: "user", content: "PHONE CALLS (work out the company from what is discussed)\n\n" + scripts.join("\n\n---\n\n") }]), { calls: scripts.length });
    st.callsSeen += chunk.items.length; st.callsRead += scripts.length; st.callCursor = chunk.next;
    if (!chunk.next || st.callsSeen >= 1500) st.callsDone = true;
  }
  else {
    // GoHighLevel: the whole text history of each company, one page of conversations at a time.
    st.ghl = st.ghl ?? {};
    const co = COMPANIES.find((c) => !st.ghl![c]?.done);
    if (co) {
      const g = st.ghl[co] ?? { seen: 0, used: 0 };
      const page = await historyPage(env, g.before, co);
      if (page.transcripts.length) await saveBatch(env, st, "ghl", await runAgent(env, { name: "library", system: EXTRACT_SYSTEM, maxTokens: 2600, model: env.BOT_MODEL }, [{ role: "user", content: `TEXT CONVERSATIONS FROM THE CRM. Every one of these is [${NAME[co].toUpperCase()}].\n\n` + page.transcripts.join("\n\n") }]), { conversations: page.transcripts.length });
      g.seen += page.seen; g.used += page.transcripts.length;
      const tooOld = !!st.since && !!page.next && page.next < Date.parse(st.since);
      if (!page.seen || !page.next || page.next === g.before || tooOld || g.seen >= maxGhl) g.done = true;
      g.before = page.next;
      st.ghl[co] = g;
    }
  }
  if (st.msgDone && st.callsDone && COMPANIES.every((c) => st.ghl?.[c]?.done)) st.finishedAt = new Date().toISOString();
  await putState(env, row.id, st);
  return { done: !!st.finishedAt, state: { ...st, numbers: undefined, users: undefined } };
}

export function parsePlaybook(raw: string): Playbook | null {
  const m = raw.match(/\{[\s\S]*\}/);
  try {
    const j = JSON.parse(m ? m[0] : "") as Record<string, unknown>;
    const pairs = <K extends string>(v: unknown, a: K, b: string, max: number) => (Array.isArray(v) ? v : []).filter((x) => x && typeof (x as Record<string, unknown>)[a] === "string").map((x) => ({ [a]: String((x as Record<string, unknown>)[a]).slice(0, 220), [b]: String((x as Record<string, unknown>)[b] ?? "").slice(0, 320) })).slice(0, max);
    const voice = typeof j.voice === "string" ? j.voice.trim().slice(0, 2600) : "";
    if (voice.length < 60) return null;
    return { voice, questions: pairs(j.questions, "q", "about", 30) as Playbook["questions"], objections: pairs(j.objections, "o", "works", 14) as Playbook["objections"], phrases: strs(j.phrases, 40), ideas: strs(j.ideas, 30), avoid: strs(j.avoid, 14) };
  } catch { return null; }
}

/** Merges every batch for one company into a single playbook, saved as a draft for the owner to read. */
export async function libraryBuild(env: Env, company: Account): Promise<Playbook> {
  const rows = await sbAll<{ n: number; body: Extract & { source: string; messages?: number; calls?: number; conversations?: number } }>(env, `library?kind=eq.batch&company=eq.${enc(company)}&select=n,body&order=n.asc`);
  if (!rows.length) throw new Error(`Nothing has been learned for ${NAME[company]} yet. Run the study first.`);
  const all = (k: keyof Extract) => rows.flatMap((r) => r.body[k] ?? []);
  const section = (title: string, items: string[], cap: number) => `${title} (${items.length} notes)\n` + items.map((x) => "- " + x).join("\n").slice(0, cap);
  const content = [section("HOW THE TEAM TALKS", all("voice"), 14_000), section("QUESTIONS CUSTOMERS ASKED", all("questions"), 22_000), section("WHY CUSTOMERS HESITATED, AND WHAT HELPED", all("objections"), 14_000), section("WHAT WON JOBS", all("wins"), 9_000), section("PHRASES CUSTOMERS USE", all("phrases"), 9_000), section("CONTENT IDEAS", all("ideas"), 10_000), section("THINGS NOT TO COPY", all("avoid"), 8_000)].join("\n\n");
  const system = [
    `You are writing the playbook that every AI agent at ${NAME[company]} will learn from. Below are notes taken from thousands of the company's real text messages and phone calls, batch by batch. The same point often appears many times: that repetition tells you what matters most.`,
    "Merge them into ONE playbook. Reply with ONLY a JSON object:",
    '{"voice": "", "questions": [{"q": "", "about": ""}], "objections": [{"o": "", "works": ""}], "phrases": [], "ideas": [], "avoid": []}',
    "voice: at most 300 words of plain short paragraphs on how the team really talks to customers. Habits only, in your own words. No quoted phrases, nothing tied to one job, and no mistakes presented as habits.",
    "questions: the 25 to 30 questions customers ask most, most common first. q is the question in the customer's kind of wording. about is one line on what the customer is really trying to find out or is worried about. Do NOT write the answer: answers come from the approved knowledge.",
    "objections: the 10 to 14 most common reasons customers hesitate. works is one line on the approach that helped, as a manner, never a script.",
    "phrases: 30 to 40 short phrases customers actually use for their problems and wants.",
    "ideas: 25 to 30 specific, helpful post or article ideas that answer what customers ask and worry about. Each one line.",
    "avoid: the 10 to 14 most important things an agent must not copy from the team.",
    "Rules: no customer names or personal details. No prices, discounts, dates or guarantees anywhere. Plain punctuation with no em dashes.",
  ].join("\n");
  const raw = await runAgent(env, { name: "playbook", system, maxTokens: 5200, model: env.BOT_MODEL }, [{ role: "user", content }]);
  const pb = parsePlaybook(raw);
  if (!pb) throw new Error("The playbook could not be put together. Try again.");
  pb.builtAt = new Date().toISOString();
  pb.from = { batches: rows.length, messages: rows.reduce((n, r) => n + (r.body.messages ?? 0), 0), calls: rows.reduce((n, r) => n + (r.body.calls ?? 0), 0), conversations: rows.reduce((n, r) => n + (r.body.conversations ?? 0), 0) };
  await sb(env, "DELETE", `library?kind=eq.playbook&company=eq.${enc(company)}`, undefined, "return=minimal");
  await sb(env, "POST", "library", { company, kind: "playbook", body: pb }, "return=minimal");
  return pb;
}

/** Switches a company's playbook on for every agent (or off, with on=false). The owner can edit the voice first. */
export async function libraryPublish(env: Env, company: Account, on: boolean, voice?: string): Promise<void> {
  await sb(env, "DELETE", `library?kind=eq.live&company=eq.${enc(company)}`, undefined, "return=minimal");
  liveCache.delete(company);
  if (!on) return;
  const [draft] = await sb<{ body: Playbook }[]>(env, "GET", `library?kind=eq.playbook&company=eq.${enc(company)}&select=body&order=id.desc&limit=1`);
  if (!draft) throw new Error("There is no playbook to switch on yet.");
  const body = { ...draft.body, voice: (voice ?? "").trim().slice(0, 2600) || draft.body.voice };
  await sb(env, "POST", "library", { company, kind: "live", body }, "return=minimal");
}

const liveCache = new Map<string, { at: number; pb: Playbook | null }>();
/** The playbook agents are using right now for a company, or null. Never throws: an agent must still work without it. */
export async function livePlaybook(env: Env, company: Account): Promise<Playbook | null> {
  const hit = liveCache.get(company);
  if (hit && Date.now() - hit.at < 60_000) return hit.pb;
  let pb: Playbook | null = null;
  try { pb = (await sb<{ body: Playbook }[]>(env, "GET", `library?kind=eq.live&company=eq.${enc(company)}&select=body&order=id.desc&limit=1`))[0]?.body ?? null; } catch { pb = null; }
  liveCache.set(company, { at: Date.now(), pb });
  return pb;
}

/** For the sales agents: what customers usually ask and worry about. Background only. Pure. */
export function salesInsights(pb: Playbook | null): string {
  if (!pb) return "";
  const q = pb.questions.slice(0, 14).map((x) => `- ${x.q}${x.about ? ` (${x.about})` : ""}`).join("\n");
  const o = pb.objections.slice(0, 8).map((x) => `- ${x.o}${x.works ? `: ${x.works}` : ""}`).join("\n");
  const a = pb.avoid.slice(0, 8).map((x) => "- " + x).join("\n");
  return ["WHAT OUR REAL CUSTOMERS USUALLY ASK AND WORRY ABOUT (learned from thousands of our own calls and texts). Use it to understand the person and to be ready for what comes next. It is background, not facts: prices, links and promises still come only from the knowledge and rules below.", q && "They often ask:\n" + q, o && "Why they hesitate, and the manner that has helped:\n" + o, a && "Things our own team has done that you must not copy:\n" + a].filter(Boolean).join("\n");
}

/** For the marketing agents: the customer's own questions and words, and post ideas. Pure. */
export function marketingInsights(pb: Playbook | null): string {
  if (!pb) return "";
  return ["WHAT REAL CUSTOMERS ASK AND HOW THEY TALK (learned from thousands of our own calls and texts). Build content around these: answer the questions people really ask, and use their everyday words, not trade jargon. This tells you what to write ABOUT. Every fact, price and link must still come from the business knowledge.",
    pb.questions.length ? "Questions they ask most:\n" + pb.questions.slice(0, 24).map((x) => "- " + x.q).join("\n") : "",
    pb.phrases.length ? "Words and phrases they use: " + pb.phrases.slice(0, 36).join("; ") : "",
    pb.ideas.length ? "Post ideas grounded in those questions:\n" + pb.ideas.slice(0, 24).map((x) => "- " + x).join("\n") : "",
    pb.voice ? "How the team itself talks to customers:\n" + pb.voice : ""].filter(Boolean).join("\n");
}
