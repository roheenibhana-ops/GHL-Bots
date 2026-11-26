import type { Env } from "./types";

/** Each agent is config, not a service: a prompt, a model and guardrails. Add one by adding an entry. */
export interface AgentConfig {
  name: string;
  system: string;
  maxTokens: number;
  /** Overrides CLAUDE_MODEL for this agent. */
  model?: string;
  /** The start of `system` that is the same on every call. It is cached, so repeat calls pay far less for it. */
  cachePrefix?: string;
}

export const AGENTS: Record<string, AgentConfig> = {
  reply: {
    name: "Reply and qualify",
    maxTokens: 300,
    system: [
      "You write SMS replies for a Sacramento gutter cleaning company (Dunzo Gutters), texting people who were customers or leads of its sister business Santa's Lights.",
      "Voice: warm, plain-spoken, short. One or two sentences. No emojis spam, no corporate language.",
      "Goal: answer their question, then collect what we need to book a quote (address, home type) or book it.",
      "Rules: never invent prices or availability. If you don't know, say a person will confirm.",
      "If the person is angry, confused, asks something unusual, or asks to speak to a human, reply with exactly: ESCALATE",
      "If they ask to stop, reply with exactly: STOP",
      "Output only the SMS text.",
    ].join("\n"),
  },
};

type ClaudeReply = { content: { type: string; text?: string }[]; stop_reason?: string };

/** One turn. Content is plain text, or a list of text and picture blocks when the agent needs to look at photos. */
export type Turn = { role: "user" | "assistant"; content: string | ({ type: "text"; text: string } | { type: "image"; source: { type: "url"; url: string } })[] };

/**
 * JSON for the API. Cutting a message short can slice an emoji in half, which leaves a broken character the API refuses.
 * Those halves are dropped here, so one odd message can never stop an agent.
 */
export function safeJson(v: unknown): string {
  return JSON.stringify(v).replace(/(^|[^\\])((?:\\\\)*)\\ud[89a-f][0-9a-f]{2}/gi, "$1$2");
}

// ---------- Which model does which job ----------
/** The jobs the AI does. The owner picks a model for each one in Settings. */
export const TASKS = {
  conversations: { label: "Sales conversations (Gus)", def: "sonnet", why: "Talks to customers. Worth the better model." },
  followups: { label: "Follow ups (Dash)", def: "sonnet", why: "Short texts to customers who went quiet." },
  writers: { label: "Marketing writers", def: "sonnet", why: "Social and Google posts for you to review." },
  reports: { label: "Photo reports", def: "sonnet", why: "Looks at job photos and writes the report or lighting design." },
  reading: { label: "Library: reading in bulk", def: "haiku", why: "Sorts and summarises thousands of messages. The cheap model does this well." },
  playbook: { label: "Library: writing the playbooks", def: "sonnet", why: "Turns all the notes into one playbook. Runs rarely." },
  advice: { label: "Advice: Director, Mentor and the builder", def: "sonnet", why: "Weekly report, reviews, and changes you ask for in the studio." },
} as const;
export type Task = keyof typeof TASKS;
export const MODELS: Record<string, { id: string; label: string; inPerM: number; outPerM: number }> = {
  haiku: { id: "claude-haiku-5-5", label: "Fast and cheapest (Haiku)", inPerM: 0.1, outPerM: 0.5 },
  sonnet: { id: "claude-sonnet-5-5", label: "Balanced (Sonnet)", inPerM: 2, outPerM: 10 },
  opus: { id: "claude-opus-5-5", label: "Smartest (Opus)", inPerM: 4, outPerM: 20 },
};
const TASK_OF: Record<string, Task> = { sales: "conversations", dash: "followups", report: "reports", library: "reading", voice: "reading", playbook: "playbook", coach: "advice", director: "advice", studio: "advice" };
export const taskOf = (agentName: string): Task => TASK_OF[agentName] ?? "writers";
export const settingKey = (t: Task) => "MODEL_" + t.toUpperCase();

/** The model for an agent: the owner's choice for that job, else the job's default. */
export function modelFor(env: Env, agentName: string): string {
  const t = taskOf(agentName);
  const pick = (env as unknown as Record<string, string | undefined>)[settingKey(t)];
  return (MODELS[pick ?? ""] ?? MODELS[TASKS[t].def]).id;
}

/**
 * How to ask each model not to spend the reply budget on thinking. They differ:
 * Haiku can switch thinking off. Sonnet and Opus cannot, so they get room to think on top of the reply budget.
 */
export function thinkingPlan(model: string, maxTokens: number): { thinking?: { type: string }; max_tokens: number } {
  if (model.includes("haiku")) return { thinking: { type: "disabled" }, max_tokens: maxTokens };
  return { max_tokens: maxTokens + 6000 };
}

/** The system prompt, with the part that never changes marked so the API can cache it. */
export function systemBlocks(agent: Pick<AgentConfig, "system" | "cachePrefix">): string | { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[] {
  const pre = agent.cachePrefix;
  if (!pre || pre.length < 4000 || !agent.system.startsWith(pre)) return agent.system;
  const rest = agent.system.slice(pre.length);
  return [{ type: "text", text: pre, cache_control: { type: "ephemeral" } }, ...(rest ? [{ type: "text" as const, text: rest }] : [])];
}

type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
async function callClaude(env: Env, agent: AgentConfig, history: Turn[], model: string, plan: { thinking?: { type: string }; max_tokens: number }): Promise<Response> {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: safeJson({ model, max_tokens: plan.max_tokens, system: systemBlocks(agent), messages: history, ...(plan.thinking ? { thinking: plan.thinking } : {}) }),
  });
}

/** Writes down what one call used, so the dashboard can show what each job costs. Never holds up or breaks a reply. */
async function logUsage(env: Env, task: Task, model: string, u: Usage | undefined): Promise<void> {
  if (!u || !env.SUPABASE_URL) return;
  await fetch(`${env.SUPABASE_URL}/rest/v1/ai_usage`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ task, model, input_tokens: u.input_tokens ?? 0, output_tokens: u.output_tokens ?? 0, cache_read: u.cache_read_input_tokens ?? 0, cache_write: u.cache_creation_input_tokens ?? 0 }),
  }).catch(() => undefined);
}

/**
 * One call to Claude, on the model chosen for that job. The model may think before it writes, and that thinking counts
 * against the reply budget. If a reply comes back empty or the request is refused, it is tried once more with plenty of room.
 */
export async function runAgent(
  env: Env,
  agent: AgentConfig,
  history: Turn[],
): Promise<string> {
  const textOf = (d: ClaudeReply) => d.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
  const model = modelFor(env, agent.name);
  const task = taskOf(agent.name);
  let res = await callClaude(env, agent, history, model, thinkingPlan(model, agent.maxTokens));
  let data: (ClaudeReply & { usage?: Usage }) | null = res.ok ? ((await res.json()) as ClaudeReply & { usage?: Usage }) : null;
  if (data) await logUsage(env, task, model, data.usage);
  if (!data || !textOf(data)) {
    res = await callClaude(env, agent, history, model, { max_tokens: agent.maxTokens + 8000 });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    data = (await res.json()) as ClaudeReply & { usage?: Usage };
    await logUsage(env, task, model, data.usage);
  }
  const text = textOf(data);
  if (!text) throw new Error(`Claude returned no text (stop reason: ${data.stop_reason ?? "unknown"}, blocks: ${data.content.map((b) => b.type).join(",") || "none"})`);
  return text;
}
