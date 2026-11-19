import { describe, expect, it } from "vitest";
import { photoThanks, planPhotoMove, type Opp, type PipelineInfo } from "../src/photo";

const pipelines: PipelineInfo[] = [{
  id: "p1", name: "Christmas Lighting Nurture",
  stages: [{ id: "s_new", name: "New Lead" }, { id: "s_photos", name: "Photos Received" }, { id: "s_quote", name: "Quote Sent" }],
}];
const opp = (stage: string, status = "open"): Opp => ({ id: "o1", name: "Sam", pipelineId: "p1", pipelineStageId: stage, status });

describe("planPhotoMove", () => {
  it("moves a New Lead opportunity to Photos Received", () => {
    expect(planPhotoMove([opp("s_new")], pipelines)).toMatchObject({ action: "move", oppId: "o1", toStageId: "s_photos", fromStage: "New Lead" });
  });
  it("leaves any other stage alone", () => {
    expect(planPhotoMove([opp("s_quote")], pipelines).action).toBe("skip");
    expect(planPhotoMove([opp("s_photos")], pipelines).action).toBe("skip");
  });
  it("ignores closed opportunities and contacts with none", () => {
    expect(planPhotoMove([opp("s_new", "lost")], pipelines).action).toBe("skip");
    expect(planPhotoMove([], pipelines).action).toBe("skip");
  });
  it("does not move when the pipeline has no Photos Received stage", () => {
    const bare: PipelineInfo[] = [{ id: "p1", name: "X", stages: [{ id: "s_new", name: "New Lead" }] }];
    expect(planPhotoMove([opp("s_new")], bare)).toMatchObject({ action: "skip" });
  });
  it("picks the New Lead opportunity when there are several", () => {
    const many: Opp[] = [{ ...opp("s_quote"), id: "a" }, { ...opp("s_new"), id: "b" }];
    expect(planPhotoMove(many, pipelines)).toMatchObject({ action: "move", oppId: "b" });
  });
});

describe("photoThanks", () => {
  it("is signed by the team, mentions photos, and uses no dashes or hyphens", () => {
    for (const acct of ["lights", "dunzo"] as const) {
      const t = photoThanks(acct, "Sam");
      expect(t).toContain("Hi Sam");
      expect(t).not.toMatch(/[-\u2013\u2014]/);
      expect(t).toMatch(/team$/);
    }
    expect(photoThanks("lights")).toContain("Santa's Lights team");
    expect(photoThanks("dunzo")).toContain("Dunzo Gutters team");
  });
});

describe("pipeline allow list", () => {
  const two: PipelineInfo[] = [
    { id: "p1", name: "Lead Nurture Pipeline 2027", stages: [{ id: "a_new", name: "New Lead" }, { id: "a_photos", name: "Photos Received" }] },
    { id: "p2", name: "Bot Pilot", stages: [{ id: "b_new", name: "New Lead" }, { id: "b_photos", name: "Photos Received" }] },
  ];
  const o = (pipelineId: string, stage: string): Opp => ({ id: `o_${pipelineId}`, name: "Sam", pipelineId, pipelineStageId: stage, status: "open" });
  it("never touches a pipeline that is not on the list", () => {
    const plan = planPhotoMove([o("p1", "a_new")], two, ["Bot Pilot"]);
    expect(plan.action).toBe("skip");
  });
  it("moves only the opportunity in the allowed pipeline", () => {
    const plan = planPhotoMove([o("p1", "a_new"), o("p2", "b_new")], two, ["bot pilot"]);
    expect(plan).toMatchObject({ action: "move", oppId: "o_p2", toStageId: "b_photos" });
  });
  it("an empty list means no restriction", () => {
    expect(planPhotoMove([o("p1", "a_new")], two, []).action).toBe("move");
  });
});
