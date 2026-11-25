import { expect, it } from "vitest";
import { callNotes } from "../src/quo";
import { callSample, parseStudy, textSamples, voiceBlock } from "../src/voice";
import { systemPrompt } from "../src/bot";

const users = [{ id: "US1", firstName: "Clark", lastName: "P" }];
const m = (id: string, conv: string, direction: "incoming" | "outgoing", text: string, userId: string | null, at: string) => ({ id, conversationId: conv, direction, text, userId, from: "+1", to: ["+2"], createdAt: at });

it("learns only from conversations a person on the team wrote in", () => {
  const r = textSamples([
    m("1", "a", "incoming", "How much for a two story house?", null, "2026-11-01T10:00:00Z"),
    m("2", "a", "outgoing", "Two story is three nineteen, want me to write it up?", "US1", "2026-11-01T10:01:00Z"),
    m("3", "b", "outgoing", "Your appointment is confirmed for tomorrow.", null, "2026-11-01T11:00:00Z"),
  ], users);
  expect(r.conversations).toBe(1);
  expect(r.teamMessages).toBe(1);
  expect(r.text).toContain("TEAM (Clark P): Two story");
  expect(r.text).toContain("CUSTOMER: How much");
  expect(r.text).not.toContain("appointment is confirmed");
  expect(textSamples([m("2", "a", "outgoing", "Two story is three nineteen", "US9", "2026-11-01T10:01:00Z")], users, "US1").conversations).toBe(0);
});

it("turns a call into a transcript and a study into a voice and notes", () => {
  const call = { id: "c", direction: "incoming" as const, status: "completed", duration: 240, createdAt: "2026-11-01T10:00:00Z" };
  const s = callSample(call, [{ status: "completed", startTime: "", duration: 240, dialogue: [{ content: "Dunzo, Clark here", start: 0, end: 1, actorId: "US1" }, { content: "Hi, my gutters are overflowing", start: 1, end: 3, actorId: null }] }], users);
  expect(s).toContain("TEAM (Clark P): Dunzo, Clark here");
  expect(s).toContain("CUSTOMER: Hi, my gutters");
  expect(parseStudy("VOICE\nShort and warm.\n---\nNOTES\nPrice comes up most.")).toEqual({ voice: "Short and warm.", notes: "Price comes up most." });
});

it("puts the approved voice and recent calls in front of the agent, and nothing when there is none", () => {
  expect(voiceBlock("")).toBe("");
  const p = systemPrompt({ firstName: "Al", voice: "Short, warm, a bit dry.", calls: "- yesterday: we called them and spoke for about 4 min" } as never);
  expect(p).toContain("HOW THE OWNER REALLY TALKS");
  expect(p).toContain("Short, warm, a bit dry.");
  expect(p).toContain("RECENT PHONE CALLS WITH THIS CUSTOMER");
  expect(p.indexOf("HOW THE OWNER REALLY TALKS")).toBeLessThan(p.indexOf("HARD RULES"));
  expect(systemPrompt({ firstName: "Al" } as never)).not.toContain("HOW THE OWNER REALLY TALKS");
});

it("describes recent calls plainly", () => {
  const now = new Date("2026-11-25T18:00:00Z").getTime();
  const n = callNotes([
    { id: "1", direction: "incoming", status: "missed", duration: 0, createdAt: "2026-11-25T10:00:00Z" },
    { id: "2", direction: "outgoing", status: "completed", duration: 300, createdAt: "2026-11-23T18:00:00Z", summary: { status: "completed", summary: ["Quoted a two story clean."] } },
  ], now);
  expect(n).toContain("today: they called and nobody picked up");
  expect(n).toContain("2 days ago: call summary");
  expect(callNotes([], now)).toBe("");
});
