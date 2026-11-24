import { pacificMsSinceMidnight } from "./batch";
import { directorReport } from "./director";
import { clearAgentCache, DEFAULTS, DIAL_DEFS, EDITABLE_AGENTS, loadAgent, type Dials } from "./playbook";
import { runPack } from "./testpack";
import { LANES, ROADMAP, TOOLS } from "./roadmap";
import { draftContent } from "./content";
import { coachHistory, coachMerge, coachReview } from "./coach";
import { DASH_CAMPAIGN, writeFollowUp } from "./chaser";
import { runAgent } from "./agents";
import { systemPrompt, type BotFacts } from "./bot";
import { sb, sbAll } from "./db";
import { addTags, credsFor, getContact, getPipelines, removeTags, sendSms } from "./ghl";
import { gql } from "./jobber";
import { BUSINESS_KNOWLEDGE } from "./knowledge";
import { isSmsDnd } from "./safety";
import { effectiveValues, loadSettings, SETTINGS, saveSetting, validSetting } from "./settings";
import type { Account, Env } from "./types";

type Conv = { contact_id: string; account: Account; status: string; facts: (BotFacts & { lastAlertAt?: number; approvedAt?: string }) | null; updated_at: string };
type Msg = { contact_id: string; direction: "inbound" | "outbound"; status: string; campaign: string; body: string | null; created_at: string; sent_at?: string | null; contact_name?: string | null };

type AgentRow = { id: string; status: string; instructions: string; dials: Dials | null; note: string | null; created_at: string; published_at: string | null };

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
  // A promo is drafted days before it is sent, so go by when it actually went out.
  const at = (m: Msg) => m.sent_at ?? m.created_at;
  for (const m of msgs) { const cur = latest.get(m.contact_id); if (!cur || at(m) > at(cur)) latest.set(m.contact_id, m); }
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
      lastAt: (m ? at(m) : null) ?? c.updated_at,
      lastFrom: m?.direction ?? "outbound",
    };
  }).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}

const MATES = [
  { unit: "director", agent: "maverick", emoji: "🦅", name: "Maverick", role: "Sales and Marketing Director", state: "live", does: "Heads the whole marketing and sales department across both companies. Reads the week's numbers, tells Clark what is working and what is not, and sets the plan: which campaigns to run, when to cross sell, what each writer should focus on. Anything that spends money or goes out to many people waits for your approval." },
  { unit: "dunzo", team: "Sales", agent: "gus", emoji: "🧢", name: "Gus", role: "Promo Closer", state: "live", does: "Texts the winter cleaning offer, answers questions, works objections, gets the address and email, creates the Jobber quote and sends the link. Funny, quick and honest." },
  { unit: "dunzo", team: "Sales", emoji: "📸", name: "Flash", role: "Photos and Repairs", state: "live", does: "Asks for photos on repair requests, thanks customers when they arrive, moves a New Lead to Photos Received and alerts the team." },
  { unit: "dunzo", team: "Sales", emoji: "🤝", name: "Relay", role: "Hand off to the team", state: "live", does: "Passes anything it should not decide to a person, with an alert: windows pricing, angry customers, out of area, Lights interest." },
  { unit: "dunzo", team: "Sales", agent: "dash", emoji: "🏃", name: "Dash", role: "Quote Chaser", state: "live", does: "Follows up with people who have gone quiet: one nudge to anyone who never answered the offer, and up to two to anyone sitting on a quote. Every message is fresh and adds something new. Stops the moment they reply, approve, or say no. Off until you switch him on in Settings, and his messages wait for your approval at first." },
  { unit: "dunzo", team: "Sales", emoji: "📅", name: "Cal", role: "Scheduler", state: "planned", does: "Books the job once the deposit is paid, using the Jobber calendar." },
  { unit: "dunzo", team: "Sales", emoji: "🏔️", name: "Summit", role: "Big job booker", state: "planned", does: "Qualifies large jobs and books Clark on site with a short briefing note." },
  { unit: "dunzo", team: "Marketing", agent: "scoop", kind: "newsletter", emoji: "📰", name: "Scoop", role: "Weekly newsletter", state: "external", does: "The weekly Dunzo Gutters newsletter is written by your own Claude on a schedule, so Scoop is not needed for that. Still here if you ever want a one off draft." },
  { unit: "dunzo", team: "Marketing", agent: "chirp", kind: "social", emoji: "🐦", name: "Chirp", role: "Social posts", state: "live", does: "Writes the week's Facebook and Instagram posts for Dunzo, with photo ideas and local hashtags. Drafts only." },
  { unit: "dunzo", team: "Marketing", emoji: "☀️", name: "Sunny", role: "Reviews and referrals", state: "planned", does: "After the job: a thank you, the review request, the referral ask, and the 6 month rebooking reminder." },
  { unit: "dunzo", team: "Marketing", emoji: "⛈️", name: "Stormy", role: "Seasonal campaigns", state: "planned", does: "Storm season, leaf drop and spring campaigns to past customers and old leads." },
  { unit: "dunzo", team: "Marketing", emoji: "🔦", name: "Beacon", role: "Ads", state: "planned", does: "Google and Facebook ad ideas and copy for Dunzo, judged on sold jobs, not clicks." },
  { unit: "dunzo", team: "Marketing", agent: "quill", kind: "blog", emoji: "✍️", name: "Quill", role: "SEO Analyst", state: "external", does: "Dunzo's SEO analyst. Your own Claude setup writes and publishes the blogs, so Quill does not write them. Next up: answering where SEO is at, with rankings, clicks and gaps from Google Search Console. Can still write a one off draft." },
  { unit: "dunzo", team: "Marketing", agent: "pin", kind: "gmb", emoji: "📍", name: "Pin", role: "Google Business posts", state: "live", does: "Writes the week's Google Business Profile posts for Dunzo: short, local, with a photo idea and a button. Drafts only." },
  { unit: "dunzo", team: "Marketing", emoji: "📷", name: "Shutter", role: "Gallery and content", state: "planned", does: "Turns finished gutter jobs into before and after galleries, photos and video ideas." },
  { unit: "lights", team: "Sales", emoji: "🎄", name: "Tinsel", role: "Lights Sales and Design", state: "planned", does: "The star of the team. Christmas lighting design, take off, quotes and follow up." },
  { unit: "lights", team: "Sales", emoji: "💡", name: "Pixel", role: "Permanent lighting", state: "planned", does: "Year round permanent smart lighting: scenes, the app, pricing and booking." },
  { unit: "lights", team: "Sales", emoji: "🔴", name: "Rudolph", role: "Lights Concierge", state: "planned", does: "Greets every Lights lead first, finds out what they want, and hands them to the right person. Guided by the nose." },
  { unit: "lights", team: "Sales", emoji: "💨", name: "Dasher", role: "Lights Quote Chaser", state: "planned", does: "Follows up fast on Lights quotes that go quiet, with a fresh message each time." },
  { unit: "lights", team: "Sales", emoji: "💃", name: "Dancer", role: "Commercial and events", state: "planned", does: "HOA, commercial, bistro and event lighting enquiries." },
  { unit: "lights", team: "Sales", emoji: "✨", name: "Prancer", role: "Install planning", state: "planned", does: "Books the install week once the deposit is in, with the right crew and the right takedown date." },
  { unit: "lights", team: "Sales", emoji: "🌩️", name: "Blitzen", role: "Service calls", state: "planned", does: "A light went out? Takes the call or text, tells the crew, and gets it fixed within one business day." },
  { unit: "lights", team: "Marketing", agent: "comet", kind: "newsletter", emoji: "☄️", name: "Comet", role: "Weekly newsletter", state: "external", does: "The weekly Santa's Lights newsletter is written by your own Claude on a schedule, so Comet is not needed for that. Still here if you ever want a one off draft." },
  { unit: "lights", team: "Marketing", agent: "vixen", kind: "social", emoji: "🦊", name: "Vixen", role: "Social posts", state: "live", does: "Writes the week's Facebook and Instagram posts for Santa's Lights, with photo ideas and hashtags. Drafts only." },
  { unit: "lights", team: "Marketing", emoji: "💘", name: "Cupid", role: "Reviews and referrals", state: "planned", does: "Asks happy customers for reviews and referrals." },
  { unit: "lights", team: "Marketing", emoji: "❄️", name: "Frosty", role: "Seasonal campaigns", state: "planned", does: "Early bird and last chance Christmas campaigns, plus holiday scenes through the year." },
  { unit: "lights", team: "Marketing", emoji: "⚡", name: "Donner", role: "Ads", state: "planned", does: "Google and Facebook ad ideas and copy for Santa's Lights, judged on sold jobs, not clicks." },
  { unit: "lights", team: "Marketing", agent: "holly", kind: "blog", emoji: "🌿", name: "Holly", role: "SEO Analyst", state: "external", does: "Santa's Lights SEO analyst. Your own Claude setup writes and publishes the blogs, so Holly does not write them. Next up: answering where SEO is at, with rankings, clicks and gaps from Google Search Console. Can still write a one off draft." },
  { unit: "lights", team: "Marketing", agent: "north", kind: "gmb", emoji: "⭐", name: "North", role: "Google Business posts", state: "live", does: "Writes the week's Google Business Profile posts for Santa's Lights. Drafts only." },
  { unit: "lights", team: "Marketing", emoji: "📷", name: "Snap", role: "Gallery and content", state: "planned", does: "Turns finished lighting jobs into gallery entries, photos and video ideas." },
  { unit: "shared", emoji: "🎓", name: "Mentor", role: "Teaches every agent", state: "live", does: "Reads real conversations, compares what won with what lost, and suggests specific changes for you to approve in the studio. Has had a head start from your GHL history. Open Gus and choose the Mentor tab to use him." },
  { unit: "shared", emoji: "🐘", name: "Memo", role: "Customer memory", state: "live", does: "One record of every customer across both companies: history, notes, quotes, what they were offered. Never forgets." },
  { unit: "shared", emoji: "🛡️", name: "Sheriff", role: "Compliance", state: "live", does: "Opt outs, send hours, no double texting, quiet hours and alerts. Applies to everything every agent does, and nobody can talk it out of it." },
  { unit: "shared", emoji: "📊", name: "Tally", role: "Reporting", state: "live", does: "The numbers on the Overview and Results pages." },
  { unit: "shared", emoji: "📚", name: "Sage", role: "Knowledge base", state: "live", does: "Everything from both websites that the agents are allowed to say, including approved prices and page links." },
];

const SAFETY_RULES = [
  "A STOP, unsubscribe or take me off is always obeyed first, and it applies to both companies.",
  "Texts only go out between your set hours (8am to 8pm Pacific by default).",
  "The agent can only state prices that are in its knowledge. Anything else is blocked and rewritten.",
  "It can only share links from the approved list of pages. Any other link is blocked.",
  "It never promises a specific day or time for the work.",
  "It never denies being automated if someone sincerely asks, and it never claims to be Clark.",
  "Anyone sensitive, upset or asking for a person is handed to the team.",
  "Notes and alerts for the team are never sent to customers.",
  "The house voice: every agent talks like a mate, names what the customer shared, takes their side, and offers a phone call to anyone who finds texting or apps hard.",
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
        sb<{ direction: string; status: string; campaign: string }[]>(env, "GET", `messages?or=(created_at.gte.${dayStart},sent_at.gte.${dayStart})&status=neq.archived&select=direction,status,campaign&limit=2000${af}`),
        sbAll<{ status: string }>(env, `messages?campaign=eq.${enc(eff.BATCH_CAMPAIGN)}&select=status&order=id.asc${af}`),
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
        sb<Msg[]>(env, "GET", "messages?status=in.(sent,received,queued_hours)&direction=in.(inbound,outbound)&order=created_at.desc&limit=900&select=contact_id,direction,status,campaign,body,created_at,sent_at,contact_name" + af),
      ]);
      return json({ rows: buildInbox(convs, msgs) });
    }

    if (p === "/admin/dash/conversation") {
      const id = url.searchParams.get("contactId") ?? "";
      const [msgs, [conv]] = await Promise.all([
        sb<Msg[]>(env, "GET", `messages?contact_id=eq.${enc(id)}&status=in.(sent,received,queued_hours,pending_approval,failed)&order=created_at.asc&limit=120&select=contact_id,direction,status,campaign,body,created_at,sent_at`),
        sb<Conv[]>(env, "GET", `conversations?contact_id=eq.${enc(id)}&select=contact_id,account,status,facts,updated_at&limit=1`),
      ]);
      const account: Account = conv?.account ?? "dunzo";
      let contact: Record<string, unknown> = {};
      try {
        const c = await getContact(credsFor(env, account), id);
        contact = { name: [c.firstName, c.lastName].filter(Boolean).join(" "), phone: c.phone, email: c.email, tags: c.tags ?? [], dnd: isSmsDnd(c), owner: c.assignedTo ?? null };
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

    if (p === "/admin/dash/plan") {
      const { map } = await loadSettings(env);
      const eff = effectiveValues(env, map);
      const { buildPlan, pacificDate } = await import("./plan");
      const rows = await sbAll<{ status: string; sent_at: string | null }>(env, `messages?campaign=eq.${enc(eff.BATCH_CAMPAIGN)}&direction=eq.outbound&select=status,sent_at&order=id.asc`);
      const now = new Date();
      const hour = pacificMsSinceMidnight(now) / 3_600_000;
      return json({ campaign: eff.BATCH_CAMPAIGN, ...buildPlan({
        rows, today: pacificDate(now), windowOpen: hour < Number(eff.WINDOW_END),
        cap: Number(eff.DAILY_CAP), capDates: eff.DAILY_CAP_DATES, blackout: eff.BLACKOUT_DATES, startOn: eff.START_ON, deadline: eff.PROMO_DEADLINE,
        sending: eff.PAUSE_ALL !== "true" && eff.SENDING_ENABLED === "true",
      }) });
    }

    if (p === "/admin/dash/activity") {
      const rows = await sb<Msg[]>(env, "GET", "messages?status=in.(sent,received)&order=created_at.desc&limit=40&select=contact_id,direction,status,campaign,body,created_at,sent_at,contact_name" + af);
      return json({ rows: rows.map((m) => ({ ...m, body: (m.body ?? "").slice(0, 160) })) });
    }


    // ---------- Agent Studio ----------
    if (p === "/admin/dash/agent") {
      const key = url.searchParams.get("agent") ?? "";
      if (!EDITABLE_AGENTS.includes(key)) return json({ error: "That agent is not editable yet" }, 404);
      let rows: AgentRow[] = []; let ready = true; let error: string | undefined;
      try { rows = await sb<AgentRow[]>(env, "GET", `agent_versions?agent=eq.${enc(key)}&order=created_at.asc&select=id,status,instructions,dials,note,created_at,published_at&limit=200`); }
      catch (e) { ready = false; error = (e as Error).message.slice(0, 200); }
      const published = [...rows].reverse().find((r) => r.status === "published");
      const draft = rows.find((r) => r.status === "draft");
      return json({
        agent: key, ready, error, defaultInstructions: DEFAULTS[key], dialDefs: DIAL_DEFS, safety: SAFETY_RULES,
        published: published ? { id: published.id, instructions: published.instructions, dials: published.dials ?? {}, n: rows.indexOf(published) + 1 } : null,
        draft: draft ? { id: draft.id, instructions: draft.instructions, dials: draft.dials ?? {}, savedAt: draft.created_at } : null,
        versions: rows.filter((r) => r.status !== "draft").map((r) => ({ id: r.id, n: rows.indexOf(r) + 1, status: r.status, note: r.note, createdAt: r.created_at, publishedAt: r.published_at })).reverse(),
      });
    }

    if (p === "/admin/dash/agent-version") {
      const id = url.searchParams.get("id") ?? "";
      const [r] = await sb<AgentRow[]>(env, "GET", `agent_versions?id=eq.${enc(id)}&select=id,status,instructions,dials,note&limit=1`);
      return r ? json(r) : json({ error: "not found" }, 404);
    }

    if (p === "/admin/dash/agent-save" && req.method === "POST") {
      const b = (await req.json()) as { agent?: string; instructions?: string; dials?: Dials; note?: string };
      const key = b.agent ?? "";
      if (!EDITABLE_AGENTS.includes(key)) return json({ error: "That agent is not editable yet" }, 400);
      const text = (b.instructions ?? "").trim();
      if (text.length < 40 || text.length > 24000) return json({ error: "The instructions must be between 40 and 24000 characters" }, 400);
      const [existing] = await sb<AgentRow[]>(env, "GET", `agent_versions?agent=eq.${enc(key)}&status=eq.draft&select=id&limit=1`);
      const dialsIn = { ...(b.dials ?? {}) } as Dials;
      if (dialsIn.reference) dialsIn.reference = dialsIn.reference.slice(0, 12000);
      const body = { agent: key, status: "draft", instructions: text, dials: dialsIn, note: (b.note ?? "").slice(0, 200) };
      if (existing) await sb(env, "PATCH", `agent_versions?id=eq.${existing.id}`, { ...body, created_at: new Date().toISOString() }, "return=minimal");
      else await sb(env, "POST", "agent_versions", body, "return=minimal");
      // Read it back: only say saved if the database really holds it.
      const [back] = await sb<AgentRow[]>(env, "GET", `agent_versions?agent=eq.${enc(key)}&status=eq.draft&select=id,instructions&limit=1`);
      return json({ confirmed: !!back && back.instructions === text, id: back?.id });
    }

    if (p === "/admin/dash/agent-publish" && req.method === "POST") {
      const b = (await req.json()) as { agent?: string; id?: string };
      const key = b.agent ?? "";
      if (!EDITABLE_AGENTS.includes(key) || !b.id) return json({ error: "Unknown agent or version" }, 400);
      const [target] = await sb<AgentRow[]>(env, "GET", `agent_versions?id=eq.${enc(b.id)}&agent=eq.${enc(key)}&select=id,status,instructions&limit=1`);
      if (!target) return json({ error: "That version was not found" }, 404);
      await sb(env, "PATCH", `agent_versions?agent=eq.${enc(key)}&status=eq.published`, { status: "archived" }, "return=minimal");
      await sb(env, "PATCH", `agent_versions?id=eq.${enc(b.id)}`, { status: "published", published_at: new Date().toISOString() }, "return=minimal");
      clearAgentCache();
      const live = await loadAgent(env, key, true);
      return json({ confirmed: live.version === b.id });
    }

    if (p === "/admin/dash/agent-edit" && req.method === "POST") {
      const b = (await req.json()) as { agent?: string; request?: string; instructions?: string };
      const key = b.agent ?? "";
      if (!EDITABLE_AGENTS.includes(key) || !(b.request ?? "").trim() || !(b.instructions ?? "").trim()) return json({ error: "An agent, a request and the current instructions are needed" }, 400);
      const system = "You edit the instructions of a sales text agent. You are given its CURRENT instructions and a plain English REQUEST from the owner. Apply the request faithfully. Rules: keep every part the request does not touch exactly as it is; write instructions as guidance and principles, never as sample lines the agent could copy word for word; never add anything that tells the agent to promise dates, invent prices, hide that it is automated, ignore STOP, or pressure someone who has said no (the owner cannot ask for that, and those rules are enforced elsewhere); keep the same plain style. Reply in exactly this format. First line: SUMMARY: one plain sentence describing what you changed. Then a line containing only ---. Then the complete revised instructions and nothing else.";
      const raw = await runAgent(env, { name: "studio", system, maxTokens: 4500, model: env.BOT_MODEL }, [{ role: "user", content: "CURRENT INSTRUCTIONS:\n" + b.instructions + "\n\nREQUEST:\n" + b.request }]);
      const head = raw.match(/^\s*SUMMARY:\s*([^\n]*)\n([\s\S]*)$/);
      const m = head ? [head[0], head[1], head[2].replace(/^\s*-{3,}\s*\n/, "").trim()] : null;
      if (!m || m[2].trim().length < 40) return json({ error: "The builder did not return usable instructions, so nothing was changed. Try rewording the request.", debug: { start: raw.slice(0, 160), end: raw.slice(-160), chars: raw.length } }, 502);
      return json({ summary: m[1].trim(), instructions: m[2].trim() });
    }

    if (p === "/admin/dash/agent-testpack" && req.method === "POST") {
      const b = (await req.json()) as { agent?: string; instructions?: string; dials?: Dials };
      if (b.agent !== "gus") return json({ error: "The test pack is for Gus. Use the sample report for Maverick." }, 400);
      const live = await loadAgent(env, "gus", true);
      const draft = { instructions: (b.instructions ?? "").trim() || live.instructions, dials: b.dials ?? {} };
      return json({ results: await runPack(env, { instructions: live.instructions, dials: live.dials }, draft) });
    }

    if (p === "/admin/dash/content-draft" && req.method === "POST") {
      const b = (await req.json()) as { agent?: string; instructions?: string; dials?: Dials };
      const key = b.agent ?? "";
      const base = await loadAgent(env, key);
      return json(await draftContent(env, key, { instructions: (b.instructions ?? "").trim() || base.instructions, dials: b.dials ?? base.dials }));
    }

    if (p === "/admin/dash/agent-sample" && req.method === "POST") {
      const b = (await req.json()) as { instructions?: string; dials?: Dials };
      const r = await directorReport(env, acct === "dunzo" || acct === "lights" ? acct : null, { instructions: (b.instructions ?? "").trim() || DEFAULTS.maverick, dials: b.dials ?? {} });
      return json(r);
    }

    if (p === "/admin/dash/systems") {
      const check = async (fn: () => Promise<unknown>): Promise<string> => { try { await fn(); return "ok"; } catch (e) { return "error: " + (e as Error).message.slice(0, 90); } };
      const [ghlDunzo, ghlLights, jobberDunzo, jobberLights, database] = await Promise.all([
        check(() => getPipelines(credsFor(env, "dunzo"))),
        check(() => getPipelines(credsFor(env, "lights"))),
        check(() => gql(env, "dunzo", "{ account { name } }")),
        check(() => gql(env, "lights", "{ account { name } }")),
        check(() => sb(env, "GET", "settings?select=key&limit=1")),
      ]);
      return json({ checks: { ghlDunzo, ghlLights, jobberDunzo, jobberLights, database } });
    }

    if (p === "/admin/dash/agent-coach") return json(await coachReview(env));
    if (p === "/admin/dash/agent-coach-history") return json(await coachHistory(env, Number(url.searchParams.get("before") ?? 0) || undefined));
    if (p === "/admin/dash/agent-coach-merge" && req.method === "POST") {
      const b = (await req.json()) as { batches?: never[]; total?: number };
      return json(await coachMerge(env, b.batches ?? [], Number(b.total ?? 0)));
    }

    if (p === "/admin/dash/sent") {
      const camp = url.searchParams.get("campaign") ?? effectiveValues(env, (await loadSettings(env)).map).BATCH_CAMPAIGN;
      const rows = await sb<{ contact_id: string; contact_name: string | null; phone_e164: string | null; body: string | null; status: string; sent_at: string | null; account: string }[]>(env, "GET", `messages?campaign=eq.${enc(camp)}&status=in.(sent,failed,skipped,sending)&order=sent_at.desc.nullslast&limit=300&select=contact_id,contact_name,phone_e164,body,status,sent_at,account`);
      const ids = rows.map((r) => r.contact_id);
      const replied = new Set<string>();
      if (ids.length) {
        const inb = await sb<{ contact_id: string }[]>(env, "GET", `messages?direction=eq.inbound&contact_id=in.(${ids.slice(0, 150).map(enc).join(",")})&select=contact_id&limit=1000`);
        inb.forEach((x) => replied.add(x.contact_id));
      }
      return json({ campaign: camp, rows: rows.map((r) => ({ ...r, replied: replied.has(r.contact_id) })) });
    }

    if (p === "/admin/dash/followups") {
      const rows = await sb<unknown[]>(env, "GET", `messages?campaign=eq.${DASH_CAMPAIGN}&status=in.(pending_approval,approved,sent,skipped,failed)&order=created_at.desc&limit=60&select=id,contact_id,contact_name,phone_e164,body,status,segment,created_at,sent_at`);
      return json({ rows });
    }
    if (p === "/admin/dash/followup-action" && req.method === "POST") {
      const b = (await req.json()) as { id?: string; action?: string; body?: string };
      if (!b.id) return json({ error: "id needed" }, 400);
      if (b.action === "approve") {
        const patch: Record<string, string> = { status: "approved" };
        if (typeof b.body === "string" && b.body.trim()) patch.body = b.body.trim().slice(0, 320);
        await sb(env, "PATCH", `messages?id=eq.${enc(b.id)}&campaign=eq.${DASH_CAMPAIGN}&status=eq.pending_approval`, patch, "return=minimal");
        return json({ ok: true });
      }
      if (b.action === "skip") { await sb(env, "PATCH", `messages?id=eq.${enc(b.id)}&campaign=eq.${DASH_CAMPAIGN}&status=in.(pending_approval,approved)`, { status: "skipped" }, "return=minimal"); return json({ ok: true }); }
      return json({ error: "unknown action" }, 400);
    }
    if (p === "/admin/dash/dash-sample" && req.method === "POST") {
      const b = (await req.json()) as { instructions?: string; dials?: Dials };
      const o = { instructions: (b.instructions ?? "").trim() || DEFAULTS.dash, dials: b.dials ?? {} };
      const promo = await writeFollowUp(env, { kind: "promo", firstName: "Dave", nth: 1, history: ["US: Hi Dave, it's Dunzo Gutters. Before the rains: gutter cleaning is $219 for a single story home or $319 for two stories. Reply 1 or 2 and we'll text you a quote to approve and pay online."] }, o);
      const quote = await writeFollowUp(env, { kind: "quote", firstName: "Dave", nth: 1, stories: 1, history: ["US: Hi Dave, it's Dunzo Gutters. Before the rains: gutter cleaning is $219 for a single story home or $319 for two stories.", "CUSTOMER: 1", "US: Single story, got it. Is the job at 12 Oak Ave?", "CUSTOMER: yes, my wife says the back gutter overflows", "US: Sorted, here's your quote: [link]"] }, o);
      return json({ promo, quote });
    }

    if (p === "/admin/dash/roadmap") return json({ lanes: LANES, items: ROADMAP, tools: TOOLS });

    if (p === "/admin/dash/director") {
      const r = await directorReport(env, acct === "dunzo" || acct === "lights" ? acct : null);
      return json(r);
    }

    if (p === "/admin/dash/agents") {
      return json({ mates: MATES, safety: SAFETY_RULES, prompt: systemPrompt({ firstName: "Customer" } as BotFacts), knowledge: BUSINESS_KNOWLEDGE });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}
