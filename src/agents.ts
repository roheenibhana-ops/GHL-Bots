import type { Env } from "./types";

/** Each agent is config, not a service: a prompt, a model and guardrails. Add one by adding an entry. */
export interface AgentConfig {
  name: string;
  system: string;
  maxTokens: number;
  /** Overrides CLAUDE_MODEL for this agent. */
  model?: string;
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

export async function runAgent(
  env: Env,
  agent: AgentConfig,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: agent.model ?? env.CLAUDE_MODEL, max_tokens: agent.maxTokens, system: agent.system, messages: history }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[]; stop_reason?: string };
  const text = data.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
  if (!text) throw new Error(`Claude returned no text (stop reason: ${data.stop_reason ?? "unknown"}, blocks: ${data.content.map((b) => b.type).join(",") || "none"})`);
  return text;
}
