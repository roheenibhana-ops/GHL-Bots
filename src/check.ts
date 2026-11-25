import { normalizePhone } from "./safety";

export interface JClient {
  id: string;
  name: string;
  phones: { number: string; normalizedPhoneNumber?: string | null }[];
  quotes: { nodes: { quoteStatus: string; sentAt?: string | null; createdAt?: string | null; title?: string | null }[] };
  jobs: { totalCount: number; nodes?: { jobStatus: string; completedAt: string | null }[] };
  /** Work requests, like a Book Now form. A recent one means they have already put their hand up. */
  requests?: { nodes: { requestStatus: string; createdAt: string }[] };
}

/** A request made in the last 45 days that has not been closed off. */
export function recentRequests(c: JClient, now = Date.now()): number {
  return (c.requests?.nodes ?? []).filter((r) => r.requestStatus !== "archived" && now - new Date(r.createdAt).getTime() < 45 * 86_400_000).length;
}

/** A quote someone could still act on. archived and converted (already a job) are not "open". */
export const OPEN_QUOTE_STATUSES = ["draft", "awaiting_response", "changes_requested", "approved"];

/** An "awaiting response" quote can sit in Jobber for months after the deal is dead, so it only counts as active if it was sent recently. */
export const QUOTE_ACTIVE_DAYS = 30;

export function isActiveQuote(q: { quoteStatus: string; sentAt?: string | null; createdAt?: string | null }, now = Date.now()): boolean {
  if (!OPEN_QUOTE_STATUSES.includes(q.quoteStatus)) return false;
  if (q.quoteStatus !== "awaiting_response") return true; // draft, changes requested and approved are always live
  const when = q.sentAt ?? q.createdAt;
  if (!when) return true; // unknown age: stay safe and hold
  return now - new Date(when).getTime() <= QUOTE_ACTIVE_DAYS * 86_400_000;
}

/** Confirms matches by exact normalised phone (the search itself is fuzzy), then summarises their quotes and jobs. */
export const RECENT_JOB_DAYS = 90;

/** Jobs that should hold a campaign message: not finished yet, or finished within the last RECENT_JOB_DAYS days. Archived jobs don't count. */
export function recentOrActiveJobs(c: JClient, now = Date.now()): number {
  return (c.jobs.nodes ?? []).filter((j) => {
    // Jobber marks a finished, closed job as archived, so the completion date decides, not the status.
    if (j.completedAt) return now - new Date(j.completedAt).getTime() <= RECENT_JOB_DAYS * 86_400_000;
    return j.jobStatus !== "archived";
  }).length;
}

/** A quote for a cleaning that already exists in Jobber: still open, or approved or turned into a job in the last RECENT_JOB_DAYS days. */
export function isCleaningQuote(q: { quoteStatus: string; sentAt?: string | null; createdAt?: string | null; title?: string | null }, now = Date.now()): boolean {
  if (!/clean/i.test(q.title ?? "")) return false;
  if (q.quoteStatus === "archived") return false;
  if (isActiveQuote(q, now)) return true;
  const when = q.sentAt ?? q.createdAt;
  if (!when) return true;
  return now - new Date(when).getTime() <= RECENT_JOB_DAYS * 86_400_000;
}

export function assess(clients: JClient[], targetE164: string, now = Date.now()) {
  const matches = clients.filter((c) => c.phones.some((p) => normalizePhone(p.normalizedPhoneNumber || p.number) === targetE164));
  const quotes = matches.flatMap((c) => c.quotes.nodes);
  const statuses = quotes.map((q) => q.quoteStatus);
  return {
    found: matches.length > 0,
    clients: matches.length,
    openQuotes: quotes.filter((q) => isActiveQuote(q, now)).length,
    cleaningQuotes: quotes.filter((q) => isCleaningQuote(q, now)).length,
    staleQuotes: quotes.filter((q) => OPEN_QUOTE_STATUSES.includes(q.quoteStatus) && !isActiveQuote(q, now)).length,
    quoteStatuses: statuses,
    jobs: matches.reduce((n, c) => n + c.jobs.totalCount, 0),
    recentJobs: matches.reduce((n, c) => n + recentOrActiveJobs(c, now), 0),
    recentRequests: matches.reduce((n, c) => n + recentRequests(c, now), 0),
    name: matches[0]?.name,
  };
}
