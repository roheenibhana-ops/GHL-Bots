import { describe, expect, it } from "vitest";
import { dialsText, GUS_DEFAULT, playbookText } from "../src/playbook";
import { systemPrompt } from "../src/bot";

describe("agent playbooks", () => {
  it("uses the built in default unless a playbook is given", () => {
    expect(playbookText()).toBe(GUS_DEFAULT);
    expect(playbookText("My own playbook text for testing.")).toContain("My own playbook text");
  });
  it("adds dial lines on top and nothing when the dials are untouched", () => {
    expect(dialsText({})).toBe("");
    expect(dialsText({ humor: "serious", push: "assertive", crossSell: false })).toMatch(/HUMOR[\s\S]*CLOSING[\s\S]*SANTA/);
  });
  it("puts the editable playbook in the prompt but keeps the locked safety rules in code", () => {
    const p = systemPrompt({ firstName: "Dave" } as never, "UNIQUE PLAYBOOK MARKER for the test.");
    expect(p).toContain("UNIQUE PLAYBOOK MARKER");
    expect(p).not.toContain("THE WHOLE POINT"); // the default playbook is replaced
    expect(p).toContain("HARD RULES");
    expect(p).toContain("HONESTY ABOUT WHO YOU ARE");
    expect(p).toContain("OUTPUT");
  });
  it("the default prompt still carries the default voice", () => {
    expect(systemPrompt({ firstName: "Dave" } as never)).toContain("THE WHOLE POINT");
  });
});
