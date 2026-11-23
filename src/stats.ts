import { gql } from "./jobber";
import { sb } from "./db";
import type { BotFacts } from "./bot";
import type { Env } from "./types";

export interface CampaignRows {
  outbound: { contact_id: string; status: string }[];
  inboundContacts: string[];
  conversations: { contact_id: string; status: string; facts: BotFacts | null }[];
  optedOut: string[];
  /** Jobber quote status by quote id (looked up separately). */
  quoteStatus: Record<string, string>;
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "n/a");

/** Turns the raw rows into the numbers we judge the pilot by. Pure, so it can be tested. */
export function summarize(r: CampaignRows) {
  const byStatus: Record<string, number> = {};
  for (const m of r.outbound) byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
  const sent = new Set(r.outbound.filter((m) => m.status === "sent").map((m) => m.contact_id));
  const inCampaign = (id: string) => sent.has(id);
  const replied = new Set(r.inboundContacts.filter(inCampaign));
  const convs = r.conversations.filter((c) => inCampaign(c.contact_id));
  const count = (f: (c: (typeof convs)[number]) => boolean) => convs.filter(f).length;
  const quoteIds = convs.map((c) => c.facts?.quoteId).filter((x): x is string => !!x);
  const jobber: Record<string, number> = {};
  for (const id of quoteIds) {
    const s = r.quoteStatus[id] ?? "unknown";
    jobber[s] = (jobber[s] ?? 0) + 1;
  }
  const approved = (jobber.approved ?? 0) + (jobber.converted ?? 0);
  const optedOut = r.optedOut.filter(inCampaign).length;
  return {
    texts: { sent: sent.size, ...byStatus },
    replies: { replied: replied.size, replyRate: pct(replied.size, sent.size) },
    funnel: {
      conversations: convs.length,
      chosenHomeSize: count((c) => !!c.facts?.stories),
      confirmedAddress: count((c) => !!c.facts?.addressConfirmed),
      gaveEmail: count((c) => !!c.facts?.email),
      quotesCreated: quoteIds.length,
      quotesApproved: approved,
      approvalRateOfReplies: pct(approved, replied.size),
    },
    outcomes: {
      handedToTeam: count((c) => c.status === "handed_off"),
      closed: count((c) => c.status === "closed"),
      stopRequests: optedOut,
    },
    jobberQuoteStatuses: jobber,
  };
}

/** Quote statuses straight from Jobber, 10 per request. Never throws. */
export async function quoteStatuses(env: Env, ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < ids.length; i += 10) {
      const batch = ids.slice(i, i + 10);
      const vars: Record<string, string> = {};
      const decl = batch.map((_, k) => `$q${k}: EncodedId!`).join(", ");
      const body = batch.map((id, k) => { vars[`q${k}`] = id; return `s${k}: quote(id: $q${k}) { quoteStatus }`; }).join("\n");
      const d = await gql<Record<string, { quoteStatus: string } | null>>(env, "dunzo", `query(${decl}) { ${body} }`, vars);
      batch.forEach((id, k) => { out[id] = d[`s${k}`]?.quoteStatus ?? "unknown"; });
    }
  } catch { /* leave unknowns */ }
  return out;
}

export async function buildStats(env: Env, campaign: string) {
  const enc = encodeURIComponent(campaign);
  const [outbound, inbound, conversations, optouts] = await Promise.all([
    sb<{ contact_id: string; status: string }[]>(env, "GET", `messages?campaign=eq.${enc}&direction=eq.outbound&select=contact_id,status&limit=1000`),
    sb<{ contact_id: string }[]>(env, "GET", "messages?campaign=eq.bot&direction=eq.inbound&select=contact_id&limit=1000"),
    sb<{ contact_id: string; status: string; facts: BotFacts | null }[]>(env, "GET", "conversations?select=contact_id,status,facts&limit=1000"),
    sb<{ contact_id: string }[]>(env, "GET", "optouts?select=contact_id&limit=1000"),
  ]);
  const ids = conversations.map((c) => c.facts?.quoteId).filter((x): x is string => !!x);
  const quoteStatus = ids.length ? await quoteStatuses(env, ids) : {};
  return { campaign, ...summarize({ outbound, inboundContacts: inbound.map((i) => i.contact_id), conversations, optedOut: optouts.map((o) => o.contact_id), quoteStatus }) };
}

/** A plain page that shows the numbers. The admin or test token is typed in and kept for the session only. */
export const STATS_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lead bot: results</title>
<style>body{font:15px system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#1a1a1a}
table{border-collapse:collapse;width:100%;margin:8px 0 18px}td,th{border-bottom:1px solid #e3e3e3;padding:6px 8px;text-align:left}th{font-size:12px;color:#666;text-transform:uppercase}
input{font:inherit;padding:6px 8px}button{font:inherit;padding:6px 14px;border-radius:8px;border:1px solid #999;background:#fff;cursor:pointer}#err{color:#b00;font-weight:600}</style></head><body>
<h2>Pilot results</h2>
<p><label>Token <input id="tok" type="password"></label> <label>Campaign <input id="camp" value="pilot-2"></label> <button id="go">Load</button></p>
<div id="err"></div><div id="out"></div>
<script>
var tok=document.getElementById('tok'),out=document.getElementById('out'),err=document.getElementById('err');
try{tok.value=sessionStorage.getItem('t')||''}catch(e){}
function sec(title,obj){var h=document.createElement('h3');h.textContent=title;out.appendChild(h);var t=document.createElement('table');
 Object.keys(obj).forEach(function(k){var r=t.insertRow();var a=r.insertCell();a.textContent=k;var b=r.insertCell();b.textContent=String(obj[k])});out.appendChild(t)}
document.getElementById('go').onclick=function(){out.textContent='';err.textContent='';try{sessionStorage.setItem('t',tok.value)}catch(e){}
 fetch('/admin/stats?campaign='+encodeURIComponent(document.getElementById('camp').value),{headers:{'Authorization':'Bearer '+tok.value}})
 .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||r.status);return j})})
 .then(function(j){sec('Texts',j.texts);sec('Replies',j.replies);sec('Funnel',j.funnel);sec('Outcomes',j.outcomes);sec('Jobber quote statuses',j.jobberQuoteStatuses)})
 .catch(function(e){err.textContent=e.message==='unauthorized'?'Wrong token.':'Something went wrong: '+e.message})};
</script></body></html>`;
