import { expect, it } from "vitest";
import { CONNECTORS, connectionFields, encryptSecret, mergeSettings } from "../src/settings";

const env = { SUPABASE_SERVICE_KEY: "service-key-for-tests", GHL_TOKEN_DUNZO: "pit-cloudflare-token-9999", GHL_LOCATION_DUNZO: "LOC123" } as never;

it("shows where each connection value comes from without exposing secrets", async () => {
  const ghl = CONNECTORS.find((c) => c.id === "ghl-dunzo")!;
  const fromCf = await connectionFields(env, {}, ghl);
  expect(fromCf.map((f) => [f.env, f.source, f.shown])).toEqual([["GHL_TOKEN_DUNZO", "cloudflare", "ending in 9999"], ["GHL_LOCATION_DUNZO", "cloudflare", "LOC123"]]);
  const map = { SECRET_GHL_TOKEN_DUNZO: await encryptSecret(env, "pit-new-token-from-dashboard-4321") };
  const saved = await connectionFields(env, map, ghl);
  expect(saved[0]).toMatchObject({ source: "dashboard", shown: "ending in 4321" });
  expect(JSON.stringify(saved)).not.toContain("pit-new-token");
  // secrets are never part of the ordinary settings merge
  expect(JSON.stringify(mergeSettings(env, map))).not.toContain("pit-new-token");
  expect(CONNECTORS.flatMap((c) => c.fields.map((f) => f.env)).some((e) => e.startsWith("SUPABASE"))).toBe(false);
});
