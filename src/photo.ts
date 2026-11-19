import type { Account } from "./types";

/** A GHL opportunity, reduced to what the photo handler needs. */
export interface Opp { id: string; name: string; pipelineId: string; pipelineStageId: string; status: string }
export interface PipelineInfo { id: string; name: string; stages: { id: string; name: string }[] }

export type PhotoPlan =
  | { action: "move"; oppId: string; pipelineName: string; fromStage: string; toStageId: string; toStageName: string }
  | { action: "skip"; reason: string };

const skip = (reason: string): PhotoPlan => ({ action: "skip", reason });

/**
 * When a customer sends photos: if their open opportunity is in the New Lead stage, move it to Photos Received.
 * Any other stage is left alone, because by then the photos are no longer the next step.
 */
export function planPhotoMove(opps: Opp[], pipelines: PipelineInfo[], allowedPipelines: string[] = []): PhotoPlan {
  // Only pipelines on the allow list are ever touched. An empty list means no restriction.
  const allowedIds = new Set(allowedPipelines.length ? pipelines.filter((p) => allowedPipelines.some((n) => n.trim().toLowerCase() === p.name.trim().toLowerCase())).map((p) => p.id) : pipelines.map((p) => p.id));
  const open = opps.filter((o) => o.status === "open" && allowedIds.has(o.pipelineId));
  if (!open.length) return skip(allowedPipelines.length ? `no open opportunity in the allowed pipeline (${allowedPipelines.join(", ")})` : "no open opportunity for this contact");
  for (const o of open) {
    const p = pipelines.find((x) => x.id === o.pipelineId);
    if (!p) continue;
    const current = p.stages.find((s) => s.id === o.pipelineStageId)?.name ?? "";
    if (/^new lead\b/i.test(current.trim())) {
      const target = p.stages.find((s) => /^photos received\b/i.test(s.name.trim()));
      if (!target) return skip(`pipeline "${p.name}" has no Photos Received stage`);
      return { action: "move", oppId: o.id, pipelineName: p.name, fromStage: current, toStageId: target.id, toStageName: target.name };
    }
  }
  return skip("no open opportunity is in the New Lead stage, so there is nothing to move");
}

/** The thank-you text. House style: no dashes or hyphens, signed by the team and never by a person. */
export function photoThanks(account: Account, firstName?: string): string {
  const hi = firstName && firstName.trim() ? `Hi ${firstName.trim()}, ` : "";
  return account === "lights"
    ? `${hi}awesome, thank you so much for sending those photos over! We got them, and our team will take a look so we can move your lighting project to the next step. We really appreciate it! The Santa's Lights team`
    : `${hi}thanks so much for sending those over! We've got your photos, and our team will take a look and come back to you shortly. The Dunzo Gutters team`;
}
