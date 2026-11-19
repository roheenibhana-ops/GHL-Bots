import { describe, expect, it } from "vitest";
import { buildHistory, inboundText, MEDIA_TEXT } from "../src/convo";

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

describe("inboundText", () => {
  it("passes real text through", () => expect(inboundText(" 2 ")).toBe("2"));
  it("treats an empty body as a picture message", () => {
    expect(inboundText("")).toBe(MEDIA_TEXT);
    expect(inboundText(undefined)).toBe(MEDIA_TEXT);
    expect(inboundText("", [{ url: "x" }])).toBe(MEDIA_TEXT);
  });
  it("ignores the literal null that the GHL test button sends", () => {
    expect(inboundText("null")).toBeNull();
    expect(inboundText("NULL", "[]")).toBeNull();
  });
  it("a photo with the word null in the body still counts when attachments exist", () => {
    expect(inboundText("null", [{ url: "x" }])).toBe(MEDIA_TEXT);
  });
});
