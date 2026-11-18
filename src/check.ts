import { normalizePhone } from "./safety";

export interface JClient {
  id: string;
  name: string;
  phones: { number: string; normalizedPhoneNumber?: string | null }[];
  quotes: { nodes: { quoteStatus: string }[] };
  jobs: { totalCount: number };
}

/** A quote someone could still act on. archived and converted (already a job) are not "open". */
export const OPEN_QUOTE_STATUSES = ["draft", "awaiting_response", "changes_requested", "approved"];

/** Confirms matches by exact normalised phone (the search itself is fuzzy), then summarises their quotes and jobs. */
export function assess(clients: JClient[], targetE164: string) {
  const matches = clients.filter((c) => c.phones.some((p) => normalizePhone(p.normalizedPhoneNumber || p.number) === targetE164));
  const statuses = matches.flatMap((c) => c.quotes.nodes.map((q) => q.quoteStatus));
  return {
    found: matches.length > 0,
    clients: matches.length,
    openQuotes: statuses.filter((s) => OPEN_QUOTE_STATUSES.includes(s)).length,
    quoteStatuses: statuses,
    jobs: matches.reduce((n, c) => n + c.jobs.totalCount, 0),
    name: matches[0]?.name,
  };
}
