import { APP_HTML } from "./app";
import { AGENTS, runAgent } from "./agents";
import { sb } from "./db";
import { addNote, addTags, credsFor, searchContacts, sendSms, setDnd, upsertByPhone } from "./ghl";
import { authorizeUrl, checkState, describeType, exchangeCode, describeField, findClientsByPhones, gql, listClientPhones, listMutations, listQuoteTemplates, makeState } from "./jobber";
import { assess } from "./check";
import { createGutterQuote } from "./quote";
import { overlapStats, type Sources } from "./overlap";
import { createPilot } from "./pilot";
import { dedupe, inSendWindow, isSmsDnd, isStopMessage, normalizePhone } from "./safety";
import { ACCOUNTS, type Account, type Env } from "./types";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), { status, headers: { "content-type": "application/json" } });

function isAdmin(req: Request, env: Env): boolean {
  // Trim both sides: a stray space or newline pasted into the secret shouldn't lock us out.
  const expected = (env.ADMIN_TOKEN ?? "").trim();
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return expected.length > 0 && given === expected;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const jobberAccount = (): Account | null => {
      const a = url.searchParams.get("account");
      return a === "lights" || a === "dunzo" ? a : null;
    };

    if (url.pathname === "/health") {
      // Presence flags only (true/false), never values. Helps debug missing secrets.
      const secrets = Object.fromEntries(
        ["GHL_TOKEN_LIGHTS", "GHL_LOCATION_LIGHTS", "GHL_TOKEN_DUNZO", "GHL_LOCATION_DUNZO", "SUPABASE_URL", "SUPABASE_SERVICE_KEY", "ANTHROPIC_API_KEY", "ADMIN_TOKEN", "WEBHOOK_SECRET"].map(
          (k) => [k, !!(env as unknown as Record<string, string>)[k]],
        ),
      );
      return json({ ok: true, sending: env.SENDING_ENABLED === "true", mode: env.SEND_MODE, secrets });
    }

    // Read-only check: pulls contacts from both sub-accounts, counts and dedupes. Sends nothing.
    if (url.pathname === "/admin/dry-run") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const maxPages = Number(url.searchParams.get("pages") ?? "3");
      const only = url.searchParams.get("account"); // optional: lights or dunzo, to report on one account
      const all: Parameters<typeof dedupe>[0] = [];
      const perAccount: Record<string, number> = {};
      for (const account of ACCOUNTS.filter((a) => !only || a === only)) {
        const creds = credsFor(env, account);
        perAccount[account] = 0;
        for (let page = 1; page <= maxPages; page++) {
          const { contacts } = await searchContacts(creds, { page, pageLimit: 100 });
          if (!contacts?.length) break;
          perAccount[account] += contacts.length;
          all.push(...contacts.map((c) => ({ ...c, account })));
        }
      }
      const { keep, dropped } = dedupe(all);
      // Field names only (no values), to confirm where GHL reports DND and tags.
      const raw = all as unknown as Record<string, unknown>[];
      const fieldNames = [...new Set(raw.flatMap((c) => Object.keys(c)))].sort();
      const dndShapes = raw.filter((c) => c.dndSettings && Object.keys(c.dndSettings as object).length).length;
      const smsStatusCounts: Record<string, number> = {};
      const tagCounts: Record<string, number> = {};
      for (const c of raw) {
        const st = ((c.dndSettings as Record<string, { status?: string }> | undefined)?.SMS?.status) ?? "none";
        smsStatusCounts[st] = (smsStatusCounts[st] ?? 0) + 1;
        for (const t of (c.tags as string[] | undefined) ?? []) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
      }
      const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 25);
      return json({ fieldNames, contactsWithDndSettings: dndShapes, smsStatusCounts, topTags, pulled: perAccount, usable: keep.length, dropped, sample: keep.slice(0, 3).map((c) => ({ id: c.id, account: c.account, phone: c.e164 })) });
    }

    // Capture mode: saves the raw body GHL sends, so we can build the real handler from a real payload.
    // Point the GHL workflow webhook at /webhooks/capture?secret=... Nothing else happens (no bot, no replies).
    if (url.pathname === "/webhooks/capture" && req.method === "POST") {
      if (url.searchParams.get("secret") !== env.WEBHOOK_SECRET) return json({ error: "unauthorized" }, 401);
      const text = await req.text();
      let payload: unknown;
      try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 5000) }; }
      await sb(env, "POST", "webhook_log", { payload }, "return=minimal");
      return json({ ok: true });
    }
    if (url.pathname === "/admin/webhook-log") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      return json({ entries: await sb(env, "GET", "webhook_log?order=received_at.desc&limit=5") });
    }

    // GHL inbound-message webhook. Opt-outs are handled first, always.
    if (url.pathname === "/webhooks/ghl" && req.method === "POST") {
      if (url.searchParams.get("secret") !== env.WEBHOOK_SECRET) return json({ error: "unauthorized" }, 401);
      const p = (await req.json()) as { contactId?: string; locationId?: string; body?: string; direction?: string; type?: string };
      if (!p.contactId || !p.body || p.direction === "outbound") return json({ ok: true, ignored: true });
      const account: Account = p.locationId === env.GHL_LOCATION_DUNZO ? "dunzo" : "lights";
      const creds = credsFor(env, account);

      if (isStopMessage(p.body)) {
        await setDnd(creds, p.contactId);
        await addTags(creds, p.contactId, ["bot-opted-out"]);
        await sb(env, "POST", "optouts", { account, contact_id: p.contactId }, "resolution=ignore-duplicates");
        return json({ ok: true, optedOut: true });
      }

      await sb(env, "POST", "messages", { account, contact_id: p.contactId, direction: "inbound", body: p.body, status: "received" });
      const rows = await sb<{ direction: string; body: string }[]>(
        env, "GET", `messages?contact_id=eq.${encodeURIComponent(p.contactId)}&order=created_at.asc&limit=20`,
      );
      const history = rows.map((m) => ({ role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant", content: m.body }));
      const draft = await runAgent(env, AGENTS.reply, history);

      if (draft === "ESCALATE" || draft === "STOP") {
        await addTags(creds, p.contactId, ["bot-needs-human"]);
        await addNote(creds, p.contactId, "Lead bot escalated this conversation to a human.");
        return json({ ok: true, escalated: true });
      }
      // Replies wait for approval unless SEND_MODE is "auto".
      const auto = env.SEND_MODE === "auto" && env.SENDING_ENABLED === "true";
      await sb(env, "POST", "messages", { account, contact_id: p.contactId, direction: "outbound", body: draft, status: auto ? "sending" : "pending_approval" });
      if (auto) await sendSms(creds, p.contactId, draft);
      return json({ ok: true, drafted: true, auto });
    }

    // Plain test send, no bot and no AI: proves GHL sending works. Admin only. Ignores the campaign switch on purpose.
    if (url.pathname === "/admin/test-send" && req.method === "POST") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const b = (await req.json()) as { account?: string; phone?: string; message?: string };
      if (b.account !== "lights" && b.account !== "dunzo") return json({ error: 'account must be "lights" or "dunzo"' }, 400);
      const phone = normalizePhone(b.phone);
      if (!phone) return json({ error: "phone must be a valid US number" }, 400);
      const message = (b.message ?? "").trim();
      if (!message || message.length > 320) return json({ error: "message required, max 320 characters" }, 400);
      try {
        const creds = credsFor(env, b.account);
        const { contact } = await upsertByPhone(creds, phone);
        if (isSmsDnd(contact)) return json({ error: "That contact is marked do-not-disturb for SMS in GHL. Not sending." }, 409);
        await addTags(creds, contact.id, ["bot-test"]);
        const sent = await sendSms(creds, contact.id, message);
        await sb(env, "POST", "messages", { account: b.account, contact_id: contact.id, direction: "outbound", body: message, status: "sent", campaign: "test", phone_e164: phone, sent_at: new Date().toISOString() }, "return=minimal");
        return json({ ok: true, contactId: contact.id, ...sent });
      } catch (e) { return json({ error: (e as Error).message }, 502); }
    }

    // Pilot safety check: hold drafts for people who already have an open quote (or jobs) in Jobber.
    // POST { campaign, apply }. Without apply=true it only reports. Held drafts can't be approved; /admin/pilot/release undoes it.
    if (url.pathname === "/admin/pilot/check" && req.method === "POST") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const b = (await req.json()) as { campaign?: string; apply?: boolean };
      const campaign = b.campaign ?? "pilot-1";
      try {
        const msgs = await sb<{ id: string; account: string; contact_name: string | null; phone_e164: string }[]>(
          env, "GET", `messages?campaign=eq.${encodeURIComponent(campaign)}&status=eq.pending_approval&select=id,account,contact_name,phone_e164&limit=500`);
        const phones = msgs.map((m) => m.phone_e164).filter(Boolean);
        const held: { id: string; name: string | null; jobber: string; quotes: string[]; jobs: number; recentJobs: number }[] = [];
        const heldIds = new Set<string>();
        for (const account of ACCOUNTS) {
          const found = await findClientsByPhones(env, account, phones);
          for (const m of msgs) {
            const a = assess(found.get(m.phone_e164) ?? [], m.phone_e164);
            // Open quotes always hold. Dunzo-sourced campaigns also hold unfinished jobs and jobs completed in the last 90 days;
            // past (older) jobs are exactly who we want to reach. A Santa's Lights contact who is already a Dunzo customer is held on any job.
            const hold = account === "dunzo" && m.account === "lights" ? a.openQuotes > 0 || a.jobs > 0 : account === "dunzo" ? a.openQuotes > 0 || a.recentJobs > 0 : a.openQuotes > 0;
            if (a.found && hold) { held.push({ id: m.id, name: m.contact_name, jobber: account, quotes: a.quoteStatuses, jobs: a.jobs, recentJobs: a.recentJobs }); heldIds.add(m.id); }
          }
        }
        if (b.apply && heldIds.size) {
          await sb(env, "PATCH", `messages?id=in.(${[...heldIds].join(",")})&status=eq.pending_approval`, { status: "held" }, "return=minimal");
        }
        return json({ campaign, checked: msgs.length, holdCount: heldIds.size, applied: !!b.apply && heldIds.size > 0, held });
      } catch (e) { return json({ error: (e as Error).message }, 502); }
    }

    if (url.pathname === "/admin/pilot/release" && req.method === "POST") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const { campaign } = (await req.json()) as { campaign?: string };
      await sb(env, "PATCH", `messages?campaign=eq.${encodeURIComponent(campaign ?? "pilot-1")}&status=eq.held`, { status: "pending_approval" }, "return=minimal");
      return json({ ok: true });
    }

    // Self-test of Jobber phone search: takes a real client's number from the account and checks the search finds them. Returns a boolean only.
    if (url.pathname === "/admin/jobber/search-selftest") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const account = jobberAccount();
      if (!account) return json({ error: "add ?account=lights or ?account=dunzo" }, 400);
      try {
        const { numbers } = await listClientPhones(env, account, 1);
        const sample = numbers.map(normalizePhone).filter((n): n is string => !!n).slice(0, 5);
        const found = await findClientsByPhones(env, account, sample);
        const results = sample.map((p) => assess(found.get(p) ?? [], p).found);
        return json({ account, tried: sample.length, foundByPhoneSearch: results.filter(Boolean).length });
      } catch (e) { return json({ error: (e as Error).message }, 502); }
    }

    // Overlap report across GHL (2 accounts) and Jobber (2 accounts). Counts only, no personal data.
    // Free Workers allow ~50 outbound calls per request: ghlPages (100 contacts each) + jobberPages (50 clients each), per account.
    if (url.pathname === "/admin/overlap") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const ghlPages = Math.min(Number(url.searchParams.get("ghlPages") ?? "5"), 40);
      const jobberPages = Math.min(Number(url.searchParams.get("jobberPages") ?? "10"), 40);
      const src: Sources = {};
      const notes: Record<string, unknown> = {};
      try {
        for (const account of ACCOUNTS) {
          const set = new Set<string>();
          let pulled = 0;
          for (let page = 1; page <= ghlPages; page++) {
            const { contacts } = await searchContacts(credsFor(env, account), { page, pageLimit: 100 });
            if (!contacts?.length) break;
            pulled += contacts.length;
            for (const c of contacts) { const n = normalizePhone(c.phone); if (n) set.add(n); }
          }
          src[`ghl_${account}`] = set;
          notes[`ghl_${account}_contactsPulled`] = pulled;
        }
        for (const account of ACCOUNTS) {
          const r = await listClientPhones(env, account, jobberPages);
          src[`jobber_${account}`] = new Set(r.numbers.map(normalizePhone).filter((n): n is string => !!n));
          notes[`jobber_${account}`] = { clientsInAccount: r.total, clientsPulled: r.pulled, phonesSmsStopped: new Set(r.smsStopped.map(normalizePhone).filter(Boolean)).size };
        }
      } catch (e) { return json({ error: (e as Error).message }, 502); }
      return json({ ...overlapStats(src), notes });
    }

    // ---- Jobber connection (one per business: ?account=lights or ?account=dunzo) ----
    // Browser navigation can't send headers, so the connect step takes the admin token as ?key=.
    if (url.pathname === "/admin/jobber/connect") {
      const key = (url.searchParams.get("key") ?? "").trim();
      if (!env.ADMIN_TOKEN || key !== env.ADMIN_TOKEN.trim()) return json({ error: "unauthorized" }, 401);
      const account = jobberAccount();
      if (!account) return json({ error: "add &account=lights or &account=dunzo" }, 400);
      try {
        return Response.redirect(authorizeUrl(env, account, url.origin, await makeState(env.ADMIN_TOKEN.trim(), account)), 302);
      } catch (e) { return json({ error: (e as Error).message }, 500); }
    }
    if (url.pathname === "/admin/jobber/callback") {
      const account = await checkState(env.ADMIN_TOKEN.trim(), url.searchParams.get("state"));
      if (!account) return json({ error: "bad or expired state, start again from /admin/jobber/connect" }, 400);
      const code = url.searchParams.get("code");
      if (!code) return json({ error: url.searchParams.get("error") ?? "no code" }, 400);
      try { await exchangeCode(env, account, url.origin, code); } catch (e) { return json({ error: (e as Error).message }, 502); }
      return new Response(`Jobber (${account}) connected. You can close this tab.`, { headers: { "content-type": "text/plain" } });
    }
    if (url.pathname === "/admin/jobber/whoami") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const account = jobberAccount();
      if (!account) return json({ error: "add ?account=lights or ?account=dunzo" }, 400);
      try { return json({ account, jobber: await gql(env, account, "{ account { id name } }") }); } catch (e) { return json({ error: (e as Error).message }, 502); }
    }
    if (url.pathname === "/admin/jobber/templates") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const account = jobberAccount();
      if (!account) return json({ error: "add ?account=lights or ?account=dunzo" }, 400);
      try { return json({ account, templates: await listQuoteTemplates(env, account) }); } catch (e) { return json({ error: (e as Error).message }, 502); }
    }
    // Quote test: plans a Jobber client + property + quote for a phone and address. Creates nothing unless "create": true.
    // Sends no text or email. Needs real records, so use your own test details and archive them afterwards.
    if (url.pathname === "/admin/jobber/test-quote" && req.method === "POST") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const b = (await req.json()) as { phone?: string; firstName?: string; lastName?: string; street1?: string; city?: string; province?: string; postalCode?: string; stories?: number; create?: boolean };
      const phone = normalizePhone(b.phone);
      if (!phone) return json({ error: "phone must be a valid US number" }, 400);
      if (!b.firstName || !b.street1 || !b.city || !b.province || !b.postalCode || (b.stories !== 1 && b.stories !== 2)) {
        return json({ error: "need firstName, street1, city, province, postalCode and stories (1 or 2)" }, 400);
      }
      try {
        return json(await createGutterQuote(env, {
          phone, firstName: b.firstName, lastName: b.lastName,
          address: { street1: b.street1, city: b.city, province: b.province, postalCode: b.postalCode },
          stories: b.stories,
        }, b.create === true));
      } catch (e) { return json({ error: (e as Error).message }, 502); }
    }

    // Schema discovery: ?account=dunzo&mutations=quote  or  ?account=dunzo&type=QuoteCreateAttributes
    if (url.pathname === "/admin/jobber/schema") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const account = jobberAccount();
      if (!account) return json({ error: "add ?account=lights or ?account=dunzo" }, 400);
      try {
        const m = url.searchParams.get("mutations");
        if (m !== null) return json({ mutations: await listMutations(env, account, m, url.searchParams.get("version") ?? undefined) });
        const f = url.searchParams.get("field"); // e.g. Query.clients
        if (f) { const [tn, fn] = f.split("."); return json({ field: f, args: await describeField(env, account, tn, fn) }); }
        const t = url.searchParams.get("type");
        if (t) return json({ type: t, fields: await describeType(env, account, t) });
        return json({ error: "use ?mutations=<text> or ?type=<TypeName>" }, 400);
      } catch (e) { return json({ error: (e as Error).message }, 502); }
    }

    // Approval page (static HTML; the admin token is typed into it).
    if (url.pathname === "/app") return new Response(APP_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });

    // Create a pilot campaign: queues drafts for approval, sends nothing.
    if (url.pathname === "/admin/pilot/create" && req.method === "POST") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const b = (await req.json()) as { account?: string; campaign?: string; size?: number; template?: string; pages?: number; dryRun?: boolean };
      if (b.account !== "lights" && b.account !== "dunzo") return json({ error: "account must be \"lights\" or \"dunzo\": a campaign runs from one GHL account" }, 400);
      try {
        return json(await createPilot(env, {
          account: b.account,
          campaign: b.campaign ?? "pilot-1",
          size: Math.min(Math.max(b.size ?? 100, 2), 500),
          template: b.template ?? "",
          pagesPerAccount: Math.min(b.pages ?? 8, 20),
          dryRun: b.dryRun === true,
        }));
      } catch (e) {
        return json({ error: (e as Error).message }, 400);
      }
    }

    if (url.pathname === "/admin/pending") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const campaign = url.searchParams.get("campaign") ?? "pilot-1";
      const messages = await sb<unknown[]>(
        env, "GET",
        `messages?status=eq.pending_approval&campaign=eq.${encodeURIComponent(campaign)}&order=created_at.asc&limit=100&select=id,account,segment,contact_name,phone_e164,body`,
      );
      return json({ messages });
    }

    if (url.pathname === "/admin/reject" && req.method === "POST") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const { id } = (await req.json()) as { id: string };
      await sb(env, "PATCH", `messages?id=eq.${id}&status=eq.pending_approval`, { status: "skipped" });
      return json({ ok: true });
    }

    // Approve one pending message: only inside the contact's send window, only when sending is enabled.
    if (url.pathname === "/admin/approve" && req.method === "POST") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      if (env.SENDING_ENABLED !== "true") return json({ error: "Sending is disabled (SENDING_ENABLED is not true)" }, 403);
      const { id } = (await req.json()) as { id: string };
      const [m] = await sb<{ id: string; account: Account; contact_id: string; body: string; status: string; timezone: string | null }[]>(env, "GET", `messages?id=eq.${id}&limit=1`);
      if (!m || m.status !== "pending_approval") return json({ error: "not pending" }, 409);
      if (!inSendWindow(new Date(), m.timezone ?? undefined, Number(env.QUIET_START_HOUR), Number(env.QUIET_END_HOUR))) {
        return json({ error: "Outside the 9am to 8pm send window for this contact. Try again later." }, 409);
      }
      // Claim it first so a double click can't send twice.
      await sb(env, "PATCH", `messages?id=eq.${id}&status=eq.pending_approval`, { status: "sending" });
      try {
        await sendSms(credsFor(env, m.account), m.contact_id, m.body);
        await sb(env, "PATCH", `messages?id=eq.${id}`, { status: "sent", sent_at: new Date().toISOString() });
      } catch (e) {
        await sb(env, "PATCH", `messages?id=eq.${id}`, { status: "failed" });
        return json({ error: (e as Error).message }, 502);
      }
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  },

  // Outreach batches. Inert unless SENDING_ENABLED = "true". Pilot logic comes in the next step.
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    if (env.SENDING_ENABLED !== "true") return;
    const start = Number(env.QUIET_START_HOUR);
    const end = Number(env.QUIET_END_HOUR);
    if (!inSendWindow(new Date(), "America/Los_Angeles", start, end)) return;
    // TODO(pilot): select next BATCH_SIZE queued contacts from the campaign, draft the first message, send or queue for approval.
  },
};
