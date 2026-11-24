import { expect, it } from "vitest";
import { buildPlan } from "../src/plan";

it("lays out past days, today, days off and the finish date", () => {
  const rows = [
    ...Array.from({ length: 20 }, () => ({ status: "sent", sent_at: "2026-11-24T18:00:00Z" })),
    ...Array.from({ length: 5 }, () => ({ status: "sent", sent_at: "2026-11-25T17:00:00Z" })),
    ...Array.from({ length: 400 }, () => ({ status: "approved", sent_at: null })),
    { status: "held", sent_at: null },
  ];
  const p = buildPlan({ rows, today: "2026-11-25", windowOpen: true, cap: 150, capDates: "2026-11-24:20,2026-11-25:100,2026-11-27:100", blackout: "2026-11-26", deadline: "2026-12-15", sending: true });
  expect(p.days.map((d) => [d.date.slice(5), d.state, d.sent, d.planned])).toEqual([
    ["11-24", "done", 20, 20], ["11-25", "today", 5, 100], ["11-26", "off", 0, 0], ["11-27", "next", 0, 100], ["11-28", "next", 0, 150], ["11-29", "next", 0, 55],
  ]);
  expect(p.finish).toBe("2026-11-29");
  expect(p.late).toBe(false);
  expect(p.totals).toEqual({ sent: 25, toSend: 400, waiting: 0, held: 1, all: 426 });
});
