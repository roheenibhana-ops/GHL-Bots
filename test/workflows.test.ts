import { expect, it } from "vitest";
import { MATES } from "../src/dash";
import { WORKFLOWS } from "../src/workflows";

it("every agent on the chart has a workflow that starts, ends and links to real agents", () => {
  const names = new Set(MATES.map((m) => m.name));
  for (const m of MATES) {
    const f = WORKFLOWS[m.name];
    expect(f, m.name + " has no workflow").toBeTruthy();
    expect(f[0].k, m.name).toBe("start");
    expect(f[f.length - 1].k, m.name).toBe("end");
    for (const st of f) if (st.k === "hand") expect(names.has(st.to as string), m.name + " hands to " + st.to).toBe(true);
  }
});
