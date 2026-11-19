import { describe, expect, it } from "vitest";
import { applyOutput, composeReply, HANDOFF_REPLY, nextStep, parseBotOutput, QUOTE_READY_REPLY, stripQuestions, systemPrompt, tryParseBotOutput } from "../src/bot";

describe("parseBotOutput", () => {
  it("reads a good reply and its facts", () => {
    const o = parseBotOutput('{"reply":"Great, is this for 2752 Argolis Way?","intent":"stories","data":{"stories":1}}');
    expect(o).toMatchObject({ intent: "stories", data: { stories: 1 } });
  });
  it("accepts JSON wrapped in other text", () => {
    expect(parseBotOutput('Sure! {"reply":"Hi","intent":"reply_only","data":{}}').intent).toBe("reply_only");
  });
  it("falls back to a safe handoff on junk or unknown intents", () => {
    expect(parseBotOutput("not json").reply).toBe(HANDOFF_REPLY);
    expect(parseBotOutput('{"reply":"x","intent":"launch_missiles","data":{}}').intent).toBe("handoff");
    expect(parseBotOutput('{"reply":"","intent":"reply_only","data":{}}').intent).toBe("handoff");
  });
  it("never lets the model send a link", () => {
    const o = parseBotOutput('{"reply":"Pay here https://evil.example/x","intent":"reply_only","data":{}}');
    expect(o.intent).toBe("handoff");
    expect(o.reply).toBe(HANDOFF_REPLY);
  });
  it("drops invalid emails and story counts", () => {
    const o = parseBotOutput('{"reply":"ok","intent":"email_given","data":{"email":"nope","stories":3}}');
    expect(o.data).toEqual({});
    expect(parseBotOutput('{"reply":"ok","intent":"email_given","data":{"email":" Sam@Example.com "}}').data.email).toBe("sam@example.com");
  });
});

describe("applyOutput and systemPrompt", () => {
  it("remembers facts and confirms a given address", () => {
    const f = applyOutput({ firstName: "Sam" }, { reply: "ok", intent: "address_given", data: { address: { street1: "9 Oak Ave", city: "Folsom", province: "CA", postalCode: "95630" }, stories: 2 } });
    expect(f).toMatchObject({ stories: 2, addressConfirmed: true });
  });
  it("states the hard rules and known facts", () => {
    const p = systemPrompt({ firstName: "Sam", stories: 1 });
    expect(p).toContain("$219");
    expect(p).toContain("$319");
    expect(p).toContain("Never promise or suggest dates");
    expect(p).toContain("Home size: 1 story");
  });
});

describe("nextStep and prompt guidance", () => {
  it("walks size, address, email, quote", () => {
    expect(nextStep({})).toBe("stories");
    expect(nextStep({ stories: 2 })).toBe("address");
    expect(nextStep({ stories: 2, addressConfirmed: true })).toBe("email");
    expect(nextStep({ stories: 2, addressConfirmed: true, email: "a@b.co" })).toBe("quote");
  });
  it("tryParse returns null for unreadable output so a retry can happen", () => {
    expect(tryParseBotOutput("sure thing!")).toBeNull();
    expect(tryParseBotOutput('{"reply":"hi","intent":"nonsense","data":{}}')).toBeNull();
    expect(tryParseBotOutput('{"reply":"hi","intent":"reply_only","data":{}}')?.reply).toBe("hi");
  });
});

describe("composeReply", () => {
  const addr = { street1: "2752 Argolis Way", city: "Sacramento", province: "CA", postalCode: "95826" };
  it("the code adds the next question in a fixed order", () => {
    expect(composeReply("Got it, two story at $319.", { stories: 2, address: addr }).reply).toBe("Got it, two story at $319. Can you confirm the work is at 2752 Argolis Way, Sacramento, CA 95826?");
    expect(composeReply("Thanks.", { stories: 2 }).reply).toContain("street address");
    expect(composeReply("Confirmed.", { stories: 2, address: addr, addressConfirmed: true }).reply).toContain("best email");
    expect(composeReply("Sure.", {}).reply).toContain("single story (1) or two story (2)");
  });
  it("when everything is known the reply is fixed and ready is true", () => {
    expect(composeReply("whatever", { stories: 1, address: addr, addressConfirmed: true, email: "a@b.co" })).toEqual({ reply: QUOTE_READY_REPLY, ready: true });
  });
});

describe("stripQuestions", () => {
  it("removes questions so none is asked twice", () => {
    expect(stripQuestions("The deposit is 50%, paid online. What's the best email to send your quote to?")).toBe("The deposit is 50%, paid online.");
    expect(stripQuestions("Is that the right address?")).toBe("Thanks.");
    expect(stripQuestions("Got it, two story at $319.")).toBe("Got it, two story at $319.");
  });
  it("composeReply asks exactly one question", () => {
    const r = composeReply("The team will be in touch with dates. Is 12 Oak St right?", { stories: 1, address: { street1: "12 Oak St", city: "Folsom", province: "CA", postalCode: "95630" } }).reply;
    expect((r.match(/\?/g) ?? []).length).toBe(1);
  });
});
