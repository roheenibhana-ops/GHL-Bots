import { runAgent } from "./agents";
import { disallowedPrices } from "./bot";
import { BUSINESS_KNOWLEDGE, SITE_LINKS } from "./knowledge";
import { CONTENT_AGENTS, dialsText, loadAgent, type Dials } from "./playbook";
import type { Env } from "./types";

const clean = (u: string) => u.replace(/[.,;:!?)]+$/, "");

/** What is wrong with a piece of marketing copy. Empty means fine. Prices and links are checked exactly like customer texts. */
export function contentProblems(text: string): string[] {
  const out: string[] = [];
  const bad = disallowedPrices(text);
  if (bad.length) out.push("It states prices that are not approved: " + bad.join(", "));
  const links = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  const wrong = links.filter((l) => !SITE_LINKS.includes(clean(l)));
  if (wrong.length) out.push("It contains links that are not on the approved page list: " + wrong.join(", "));
  return out;
}

/** The season, in plain words, so the writer knows what is timely. */
export function seasonNote(now: Date, company: "dunzo" | "lights"): string {
  const m = Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "America/Los_Angeles" }).format(now));
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "America/Los_Angeles" }).format(now);
  const rainy = m >= 11 || m <= 2;
  const lines = [`Today is ${date} in Sacramento.`];
  if (company === "dunzo") {
    lines.push(rainy ? "It is the rainy season: over half of Sacramento's rain falls November to February, which is when clogged gutters do the most damage." : m >= 3 && m <= 5 ? "Spring: after the rains, a good time to clear gutters and check for winter damage." : m >= 9 ? "Leaf drop is starting, so late fall cleaning is coming up." : "Dry season: a good time for roof cleaning, solar panels and windows.");
    lines.push("Running now: the Winter Ready gutter cleaning promo, $219 for a single story home or $319 for two stories, with a 50 percent deposit when the customer approves the quote online.");
  } else {
    lines.push(m >= 10 || m === 1 ? "It is Christmas lighting season. Installs run late October through early December and takedown is January 2 to 20." : m >= 7 && m <= 9 ? "The calendar for this year's Christmas installs is open. Popular areas fill by mid October, so now is the time to book." : "Off season for Christmas lights. Permanent smart lighting works year round, and early booking for next year is worth mentioning.");
    lines.push("Running now: permanent smart lighting from $2,999 installed, and free Christmas lights with any permanent lighting install of $4,000 or more while spots last.");
  }
  return lines.join("\n");
}

const KINDS: Record<string, string> = {
  newsletter: "Write this week's email newsletter. Output: a subject line, a preview line, then the body, ready to paste into an email.",
  social: "Write five social media posts for this week, a mix of Facebook and Instagram. For each post give: the platform, the caption, a suggested photo or video idea that uses real job photos or the gallery, and 3 to 5 local hashtags.",
};

export async function draftContent(env: Env, agentKey: string, override?: { instructions: string; dials: Dials }): Promise<{ text: string; problems: string[]; agent: string }> {
  const def = CONTENT_AGENTS[agentKey];
  if (!def) throw new Error("That is not a content agent");
  const live = override ?? (await loadAgent(env, agentKey));
  const company = def.company === "dunzo" ? "Dunzo Gutters" : "Santa's Lights";
  const reference = (live.dials as Dials).reference?.trim();
  const system = [
    `You write marketing content for ${company}, a Sacramento area company run by Clark. The other company, ${def.company === "dunzo" ? "Santa's Lights" : "Dunzo Gutters"}, is its sister company.`,
    "FIXED RULES, never broken:",
    "- Use ONLY facts that appear in the business knowledge below. Never invent prices, offers, dates, deadlines, reviews, statistics, awards, customer names or stories. Never claim savings or scarcity that is not in the facts.",
    "- Links must be copied exactly from the approved page list in the knowledge, only where they genuinely fit. Never invent or alter a link.",
    "- Never promise a specific day for any work. Never put internal business numbers in public copy.",
    "- If you are missing a fact you would like to use, leave it out. Do not guess.",
    "",
    "HOW YOU WRITE (set by Clark and editable by him):",
    live.instructions,
    dialsText(live.dials),
    reference ? "\nREFERENCE MATERIAL from Clark: examples of copy he likes. Learn the voice, rhythm and structure from them. Never copy sentences word for word, and never take any price, date or fact from them: facts come only from the business knowledge.\n" + reference.slice(0, 12000) : "",
    "",
    "WHAT IS HAPPENING NOW:",
    seasonNote(new Date(), def.company),
    "",
    "BUSINESS KNOWLEDGE (the only facts you may use):",
    BUSINESS_KNOWLEDGE,
  ].filter((x) => x !== "").join("\n");
  const text = await runAgent(env, { name: agentKey, system, maxTokens: 1400, model: env.BOT_MODEL }, [{ role: "user", content: KINDS[def.kind] }]);
  return { text, problems: contentProblems(text), agent: agentKey };
}
