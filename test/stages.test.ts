import { describe, expect, it } from "vitest";
import { planStage } from "../src/stages";

const P = [{ id: "p1", name: "Gutter Promo Nurture Pipeline 2027", stages: ["New Lead", "Photos Received", "Appointment Set", "Quote Sent", "Lost - Reason for Objection", "ReHash", "Quote Approved"].map((n, i) => ({ id: `s${i}`, name: n })) }];
const opp = (stage: string, status = "open") => ({ id: "o1", name: "x", pipelineId: "p1", pipelineStageId: stage, status });

describe("planStage", () => {
  it("creates the opportunity when there is none", () => {
    expect(planStage([], P, "Gutter Promo Nurture Pipeline 2027", "New Lead")).toMatchObject({ action: "create", stageId: "s0" });
  });
  it("moves forward only", () => {
    expect(planStage([opp("s0")], P, "Gutter Promo Nurture Pipeline 2027", "Quote Sent")).toMatchObject({ action: "move", stageId: "s3" });
    expect(planStage([opp("s6")], P, "Gutter Promo Nurture Pipeline 2027", "Quote Sent")).toMatchObject({ action: "none" });
  });
  it("sets Lost from anywhere but leaves team-managed stages alone otherwise", () => {
    expect(planStage([opp("s3")], P, "Gutter Promo Nurture Pipeline 2027", "Lost")).toMatchObject({ action: "move", stageId: "s4" });
    expect(planStage([opp("s5")], P, "Gutter Promo Nurture Pipeline 2027", "Quote Sent")).toMatchObject({ action: "none" });
  });
  it("does nothing if the pipeline is missing", () => {
    expect(planStage([], P, "Nope", "New Lead")).toMatchObject({ action: "none" });
  });
});
