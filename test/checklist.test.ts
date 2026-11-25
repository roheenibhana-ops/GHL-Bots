import { expect, it } from "vitest";
import { CHECKLIST } from "../src/checklist";

it("every test case has a unique id, an action and an expected result", () => {
  const ids = CHECKLIST.flatMap((s) => s.cases.map((c) => c.id));
  expect(new Set(ids).size).toBe(ids.length);
  for (const s of CHECKLIST) {
    expect(s.what.length).toBeGreaterThan(40);
    expect(s.cases.length).toBeGreaterThan(0);
    for (const c of s.cases) { expect(c.do.length).toBeGreaterThan(5); expect(c.expect.length).toBeGreaterThan(4); }
  }
});
