import { describe, expect, it } from "vitest";
import { checkState, makeState, typeName } from "../src/jobber";

describe("oauth state", () => {
  it("accepts a fresh state and rejects tampered, expired and foreign ones", async () => {
    const now = 1_700_000_000_000;
    const st = await makeState("secret", "lights", now);
    expect(await checkState("secret", st, now + 1000)).toBe("lights");
    expect(await checkState("other", st, now + 1000)).toBeNull();
    expect(await checkState("secret", st + "0", now + 1000)).toBeNull();
    expect(await checkState("secret", st.replace(".lights.", ".dunzo."), now + 1000)).toBeNull();
    expect(await checkState("secret", st, now + 11 * 60_000)).toBeNull();
    expect(await checkState("secret", null, now)).toBeNull();
  });
});

describe("typeName", () => {
  it("renders non-null lists", () => {
    expect(typeName({ kind: "NON_NULL", name: null, ofType: { kind: "LIST", name: null, ofType: { kind: "SCALAR", name: "String" } } })).toBe("[String]!");
  });
});
