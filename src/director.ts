import { runAgent } from "./agents";
import type { BotFacts } from "./bot";
import { sb } from "./db";
import type { Account, Env } from "./types";

type Conv = { contact_id: string; account: Account; status: string; facts: (BotFacts & { approvedAt?: string }) | null; updated_at: string };
type Msg = { direction: "inbound" | "outbound"; status: string; campaign: string; account: Account; created_at: string };

/** The week in numbers. Pure, so it can be tested. Only real counts go in: the director is told not to invent any. */
export function weekFacts(msgs: Msg[], convs: Conv[], sinceIso: string, account: Account | null) {
  const inScope = <T extends { account: Account }>(x: T) => !account || x.account === account;
  const m = msgs.filter(inScope);
  const c = convs.filter(inScope);
  const week = c.filter((x) => x.updated_at >= sinceIso);
  const by = (f: (x: Msg) => boolean) => m.filter(f).length;
  return {
    period: "last 7 days",
    scope: account ?? "both companies",
    texts: {
      promoSent: by((x) => x.direction === "outbound" && x.status === "sent" && x.campaign !== "bot" && x.campaign !== "human" && x.campaign !== "test"),
      botReplies: by((x) => x.direction === "outbound" && x.campaign === "bot" && x.status === "sent"),
      teamReplies: by((x) => x.direction === "outbound" && x.campaign === "human"),
      customerReplies: by((x) => x.direction === "inbound"),
    },
    conversationsActiveThisWeek: week.length,
    stages: {
      choseHomeSize: week.filter((x) => x.facts?.stories).length,
      confirmedAddress: week.filter((x) => x.facts?.addressConfirmed).length,
      gaveEmail: week.filter((x) => x.facts?.email).length,
      quotesCreated: week.filter((x) => x.facts?.quoteId).length,
      quotesApproved: week.filter((x) => x.facts?.approvedAt).length,
      withTheTeam: week.filter((x) => x.status === "handed_off").length,
      closedNotInterested: week.filter((x) => x.status === "closed" && !x.facts?.approvedAt).length,
    },
  };
}

const SYSTEM = `You are the Marketing Director for Dunzo Gutters and Santa's Lights (sister companies run by Clark in Sacramento). You report to Clark each week. You will be given real numbers for the last 7 days. Write a short, plain English weekly report for Clark.

Rules:
- Use ONLY the numbers you are given. Never invent a figure, a percentage trend, a comparison with last week, or a result you were not told. If the data is thin or zero, say so plainly and say what is needed to learn more.
- Be honest, direct and practical. No hype, no jargon, no filler. Write like a sharp colleague, not a consultant.
- Structure: 1) How the week went, in two or three sentences. 2) What is working. 3) What is not, or what we cannot tell yet. 4) Three specific things to do next week, each one line, in priority order. 5) Anything that needs Clark's approval (anything that spends money or goes out to many people).
- Think about cross selling between the two companies (gutter customers to Christmas and permanent lighting, lighting customers to gutter cleaning) and mention one concrete idea if it is sensible for the time of year. It is late November, so Christmas lighting is in season.
- Plain text only. No markdown symbols, no bullet characters, no dashes or hyphens as punctuation. Number the next steps 1, 2, 3. Under 280 words.`;

export async function directorReport(env: Env, account: Account | null): Promise<{ report: string; facts: ReturnType<typeof weekFacts> }> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [msgs, convs] = await Promise.all([
    sb<Msg[]>(env, "GET", `messages?created_at=gte.${since}&status=neq.archived&select=direction,status,campaign,account,created_at&limit=3000`),
    sb<Conv[]>(env, "GET", "conversations?select=contact_id,account,status,facts,updated_at&limit=1500"),
  ]);
  const facts = weekFacts(msgs, convs, since, account);
  const text = await runAgent(env, { name: "director", system: SYSTEM, maxTokens: 700, model: env.BOT_MODEL }, [{ role: "user", content: "Here are the real numbers for the last 7 days:\n" + JSON.stringify(facts, null, 2) + "\n\nWrite the weekly report." }]);
  return { report: text, facts };
}
