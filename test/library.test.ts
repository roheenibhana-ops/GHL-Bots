import { expect, it } from "vitest";
import { companyOf, conversationBlocks, marketingInsights, parseExtract, parsePlaybook, salesInsights } from "../src/library";
import { systemPrompt } from "../src/bot";

const m = (id: string, conv: string, direction: "incoming" | "outgoing", text: string, userId: string | null, line: string) => ({ id, conversationId: conv, direction, text, userId, phoneNumberId: line, from: "+1", to: ["+2"], createdAt: "2026-11-01T10:0" + id + ":00Z" });

it("labels each conversation with its company and skips ones no person wrote in", () => {
  expect(companyOf({ id: "1", name: "Santa's Lights Main" })).toBe("lights");
  expect(companyOf({ id: "2", name: "Dunzo Gutters" })).toBe("dunzo");
  expect(companyOf({ id: "3", name: "Office" })).toBe("both");
  const r = conversationBlocks([
    m("1", "a", "incoming", "Do you clean two story gutters?", null, "PN1"),
    m("2", "a", "outgoing", "We sure do, what is the address?", "US1", "PN1"),
    m("3", "b", "outgoing", "Your payment was received, thank you.", null, "PN2"),
  ], { PN1: "dunzo", PN2: "lights" }, { US1: "Clark" });
  expect(r.conversations).toBe(1);
  expect(r.text).toContain("[DUNZO GUTTERS]");
  expect(r.text).toContain("TEAM (Clark): We sure do");
  expect(r.text).not.toContain("payment was received");
});

it("reads a batch and a playbook, and survives rubbish", () => {
  const ex = parseExtract('Here you go {"dunzo": {"questions": ["How soon can you come?"], "phrases": ["overflowing"]}, "lights": {"voice": ["short and warm"]}}');
  expect(ex.dunzo.questions).toEqual(["How soon can you come?"]);
  expect(ex.lights.voice).toEqual(["short and warm"]);
  expect(ex.dunzo.avoid).toEqual([]);
  expect(parseExtract("not json").dunzo.questions).toEqual([]);
  expect(parsePlaybook("nope")).toBeNull();
  const pb = parsePlaybook(JSON.stringify({ voice: "Short, plain and friendly. They listen first and repeat back what the customer wants before anything else.", questions: [{ q: "How soon can you come?", about: "They want it done before the rain." }], objections: [{ o: "Too expensive", works: "Stay relaxed and explain what is included." }], phrases: ["overflowing"], ideas: ["What overflowing gutters do to fascia"], avoid: ["Promising a day"] })) as NonNullable<ReturnType<typeof parsePlaybook>>;
  expect(pb.questions[0].q).toBe("How soon can you come?");
  const sales = salesInsights(pb);
  expect(sales).toContain("How soon can you come?");
  expect(sales).toContain("Promising a day");
  const mk = marketingInsights(pb);
  expect(mk).toContain("overflowing");
  expect(mk).toContain("What overflowing gutters do to fascia");
  expect(salesInsights(null)).toBe("");
  const p = systemPrompt({ firstName: "Al", voice: pb.voice, insights: sales } as never);
  expect(p).toContain("WHAT OUR REAL CUSTOMERS USUALLY ASK");
  expect(p.indexOf("WHAT OUR REAL CUSTOMERS USUALLY ASK")).toBeLessThan(p.indexOf("HARD RULES"));
});
