import { expect, it } from "vitest";
import { AI_KEY_ROW, aiKeyLooksRight, aiKeyStatus, applySettings, decryptSecret, effectiveValues, encryptSecret, validSetting } from "../src/settings";

const env = { SUPABASE_SERVICE_KEY: "service-key-for-tests", ANTHROPIC_API_KEY: "sk-ant-cloudflare-0000000000000000CFCF" } as never;

it("stores the AI key encrypted and never exposes it", async () => {
  const key = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz-1234";
  const blob = await encryptSecret(env, key);
  expect(blob).not.toContain("abcdefghijklmnop");
  expect(await decryptSecret(env, blob)).toBe(key);
  expect(await decryptSecret({ SUPABASE_SERVICE_KEY: "someone-else" } as never, blob)).toBeNull();
  const map = { [AI_KEY_ROW]: blob };
  expect(JSON.stringify(effectiveValues(env, map))).not.toContain("sk-ant");
  expect(await aiKeyStatus(env, map)).toEqual({ source: "dashboard", ending: "1234" });
  expect(await aiKeyStatus(env, {})).toEqual({ source: "cloudflare", ending: "CFCF" });
  expect(validSetting(AI_KEY_ROW, "anything")).toBe("Unknown setting"); // not writable through the normal settings route
  expect(aiKeyLooksRight(key)).toBe(true);
  expect(aiKeyLooksRight("hello")).toBe(false);
  expect(typeof applySettings).toBe("function");
});
