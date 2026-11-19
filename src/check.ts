import { normalizePhone } from "./safety";

export interface JClient {
  id: string;
  name: string;
  phones: { number: string; normalizedPhoneNumber?: string | null }[];
  quotes: { nodes: { quoteStatus: string }[] };
  jobs: { totalCount: number; nodes?: { jobStatus: string; completedAt: string | null }[] };
}

/** A quote someone could still act on. archived and converted (already a job) are not "open". */
export const OPEN_QUOTE_STATUSES = ["draft", "awaiting_response", "changes_requested", "approved"];

/** Confirms matches by exact normalised phone (the search itself is fuzzy), then summarises their quotes and jobs. */
export const RECENT_JOB_DAYS = 90;

/** Jobs that should hold a campaign message: not finished yet, or finished within the last RECENT_JOB_DAYS days. Archived jobs don't count. */
export function recentOrActiveJobs(c: JClient, now = Date.now()): number {
  return (c.jobs.nodes ?? []).filter((j) => {
    if (j.jobStatus === "archived") return false;
    if (!j.completedAt) return true;
    return now - new Date(j.completedAt).getTime() <= RECENT_JOB_DAYS * 86_400_000;
  }).length;
}

export function assess(clients: JClient[], targetE164: string, now = Date.now()) {
  const matches = clients.filter((c) => c.phones.some((p) => normalizePhone(p.normalizedPhoneNumber || p.number) === targetE164));
  const statuses = matches.flatMap((c) => c.quotes.nodes.map((q) => q.quoteStatus));
  return {
    found: matches.length > 0,
    clients: matches.length,
    openQuotes: statuses.filter((s) => OPEN_QUOTE_STATUSES.includes(s)).length,
    quoteStatuses: statuses,
    jobs: matches.reduce((n, c) => n + c.jobs.totalCount, 0),
    recentJobs: matches.reduce((n, c) => n + recentOrActiveJobs(c, now), 0),
    name: matches[0]?.name,
  };
}
