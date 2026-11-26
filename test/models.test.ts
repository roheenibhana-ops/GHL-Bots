import { expect, it } from "vitest";
import { MODELS, modelFor, taskOf, thinkingPlan } from "../src/agents";
import { SETTINGS, effectiveValues, mergeSettings, validSetting } from "../src/settings";

it("uses the model the owner picked for each job, and a sensible default otherwise", () => {
  const env = {} as never;
  expect(modelFor(env, "sales")).toBe("claude-sonnet-5-5"); // Gus stays on the better model
  expect(modelFor(env, "library")).toBe("claude-haiku-5-5"); // bulk reading goes to the cheap one
  expect(modelFor(env, "playbook")).toBe("claude-sonnet-5-5");
  expect(taskOf("chirp")).toBe("writers");
  const picked = mergeSettings(env, { MODEL_CONVERSATIONS: "opus", MODEL_READING: "sonnet" });
  expect(modelFor(picked, "sales")).toBe("claude-opus-5-5");
  expect(modelFor(picked, "library")).toBe("claude-sonnet-5-5");
  expect(modelFor(mergeSettings(env, { MODEL_CONVERSATIONS: "nonsense" }), "sales")).toBe("claude-sonnet-5-5");
});

it("asks each model for thinking in a way it accepts", () => {
  expect(thinkingPlan("claude-haiku-5-5", 900)).toEqual({ thinking: { type: "disabled" }, max_tokens: 900 });
  expect(thinkingPlan("claude-sonnet-5-5", 900)).toEqual({ max_tokens: 6900 });
  expect(thinkingPlan("claude-opus-5-5", 900).thinking).toBeUndefined();
});

it("offers the model choice in Settings", () => {
  const m = SETTINGS.filter((s) => s.group === "AI models");
  expect(m).toHaveLength(7);
  expect(m[0].options).toEqual(Object.keys(MODELS));
  expect(validSetting("MODEL_READING", "haiku")).toBeNull();
  expect(validSetting("MODEL_READING", "gpt")).not.toBeNull();
  expect(effectiveValues({} as never, {}).MODEL_READING).toBe("haiku");
  expect(effectiveValues({} as never, { MODEL_READING: "opus" }).MODEL_READING).toBe("opus");
});
