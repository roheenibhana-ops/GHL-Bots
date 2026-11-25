import { expect, it } from "vitest";
import { safeJson } from "../src/agents";

it("drops half an emoji so the request is always valid", () => {
  const cut = "Thanks so much \u{1F600}".slice(0, -1); // an emoji sliced in half
  const out = safeJson({ text: cut, ok: "whole \u{1F600} emoji", path: "C:\\\\udata" });
  expect(() => JSON.parse(out)).not.toThrow();
  const back = JSON.parse(out);
  expect(back.text).toBe("Thanks so much ");
  expect(back.ok).toBe("whole \u{1F600} emoji");
  expect(back.path).toBe("C:\\\\udata");
  expect(/\\ud[89a-f]/i.test(out.replace(/\\\\/g, ""))).toBe(false);
});
