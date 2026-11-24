const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-12-15" becomes "December 15". Returns null for anything that is not a real date. */
export function formatDeadline(iso: string | undefined | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? "").trim());
  if (!m) return null;
  const month = Number(m[2]), day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${MONTHS[month - 1]} ${day}`;
}

/** The sentence added to a promo text for a batch, or "" when no deadline is set. */
export function deadlineNote(iso: string | undefined | null): string {
  const d = formatDeadline(iso);
  return d ? `Price good through ${d}.` : "";
}

/**
 * The deadline that applies to one customer: the date written in the promo text they were sent, so each batch keeps its own.
 * Falls back to the campaign default for people texted before deadlines existed. Returns an ISO date or null.
 */
export function deadlineFor(opening: string | undefined | null, defaultIso: string | undefined | null, now = new Date()): string | null {
  const m = /good through ([A-Z][a-z]+) (\d{1,2})/.exec(opening ?? "");
  if (m) {
    const mi = MONTHS.indexOf(m[1]);
    if (mi >= 0) {
      let year = now.getUTCFullYear();
      // A January deadline read in December belongs to next year.
      if (mi < now.getUTCMonth() - 6) year += 1;
      return `${year}-${String(mi + 1).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
    }
  }
  return formatDeadline(defaultIso) ? (defaultIso as string).trim() : null;
}

/** True once the deadline day is over in Sacramento. */
export function deadlinePassed(iso: string, now = new Date()): boolean {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);
  return today > iso;
}
