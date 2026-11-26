# What this is

A sales and marketing system that runs on a Cloudflare Worker with Supabase, driving GoHighLevel (GHL) and Jobber, with Claude through the Anthropic API. It texts a promo to old leads, an agent ("Gus") holds the conversation, a Jobber quote is created and the link is texted, and a second agent ("Dash") writes follow ups. The control panel is at `/dashboard` ("The Partridge Standard").

This copy runs two Sacramento companies with one owner: Dunzo Gutters and Santa's Lights. The repo is also the base for copies made for other clients (see the end).

# Working agreements

- Commit on the assigned `claude/...` branch and push to `main` as well, without asking. Cloudflare deploys `main` automatically in about two minutes.
- Before every push run `npx tsc --noEmit` and `npx vitest run`, and check the exit code. Do not pipe test output through `tail`, it hides failures.
- Secrets live in Cloudflare as type Secret. Never put them in the repo, in `wrangler.toml`, or in chat, and never ask the owner to paste one. The exceptions are the keys on the Connections section of Settings (Claude, GoHighLevel, Jobber, Quo, CompanyCam), which can also be saved from Settings in the dashboard: it is stored encrypted in the `settings` table, never returned to the browser, and overrides the Cloudflare one.
- Never send a real text to a real person unless the owner asked for that send. Drafts and dry runs are fine.
- Report only what was checked. Say plainly what is untested.
- The owner is in New Zealand. All sending is in Pacific time (Sacramento). Double check dates and times against Pacific before setting anything.

# Rules for anything a customer reads

- No em dashes and no hyphens. Sign as the team, never as an individual.
- The agents talk like a mate, not a script. No sample lines in prompts. They name what the customer actually shared.
- Agents do not announce they are automated. If a customer raises it, they acknowledge it honestly and offer a person. They never deny it and never claim to be a named human.
- Internal notes never go to customers.
- Prices and links are limited to the approved lists in `src/knowledge.ts`. Agents never promise a date for the work.
- Sending window is 8am to 8pm Pacific, seven days a week. Days off are in the `BLACKOUT_DATES` setting.
- Always check Jobber right before a promo goes out: no promo to someone with an open quote, a cleaning quote, or a recent or unfinished job.
- STOP is honoured first, in every mode, and carried across both companies.
- The existing Zaps stay. The bot does not move pipeline stages (`PROMO_PIPELINE = "off"`).

# How it fits together

- `src/index.ts`: routes, and the cron (every 10 minutes): queued replies, approvals, the daily promo sender, Dash.
- `src/batch.ts`: daily promo sender. Limits, special days, days off, Jobber check, deadline line, owner.
- `src/pilot.ts`: builds a campaign list from GHL contacts as drafts, and removes duplicates.
- `src/convo.ts`, `src/bot.ts`, `src/playbook.ts`, `src/knowledge.ts`: the conversation agent, its rules, voice and business knowledge.
- `src/quote.ts`, `src/jobber.ts`, `src/check.ts`: Jobber quotes and the customer history check.
- `src/quo.ts`: read only client for Quo, the phone system. `src/voice.ts`: studies real calls and texts to learn the house voice, which the owner approves before agents use it.
- `src/library.ts`: the library. Reads thousands of Quo texts and calls in batches, merges them into one playbook per company, and once the owner switches it on every agent learns from it (sales agents: voice and what customers ask; marketing writers: questions, customer wording and post ideas).
- `src/companycam.ts`: read only client for CompanyCam job photos. `src/report.ts`: photo reports (Gutter Health Report, lighting design preview). An agent drafts from the photos, a person approves, and only then is the customer page at `/r/<id>` visible.
- `src/flows.ts`: the app's own copy of every Zap, step by step, with a planner for each. `src/flowwatch.ts`: watch mode. A second cron looks at what just happened in Jobber, GoHighLevel and Quo and writes down what each flow would have done in `flow_runs`. Watch mode only ever reads.
- `src/chaser.ts`: Dash, the follow up writer. `src/coach.ts`: the Mentor. `src/director.ts`: the weekly report.
- `src/deadline.ts`: the offer deadline. Each customer is held to the date printed in the text they received.
- `src/plan.ts`: the day by day send plan shown on the Overview.
- `src/settings.ts`: everything that can be changed from the dashboard. These override `wrangler.toml`.
- `src/dash.ts`: the dashboard's data endpoints. `src/dashboard.ts`: the dashboard page itself.

The existing Zaps are being retired one at a time. `docs/zap-map.md` has every Zap step by step. The rule: build the replacement, run it in watch only mode beside the Zap, compare, and only then does the owner switch that Zap off. Never change, pause or delete a live Zap.

The GoHighLevel Agent Studio agents are coming across too. `docs/ghl-agents/` holds all 13 as read from GoHighLevel (instructions, triggers, settings) and `SUMMARY.md` says what each does. These files, and `docs/zap-map.md`, are this client's own data: leave them out of the base and out of any other client's copy. Some of the exported instructions contain real customer names.

Things that bite:

- The dashboard page script sits inside a `String.raw` template in `src/dashboard.ts`. It must not contain backticks or `${`. Check visual changes with a Playwright screenshot.
- Supabase returns at most 1000 rows per request. Use `sbAll` from `src/db.ts` for anything that can grow.
- The Cloudflare free plan allows 50 outbound calls per run, so batch sizes are kept small. Admin jobs over big lists run in chunks.
- Model thinking can use the whole token budget and return no text. `runAgent` handles this; keep it that way.

# Setting up a copy for another client

The rule for every client: the client owns their data (customers, conversations, calls, their library, their business details and their keys). They do not own the system. Their data never goes into another client's copy or into the base.

1. Duplicate this repo into a new private repo for the client. Never share a Worker, a database or keys between clients.
2. Create a Cloudflare Worker and a Supabase project for them. Run `supabase/schema.sql`, then the numbered files in order.
3. Add the secrets in Cloudflare: GHL token and location id, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY` (the client's own key from their own Claude Console account, so AI costs bill to them, with a spending limit set there), a long random `ADMIN_TOKEN`, `WEBHOOK_SECRET`, and the Jobber app id and secret if they use Jobber.
4. Change the business details. They are still spread through the code, mainly: the account names (`dunzo`, `lights`) in `src/types.ts` and `src/ghl.ts`, business knowledge, prices and links in `src/knowledge.ts`, agent playbooks in `src/playbook.ts`, the quote step in `src/quote.ts`, the follow up offer in `src/chaser.ts`, tag rules in `src/segments.ts`, and names and colours in `src/dashboard.ts`.
5. Point the client's GHL inbound message webhook at the Worker, then test with one contact tagged `bot-test` and `BOT_MODE` set to `test` before going live.

The planned improvement is to gather step 4 into a single business profile, so a new client means filling in one file.
