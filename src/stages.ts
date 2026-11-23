import { sb } from "./db";
import { addNote, addTags, createOpportunity, credsFor, getContact, getPipelines, listOpportunities, moveOpportunity } from "./ghl";
import { quoteStatuses } from "./stats";
import type { BotFacts } from "./bot";
import { OUR_NOTE_PREFIX } from "./profile";
import type { Opp, PipelineInfo } from "./photo";
import type { Env } from "./types";

export const DEFAULT_PROMO_PIPELINE = "Gutter Promo Nurture Pipeline 2027";
/** Stages only ever move forward along this path. Lost can be set from any of them. */
const PATH = ["new lead", "photos received", "appointment set", "quote sent", "quote approved", "job unscheduled", "job scheduled"];
const norm = (s: string) => s.trim().toLowerCase();

export type StagePlan =
  | { action: "create"; pipelineId: string; stageId: string }
  | { action: "move"; oppId: string; stageId: string }
  | { action: "none"; reason: string };

/** Decides what to do with a contact's opportunity in the promo pipeline. Pure, so it can be tested. */
export function planStage(opps: Opp[], pipelines: PipelineInfo[], pipelineName: string, target: string): StagePlan {
  const p = pipelines.find((x) => norm(x.name) === norm(pipelineName));
  if (!p) return { action: "none", reason: `pipeline "${pipelineName}" not found` };
  const stage = p.stages.find((s) => norm(s.name) === norm(target) || norm(s.name).startsWith(norm(target)));
  if (!stage) return { action: "none", reason: `stage "${target}" not found` };
  const open = opps.find((o) => o.pipelineId === p.id && o.status === "open");
  if (!open) return { action: "create", pipelineId: p.id, stageId: stage.id };
  if (open.pipelineStageId === stage.id) return { action: "none", reason: "already there" };
  if (norm(target).startsWith("lost")) return { action: "move", oppId: open.id, stageId: stage.id };
  const cur = norm(p.stages.find((s) => s.id === open.pipelineStageId)?.name ?? "");
  const ci = PATH.indexOf(cur);
  const ti = PATH.findIndex((x) => norm(stage.name).startsWith(x));
  if (ci === -1) return { action: "none", reason: `opportunity is in "${cur}", leaving it for the team` };
  if (ti <= ci) return { action: "none", reason: "would move backwards" };
  return { action: "move", oppId: open.id, stageId: stage.id };
}

/** Puts the contact's promo opportunity in the named stage, creating it if needed. Best effort: never throws. */
export async function setStage(env: Env, account: "dunzo" | "lights", contactId: string, target: string, contactName?: string): Promise<string> {
  if (!env.PROMO_PIPELINE || env.PROMO_PIPELINE.toLowerCase() === "off") return "stage moves are off";
  try {
    const creds = credsFor(env, account);
    const name = env.PROMO_PIPELINE ?? DEFAULT_PROMO_PIPELINE;
    const [opps, pipelines] = await Promise.all([listOpportunities(creds, contactId), getPipelines(creds)]);
    const plan = planStage(opps, pipelines, name, target);
    if (plan.action === "create") {
      const nm = contactName ?? (await getContact(creds, contactId).then((c) => [c.firstName, c.lastName].filter(Boolean).join(" ")).catch(() => "")) ?? "";
      await createOpportunity(creds, { pipelineId: plan.pipelineId, stageId: plan.stageId, contactId, name: nm || "Winter promo lead" });
      return `created in ${target}`;
    }
    if (plan.action === "move") { await moveOpportunity(creds, plan.oppId, plan.stageId); return `moved to ${target}`; }
    return plan.reason;
  } catch (e) { return `stage not updated: ${(e as Error).message.slice(0, 100)}`; }
}

/** Looks at Jobber for quotes the bot created. When one is approved, moves the opportunity to Quote Approved. Runs from the cron. */
export async function syncApprovals(env: Env): Promise<{ checked: number; approved: number }> {
  const rows = await sb<{ contact_id: string; account: "dunzo" | "lights"; facts: BotFacts & { approvedAt?: string } | null }[]>(env, "GET", "conversations?select=contact_id,account,facts&order=updated_at.desc&limit=200");
  const pending = rows.filter((r) => r.facts?.quoteId && !r.facts.approvedAt && r.account === "dunzo").slice(0, 10);
  if (!pending.length) return { checked: 0, approved: 0 };
  const st = await quoteStatuses(env, pending.map((r) => r.facts!.quoteId!));
  let approved = 0;
  for (const r of pending) {
    const s = st[r.facts!.quoteId!];
    if (s !== "approved" && s !== "converted") continue;
    const facts = { ...r.facts!, approvedAt: new Date().toISOString() };
    await sb(env, "PATCH", `conversations?contact_id=eq.${encodeURIComponent(r.contact_id)}`, { facts, status: "closed" }, "return=minimal");
    await setStage(env, r.account, r.contact_id, "Quote Approved");
    const creds = credsFor(env, r.account);
    await addTags(creds, r.contact_id, ["bot-quote-approved"]).catch(() => undefined);
    await addNote(creds, r.contact_id, `${OUR_NOTE_PREFIX}Quote #${r.facts!.quoteNumber ?? ""} was approved in Jobber. Moved to Quote Approved.`).catch(() => undefined);
    approved++;
  }
  return { checked: pending.length, approved };
}
