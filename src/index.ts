import { APP_HTML } from "./app";
import { AGENTS, runAgent } from "./agents";
import { sb } from "./db";
import { addNote, addTags, credsFor, searchContacts, sendSms, setDnd } from "./ghl";
import { authorizeUrl, checkState, describeType, exchangeCode, gql, listMutations, makeState } from "./jobber";
import { createPilot } from "./pilot";
import { dedupe, inSendWindow, isStopMessage } from "./safety";
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
      const all: Parameters<typeof dedupe>[0] = [];
      const perAccount: Record<string, number> = {};
      for (const account of ACCOUNTS) {
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

    // ---- Jobber connection (one per business: ?account=lights or ?account=dunzo) ----
    const jobberAccount = (): Account | null => {
      const a = url.searchParams.get("account");
      return a === "lights" || a === "dunzo" ? a : null;
    };
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
    // Schema discovery: ?account=dunzo&mutations=quote  or  ?account=dunzo&type=QuoteCreateAttributes
    if (url.pathname === "/admin/jobber/schema") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      const account = jobberAccount();
      if (!account) return json({ error: "add ?account=lights or ?account=dunzo" }, 400);
      try {
        const m = url.searchParams.get("mutations");
        if (m !== null) return json({ mutations: await listMutations(env, account, m) });
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
      const b = (await req.json()) as { campaign?: string; size?: number; template?: string; pages?: number };
      try {
        return json(await createPilot(env, {
          campaign: b.campaign ?? "pilot-1",
          size: Math.min(Math.max(b.size ?? 100, 2), 500),
          template: b.template ?? "",
          pagesPerAccount: Math.min(b.pages ?? 8, 20),
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
