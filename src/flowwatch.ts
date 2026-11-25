import { sb } from "./db";
import { FLOWS, STAGES, planClient, planJob, planNewLead, planQuoCall, planQuoMessage, planQuote, type JClientEvent, type JJob, type JQuote, type Person, type Plan } from "./flows";
import { credsFor, ghlRaw } from "./ghl";
import { gql } from "./jobber";
import { ghlOpportunities } from "./profile";
import { quoGet, quoKey, type QuoCall, type QuoMessage } from "./quo";
import type { Account, Env } from "./types";

/**
 * Watch mode for the flows. Every few minutes this looks at what has just happened in Jobber, GoHighLevel and Quo, the same
 * events the Zaps react to, and writes down what each flow WOULD do. It never changes anything in any of those systems.
 * A little later it looks at where the lead actually ended up, to see whether the Zap did the same thing.
 */
const ACCOUNTS: Account[] = ["dunzo", "lights"];
const QUO_LINE: Record<string, Account> = { PNoFRrHMiM: "dunzo", PN2d58Mbjk: "lights" };
interface State { since: string; jobs: Record<string, string> }

const C = "id firstName lastName jobberWebUri phones { number primary } emails { address primary }";
type JC = { id: string; firstName: string; lastName: string; phones?: { number: string; primary: boolean }[]; emails?: { address: string; primary: boolean }[]; billingAddress?: Addr | null };
type Addr = { street1?: string | null; city?: string | null; province?: string | null; postalCode?: string | null };
const addr = (a?: Addr | null) => (a ? [a.street1, a.city, a.province, a.postalCode].filter(Boolean).join(", ") : "");
const person = (c: JC | null | undefined, a?: Addr | null): Person => ({ name: [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim(), phone: c?.phones?.find((p) => p.primary)?.number ?? c?.phones?.[0]?.number ?? null, email: c?.emails?.find((e) => e.primary)?.address ?? c?.emails?.[0]?.address ?? null, address: addr(a) || null });

async function jobberPlans(env: Env, a: Account, st: State): Promise<Plan[]> {
  const since = st.since;
  const d = await gql<{
    quotes: { nodes: { id: string; quoteNumber: string; quoteStatus: string; sentAt: string | null; updatedAt: string; title: string | null; amounts: { total: number }; lineItems: { nodes: { name: string; description: string | null; totalPrice: number | null }[] }; client: JC | null; property: { address: Addr } | null }[] };
    jobs: { nodes: { id: string; jobNumber: number; jobStatus: string; createdAt: string; updatedAt: string; completedAt: string | null; startAt: string | null; total: number; client: JC; property: { address: Addr } | null }[] };
    clients: { nodes: (JC & { createdAt: string; updatedAt: string })[] };
  }>(env, a, `query($r: Iso8601DateTimeRangeInput!) {
    quotes(filter: { updatedAt: $r }, first: 40) { nodes { id quoteNumber quoteStatus sentAt updatedAt title amounts { total } lineItems(first: 8) { nodes { name description totalPrice } } client { ${C} } property { address { street1 city province postalCode } } } }
    jobs(sort: [{ key: UPDATED_AT, direction: DESCENDING }], first: 30) { nodes { id jobNumber jobStatus createdAt updatedAt completedAt startAt total client { ${C} } property { address { street1 city province postalCode } } } }
    clients(filter: { updatedAt: $r }, first: 50) { nodes { ${C} createdAt updatedAt billingAddress { street1 city province postalCode } } }
  }`, { r: { after: since } });
  const plans: Plan[] = [];
  for (const q of d.quotes.nodes) plans.push(...planQuote(a, { id: q.id, quoteNumber: q.quoteNumber, quoteStatus: q.quoteStatus, sentAt: q.sentAt, updatedAt: q.updatedAt, title: q.title, total: q.amounts?.total || q.lineItems.nodes.reduce((n, i) => n + (i.totalPrice ?? 0), 0), items: q.lineItems.nodes, person: person(q.client, q.property?.address) } satisfies JQuote, since));
  for (const j of d.jobs.nodes) {
    const k = `${a}:${j.id}`;
    const ev: JJob = { id: j.id, jobNumber: j.jobNumber, jobStatus: j.jobStatus, createdAt: j.createdAt, updatedAt: j.updatedAt, completedAt: j.completedAt, startAt: j.startAt, total: j.total, person: person(j.client, j.property?.address) };
    if (j.updatedAt > since || st.jobs[k] !== undefined) plans.push(...planJob(a, ev, since, st.jobs[k]));
    st.jobs[k] = j.jobStatus;
  }
  for (const c of d.clients.nodes) plans.push(...planClient(a, { id: c.id, createdAt: c.createdAt, updatedAt: c.updatedAt, person: person(c, c.billingAddress) } satisfies JClientEvent, since));
  return plans;
}

async function ghlPlans(env: Env, a: Account, since: string): Promise<Plan[]> {
  const creds = credsFor(env, a);
  const stageId = await newLeadStage(env, a);
  if (!stageId) return [];
  const d = await ghlRaw<{ opportunities?: { id: string; lastStageChangeAt?: string; updatedAt?: string; contact?: { name?: string; email?: string; phone?: string; tags?: string[] } }[] }>(creds, "GET", `/opportunities/search?location_id=${creds.locationId}&pipeline_id=${STAGES[a].pipeline}&pipeline_stage_id=${stageId}&limit=20`);
  return (d.opportunities ?? []).filter((o) => (o.lastStageChangeAt ?? o.updatedAt ?? "") > since).map((o) => planNewLead(a, { id: o.id, changedAt: o.lastStageChangeAt ?? o.updatedAt ?? since, person: { name: o.contact?.name ?? "", phone: o.contact?.phone, email: o.contact?.email }, tags: o.contact?.tags ?? [] }));
}

const stageCache = new Map<string, Record<string, string>>();
/** Stage names to ids for the company's main pipeline, read from GoHighLevel so nothing is hard coded wrongly. */
async function stageIds(env: Env, a: Account): Promise<Record<string, string>> {
  if (stageCache.has(a)) return stageCache.get(a)!;
  const creds = credsFor(env, a);
  const d = await ghlRaw<{ pipelines?: { id: string; stages?: { id: string; name: string }[] }[] }>(creds, "GET", `/opportunities/pipelines?locationId=${creds.locationId}`);
  const p = (d.pipelines ?? []).find((x) => x.id === STAGES[a].pipeline);
  const map = Object.fromEntries((p?.stages ?? []).map((s) => [s.name.trim().toLowerCase(), s.id]));
  stageCache.set(a, map);
  return map;
}
const newLeadStage = async (env: Env, a: Account) => (await stageIds(env, a))["new lead"];

async function quoPlans(env: Env, since: string): Promise<Plan[]> {
  if (!quoKey(env)) return [];
  const plans: Plan[] = [];
  const msgs = await quoGet<{ data: QuoMessage[] }>(env, "/messages", { "createdAt[gt]": since, limit: 50 });
  for (const m of msgs.data) {
    const a = QUO_LINE[m.phoneNumberId ?? ""];
    if (!a || !m.text?.trim()) continue;
    if (m.direction === "outgoing" && m.status && m.status !== "delivered" && m.status !== "sent") continue;
    plans.push(planQuoMessage(a, { id: m.id, direction: m.direction, text: m.text, other: m.direction === "outgoing" ? m.to?.[0] ?? "" : m.from, createdAt: m.createdAt }));
  }
  const calls = await quoGet<{ data: (QuoCall & { phoneNumberId?: string | null })[] }>(env, "/calls", { "createdAt[gte]": since, limit: 30 });
  for (const c of calls.data) {
    const a = QUO_LINE[c.phoneNumberId ?? ""];
    if (!a || c.duration < 20 || ["missed", "no-answer", "abandoned", "busy", "failed", "canceled"].includes(c.status)) continue;
    plans.push(planQuoCall(a, { id: c.id, other: c.participants?.map((p) => p.phoneNumber).find((n) => n) ?? "", duration: c.duration, createdAt: c.createdAt }));
  }
  return plans;
}

async function getState(env: Env): Promise<{ id: number | null; body: State }> {
  const rows = await sb<{ id: number; body: State }[]>(env, "GET", "library?kind=eq.flowstate&select=id,body&order=id.desc&limit=1");
  // The first look goes back two days, so there is something to see straight away.
  return rows[0] ? { id: rows[0].id, body: { since: rows[0].body.since, jobs: rows[0].body.jobs ?? {} } } : { id: null, body: { since: new Date(Date.now() - 2 * 86_400_000).toISOString(), jobs: {} } };
}

/** One look. Reads only. Returns how many new events were written down. */
export async function watchFlows(env: Env): Promise<{ seen: number; errors: string[]; since: string }> {
  if (env.FLOWS_WATCH === "off") return { seen: 0, errors: [], since: "" };
  const { id, body: st } = await getState(env);
  const started = new Date(Date.now() - 60_000).toISOString(); // a minute of overlap, so nothing slips between looks
  const plans: Plan[] = [];
  const errors: string[] = [];
  const tryIt = async (label: string, fn: () => Promise<Plan[]>) => { try { plans.push(...(await fn())); } catch (e) { errors.push(`${label}: ${(e as Error).message.slice(0, 160)}`); } };
  for (const a of ACCOUNTS) {
    await tryIt(`Jobber ${a}`, () => jobberPlans(env, a, st));
    await tryIt(`GoHighLevel ${a}`, () => ghlPlans(env, a, st.since));
  }
  await tryIt("Quo", () => quoPlans(env, st.since));
  let seen = 0;
  if (plans.length) {
    const rows = plans.map((p) => ({ flow: p.flow, account: p.account, key: p.key, subject: p.subject.slice(0, 120), summary: p.summary.slice(0, 200), plan: { steps: p.steps, stage: p.stage ?? null, at: p.at }, mode: "watch" }));
    const saved = await sb<{ id: number }[]>(env, "POST", "flow_runs?on_conflict=key", rows, "resolution=ignore-duplicates,return=representation").catch((e) => { errors.push("save: " + (e as Error).message.slice(0, 160)); return []; });
    seen = saved.length;
  }
  // Keep the job memory from growing for ever.
  const keys = Object.keys(st.jobs);
  if (keys.length > 400) for (const k of keys.slice(0, keys.length - 400)) delete st.jobs[k];
  const next: State = { since: errors.some((e) => e.startsWith("Jobber")) ? st.since : started, jobs: st.jobs };
  if (id) await sb(env, "PATCH", `library?id=eq.${id}`, { body: next }, "return=minimal");
  else await sb(env, "POST", "library", { company: "all", kind: "flowstate", body: next }, "return=minimal");
  return { seen, errors, since: st.since };
}

/**
 * Checks a few earlier events against reality: where is that lead in GoHighLevel now? If it is in the stage the flow planned,
 * the Zap and the flow agree. Reads only.
 */
export async function checkFlows(env: Env, max = 4): Promise<number> {
  const cutoff = new Date(Date.now() - 20 * 60_000).toISOString();
  const rows = await sb<{ id: number; flow: string; account: Account; subject: string; plan: { stage?: string | null } }[]>(env, "GET", `flow_runs?verdict=is.null&created_at=lt.${cutoff}&plan->>stage=not.is.null&flow=in.(quote_sent,quote_approved,job_created,job_schedule,archived_lost)&order=created_at.desc&limit=${max}`);
  let done = 0;
  for (const r of rows) {
    let verdict = "unknown", note = "";
    try {
      const creds = credsFor(env, r.account);
      const found = await ghlRaw<{ contacts?: { id: string }[] }>(creds, "POST", "/contacts/search", { locationId: creds.locationId, pageLimit: 1, page: 1, query: r.subject });
      const cid = found.contacts?.[0]?.id;
      if (!cid) { verdict = "unknown"; note = "No matching contact was found in GoHighLevel."; }
      else {
        const opps = await ghlOpportunities(creds, cid);
        const stages = opps.map((o) => String((o as { stage?: string }).stage ?? "")).filter(Boolean);
        const want = (r.plan.stage ?? "").toLowerCase();
        if (stages.some((s) => s.toLowerCase().startsWith(want.split(" ")[0]) && s.toLowerCase().includes(want.split(" ").slice(-1)[0]))) { verdict = "match"; note = `The lead is in ${stages[0]}, the same as the flow planned.`; }
        else if (stages.length) { verdict = "moved"; note = `The flow planned ${r.plan.stage}. The lead is now in ${stages.join(", ")}, which can simply mean it has moved on since.`; }
        else { verdict = "unknown"; note = "The contact has no open lead in GoHighLevel."; }
      }
    } catch (e) { note = (e as Error).message.slice(0, 160); }
    await sb(env, "PATCH", `flow_runs?id=eq.${r.id}`, { verdict, verdict_note: note }, "return=minimal").catch(() => undefined);
    done++;
  }
  return done;
}

/** For the dashboard: every flow with how much it has seen. */
export async function flowsOverview(env: Env) {
  const rows = await sb<{ flow: string; account: string; verdict: string | null; created_at: string }[]>(env, "GET", "flow_runs?select=flow,account,verdict,created_at&order=created_at.desc&limit=1000").catch(() => []);
  const st = await getState(env).catch(() => null);
  const by = new Map<string, { seen: number; match: number; checked: number; last: string | null }>();
  for (const r of rows) {
    const k = `${r.flow}:${r.account}`;
    const x = by.get(k) ?? { seen: 0, match: 0, checked: 0, last: null };
    x.seen++; if (r.verdict === "match") x.match++; if (r.verdict === "match" || r.verdict === "moved") x.checked++; x.last = x.last ?? r.created_at;
    by.set(k, x);
  }
  return { watching: env.FLOWS_WATCH !== "off", lastLook: st?.id ? st.body.since : null, flows: FLOWS.map((f) => ({ ...f, stats: by.get(`${f.key}:${f.account}`) ?? { seen: 0, match: 0, checked: 0, last: null } })) };
}

export const flowRuns = (env: Env, flow: string, account: string) => sb<{ id: number; subject: string; summary: string; plan: { steps: string[]; stage?: string | null; at?: string }; verdict: string | null; verdict_note: string | null; created_at: string }[]>(env, "GET", `flow_runs?flow=eq.${encodeURIComponent(flow)}&account=eq.${encodeURIComponent(account)}&select=id,subject,summary,plan,verdict,verdict_note,created_at&order=created_at.desc&limit=40`);
