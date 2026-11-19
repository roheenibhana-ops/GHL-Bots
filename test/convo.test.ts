import { describe, expect, it } from "vitest";
import { buildHistory } from "../src/convo";

const o = (body: string) => ({ direction: "outbound" as const, body });
const i = (body: string) => ({ direction: "inbound" as const, body });

describe("buildHistory", () => {
  it("uses the offer as the opening and starts at the first customer reply", () => {
    const r = buildHistory([o("Offer text"), i("2"), o("Got it. Confirm address?"), i("yes")]);
    expect(r.opening).toBe("Offer text");
    expect(r.history).toEqual([{ role: "user", content: "2" }, { role: "assistant", content: "Got it. Confirm address?" }, { role: "user", content: "yes" }]);
  });
  it("merges consecutive messages from the same side", () => {
    expect(buildHistory([o("Offer"), i("hi"), i("2")]).history).toEqual([{ role: "user", content: "hi\n2" }]);
  });
  it("has nothing to answer when the last message is ours or there is no reply", () => {
    expect(buildHistory([o("Offer"), i("2"), o("Reply")]).history).toEqual([]);
    expect(buildHistory([o("Offer")]).history).toEqual([]);
  });
  it("works with no offer in front (a cold reply)", () => {
    const r = buildHistory([i("hello")]);
    expect(r.opening).toBeUndefined();
    expect(r.history).toEqual([{ role: "user", content: "hello" }]);
  });
});
