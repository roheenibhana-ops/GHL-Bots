# GHL-Bots

One lead-handling engine for **Santa's Lights** and **Dunzo Gutters**, built on Cloudflare Workers + Supabase, driving GoHighLevel (GHL) through its API. It replaces GHL Agent Studio and the Zaps.

First job: text ~6k existing leads across both GHL sub-accounts with a gutter-cleaning offer, starting with a 100-lead pilot.

## How it works

- **GHL stays the messenger.** Contacts, phone numbers and conversations live there; the Worker sends and reads SMS through the GHL v2 API.
- **Worker (`src/`)** receives GHL's inbound-SMS webhook, drafts a reply with Claude, and either queues it for human approval or sends it.
- **Supabase** stores contacts, messages and opt-outs (`supabase/schema.sql`).
- **Safety layer (`src/safety.ts`)** handles STOP words, quiet hours (9am to 8pm contact-local), phone normalisation and cross-account dedupe.
- **Agents (`src/agents.ts`)** are config entries (prompt, model, guardrails). Add one by adding an entry.

## Safe by default

| Switch | Default | Meaning |
|---|---|---|
| `SENDING_ENABLED` | `false` | Nothing sends until this is `"true"` |
| `SEND_MODE` | `approve` | Every outbound message waits for a human approval |
| `BATCH_SIZE` | `10` | Messages released per 10-minute cron run |

Opt-outs are always processed, even with sending off.

## Routes

- `GET /health`
- `GET /admin/dry-run?pages=3` (Bearer `ADMIN_TOKEN`): pulls contacts from both sub-accounts, dedupes, reports counts. **Sends nothing.**
- `POST /webhooks/ghl?secret=...`: inbound SMS from GHL.
- `POST /admin/pilot/create` (Bearer `ADMIN_TOKEN`) `{ account, campaign, size, template, pages }`: builds a pilot from one GHL account (`lights` or `dunzo`) (half customers, half lost leads, DND/dupes/excluded dropped) and queues drafts for approval. Sends nothing. Template uses `{firstName}` and `{brand}`.
- `GET /app`: approval page (type the admin token in). Lists pending drafts with Approve / Skip.
- `GET /admin/pending`, `POST /admin/approve`, `POST /admin/reject`: what the page calls. Approve only sends if `SENDING_ENABLED` is true and the contact is inside the 9am to 8pm window.

## Setup

1. Create a Cloudflare account and a Supabase project. Run `supabase/schema.sql`, then `supabase/002_pilot.sql`, in the Supabase SQL editor.
2. In each GHL sub-account create a Private Integration (scopes: contacts, conversations, conversation messages, locations/tags/custom fields, opportunities). Note each Location ID.
3. `npm install`
4. Set secrets (never commit them):
   ```bash
   npx wrangler secret put GHL_TOKEN_LIGHTS
   npx wrangler secret put GHL_LOCATION_LIGHTS
   npx wrangler secret put GHL_TOKEN_DUNZO
   npx wrangler secret put GHL_LOCATION_DUNZO
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_SERVICE_KEY
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put ADMIN_TOKEN
   npx wrangler secret put WEBHOOK_SECRET
   ```
5. `npm run deploy`, then call `/admin/dry-run` to confirm both GHL connections work.

## Before any real send

- A2P 10DLC campaign approved on each sub-account.
- Consent: these people opted in to Santa's Lights, not Dunzo. Send under the Santa's Lights name or get compliance advice.
- Turn off any GHL workflows that text the same contacts.

## Status

Scaffold. Built from GHL's public OpenAPI specs, not yet run against a live account: field names in `src/ghl.ts` (contact search, message send) need confirming in the first dry run. The outreach batch in `scheduled()` is a stub, which is the next step, then the management app (inbox, approval queue, scoreboard).

## Dev

```bash
npm run typecheck
npm test
```
