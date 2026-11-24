import { capForDate, isBlackout } from "./batch";
import { formatDeadline } from "./deadline";

export interface PlanDay { date: string; label: string; planned: number; sent: number; state: "done" | "today" | "next" | "off" }
export interface Plan {
  days: PlanDay[];
  totals: { sent: number; toSend: number; waiting: number; held: number; all: number };
  finish: string | null;
  finishLabel: string | null;
  deadline: string | null;
  deadlineLabel: string | null;
  late: boolean;
  sending: boolean;
}

const addDay = (iso: string, n = 1) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const label = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(iso + "T00:00:00Z"));
export const pacificDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d);

/** The day by day sending plan: what went out on each past day and what is due on each day ahead. Pure. */
export function buildPlan(o: {
  rows: { status: string; sent_at: string | null }[];
  today: string;
  windowOpen: boolean; // false once today's sending hours are over
  cap: number;
  capDates?: string;
  blackout?: string;
  startOn?: string;
  deadline?: string;
  sending: boolean;
}): Plan {
  const sentBy = new Map<string, number>();
  const count: Record<string, number> = {};
  for (const r of o.rows) {
    count[r.status] = (count[r.status] ?? 0) + 1;
    if (r.status === "sent" && r.sent_at) { const d = pacificDate(new Date(r.sent_at)); sentBy.set(d, (sentBy.get(d) ?? 0) + 1); }
  }
  const capOn = (d: string) => (isBlackout(o.blackout, d) || (o.startOn && d < o.startOn) ? 0 : capForDate(o.cap, o.capDates, d));
  const days: PlanDay[] = [];
  const first = [...sentBy.keys()].sort()[0] ?? o.today;
  for (let d = first; d < o.today; d = addDay(d)) {
    const sent = sentBy.get(d) ?? 0;
    days.push({ date: d, label: label(d), planned: Math.max(capOn(d), sent), sent, state: sent === 0 && capOn(d) === 0 ? "off" : "done" });
  }
  let left = (count.approved ?? 0) + (count.sending ?? 0);
  let finish: string | null = null;
  for (let d = o.today, i = 0; i < 120 && (left > 0 || d === o.today); d = addDay(d), i++) {
    const sent = sentBy.get(d) ?? 0;
    const cap = capOn(d);
    const room = d === o.today && !o.windowOpen ? 0 : Math.max(0, cap - sent);
    const due = o.sending ? Math.min(room, left) : 0;
    left -= due;
    if (due > 0) finish = d;
    days.push({ date: d, label: label(d), planned: sent + due, sent, state: d === o.today ? "today" : cap === 0 ? "off" : "next" });
    if (!o.sending) break;
  }
  const dl = formatDeadline(o.deadline) ? (o.deadline as string) : null;
  return {
    days,
    totals: { sent: count.sent ?? 0, toSend: (count.approved ?? 0) + (count.sending ?? 0), waiting: count.pending_approval ?? 0, held: (count.held ?? 0) + (count.skipped ?? 0) + (count.failed ?? 0), all: o.rows.length },
    finish, finishLabel: finish ? label(finish) : null,
    deadline: dl, deadlineLabel: dl ? label(dl) : null,
    late: !!(finish && dl && finish > dl),
    sending: o.sending,
  };
}
