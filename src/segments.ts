export type Segment = "customer" | "lost" | "excluded" | "other";
import type { Account } from "./types";

const has = (tags: string[], t: string) => tags.includes(t);
const anyOf = (tags: string[], list: string[]) => list.some((t) => has(tags, t));

/**
 * Campaign segmentation from GHL tags (lowercased). The rules depend on which GHL account the campaign runs from.
 * Other tags (lead sources like "ride-the-wave", the old "quote-nurture-paused") are ignored.
 */
export function classify(rawTags: string[] | undefined, source: Account = "lights"): Segment {
  const tags = (rawTags ?? []).map((t) => t.toLowerCase().trim());
  if (source === "dunzo") {
    // Gutter offer to Dunzo's own database. Service tags (gutter cleaning, repair...) only say what they had, so they are not exclusions.
    if (anyOf(tags, ["job scheduled", "quote approved", "new lead 2026", "new lead 2027", "phone-engaged-positive", "quote-nurture-negative", "newsletter - unsubscribed"])) return "excluded";
    if (has(tags, "dunzo won")) return "customer";
    if (has(tags, "dunzo lost")) return "lost";
    return "other";
  }
  // Gutter offer to Santa's Lights contacts: exclude anyone already in the gutter pipeline, talking to a human,
  // an active new lead, or a cold Facebook ad lead (their consent was for a different offer).
  if (anyOf(tags, ["gutter cleaning", "gutter repair", "dunzo-gutters", "phone-engaged-positive", "new lead 2026", "new lead 2027", "early bird lights 2026", "facebook funnel leads"])) return "excluded";
  if (anyOf(tags, ["lights won", "job scheduled", "quote approved"])) return "customer";
  if (anyOf(tags, ["lights lost", "dunzo lost"])) return "lost";
  return "other";
}

/** Internal or dummy records ("Vic Testing 1234", "Demo Customer") must never receive a campaign. */
export function looksLikeTestRecord(c: { firstName?: string; lastName?: string; email?: string }): boolean {
  const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`;
  return /\b(test|testing|tester|demo|dummy|fake|sample)\b/i.test(name) || /(^|[._+-])(test|demo|dummy|fake)([._+@-]|$)/i.test(c.email ?? "");
}
