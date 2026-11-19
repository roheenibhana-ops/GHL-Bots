import { describe, expect, it } from "vitest";
import { applyOutput, HANDOFF_REPLY, parseBotOutput, systemPrompt } from "../src/bot";

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
