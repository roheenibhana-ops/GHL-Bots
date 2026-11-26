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
import { WORKFLOWS } from "./workflows";
import { addTags, credsFor, getContact, getPipelines, removeTags, sendSms, upsertByPhone } from "./ghl";
import { gql } from "./jobber";
import { BUSINESS_KNOWLEDGE } from "./knowledge";
import { isSmsDnd, normalizePhone } from "./safety";
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

export const MATES = [
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
export async function handleDash(req: Request, env: Env, url: URL, rawEnv: Env = env): Promise<Response | null> {
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

    if (p === "/admin/dash/ai-key") {
      const { loadSettings: ls, aiKeyStatus, aiKeyLooksRight, encryptSecret, AI_KEY_ROW } = await import("./settings");
      if (req.method === "POST") {
        const value = String(((await req.json()) as { value?: string }).value ?? "").trim();
        const { ready, error } = await ls(env, true);
        if (!ready) return json({ error: "The key could not be saved: " + (error ?? "settings table not found") }, 409);
        if (value !== "") {
          if (!aiKeyLooksRight(value)) return json({ error: "That does not look like a Claude API key. It should start with sk-ant-" }, 400);
          // Prove the key works before saving it, so a typo can never take the agents down.
          const test = await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": value, "anthropic-version": "2023-06-01" } }).catch(() => null);
          if (!test) return json({ error: "Could not reach Claude to check the key. Try again." }, 502);
          if (test.status === 401 || test.status === 403) return json({ error: "Claude did not accept that key. Check it was copied in full and is still active." }, 400);
          if (!test.ok) return json({ error: "Claude answered with an error (" + test.status + ") while checking the key. Nothing was changed." }, 502);
        }
        await saveSetting(env, AI_KEY_ROW, value === "" ? "" : await encryptSecret(rawEnv, value));
      }
      const { map } = await ls(env, true);
      return json(await aiKeyStatus(rawEnv, map));
    }

    if (p === "/admin/dash/connections" || p === "/admin/dash/connection") {
      const S = await import("./settings");
      const raw = rawEnv as unknown as Record<string, string | undefined>;
      if (p === "/admin/dash/connection" && req.method === "POST") {
        const b = (await req.json()) as { id?: string; values?: Record<string, string>; remove?: boolean };
        const c = S.CONNECTORS.find((x) => x.id === b.id);
        if (!c) return json({ error: "Unknown connection" }, 400);
        const { ready, error, map } = await S.loadSettings(env, true);
        if (!ready) return json({ error: "Could not be saved: " + (error ?? "settings table not found") }, 409);
        if (b.remove) {
          for (const f of c.fields) await saveSetting(env, "SECRET_" + f.env, "");
        } else {
          const given: Record<string, string> = {};
          for (const f of c.fields) { const v = String(b.values?.[f.env] ?? "").trim(); if (v) given[f.env] = v; }
          if (!Object.keys(given).length) return json({ error: "Nothing to save. Paste a value first." }, 400);
          // What the connection would use after this save: new values over the current ones.
          const next: Record<string, string> = {};
          for (const f of c.fields) next[f.env] = given[f.env] ?? (await S.savedSecret(rawEnv, map, "SECRET_" + f.env)) ?? raw[f.env] ?? "";
          const missing = c.fields.filter((f) => !next[f.env]).map((f) => f.label);
          if (missing.length) return json({ error: "Also needed: " + missing.join(", ") }, 400);
          if (Object.values(given).some((v) => v.length > 400 || /\s/.test(v))) return json({ error: "That does not look right. Check it was copied without spaces." }, 400);
          // Prove it works before saving, so a typo can never take a live system down.
          let problem: string | null = null;
          try {
            if (c.id === "claude") {
              if (!S.aiKeyLooksRight(next.ANTHROPIC_API_KEY)) problem = "That does not look like a Claude API key. It should start with sk-ant-";
              else { const t = await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": next.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" } }); if (!t.ok) problem = t.status === 401 || t.status === 403 ? "Claude did not accept that key." : "Claude answered with an error (" + t.status + ")."; }
            } else if (c.id === "quo") {
              const t = await (await import("./quo")).quoCheckKey(next.QUO_API_KEY);
              if (!t.ok) problem = t.status === 401 || t.status === 403 ? "Quo did not accept that key." : "Could not check the key with Quo (" + (t.status || "no answer") + ").";
            } else if (c.id === "companycam") {
              const t = await (await import("./companycam")).ccCheckToken(next.COMPANYCAM_TOKEN);
              if (!t.ok) problem = t.status === 401 || t.status === 403 ? "CompanyCam did not accept that token." : "Could not check the token with CompanyCam (" + (t.status || "no answer") + ").";
            } else if (c.id === "ghl-dunzo" || c.id === "ghl-lights") {
              const acct = c.id === "ghl-dunzo" ? "dunzo" : "lights";
              const up = acct.toUpperCase();
              await getPipelines({ account: acct, token: next["GHL_TOKEN_" + up], locationId: next["GHL_LOCATION_" + up] });
            }
          } catch (e) { problem = c.name + " did not accept those details: " + (e as Error).message.slice(0, 140); }
          if (problem) return json({ error: problem + " Nothing was changed." }, 400);
          for (const [k, v] of Object.entries(given)) await saveSetting(env, "SECRET_" + k, await S.encryptSecret(rawEnv, v));
        }
      }
      const { map } = await S.loadSettings(env, true);
      const list = await Promise.all(S.CONNECTORS.map(async (c) => ({ id: c.id, title: c.title, name: c.name, need: c.need, help: c.help, fields: await S.connectionFields(rawEnv, map, c) })));
      return json({ connections: list });
    }

    // ---------- The library: what every agent learns from real conversations ----------
    if (p.startsWith("/admin/dash/library")) {
      const L = await import("./library");
      const b = req.method === "POST" ? ((await req.json().catch(() => ({}))) as { fresh?: boolean; company?: string; on?: boolean; voice?: string }) : {};
      const co = b.company === "lights" ? "lights" : "dunzo";
      try {
        if (p === "/admin/dash/library-start" && req.method === "POST") await L.libraryStart(env, b.fresh !== false);
        if (p === "/admin/dash/library-step" && req.method === "POST") return json(await L.libraryStep(env));
        if (p === "/admin/dash/library-build" && req.method === "POST") await L.libraryBuild(env, co);
        if (p === "/admin/dash/library-publish" && req.method === "POST") await L.libraryPublish(env, co, b.on !== false, b.voice);
        const { quoKey } = await import("./quo");
        return json({ connected: !!quoKey(env), ...(await L.libraryStatus(env)) });
      } catch (e) { return json({ error: (e as Error).message }, 502); }
    }

    // ---------- Photo reports, from CompanyCam ----------
    if (p.startsWith("/admin/dash/cc-") || p.startsWith("/admin/dash/report")) {
      const CC = await import("./companycam");
      const R = await import("./report");
      try {
        if (p === "/admin/dash/cc-projects") {
          if (!CC.ccToken(env)) return json({ connected: false, projects: [] });
          const list = await CC.ccSearchProjects(env, url.searchParams.get("q") ?? "");
          return json({ connected: true, projects: list.map((x) => ({ id: x.id, name: x.name, address: CC.addressLine(x), photos: x.photo_count ?? 0, last: x.last_activity_at ?? x.created_at ?? null })) });
        }
        if (p === "/admin/dash/cc-photos") {
          const list = await CC.ccProjectPhotos(env, url.searchParams.get("project") ?? "", 60);
          return json({ photos: list.map((x) => ({ id: x.id, thumb: CC.photoUrl(x, "thumb"), sizes: (x.uris ?? []).map((u) => u.type), note: x.description?.plain_text_content ?? "", taken: x.captured_at ?? null })).filter((x) => x.thumb) });
        }
        if (p === "/admin/dash/reports") return json({ reports: await R.listReports(env) });
        if (p === "/admin/dash/report") { const r = await R.getReport(env, url.searchParams.get("id") ?? ""); return r ? json({ report: r, link: url.origin + "/r/" + r.id }) : json({ error: "Report not found" }, 404); }
        if (p === "/admin/dash/report-preview") { const r = await R.getReport(env, url.searchParams.get("id") ?? ""); return r ? json({ html: R.reportHtml(r) }) : json({ error: "Report not found" }, 404); }
        if (req.method === "POST") {
          const b = (await req.json()) as { kind?: string; projectId?: string; photoIds?: string[]; id?: string; body?: unknown; approve?: boolean; phone?: string };
          if (p === "/admin/dash/report-create") {
            const r = await R.createReport(env, { kind: b.kind === "lights" ? "lights" : "gutter", projectId: String(b.projectId ?? ""), photoIds: Array.isArray(b.photoIds) ? b.photoIds.map(String).slice(0, 20) : undefined });
            return json({ report: r, link: url.origin + "/r/" + r.id });
          }
          if (p === "/admin/dash/report-save") {
            const r = await R.saveReport(env, String(b.id ?? ""), b.body, b.approve === true ? "approved" : b.approve === false ? "draft" : undefined);
            return r ? json({ report: r, link: url.origin + "/r/" + r.id }) : json({ error: "Report not found" }, 404);
          }
          if (p === "/admin/dash/report-send") {
            const r = await R.getReport(env, String(b.id ?? ""));
            if (!r) return json({ error: "Report not found" }, 404);
            if (r.status === "draft") return json({ error: "Approve the report before sending it." }, 400);
            const phone = normalizePhone(b.phone ?? r.contact?.phone ?? "");
            if (!phone) return json({ error: "That phone number does not look right." }, 400);
            const creds = credsFor(env, r.account);
            const { contact } = await upsertByPhone(creds, phone);
            const full = await getContact(creds, contact.id);
            if (isSmsDnd(full) || (full.tags ?? []).map((t) => t.toLowerCase()).includes("bot-opted-out")) return json({ error: "This customer has opted out of texts, so it was not sent. You can still copy the link and share it another way." }, 400);
            const first = (full.firstName || r.contact?.name || "").split(" ")[0];
            const co = r.account === "lights" ? "Santa's Lights" : "Dunzo Gutters";
            const text = `Hi${first ? " " + first : ""}, it's the team at ${co}. ${r.kind === "lights" ? "Here is your lighting design preview" : "Here is your Gutter Health Report with photos"}: ${url.origin}/r/${r.id}`;
            await sendSms(creds, contact.id, text);
            await sb(env, "PATCH", `reports?id=eq.${enc(r.id)}`, { status: "sent", sent_at: new Date().toISOString() }, "return=minimal");
            await sb(env, "POST", "messages", { account: r.account, contact_id: contact.id, direction: "outbound", body: text, status: "sent", sent_at: new Date().toISOString(), campaign: "report", contact_name: full.firstName ?? null, phone_e164: phone }, "return=minimal").catch(() => undefined);
            return json({ sent: true, text });
          }
        }
      } catch (e) { return json({ error: (e as Error).message }, 502); }
    }

    // ---------- The test checklist: every case for the whole app, with your ticks saved ----------
    if (p === "/admin/dash/checklist") {
      const { CHECKLIST } = await import("./checklist");
      const rows = await sb<{ id: number; body: Record<string, { s: string; note?: string; at: string }> }[]>(env, "GET", "library?kind=eq.checks&select=id,body&order=id.desc&limit=1").catch(() => []);
      const marks = rows[0]?.body ?? {};
      if (req.method === "POST") {
        const b = (await req.json()) as { id?: string; state?: string; note?: string };
        const known = CHECKLIST.some((sec) => sec.cases.some((x) => x.id === b.id));
        if (!known) return json({ error: "Unknown test" }, 400);
        if (b.state === "pass" || b.state === "fail") marks[b.id!] = { s: b.state, note: String(b.note ?? "").slice(0, 300) || undefined, at: new Date().toISOString() };
        else delete marks[b.id!];
        if (rows[0]) await sb(env, "PATCH", `library?id=eq.${rows[0].id}`, { body: marks }, "return=minimal");
        else await sb(env, "POST", "library", { company: "all", kind: "checks", body: marks }, "return=minimal");
      }
      return json({ sections: CHECKLIST, marks });
    }

    // ---------- Zapier: a saved snapshot of the Zaps that are running ----------
    // The Worker cannot read Zapier itself, so the list is saved here whenever it is checked.
    // ---------- Flows: the app's own copy of each Zap, in watch mode ----------
    if (p === "/admin/dash/flows") { const F = await import("./flowwatch"); return json(await F.flowsOverview(env)); }
    if (p === "/admin/dash/flow-runs") { const F = await import("./flowwatch"); return json({ runs: await F.flowRuns(env, url.searchParams.get("flow") ?? "", url.searchParams.get("account") ?? "") }); }
    if (p === "/admin/dash/flow-look" && req.method === "POST") {
      const F = await import("./flowwatch");
      try { const r = await F.watchFlows(env); const checked = await F.checkFlows(env).catch(() => 0); return json({ ...r, checked }); } catch (e) { return json({ error: (e as Error).message }, 502); }
    }

    // ---------- What the AI is costing, by job ----------
    // A tiny test call, to see which thinking settings a model accepts and what a short reply uses.
    if (p === "/admin/dash/ai-probe") {
      const { MODELS } = await import("./agents");
      const m = MODELS[url.searchParams.get("model") ?? "sonnet"] ?? MODELS.sonnet;
      const mode = url.searchParams.get("thinking") ?? "";
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: m.id, max_tokens: 3000, messages: [{ role: "user", content: "A customer texts: can you do my gutters before it rains? Reply in one short friendly sentence." }], ...(mode ? { thinking: { type: mode } } : {}) }) });
      const j = (await res.json()) as { usage?: unknown; content?: { type: string }[]; error?: { message?: string } };
      return json({ model: m.id, thinking: mode || "(not set)", status: res.status, blocks: j.content?.map((b) => b.type), usage: j.usage, error: j.error?.message?.slice(0, 200) });
    }

    if (p === "/admin/dash/ai-costs") {
      const { MODELS, TASKS } = await import("./agents");
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const rows = await sbAll<{ at: string; task: string; model: string; input_tokens: number; output_tokens: number; cache_read: number; cache_write: number }>(env, `ai_usage?at=gte.${since}&select=at,task,model,input_tokens,output_tokens,cache_read,cache_write&order=id.asc`).catch(() => []);
      const price = (model: string) => Object.values(MODELS).find((m) => m.id === model) ?? MODELS.sonnet;
      const cost = (r: (typeof rows)[number]) => { const m = price(r.model); return (r.input_tokens * m.inPerM + r.cache_write * m.inPerM * 1.25 + r.cache_read * m.inPerM * 0.1 + r.output_tokens * m.outPerM) / 1_000_000; };
      const day = new Date(Date.now() - pacificMsSinceMidnight(new Date())).toISOString();
      const by: Record<string, { calls: number; cost: number; today: number }> = {};
      for (const r of rows) { const x = (by[r.task] = by[r.task] ?? { calls: 0, cost: 0, today: 0 }); const c = cost(r); x.calls++; x.cost += c; if (r.at >= day) x.today += c; }
      const tasks = Object.entries(TASKS).map(([k, t]) => ({ key: k, label: t.label, calls: by[k]?.calls ?? 0, cost: by[k]?.cost ?? 0, today: by[k]?.today ?? 0 }));
      const last = rows.slice(-6).map((r) => ({ task: r.task, model: r.model, input: r.input_tokens, cached: r.cache_read, written: r.cache_write, output: r.output_tokens, cost: Number(cost(r).toFixed(4)) }));
      return json({ since: rows[0]?.at ?? null, total: tasks.reduce((n, t) => n + t.cost, 0), today: tasks.reduce((n, t) => n + t.today, 0), tasks, last });
    }

    if (p === "/admin/dash/zaps") {
      const rows = await sb<{ id: number; body: unknown }[]>(env, "GET", "library?kind=eq.zaps&select=id,body&order=id.desc&limit=1").catch(() => []);
      if (req.method === "POST") {
        const b = (await req.json()) as { zaps?: { name?: string; group?: string; on?: boolean; does?: string; app?: string }[] };
        const zaps = (Array.isArray(b.zaps) ? b.zaps : []).filter((z) => typeof z.name === "string").slice(0, 200).map((z) => ({ name: String(z.name).slice(0, 160), group: String(z.group ?? "Other").slice(0, 60), on: z.on !== false, does: String(z.does ?? "").slice(0, 300), app: String(z.app ?? "").slice(0, 300) }));
        const body = { checkedAt: new Date().toISOString(), zaps };
        if (rows[0]) await sb(env, "PATCH", `library?id=eq.${rows[0].id}`, { body }, "return=minimal");
        else await sb(env, "POST", "library", { company: "all", kind: "zaps", body }, "return=minimal");
        return json(body);
      }
      return json(rows[0]?.body ?? { checkedAt: null, zaps: [] });
    }

    if (p === "/admin/dash/quo-key") {
      const S = await import("./settings");
      if (req.method === "POST") {
        const value = String(((await req.json()) as { value?: string }).value ?? "").trim();
        const { ready, error } = await S.loadSettings(env, true);
        if (!ready) return json({ error: "The key could not be saved: " + (error ?? "settings table not found") }, 409);
        if (value !== "") {
          if (!/^[A-Za-z0-9_-]{16,200}$/.test(value)) return json({ error: "That does not look like a Quo API key." }, 400);
          const { quoCheckKey } = await import("./quo");
          const t = await quoCheckKey(value);
          if (t.status === 401 || t.status === 403) return json({ error: "Quo did not accept that key. Check it was copied in full." }, 400);
          if (!t.ok) return json({ error: "Could not check the key with Quo (" + (t.status || "no answer") + "). Nothing was changed." }, 502);
        }
        await saveSetting(env, S.QUO_KEY_ROW, value === "" ? "" : await S.encryptSecret(rawEnv, value));
      }
      const { map } = await (await import("./settings")).loadSettings(env, true);
      return json(await S.quoKeyStatus(rawEnv, map));
    }

    // ---------- The house voice, learned from Quo ----------
    if (p === "/admin/dash/voice" || p === "/admin/dash/voice-study" || p === "/admin/dash/voice-publish") {
      const S = await import("./settings");
      const state = async () => {
        const { map } = await S.loadSettings(env, true);
        let draft: unknown = null;
        try { draft = map[S.VOICE_DRAFT_ROW] ? JSON.parse(map[S.VOICE_DRAFT_ROW]) : null; } catch { draft = null; }
        return { connected: (await S.quoKeyStatus(rawEnv, map)).source !== "none", live: map[S.VOICE_ROW] ?? "", draft };
      };
      if (p === "/admin/dash/voice-study" && req.method === "POST") {
        const b = (await req.json().catch(() => ({}))) as { userId?: string; days?: number };
        const { studyVoice } = await import("./voice");
        try {
          const study = await studyVoice(env, { userId: b.userId || undefined, days: Math.min(Math.max(Number(b.days ?? 120), 7), 365) });
          await saveSetting(env, S.VOICE_DRAFT_ROW, JSON.stringify(study));
        } catch (e) { return json({ error: (e as Error).message }, 502); }
      }
      if (p === "/admin/dash/voice-publish" && req.method === "POST") {
        const text = String(((await req.json()) as { text?: string }).text ?? "").trim().slice(0, 4000);
        await saveSetting(env, S.VOICE_ROW, text); // an empty text switches the learned voice off
      }
      const st = await state();
      let users: { id: string; name: string }[] = [];
      if (st.connected && p === "/admin/dash/voice") {
        const { quoUsers } = await import("./quo");
        users = (await quoUsers(env).catch(() => [])).map((u) => ({ id: u.id, name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u.id }));
      }
      return json({ ...st, users });
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
      const { quoKey, quoUsers } = await import("./quo");
      const quo = quoKey(env) ? await check(() => quoUsers(env)) : undefined;
      const { ccToken, ccGet } = await import("./companycam");
      const companycam = ccToken(env) ? await check(() => ccGet(env, "/companies/current")) : undefined;
      return json({ checks: { ghlDunzo, ghlLights, jobberDunzo, jobberLights, database, quo, companycam } });
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
      // Show what is really switched on right now, not just what has been built.
      const eff = effectiveValues(env, (await loadSettings(env)).map);
      const paused = eff.PAUSE_ALL === "true";
      const by = (mode: string, what: string) => paused ? { label: "Paused", tone: "o", note: "Everything is paused." }
        : mode === "live" || mode === "auto" ? { label: "Live", tone: "g", note: "" }
        : mode === "approve" ? { label: "Live, you approve", tone: "g", note: "Writes follow ups that wait on your Approvals page." }
        : mode === "test" ? { label: "Test only", tone: "o", note: `Built and working, but ${what} is set to Test in Settings, so it only acts on contacts tagged bot-test.` }
        : { label: "Switched off", tone: "", note: `Built, but ${what} is switched off in Settings.` };
      const { dashMode: dashModeNow } = await import("./chaser");
      const mates = MATES.map((m) => {
        if (m.state !== "live") return m;
        const st = m.name === "Gus" || m.name === "Relay" ? by(eff.BOT_MODE, "the bot") : m.name === "Flash" ? by(eff.PHOTO_MODE, "photo handling") : m.name === "Dash" ? by(dashModeNow(eff.DASH_MODE, eff.DASH_AUTO_FROM, new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date())), "follow ups") : null;
        return st ? { ...m, ...st } : m;
      });
      return json({ mates, flows: WORKFLOWS, safety: SAFETY_RULES, prompt: systemPrompt({ firstName: "Customer" } as BotFacts), knowledge: BUSINESS_KNOWLEDGE });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}
