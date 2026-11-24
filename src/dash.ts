import { pacificMsSinceMidnight } from "./batch";
import { directorReport } from "./director";
import { systemPrompt, type BotFacts } from "./bot";
import { sb } from "./db";
import { addTags, credsFor, getContact, removeTags, sendSms } from "./ghl";
import { BUSINESS_KNOWLEDGE } from "./knowledge";
import { isSmsDnd } from "./safety";
import { effectiveValues, loadSettings, SETTINGS, saveSetting, validSetting } from "./settings";
import type { Account, Env } from "./types";

type Conv = { contact_id: string; account: Account; status: string; facts: (BotFacts & { lastAlertAt?: number; approvedAt?: string }) | null; updated_at: string };
type Msg = { contact_id: string; direction: "inbound" | "outbound"; status: string; campaign: string; body: string | null; created_at: string; contact_name?: string | null };

const json = (data: unknown, status = 200): Response => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** A plain label for how far a conversation has got. */
export function stageOf(c: Pick<Conv, "status" | "facts">): string {
  const f = c.facts ?? {};
  if (f.approvedAt) return "Approved";
  if (f.quoteId) return "Quote sent";
  if (c.status === "handed_off") return "With the team";
  if (c.status === "closed") return "Closed";
  if (f.email) return "Got email";
  if (f.addressConfirmed) return "Confirmed address";
  if (f.stories) return "Chose home size";
  return "Just started";
}

export interface InboxRow { contactId: string; name: string; account: Account; status: string; stage: string; waiting: boolean; last: string; lastAt: string; lastFrom: "inbound" | "outbound" }

/** Joins conversations with their latest message. Pure, so it can be tested. */
export function buildInbox(convs: Conv[], msgs: Msg[]): InboxRow[] {
  const latest = new Map<string, Msg>();
  for (const m of msgs) if (!latest.has(m.contact_id)) latest.set(m.contact_id, m); // msgs are newest first
  return convs.filter((c) => latest.has(c.contact_id)).map((c) => {
    const m = latest.get(c.contact_id);
    const waiting = !!m && m.direction === "inbound" && c.status !== "closed";
    return {
      contactId: c.contact_id,
      name: c.facts?.firstName || m?.contact_name || "Customer",
      account: c.account,
      status: c.status,
      stage: stageOf(c),
      waiting,
      last: (m?.body ?? "").slice(0, 140),
      lastAt: m?.created_at ?? c.updated_at,
      lastFrom: m?.direction ?? "outbound",
    };
  }).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}

const MATES = [
  { unit: "director", name: "Marketing Director", state: "planned", does: "The head of the company's marketing and sales. Sets the plan and budget, decides which campaigns run for each company, decides when to cross sell between them, reviews the numbers every week and reports to Clark. You approve anything that spends money or goes out to many people." },
  { unit: "dunzo", team: "Sales", name: "Promo Closer", state: "live", does: "Texts the winter cleaning offer, answers questions, handles objections, gets the address and email, creates the Jobber quote and sends the link." },
  { unit: "dunzo", team: "Sales", name: "Photos and Repairs", state: "live", does: "Asks for photos on repair requests, thanks them when photos arrive, moves a New Lead to Photos Received and alerts the team." },
  { unit: "dunzo", team: "Sales", name: "Hand off to the team", state: "live", does: "Passes anything it should not decide (windows pricing, angry customers, out of area) to a person, with an alert." },
  { unit: "dunzo", team: "Sales", name: "Quote Chaser", state: "planned", does: "A fresh follow up every morning on quotes that go quiet, stopping when they reply, approve, or say no." },
  { unit: "dunzo", team: "Sales", name: "Scheduler", state: "planned", does: "Books the job once the deposit is paid, using the Jobber calendar." },
  { unit: "dunzo", team: "Sales", name: "Big job booker", state: "planned", does: "Qualifies large jobs and books Clark on site with a short briefing note." },
  { unit: "dunzo", team: "Marketing", name: "After the job", state: "planned", does: "Thank you, review request and the 6 month rebooking reminder." },
  { unit: "dunzo", team: "Marketing", name: "Seasonal campaigns", state: "planned", does: "Storm season, leaf drop and spring campaigns to past customers and old leads." },
  { unit: "lights", team: "Sales", name: "Lights Sales and Design", state: "planned", does: "Christmas lighting enquiries, design, take off, quotes and follow up." },
  { unit: "lights", team: "Sales", name: "Permanent lighting", state: "planned", does: "Year round permanent lighting leads, scenes and pricing questions." },
  { unit: "lights", team: "Marketing", name: "Seasonal campaigns", state: "planned", does: "Early bird and last chance Christmas campaigns, plus holiday scenes through the year." },
  { unit: "lights", team: "Marketing", name: "Gallery and social", state: "planned", does: "Turns finished jobs into posts and gallery updates." },
  { unit: "shared", name: "Customer memory", state: "live", does: "One record of every customer across both companies: history, notes, quotes, what they were offered." },
  { unit: "shared", name: "Compliance", state: "live", does: "Opt outs, send hours, no double texting, quiet hours and alerts. Applies to everything every agent does." },
  { unit: "shared", name: "Reporting", state: "live", does: "The numbers on the Overview and Results pages, and later the daily report to Clark." },
  { unit: "shared", name: "Knowledge base", state: "live", does: "Everything from both websites that the agents are allowed to say, including approved prices and page links." },
];

/** All the dashboard's data and actions. Returns null when the path is not a dashboard path. */
export async function handleDash(req: Request, env: Env, url: URL): Promise<Response | null> {
  const p = url.pathname;
  if (!p.startsWith("/admin/dash/")) return null;
  const enc = encodeURIComponent;
  const acct = url.searchParams.get("account");
  const af = acct === "dunzo" || acct === "lights" ? "&account=eq." + acct : "";

  try {
    if (p === "/admin/dash/overview") {
      const { map, ready } = await loadSettings(env, true);
      const eff = effectiveValues(env, map);
      const dayStart = new Date(Date.now() - pacificMsSinceMidnight(new Date())).toISOString();
      const [convs, today, queue] = await Promise.all([
        sb<Conv[]>(env, "GET", "conversations?select=contact_id,account,status,facts,updated_at&order=updated_at.desc&limit=500" + af),
        sb<{ direction: string; status: string; campaign: string }[]>(env, "GET", `messages?created_at=gte.${dayStart}&status=neq.archived&select=direction,status,campaign&limit=2000${af}`),
        sb<{ status: string }[]>(env, "GET", `messages?campaign=eq.${enc(eff.BATCH_CAMPAIGN)}&select=status&limit=3000${af}`),
      ]);
      const byStatus: Record<string, number> = {};
      for (const c of convs) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      const q: Record<string, number> = {};
      for (const m of queue) q[m.status] = (q[m.status] ?? 0) + 1;
      const quotes = convs.filter((c) => c.facts?.quoteId).length;
      const approved = convs.filter((c) => c.facts?.approvedAt).length;
      return json({
        settingsReady: ready,
        settings: eff,
        today: {
          textsSent: today.filter((m) => m.direction === "outbound" && m.status === "sent").length,
          replies: today.filter((m) => m.direction === "inbound").length,
          promoSent: today.filter((m) => m.campaign === eff.BATCH_CAMPAIGN && m.status === "sent").length,
        },
        conversations: { total: convs.length, active: byStatus.active ?? 0, withTeam: byStatus.handed_off ?? 0, closed: byStatus.closed ?? 0, quotes, approved },
        queue: { waiting: q.pending_approval ?? 0, approved: q.approved ?? 0, sent: q.sent ?? 0, held: q.held ?? 0, failed: q.failed ?? 0, skipped: q.skipped ?? 0 },
      });
    }

    if (p === "/admin/dash/inbox") {
      const [convs, msgs] = await Promise.all([
        sb<Conv[]>(env, "GET", "conversations?select=contact_id,account,status,facts,updated_at&order=updated_at.desc&limit=300" + af),
        sb<Msg[]>(env, "GET", "messages?status=in.(sent,received,queued_hours)&direction=in.(inbound,outbound)&order=created_at.desc&limit=900&select=contact_id,direction,status,campaign,body,created_at,contact_name" + af),
      ]);
      return json({ rows: buildInbox(convs, msgs) });
    }

    if (p === "/admin/dash/conversation") {
      const id = url.searchParams.get("contactId") ?? "";
      const [msgs, [conv]] = await Promise.all([
        sb<Msg[]>(env, "GET", `messages?contact_id=eq.${enc(id)}&status=in.(sent,received,queued_hours,pending_approval,failed)&order=created_at.asc&limit=120&select=contact_id,direction,status,campaign,body,created_at`),
        sb<Conv[]>(env, "GET", `conversations?contact_id=eq.${enc(id)}&select=contact_id,account,status,facts,updated_at&limit=1`),
      ]);
      const account: Account = conv?.account ?? "dunzo";
      let contact: Record<string, unknown> = {};
      try {
        const c = await getContact(credsFor(env, account), id);
        contact = { name: [c.firstName, c.lastName].filter(Boolean).join(" "), phone: c.phone, email: c.email, tags: c.tags ?? [], dnd: isSmsDnd(c) };
      } catch { /* the chat still shows without the contact card */ }
      const f = conv?.facts ?? {};
      return json({
        account, status: conv?.status ?? "none", stage: conv ? stageOf(conv) : "No conversation", contact, messages: msgs,
        known: { homeSize: f.stories ? f.stories + " story" : null, address: f.address ? [f.address.street1, f.address.city].filter(Boolean).join(", ") : null, email: f.email ?? null, quoteNumber: f.quoteNumber ?? null },
        background: f.profile ?? null,
      });
    }

    if (p === "/admin/dash/contact-action" && req.method === "POST") {
      const b = (await req.json()) as { contactId?: string; action?: string };
      if (!b.contactId) return json({ error: "contactId needed" }, 400);
      const [conv] = await sb<Conv[]>(env, "GET", `conversations?contact_id=eq.${enc(b.contactId)}&select=contact_id,account,status,facts,updated_at&limit=1`);
      const creds = credsFor(env, conv?.account ?? "dunzo");
      const setStatus = (status: string) => sb(env, "PATCH", `conversations?contact_id=eq.${enc(b.contactId!)}`, { status, updated_at: new Date().toISOString() }, "return=minimal");
      if (b.action === "pause") { await addTags(creds, b.contactId, ["bot-paused"]); return json({ ok: true }); }
      if (b.action === "resume") { await removeTags(creds, b.contactId, ["bot-paused", "bot-needs-human"]).catch(() => undefined); await setStatus("active"); return json({ ok: true }); }
      if (b.action === "handled") { await setStatus("closed"); return json({ ok: true }); }
      return json({ error: "unknown action" }, 400);
    }

    if (p === "/admin/dash/send" && req.method === "POST") {
      const b = (await req.json()) as { contactId?: string; message?: string };
      const message = (b.message ?? "").trim();
      if (!b.contactId || !message || message.length > 600) return json({ error: "A contact and a message under 600 characters are needed" }, 400);
      const [conv] = await sb<Conv[]>(env, "GET", `conversations?contact_id=eq.${enc(b.contactId)}&select=contact_id,account,status,facts,updated_at&limit=1`);
      const account: Account = conv?.account ?? "dunzo";
      const creds = credsFor(env, account);
      const c = await getContact(creds, b.contactId);
      if (isSmsDnd(c)) return json({ error: "That customer opted out of texts. Not sending." }, 409);
      await sendSms(creds, b.contactId, message);
      await sb(env, "POST", "messages", { account, contact_id: b.contactId, direction: "outbound", body: message, status: "sent", campaign: "human", sent_at: new Date().toISOString() }, "return=minimal");
      // A person has joined in: the bot stays quiet on this customer until someone resumes it.
      await addTags(creds, b.contactId, ["bot-paused"]).catch(() => undefined);
      if (conv) await sb(env, "PATCH", `conversations?contact_id=eq.${enc(b.contactId)}`, { status: "handed_off", updated_at: new Date().toISOString() }, "return=minimal");
      return json({ ok: true });
    }

    if (p === "/admin/dash/settings") {
      if (req.method === "POST") {
        const b = (await req.json()) as { key?: string; value?: string };
        const bad = validSetting(b.key ?? "", String(b.value ?? ""));
        if (bad) return json({ error: bad }, 400);
        const { ready, error } = await loadSettings(env, true);
        if (!ready) return json({ error: "Settings could not be saved: " + (error ?? "table not found") }, 409);
        await saveSetting(env, b.key!, String(b.value));
      }
      const { map, ready, error } = await loadSettings(env, true);
      return json({ ready, error, defs: SETTINGS, values: effectiveValues(env, map) });
    }

    if (p === "/admin/dash/activity") {
      const rows = await sb<Msg[]>(env, "GET", "messages?status=in.(sent,received)&order=created_at.desc&limit=40&select=contact_id,direction,status,campaign,body,created_at,contact_name" + af);
      return json({ rows: rows.map((m) => ({ ...m, body: (m.body ?? "").slice(0, 160) })) });
    }

    if (p === "/admin/dash/director") {
      const r = await directorReport(env, acct === "dunzo" || acct === "lights" ? acct : null);
      return json(r);
    }

    if (p === "/admin/dash/agents") {
      return json({ mates: MATES, prompt: systemPrompt({ firstName: "Customer" } as BotFacts), knowledge: BUSINESS_KNOWLEDGE });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}
