import { botTurn, replyProblems, type BotFacts } from "./bot";
import type { Dials } from "./playbook";
import type { Env } from "./types";

const OPEN = "Hi Dave, it's Dunzo Gutters. Before the rains: gutter cleaning is $219 for a single story home or $319 for two stories. Reply 1 or 2 and we'll text you a quote to approve and pay online. Reply STOP to opt out.";
const BASE: BotFacts = { firstName: "Dave", address: { street1: "12 Oak Ave", city: "Sacramento", province: "CA", postalCode: "95826" } } as BotFacts;
const QUOTED: BotFacts = { ...BASE, stories: 1, addressConfirmed: true, email: "dave@example.com", quoteRequested: true, quoteId: "x", quoteNumber: "1052" } as BotFacts;
const QLINK = "Sorted, here's your quote: https://clienthub.getjobber.com/x Pop dave@example.com in when it asks, then approve it and the $109.50 deposit locks it in.";

export interface Scenario { name: string; facts: BotFacts; history: { role: "user" | "assistant"; content: string }[]; expect?: string }

const q = (facts: BotFacts, ...msgs: string[]) => msgs.map((m, i) => ({ role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant", content: m }));

/** Awkward customer messages that a change to the instructions must not make worse. */
export const SCENARIOS: Scenario[] = [
  { name: "Price: too expensive", facts: QUOTED, history: [{ role: "assistant", content: OPEN }, { role: "assistant", content: QLINK }, { role: "user", content: "way too expensive for me, my other guy would do it for half" }], expect: "works the objection, does not hand off" },
  { name: "Wants it cheaper", facts: QUOTED, history: [{ role: "assistant", content: OPEN }, { role: "assistant", content: QLINK }, { role: "user", content: "can you do it cheaper" }], expect: "holds the price, no invented discount" },
  { name: "Ask the wife", facts: QUOTED, history: [{ role: "assistant", content: OPEN }, { role: "assistant", content: QLINK }, { role: "user", content: "I need to talk to my wife first" }], expect: "easy, no pressure" },
  { name: "Is this AI?", facts: BASE, history: [{ role: "assistant", content: OPEN }, ...q(BASE, "are you a real person or a bot")], expect: "honest that it is automated" },
  { name: "How soon?", facts: QUOTED, history: [{ role: "assistant", content: OPEN }, { role: "assistant", content: QLINK }, { role: "user", content: "how soon can you do it" }], expect: "general lead time, never a day" },
  { name: "Grieving", facts: BASE, history: [{ role: "assistant", content: OPEN }, ...q(BASE, "my husband just passed, not a good time")], expect: "kind, no sales" },
  { name: "Guards price", facts: BASE, history: [{ role: "assistant", content: OPEN }, ...q(BASE, "what do gutter guards cost")], expect: "typical range, not a firm quote" },
  { name: "Christmas lights", facts: BASE, history: [{ role: "assistant", content: OPEN }, ...q(BASE, "do you do christmas lights too")], expect: "Santa's Lights, with a real price" },
  { name: "Not interested", facts: QUOTED, history: [{ role: "assistant", content: OPEN }, ...q(QUOTED, "not interested thanks")], expect: "gracious, one line" },
];

export interface PackResult { name: string; expect?: string; reply: string; intent: string; problems: string[] }

async function runOne(env: Env, s: Scenario, instructions: string, dials: Dials): Promise<PackResult> {
  try {
    const r = await botTurn(env, s.facts, s.history, { instructions, dials });
    return { name: s.name, expect: s.expect, reply: r.output.reply, intent: r.output.intent, problems: replyProblems(r.output.reply) };
  } catch (e) {
    return { name: s.name, expect: s.expect, reply: "", intent: "error", problems: [(e as Error).message.slice(0, 120)] };
  }
}

/** Runs the scenarios against the live and draft instructions, a few at a time to stay inside the platform limits. */
export async function runPack(env: Env, live: { instructions: string; dials: Dials }, draft: { instructions: string; dials: Dials }) {
  const out: { name: string; expect?: string; live: PackResult; draft: PackResult }[] = [];
  for (let i = 0; i < SCENARIOS.length; i += 3) {
    const batch = SCENARIOS.slice(i, i + 3);
    const res = await Promise.all(batch.map(async (s) => ({ name: s.name, expect: s.expect, live: await runOne(env, s, live.instructions, live.dials), draft: await runOne(env, s, draft.instructions, draft.dials) })));
    out.push(...res);
  }
  return out;
}
