import { expect, it } from "vitest";
import { DASH_HTML } from "../src/dashboard";

it("the dashboard page script parses, so a typo can never ship a dead page", () => {
  const scripts = [...DASH_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  expect(scripts.length).toBeGreaterThan(0);
  for (const s of scripts) expect(() => new Function(s)).not.toThrow();
});
