export type Segment = "customer" | "lost" | "excluded" | "other";

const has = (tags: string[], t: string) => tags.includes(t);

/**
 * Pilot segmentation from GHL tags (all lowercased).
 * excluded: already in the gutter pipeline, talking to a human, or an active new lead.
 * customer: won / booked / approved. lost: got a quote and didn't buy.
 * Other tags (e.g. "ride-the-wave" lead source, "quote-nurture-paused") are ignored.
 */
export function classify(rawTags: string[] | undefined): Segment {
  const tags = (rawTags ?? []).map((t) => t.toLowerCase().trim());
  if (["gutter cleaning", "gutter repair", "dunzo-gutters", "phone-engaged-positive", "new lead 2026", "new lead 2027"].some((t) => has(tags, t))) {
    return "excluded";
  }
  if (["lights won", "job scheduled", "quote approved"].some((t) => has(tags, t))) return "customer";
  if (["lights lost", "dunzo lost"].some((t) => has(tags, t))) return "lost";
  return "other";
}
