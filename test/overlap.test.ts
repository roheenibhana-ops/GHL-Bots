import { describe, expect, it } from "vitest";
import { overlapStats } from "../src/overlap";

describe("overlapStats", () => {
  it("counts pairs, unique people and multi-system people", () => {
    const r = overlapStats({
      a: new Set(["1", "2", "3"]),
      b: new Set(["2", "3", "4"]),
      c: new Set(["3", "5"]),
    });
    expect(r.sizes).toEqual({ a: 3, b: 3, c: 2 });
    expect(r.pairs).toEqual({ "a & b": 2, "a & c": 1, "b & c": 1 });
    expect(r.uniquePeople).toBe(5);
    expect(r.inMoreThanOneSystem).toBe(3);
    expect(r.inAllSystems).toBe(1);
  });
});
