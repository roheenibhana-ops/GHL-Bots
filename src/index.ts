import { AGENTS, runAgent } from "./agents";
import { sb } from "./db";
import { addNote, addTags, credsFor, searchContacts, sendSms, setDnd } from "./ghl";
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
      return json({ pulled: perAccount, usable: keep.length, dropped, sample: keep.slice(0, 3).map((c) => ({ id: c.id, account: c.account, phone: c.e164 })) });
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

    // Approve a pending message from the app: POST /admin/approve {id}
    if (url.pathname === "/admin/approve" && req.method === "POST") {
      if (!isAdmin(req, env)) return json({ error: "unauthorized" }, 401);
      if (env.SENDING_ENABLED !== "true") return json({ error: "sending disabled" }, 403);
      const { id } = (await req.json()) as { id: string };
      const [m] = await sb<{ id: string; account: Account; contact_id: string; body: string; status: string }[]>(env, "GET", `messages?id=eq.${id}&limit=1`);
      if (!m || m.status !== "pending_approval") return json({ error: "not pending" }, 409);
      await sendSms(credsFor(env, m.account), m.contact_id, m.body);
      await sb(env, "PATCH", `messages?id=eq.${id}`, { status: "sent", sent_at: new Date().toISOString() });
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
