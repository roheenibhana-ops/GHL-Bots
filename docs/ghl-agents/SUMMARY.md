# GoHighLevel Agent Studio agents: what each one does

Source: the 13 exported agent files in `docs/ghl-agents/dunzo/` and `docs/ghl-agents/lights/`, read from GoHighLevel on 2026-11-26. This is a literal description of what the exported settings, triggers and system prompts say. Nothing here was tested against live GoHighLevel. Where a file does not say something, it is marked "not stated" or "unclear". Customer names that appear inside the prompts are deliberately not copied here.

Shared facts:

- Dunzo pipeline: "Lead Nurture Pipeline 2027", id `zsWyKWFJMybbPdMehZFE`. Dunzo knowledge base id: `xMx2FxHUMzfihwBtFffn`.
- Lights pipeline: "Christmas Lighting Nurture", id `wfoJW8c5BbVDhZ7BiKo6`. Lights knowledge base id: `0W3lrg8Z3gcDpCiBs0Ud`.
- Every agent has one plugin: `default` ("Built-in crm skills for your agent", `allSkills: true`), `customApiEnabled: false` where shown, `imageGeneration: null`, and `contextManagement: summarize, keepRecentTurns 10, compactionThreshold 0.9`.
- All schedules are in `America/Los_Angeles`.
- Stage ids appear in the triggers without names. The stage name given beside each id below is taken from the trigger name or trigger message, not from a lookup.
- "Clark" is the internal person every agent escalates to. Other staff named: Vic, ROHEENI (also written Roheeni), Kristina Stewart.
- The "winter promo" stop rule (if the contact has the tag `winter promo`, any capitalisation, do nothing at all) is in Dunzo agents 01 to 05 only. It is not in Dunzo 06 and not in any Lights agent.

---

## Dunzo Gutters: 01. Take Off

1. **Purpose.** Checks each new website quote lead: is the address real and in the Sacramento area, have photos already arrived, and if not, asks for photos and reminds on a cadence. Marks photo completion and rejects fake or out of area leads.
2. **Published.** Yes (version 4 of 5).
3. **Triggers.**
 - `opportunity_created`, "New Quote Opportunity Created": pipeline `zsWyKWFJMybbPdMehZFE`, stage `86aa38d0-656c-46b5-bbad-c2b5cc6fd36a` (New Lead). Message: "A new opportunity "{{opportunityName}}" was created for a Dunzo Gutters quote lead. Check the address, photo status, stage, tags, notes, messages, uploads, and service details, then process the picture workflow automatically."
 - `opportunity_status_changed`, "Quote Opportunity Updated": same pipeline, **no stage filter**. Message: "Opportunity "{{opportunityName}}" changed to status "{{opportunityStatus}}". Review the stage, tags, notes, messages, uploads, and photo workflow requirements, then process this update without undoing human or automation changes."
 - `schedule`, "Daily Photo Nurture Check": every 1 day at 09:00 Pacific from 2026-09-30, never ends. Message: review "New Lead opportunities in the Lead Nurture Pipeline 2027 and send only due photo follow-ups according to the Pacific-time nurture cadence, duplicate guard, tags, stage, address status, and message history."
 - `workflows`, "Workflow Invoked Lead Review": invoked by a GHL workflow (which one is not stated). Message: "Carry out the requested quote-lead photo, address, message, or stage-review task according to your instructions."
4. **What it reads.** Contact fields, tags, opportunity and its stage, objection reason field, conversation history (SMS, MMS, email, chat), form submissions and uploads, email attachments and inline images, opportunity notes, "CRM chat notes", "lead chat notes", DND and opt out indicators, property address, lead source, services selected on the quote form. Photo evidence includes Quo share links (`share.quo`, `share.quo.com`), shared albums, cloud drive links, upload links. Web search and web fetch for address checks and public exterior photos.
5. **What it does, in order.**
 1. Winter promo check: tag `winter promo` present, stop.
 2. Address check. If clearly fake, spam, impossible, unusable or clearly outside Sacramento: send the customer "Thanks for reaching out. We only serve in and around Sacramento, so unfortunately we would not be able to help with this address." then add tag `ghost`, set objection reason `Ghost`, move to stage **Lost - Reason for Objection**, verify all three, stop. If address missing or incomplete but lead looks real and local: ask the customer for the full property address.
 3. Tag `ai-visualizer` (or `ai visualizer`): stop the picture workflow, no message, note or stage move.
 4. Tag `photos received` already present: make sure the opportunity is in **Photos Received** (move it if not), stop, no message.
 5. Search everywhere for existing photos. If found (including a Quo share link in notes): add tag `photos received`, move to **Photos Received**, verify, stop.
 6. If photos arrived as inbound SMS or MMS media: same tag and stage move, then send an acknowledgement such as "Thanks for sending those over, we've got the pics now." (about 2 minutes after detection "where supported").
 7. If the opportunity is not in **New Lead**: stop, no request.
 8. Look online for a public exterior photo of the address. If a confident match: send it and ask "I found this photo online for the property. Does this show the house and the areas you want done, or would you mind sending a couple of current photos?" A clear yes counts as photos received (tag plus stage move).
 9. Otherwise send the photo request. Base: "Thanks for requesting a quote. Could you please send through a few pictures so we can give you an accurate price?" plus a per service ask (gutters: each side showing full gutter line, close ups of problem areas and downspouts; roof cleaning: roof from the ground each side, and one or two stories; solar: panels, roof, rough panel count; windows: front, sides, back, rough window count and stories; pressure washing: each area and rough size; mixed or unclear: front, left, right, back).
 10. Reminders on the cadence below while still in **New Lead**.
 11. Answers customer questions from known facts (quotes free, gutter cleaning from $249, firm price before work, Greater Sacramento, no roofing, solar installation or window replacement), then steers back to photos.
 12. If the customer says no, not interested or stop: no more picture messages, notify Clark internally, no stage move.
 - Channel: SMS first; email once only if SMS is invalid, blocked, opted out or fails. Never both.
 - Internal: notifies Clark "through an internal or admin channel" on any failed or unverifiable step (contact, opportunity, stage, what was attempted, what failed, what needs review). Exact channel not stated.
6. **Timing rules.** First request or image confirmation within about 5 minutes of the event. Thank you about 2 minutes after detection. Duplicate guard: no picture request, image confirmation or reminder if one was sent by the agent, Clark or any automation in the last 20 hours. Cadence anchored to the first request timestamp (not lead creation): 9:00 AM Pacific reminder next morning; daily 9:00 AM reminder for the first 2 days; every second day for the rest of week 1; two reminders in week 2; one in week 3; after 3 weeks "gentle, low-frequency follow-up until a human intervenes" (frequency not defined, no end). A stated delay reason pauses reminders until the timeframe passes. One word replies ("ok", "yes", "thanks") do not pause. If no first request timestamp can be found: do not guess, notify Clark, pause that lead. No send hours window is stated other than the 9:00 AM reminder time.
7. **Hard rules.** Only two stage moves allowed (to **Photos Received**, to **Lost - Reason for Objection**). Never move a lead to objection for no response. Never move from **Waiting on Quote** to **Pre Quote Contact Made**, never move anything into **Pre Quote Contact Made**. Never undo a stage change made by a person or automation. Never ask for pictures outside **New Lead**. Never treat an unconfirmed online image as photos received. Never promise a price. No em dashes or "awkward hyphenated phrasing". Never send internal notes, errors or reasoning to the contact. If anything cannot be verified: do not send, tag or move; notify Clark and pause.
8. **Tools.** Model `anthropic/claude-sonnet-5-5`, reasoning effort **high**. Tools: `web_fetch`, `web_search`, `kb_search`. Knowledge base `xMx2FxHUMzfihwBtFffn`. Plugin `default`.
9. **Depends on or hands off to.** Clark (all escalations). An unnamed GHL workflow that invokes it. Whatever writes Quo share links into notes. Overlaps with Dunzo 02 (same stage move and a thank you). Audited by Dunzo 06.
10. **Oddities.**
  - The prompt calls the agent "Opportunity Notes Helper", not "Take Off".
  - The out of area message is sent to leads judged fake or spam as well, before tagging (the Lights version says "when appropriate").
  - The status changed trigger has no stage filter, so every status change in the pipeline runs this agent at high reasoning effort. The daily run also walks every New Lead opportunity. Likely the most expensive Dunzo agent.
  - The first request has no send hours limit: a lead created at night gets a text within about 5 minutes.
  - Sending a photo of the customer's house found online is a privacy and wrong house risk, and nothing in Settings gives it a way to attach an image other than a link.
  - "Waiting on Quote" and "Pre Quote Contact Made" are stage names that appear nowhere else in the Dunzo files.
  - No instruction about who the messages are signed as.
  - Both this agent and Dunzo 02 can thank the customer for the same photos (different wording).

## Dunzo Gutters: 02. Dunzo KB Photo Assistant

1. **Purpose.** Backup photo detector for New Lead opportunities: if the customer has supplied photos, moves the opportunity to Photos Received and sends a thank you. Also written as a knowledge base question answerer.
2. **Published.** Yes (version 3 of 4).
3. **Triggers.**
 - `opportunity_created`, "New Lead Opportunity Photo Check": pipeline `zsWyKWFJMybbPdMehZFE`, stage `86aa38d0-…` (New Lead). Message ends: "If qualifying photos are found, move the opportunity to Photos Received and send the approved thank you reply. If no qualifying customer supplied photos are found, leave it unchanged and do not send a customer facing message."
 - `opportunity_status_changed`, "Updated New Lead Photo Check": same pipeline and stage. Same instruction.
 - `schedule`, "Four Hour New Lead Photo Scan": every 4 hours from 2026-09-29 21:32 Pacific (so 21:32, 01:32, 05:32, 09:32, 13:32, 17:32), never ends. Scans all New Lead opportunities and asks for "an internal scan report".
4. **What it reads.** Opportunity stage; recent chat, SMS and email history; opportunity notes (every time); attachments (JPG, JPEG, PNG, HEIC, WEBP, GIF); photo links, shared file URLs, Quo links, share.quo links, "quote related links"; Zapier logged notes; tags, notes and messages to tailor the thank you; the knowledge base for questions; contact tags for `winter promo`.
5. **What it does, in order.**
 1. Winter promo check (skip that contact; in a scan, continue with the others).
 2. Confirm the opportunity is in **New Lead**.
 3. Look for photo evidence and confirm it is inbound from the customer (outbound team images, staff notes, example job photos do not count; unclear direction does not count).
 4. If qualifying: move the opportunity to **Photos Received**, then send the thank you. Default: "Awesome, thank you so much for sending those photos over! We got them, and our team will take a look so we can get your quote sorted. We really appreciate it!" (may be lightly tailored to the service). Channel not stated.
 5. If photos are said to be sent but are broken or inaccessible: "politely ask the contact to resend the photos" and notify the team.
 6. If nothing qualifies: no change, no message.
 7. Scheduled scan: produce a scan report (count reviewed, channels checked, notes checked, evidence found and its source, action taken).
 8. Knowledge base questions: search first; if no answer say "I don't have specific information on that. Let me connect you with someone who can help."; log unanswered questions for the team.
 - Tags: none added or removed. It does **not** add `photos received`.
 - Internal: notifies "the team" through "an internal channel" (failed stage update, opportunity not found, unclear sender direction, inaccessible files, frustrated user).
6. **Timing rules.** Scan every 4 hours as a "backup sweep". No send hours, no wait, no numeric duplicate window (only "do not send duplicate thank you messages for the same photo submission").
7. **Hard rules.** Do not move to **Photos Received** unless the opportunity is in **New Lead** and customer photos are found. Never count outbound or staff images. No duplicate thank you. No price or timing promises unless in the knowledge base. No em dashes or hyphens in customer replies. Do not say "according to our knowledge base". Never send internal notes or errors to the customer. Do not claim a CRM action succeeded until the plugin confirms it.
8. **Tools.** Model `anthropic/claude-sonnet-5-5`, reasoning medium. Tools: `web_search`, `kb_search`. Knowledge base `xMx2FxHUMzfihwBtFffn`. Plugin `default`.
9. **Depends on or hands off to.** "The team" (no names). Zapier logged notes and Quo links as evidence sources. Overlaps with Dunzo 01. Dunzo 06 audits it under the name "02. Mr Photos Received".
10. **Oddities.**
  - It does not add the `photos received` tag, while Dunzo 01 treats the tag and the stage as a required pair. Dunzo 01 would have to repair the tag later.
  - The thank you can go out at 01:32 or 05:32 Pacific because there is no send window.
  - The knowledge base answering half has no trigger: there is no inbound message trigger, and the prompt itself says it does not run from a customer chat.
  - Where the scan report goes is not stated (presumably the run output).
  - Possible double thank you with Dunzo 01.

## Dunzo Gutters: 03.Lead Follow-Up

1. **Purpose.** Follows up quoted leads: a one time "did the quote come through" confirmation after a lead enters Quote Sent, answers to unanswered customer questions, and proactive follow ups, all written "as Clark". Escalates anything risky.
2. **Published.** Yes (version 3 of 4).
3. **Triggers.**
 - `schedule`, "Three Hour Lead Check": every 3 hours from 2026-09-30 00:00 Pacific (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00). Message: "Scheduled 3 hour check triggered at {{run_time}}. Perform the cheap timestamp-first review for eligible Quote Sent and Post Quote Contact Made leads, then only do full context review when at least 3 hours have passed or meaningful new activity exists."
 - `schedule`, "Daily Quote Cadence": every 1 day at 09:00 Pacific from 2026-09-30. **Its trigger message is the same text as the 3 hour check** ("Scheduled 3 hour check triggered…").
 - `opportunity_status_changed`, "Quote Sent Stage Entry": pipeline `zsWyKWFJMybbPdMehZFE`, stage `f52cb263-87c1-44e8-960e-cc98cded9a9a` (Quote Sent). Message: "Opportunity "{{opportunityName}}" changed to Quote Sent. Wait until at least 10 minutes after stage entry, then send the one-time quote receipt confirmation only if every consent, duplicate, household, retry, routing, quarantine, lookup, and allowed-window check passes."
 - `workflows`, "Workflow Inbound Rescue": invoked by a GHL workflow (not named). Message: "Determine whether this is a new unanswered inbound message, Quote Sent check, retry, or routine review, then follow the correct safety and context process before taking any action."
4. **What it reads.** Its own last check or last action timestamp per lead ("from your own notes or prior activity record"); conversation, chat and email history; contact notes, opportunity notes, pasted texts and emails, call notes, senderless notes, team notes, quote notes and "Jobber quote detail notes"; prior run summaries; plugin results; related contacts and opportunities sharing phone, email, property, quote or household; consent, DND and opt out status; tags; the knowledge base. Covers open opportunities in **Quote Sent** and **Post Quote Contact Made**.
5. **What it does, in order.**
 1. Winter promo check.
 2. Decide the situation: (1) new unanswered inbound message, (2) lead just entered Quote Sent, (3) anything else.
 3. Situation 3: cheap timestamp check first. If it checked this lead under 3 hours ago and nothing new happened, skip without reading anything else. If no timestamp exists, treat as over 3 hours and "record the check time" (where is not stated).
 4. Situation 2: if at least 10 minutes since stage entry and no confirmation, acknowledgement or similar human message exists for the contact, phone, email, household, buying unit, opportunity, thread, property or quote, send one short quote receipt confirmation written from scratch in Clark's voice. Example style given in the prompt (with a placeholder first name): "Hey [name], just wanted to make sure the gutter cleaning quote came through okay. Any questions I can help with?" If under 10 minutes, do not send yet.
 5. Situation 1: if the lead asked a real question and no human has replied for at least 10 minutes, answer it. Escalate instead if it needs exact pricing, availability, contract changes, refunds, cancellation, conflict or legal judgement.
 6. Daily cadence: proactive follow ups ("check-ins, stale lead messages, quote detail nudges, gallery nudges, resource nudges, and quote follow-ups") using verified Jobber quote details. No template and no day by day cadence is given.
 7. Before outreach, decide whether the lead should stay, "move to a configured next stage", be paused, escalated or quarantined. **No destination stage is named.** If unclear: do not invent a stage, escalate.
 8. Internal notes, only lead specific (message sent, quote receipt confirmation sent, stage moved, question answered, opt out detected, handoff needed, duplicate risk, routing failure quarantine, quote detail uncertainty, outside window risk, plugin failure, blocker). Escalations to Clark: lead name, stage, why, latest customer statement, relevant quote detail, quarantine status, recommended action.
 - Channel: SMS first; email only when SMS is unavailable or not allowed. Never the same message on two channels.
 - Tags: none added or removed. Fields: none named.
 - Allowed business facts: free quotes and inspections, firm price before work begins, licensed and insured, 30 day guarantee.
6. **Timing rules.** Routine evaluation at most every 3 hours per quiet lead. No more than one proactive message to a lead or related buying unit in any 3 hours; no same or similar outbound within 4 hours (except the one time confirmation); no same purpose proactive touch twice in one Pacific day unless the cadence clearly allows. Quote receipt confirmation: at least 10 minutes after stage entry, once ever per quote and household. Proactive messages and confirmations only 8:00 AM to 9:00 PM Pacific, 7 days. Answers to inbound questions (after 10 minutes unanswered) any time, any day. Retries do not reset the send clock. No notes for no change runs.
7. **Hard rules.** Routing failure quarantine: if any note or result implies internal text was sent to a customer ("SYSTEMIC ISSUE FLAGGED", "Internal note sent as SMS", "Wrong phone number sent as SMS", "Automated outreach stopped" and similar), no customer message to that lead or buying unit until Clark reviews; uncertain means quarantined. A successful internal note is not a customer message and is never reused as one. A successful lookup is not permission to send. Anything addressed to Clark, Vic, ROHEENI, Kristina Stewart or the team is internal only; if no verified internal route exists, "send it nowhere". Stay out when a human is engaging (except the one time confirmation). No messages to leads opted out, DND, closed, won, lost, quote approved, in an objection stage or marked stop nurture. Never invent pricing, discounts, dates, availability, line items, warranty, deposits or totals. Never filter leads by owner, sender or assignee. No em dashes or hyphens. Never mention stages, automation or sending windows to the customer. If uncertain whether something was already done, treat it as done and skip. 14 point pre send checklist.
8. **Tools.** Model `anthropic/claude-sonnet-5-5`, reasoning medium. Tools: `web_search`, `kb_search`. Knowledge base `xMx2FxHUMzfihwBtFffn`. Plugin `default`. No wait tool.
9. **Depends on or hands off to.** Clark (reviews, clears quarantine). Vic, ROHEENI, Kristina Stewart named as humans who may be engaging. Jobber quote details copied into notes by something else (a Zap, presumably; not stated). An unnamed GHL workflow that invokes it on inbound messages. Dunzo 06 audits it under the name "03. Post Quote Lead Follow-Up".
10. **Oddities.**
  - It writes to customers **as Clark**, a named person. This conflicts with the repo rule that customer messages are signed as the team and never claim to be a named human.
  - The Quote Sent trigger fires at stage entry, the prompt says wait 10 minutes, and there is no wait tool. In practice the confirmation probably goes out on the next 3 hour run, not at 10 minutes. Unclear from the file.
  - The 09:00 daily trigger and the 09:00 three hour trigger fire at the same minute with the same message, which is the batch collision the prompt spends pages guarding against.
  - The skip check depends on a per lead "last check" timestamp, but the prompt also says not to write notes for no change runs and names no field for the timestamp. If the timestamp is never stored, every run does a full review (cost) or nothing is ever skipped.
  - 3 hour and 4 hour duplicate windows both appear.
  - Proactive cadence (how many days between follow ups, how many in total) is not defined anywhere.
  - "Gallery nudges" and "resource nudges" are mentioned with no links or content.
  - Send window is 8 AM to 9 PM; the repo rule is 8 AM to 8 PM.
  - The quarantine wording shows a past incident where internal notes reached customers by SMS. Internal notification through the GHL plugin should be treated as unsafe until proven.

## Dunzo Gutters: 04.Quote Approval SMS

1. **Purpose.** When an opportunity moves to Quote Approved, sends one thank you SMS saying the team is working on scheduling.
2. **Published.** Yes (version 3 of 4).
3. **Triggers.** `opportunity_status_changed`, "Quote Approved Stage Update": pipeline `zsWyKWFJMybbPdMehZFE`, stage `5458517f-9c63-4a76-ad72-71baf2807190` (Quote Approved); `pageId` is `","`. Message: "Opportunity "{{opportunityName}}" changed to status "{{opportunityStatus}}". Review the pipeline, stage, contact, quote details, and recent conversation history. If this update clearly confirms quote approval for a Dunzo Gutters lead, send the approved quote thank you SMS after eligibility and duplicate checks. If not, do not message the customer and provide a concise internal note."
4. **What it reads.** Trigger payload (opportunity name, contact name, pipeline, stage, status, notes, custom fields, quote information; no custom field is named), contact tags, phone number, SMS opt out and DND, recent conversation history.
5. **What it does, in order.**
 1. Winter promo check (stop with no note at all).
 2. Confirm the event is in the Dunzo pipeline and clearly shows approval (stage named Quote Approved, or status, notes or fields saying approved, accepted, signed, confirmed or authorised).
 3. Check: contact exists, usable SMS number, not opted out, not DND for SMS, this thank you not already sent.
 4. Send exactly one SMS: "Hi {{contact.first_name}}, thank you for approving your quote! We're already working on getting your job scheduled and will be in touch soon with the next steps." Without a first name: "Hi, thank you for approving your quote! …" (same text). "your quote" may become "your seamless gutter quote", "your gutter cleaning quote", "your gutter guard quote", "your gutter repair quote", "your roof cleaning quote", "your solar panel cleaning quote", "your window cleaning quote" or "your pressure washing quote" when the service is clear and single.
 5. End with a short confirmation, or if any check failed, a short internal note such as "No SMS was sent because the contact is opted out or marked DND for SMS."
 - No tags, stage moves or field updates.
6. **Timing rules.** One SMS, sent when triggered. No send hours, no wait. If unsure whether it was already sent, do not send.
7. **Hard rules.** No SMS if approval is ambiguous, wrong pipeline, no number, opt out, DND or possible duplicate. No exact service date unless reliably present in the event data. No pricing, legal terms or new commitments. No mention of automation. No em dashes or hyphens in the customer message or the internal note.
8. **Tools.** Model `anthropic/claude-sonnet-5-5`, reasoning medium. Tools: `web_search`. No knowledge base. Plugin `default`.
9. **Depends on or hands off to.** Whatever moves the opportunity to Quote Approved (not stated; the existing Zaps on Jobber quote approval are the likely source). "The team" does the scheduling. Dunzo 06 audits it.
10. **Oddities.**
  - No send hours: an approval at 11 PM texts at 11 PM.
  - The "internal note" is "returned", which reads as run output, not a saved CRM note. Unclear.
  - `web_search` is enabled but has no use here.
  - The copy is unsigned and does not name Dunzo Gutters.

## Dunzo Gutters: 05.Rehash Reviewer

1. **Purpose.** On the 1st of each month, reviews opportunities in the ReHash stage, finds those due for a check in this month, and writes a follow up plan with suggested messages for people to send.
2. **Published.** **No.** Latest draft is version 3 of 4.
3. **Triggers.** `schedule`, "Monthly Rehash Reconciliation": every 1 month from 2026-10-01 at 09:00 Pacific, never ends; config carries pipeline `zsWyKWFJMybbPdMehZFE` and stage `bbdcdbfa-d4b2-454d-8d71-ba19e53562e0` (ReHash). Message: "Review opportunities in the ReHash stage of the Lead Nurture Pipeline 2027, identify leads due for follow-up during the current month, and create a daily follow-up focus plan with suggested human outreach, blockers, next steps, priority levels, status recommendations, and Clark review notes where needed."
4. **What it reads.** Opportunity details, contact history, chat messages, notes, Jobber quote details in notes, contact tags (winter promo only), the knowledge base.
5. **What it does.** Winter promo contacts are left out of the plan entirely. For each due lead it reports: lead name, why due now, short backstory, likely current situation, likely blocker, best next move, recommended tone, suggested follow up message, daily focus recommendation, priority (High, Medium, Low), status recommendation (including "Status: Abandoned"), Clark review note. Then a team summary: highest value follow ups, suggested daily rhythm, leads to avoid, leads needing Clark's review, patterns. It sends nothing to customers and is not told to tag, move or note anything. Where the report is delivered is not stated.
6. **Timing rules.** Monthly. "Abandoned" only after at least one full month since the lead became due with no progress. High priority leads earlier in the month.
7. **Hard rules.** Do not invent history, pricing, discounts, availability or promises. Do not pressure leads hesitant over money, timing or family. Never label Abandoned before a full month unless Clark said so; Clark decides the final outcome. Drafts: no em dashes or hyphens; only verified facts (free quotes and inspections, firm price before work, licensed and insured, 30 day guarantee). Internal notes stay internal.
8. **Tools.** Model `anthropic/claude-sonnet-4-6`, reasoning medium. Tools: `web_search`, `kb_search`. Knowledge base `xMx2FxHUMzfihwBtFffn`. Plugin `default`.
9. **Depends on or hands off to.** Clark (Abandoned decisions, sensitive leads). "The team" sends the messages.
10. **Oddities.**
  - Not published, so it is not running, although the trigger is enabled.
  - Unlike the Lights version it has no read only guardrail. Nothing forbids it from sending or writing; it is only described as recommending.
  - Stage is written "ReHash" here and "Rehash" in Dunzo 06.
  - Uses an older model than agents 01 to 04.

## Dunzo Gutters: 06.Daily Sales Auditor

1. **Purpose.** At the end of each day, reviews the last 24 hours of the sales pipeline and writes a "DAILY LEAD BOTTOM LINE" report for Clark in the run output.
2. **Published.** **No.** Latest draft is version 2 of 3.
3. **Triggers.** `schedule`, "Daily End-of-Day Pipeline Audit": every 1 day at 20:00 Pacific from 2026-09-30, never ends, no pipeline or stage filter. Message: "Review the last 24 hours of sales pipeline activity, excluding Job Scheduled and Job Unscheduled entirely, verify activity from 01. Take Off, 02. Mr Photos Received, 03. Post Quote Lead Follow-Up, and 04. Quote Approval SMS, then produce the complete DAILY LEAD BOTTOM LINE report directly in this run output with the required delivery note and no automatic internal email or contact-based delivery."
4. **What it reads.** In priority order: opportunity notes, agent notes, note and activity summaries; pipeline activity, stage movement, tags, fields, status; recent conversation history only when notes are unclear; Quo transcripts found inside notes or chat; Jobber related quote sent, quote approved, job status, scheduling fields, tags, sync fields and notes as reflected in GHL. Stages reviewed: **New Lead**, **Photos Received**, **Appointment Set**, **Quote Sent**, **Post Quote Contact Made**, **Quote Approved**, **Lost - Reason for Objection** (or objection stages), **Rehash**. It never reads Jobber or Quo directly.
5. **What it does.** Produces one report in the run output, in this order: title "DAILY LEAD BOTTOM LINE - [DATE]"; Audit Window; Delivery Note (report is in the run output, no email sent); Bottom Line Summary (2 to 4 findings); Scorecard (total reviewed, issues, hot leads, bottlenecks, handled, whether the four agents were reviewed); "Clark's Quick View" (3 to 7 items); "Lead Bottom Line" table (Lead, Stage, Bottom Line, Last Meaningful Activity, Primary Agent Check, Team Action, Status); "Needs Attention"; "Operational Blockers" (max 5); "Pipeline Snapshot"; "Automated Wins". Status labels: Needs Attention, Blocked, Handled, No obvious action needed. No customer messages, tags, stage moves, notes or notifications.
6. **Timing rules.** Daily 20:00 Pacific, 24 hour window. Must finish in one run: dedupe repeated notes by contact and issue, cap blockers at 5, drop detail and end with "Top Actions for Clark" if long.
7. **Hard rules.** Ignore **Job Scheduled** and **Job Unscheduled** completely (not even as skipped). Do not send the report by email, customer conversation, Clark's or Roheeni's contact records, Google Drive, PDFs or file links. Never claim an email was sent. Do not draft customer replies unless Clark asks. Do not reproduce raw notes, message bodies or phone numbers. Do not fabricate records.
8. **Tools.** Model `anthropic/claude-sonnet-4-6`, reasoning medium. Tools: `web_search`. No knowledge base. Plugin `default`.
9. **Depends on or hands off to.** Reads the work of agents 01 to 04. Clark reads the report; Roheeni named. Jobber and Quo data only as synced into GHL.
10. **Oddities.**
  - Not published, so not running.
  - It names the agents "02. Mr Photos Received" and "03. Post Quote Lead Follow-Up". Those are the **Lights** names. The Dunzo agents are "02. Dunzo KB Photo Assistant" and "03.Lead Follow-Up". The prompt was copied from Lights.
  - No winter promo rule (it is read only, so low risk, but winter promo contacts will appear in the report).
  - The report exists only in the run output. Someone has to open the run to see it.
  - How it identifies which agent did what is not stated.

---

## Santa's Lights: 01. Take Off

1. **Purpose.** Same job as the Dunzo Take Off for lighting quote leads: address check, look for photos already sent, ask for photos, remind on a cadence, mark photo completion, reject fake or out of area leads.
2. **Published.** Yes (version 46 of 47).
3. **Triggers.**
 - `form`, "Internal Lead Capture Submitted": form id `SXu7NucKGYnDgmqgs3qj`. Message: "A contact just submitted the form "{{formName}}". Form data: {{formData}}. Run Take Off's address quality check, photo check, photo-received completion, and picture follow-up workflow automatically."
 - `opportunity_created`, "New Lead Opportunity Created": pipeline `wfoJW8c5BbVDhZ7BiKo6`, stage `1efe315a-9764-47a1-b75c-60334b09219d` (New Lead). Message: "A new opportunity "{{opportunityName}}" was created for a contact. Run Take Off's address quality check, photo check, photo-received completion, and picture follow-up workflow automatically."
 - No schedule trigger, no status change trigger, no workflow trigger, no inbound message trigger.
4. **What it reads.** Same list as Dunzo 01: contact, opportunity, stage, tags, objection reason field, opportunity notes, "CRM chat notes", "lead chat notes", form data and uploads, emails, attachments, inline images, SMS and MMS media, photo links, Quo share links (`share.quo`, `share.quo.com`, "quo share"), DND and opt out status, property address, lead source. Tags and notes to learn whether the job is "permanent lights, Christmas lights, or another service type". Web search and fetch for address and public exterior photos.
5. **What it does, in order** (the "Addendum: Precision Rules" at the end overrides the body).
 1. Address check. Clearly fake, spam or outside the Sacramento install market: send "Thanks for reaching out. We only install in and around Sacramento, so unfortunately we would not be able to help with this address." ("when appropriate"; for fake addresses "only when it makes sense"), add tag `ghost`, set objection reason `Ghost`, move to **Lost - Reason for Objection**, verify, stop. Missing address on a real looking lead: ask for the full property address.
 2. Tag `ai-visualizer` (or `ai visualizer`): stop the picture workflow.
 3. Tag `photos received` present: confirm or move to **Photos Received**, stop, no thank you resend.
 4. Photos already anywhere (including a Quo share link in notes): add tag `photos received`, move to **Photos Received**, verify, stop. If they came by SMS or MMS, also send a warm acknowledgement with a compliment, for example "Beautiful home, thanks for sending those over. We've got the pics now." or "That looks great, thanks for sending the photos. We've got them now."
 5. Not in **New Lead**: stop.
 6. Look for a public exterior photo; if a confident match, send it and ask "I found this photo online for the property. Does this show the area you want lights on, or would you mind sending a couple of current photos of the part of the house you want done?"
 7. Otherwise the photo request: "Thanks for requesting a quote. Could you please send through a few pictures so we can prepare it accurately? Photos of the front, left side, right side and back of the house are helpful. If you only need work on a specific part of the house, just send clear photos of that area."
 8. Reminders on the cadence; answers questions; notifies Clark internally on failures; on "no", "not interested" or "stop": no more picture messages, flag to Clark, no stage move.
 - Channel: SMS first, email once as fallback.
 - Voice: "Address every customer-facing message as a member of the Santa's Lights team, not as Clark"; sign "The Santa's Lights team" when a sign off fits.
6. **Timing rules.** Identical to Dunzo 01: first request within about 5 minutes; thank you about 2 minutes after detection; 20 hour duplicate guard; 9:00 AM Pacific reminders (next morning, daily for 2 days, every second day for the rest of week 1, twice in week 2, once in week 3, then gentle low frequency until a human intervenes); anchored to the first request timestamp; delay reasons pause it.
7. **Hard rules.** Same as Dunzo 01: only the two stage moves; never to objection for no response; never **Waiting on Quote** to **Pre Quote Contact Made**; never undo others' stage changes; tag must be exactly `photos received` ("do not create or use misspelled versions such as `ohotis received`"); no em dashes or hyphens in customer replies; any message containing "internal", "flag", "Clark", error details or workflow reasoning never goes to the contact; never sign as Clark; when in doubt do nothing and notify Clark.
8. **Tools.** Model `anthropic/claude-sonnet-5-5`, reasoning medium. Tools: `web_fetch`, `image_generation`, `web_search`, `kb_search`. Knowledge base `0W3lrg8Z3gcDpCiBs0Ud`. Plugin `default`.
9. **Depends on or hands off to.** Clark. The "Internal Lead Capture" form. Whatever stores Quo links in notes. Overlaps with Lights 02. Audited by Lights 05.
10. **Oddities.**
  - **There is no schedule or inbound trigger**, yet the prompt describes 9:00 AM reminders over three weeks and reacting when photos arrive by text. With only form and opportunity created triggers, nothing in this file can make the reminders or the photo completion happen later. Either another workflow re invokes it (not shown) or the nurture never runs. Unclear, and the biggest functional gap in the set.
  - A form submission that also creates an opportunity fires the agent twice for the same lead.
  - `image_generation` is enabled although the prompt never uses it. Combined with "send a photo of the property" this could produce a generated house image.
  - The prompt is about 60,000 characters with the same rules repeated five or more times. Version 46: heavily patched.
  - Description is empty and the starter prompts are generic template leftovers (placeholder people and companies, nothing to do with lighting). The prompt calls it "Opportunity Notes Helper".
  - No winter promo rule.
  - No send hours limit on the first request.
  - It uses "I found this photo online" while told to speak as "we".

## Santa's Lights: 02. Mr Photos Received

1. **Purpose.** Backup photo detector for New Lead opportunities in the Christmas Lighting Nurture pipeline: moves to Photos Received and thanks the customer. Also written as a knowledge base answerer.
2. **Published.** Yes (version 8 of 9).
3. **Triggers.**
 - `opportunity_created`, "New Christmas Lighting Nurture Opportunity Created": pipeline `wfoJW8c5BbVDhZ7BiKo6`, stage `1efe315a-…` (New Lead).
 - `opportunity_status_changed`, "Christmas Lighting Nurture Opportunity Updated": same pipeline and stage.
 - `schedule`, "Scan New Leads For Photos Every 4 Hours": every 4 hours from 2026-09-11 15:30 Pacific (15:30, 19:30, 23:30, 03:30, 07:30, 11:30), never ends, same pipeline and stage.
 - All three messages say: check chat, SMS, email and opportunity notes for photos, image links, shared file URLs, Quo links or quote related image links; count only customer supplied photos; "If qualifying photos are found, move the opportunity to Photos Received and send the casual thank-you reply"; if sender direction is unclear, do not move and notify the team.
4. **What it reads.** Same as Dunzo 02: stage, recent chat, SMS and email, opportunity notes, attachments, links, Quo links, Zapier logged notes, the knowledge base.
5. **What it does, in order.** Confirm stage **New Lead**; find customer supplied photo evidence; move to **Photos Received**; send "Awesome, thank you so much for sending those photos over! We got them, and our team will take a look so we can move your lighting project to the next step. We really appreciate it!" (tone may be adjusted); ask the contact to resend if the photos are broken or not visible; notify the team when direction is unclear, files are inaccessible, the opportunity cannot be found or the stage update fails; scan report as in Dunzo 02; knowledge base answers with the same fallback line. No tags added or removed.
6. **Timing rules.** Every 4 hours "to reduce unnecessary scanning cost". No send window, no wait.
7. **Hard rules.** Same as Dunzo 02. Plus: write "from the Santa's Lights team, not as Clark"; no em dashes or hyphens in customer replies.
8. **Tools.** Model `anthropic/claude-sonnet-5-5`, reasoning medium. Tools: `kb_search`, `web_search`. Knowledge base `0W3lrg8Z3gcDpCiBs0Ud`. Plugin `default`.
9. **Depends on or hands off to.** "The team". Zapier and Quo notes as evidence. Overlaps with Lights 01. Audited by Lights 05.
10. **Oddities.**
  - Stage names are written with the pipeline attached and an em dash: "New Lead — Christmas Lighting Nurture", "Photos Received — Christmas Lighting Nurture". The actual stage names are probably just "New Lead" and "Photos Received".
  - Does not add the `photos received` tag.
  - Thank you can go out at 23:30 or 03:30.
  - The role says "for this business" (generic template) and the description calls it "chat-based", but nothing triggers it from a chat.
  - No winter promo rule.

## Santa's Lights: 03. Post Quote Lead Follow-Up

1. **Purpose.** Follows up leads in Quote Sent: one time quote receipt confirmation, answers to unanswered questions, proactive follow ups using Jobber quote details, in the Santa's Lights team voice. Heavy guarding against duplicates and against internal notes reaching customers.
2. **Published.** Yes (version 52 of 53).
3. **Triggers.**
 - `schedule`, "Daily Follow-Up Cadence Check": every 1 day at 09:00 Pacific from 2026-07-11. `endCondition` is `{"type": "never", "endDate": "/null", "occurrences": 72}`. Long message: Situation 3, 3 hour timestamp check first, then "a full stage-based review of every open opportunity in Quote Sent"; reconstruct successful sends after a failed run; "only one safe proactive message is sent per buying unit per allowed window"; window "8:00 AM–9:00 PM Pacific… 7 days a week".
 - `schedule`, "3-Hour Unanswered Question and Quote Confirmation Check": every 3 hours from 2026-08-26 18:55 Pacific (18:55, 21:55, 00:55, 03:55, 06:55, 09:55, 12:55, 15:55). Same odd end condition. Message: cheap timestamp check, then review, never duplicate "quote receipt confirmations, proactive nurture messages, question answers, internal notes, and stage moves".
 - `opportunity_status_changed`, "Quote Sent Stage Entry Check": pipeline `wfoJW8c5BbVDhZ7BiKo6`, stage `904ff8d0-e002-44a0-8b1e-6f033fd1fa33` (Quote Sent). Message: "This is Situation 2. Check the stage-entry or quote-sent timestamp and do not send a quote receipt confirmation until at least 10 minutes have passed… send only one short customer-safe confirmation in Clark's voice after all… checks pass."
 - No workflow trigger and no inbound message trigger.
4. **What it reads.** Own last check timestamp per lead; main conversation, chat and email history; opportunity notes, contact notes, "contact chat notes", "contact email notes", Quo notes, Jobber notes, Jobber quote detail notes, pasted texts and emails, call notes, senderless notes, team notes; prior run summaries; plugin results (named: skill "Create Note on Contact", fields `success`, `data.note.body`, `contactId`; conversation fields `lastMessageDirection`, `lastManualMessageDate`, `lastMessageBody`, `lastOutboundMessageAction`); related contacts and opportunities; consent, DND, opt out; tags; the knowledge base. Covers open opportunities in **Quote Sent** only.
5. **What it does, in order.**
 1. Decide Situation 1, 2 or 3 (same definitions as Dunzo 03).
 2. Situation 3: timestamp skip check; record the check time.
 3. Quarantine check, including a **hard coded list of 7 named customers** (one with a community or organisation name attached) who must get no automated outreach until Clark reviews, plus any related record. The names are in the source file and are not repeated here.
 4. Situation 2: after 10 minutes in Quote Sent, one short confirmation "asking whether the customer received the quote". No template given.
 5. Situation 1: answer a real question when no human has replied for 10 minutes ("Respond immediately").
 6. Daily cadence: "proactive check-ins, stale-lead messages, quote-detail sales nudges, gallery nudges, blog/resource nudges, and quote follow-ups". No templates and no cadence numbers.
 7. Stage decision before outreach: stay, "move to Objection Stage", pause, escalate, quarantine or message. This is the only stage move named.
 8. Internal notes via "Create Note on Contact", body starting "INTERNAL", lead specific only; escalations to Clark in the same short format as Dunzo 03.
 - Channel: SMS first, email only as fallback, never both.
 - No tags or fields changed.
6. **Timing rules.** Same as Dunzo 03: 3 hour skip rule; one proactive message per lead or buying unit per 3 hours; none within 4 hours of another proactive touch; one per Pacific day; confirmation once per quote, person and household, at least 10 minutes after stage entry; proactive and confirmations only 8:00 AM to 9:00 PM Pacific, 7 days; answers to questions any time; retries never resend. The prompt records that "The previous routine operating interval was every 10 minutes for every lead."
7. **Hard rules.** Same set as Dunzo 03 (quarantine, internal versus customer routing lock, human engagement wins, lookup success is not permission, no invented quote details, no person based filtering, silence when in doubt). Extra: "PQCM" and "recommend Vic or Clark" are listed as internal only phrases; never attach a full run summary to any one lead (the rule lists 12 named customers: 6 of the quarantined ones plus 6 others); never send a "cleanup" message after a routing failure. **No rule about em dashes or hyphens.**
8. **Tools.** Model `anthropic/claude-sonnet-5-5`, reasoning medium, `memoryEnabled: false`. Tools: `image_generation`, `web_fetch`, `web_search`, `kb_search`. Knowledge base `0W3lrg8Z3gcDpCiBs0Ud`. Plugin `default`. No wait tool.
9. **Depends on or hands off to.** Clark (only person who clears quarantine). Vic, ROHEENI, Kristina Stewart. Jobber quote details and Quo notes written into GHL notes by something else. Audited by Lights 05.
10. **Oddities.**
  - **Real customer names are written into the prompt**: 13 named customers in total (7 quarantined, 6 more in the note hygiene rule), and several are used again in worked examples that quote message text. This is client data inside a system prompt and must not be copied to another client's build or the base. A rebuild should hold quarantine as data (a flag on the contact), not as names in a prompt.
  - It documents a real incident: internal escalation notes were sent to customers as SMS, a wrong phone number was texted, and a 9:02 AM batch sent duplicates. About half the prompt is scar tissue from that.
  - The stage entry trigger message says "in Clark's voice" while the prompt says "You always communicate as the Santa's Lights team". Direct contradiction.
  - "Respond immediately" to inbound messages, but there is no inbound trigger. A question waits for the next 3 hour run.
  - Same 10 minute wait problem as Dunzo 03 (no wait tool, trigger fires at stage entry).
  - Same timestamp storage problem as Dunzo 03, made worse by `memoryEnabled: false`.
  - `endCondition` says "never" but also carries `occurrences: 72` and `"/null"` strings. If GHL honours the 72, the daily trigger stopped after 72 days (about 2026-09-20) and the 3 hour one after 9 days. Unclear.
  - 3 hour runs at 00:55, 03:55 and 06:55 can send answers to questions at night.
  - `image_generation` and `web_fetch` are enabled with no use in the prompt.
  - Starter prompts talk about "3 days" follow up, which the prompt never defines.
  - The prompt's own examples contain em dashes (for example the "INTERNAL —" note prefix and a quoted follow up text).
  - No winter promo rule.

## Santa's Lights: 04. Quote Approval SMS

1. **Purpose.** When an opportunity moves to Quote Approved in the lighting pipeline, sends one thank you SMS from the Santa's Lights team.
2. **Published.** Yes (version 4 of 5).
3. **Triggers.** `opportunity_status_changed`, "Lighting Quote Approved": pipeline `wfoJW8c5BbVDhZ7BiKo6`, stage `1e5570bf-692f-479c-a642-dbe960640482` (Quote Approved), `opportunityStatuses: ["open"]`. Message: "Opportunity "{{opportunityName}}" changed to status "{{opportunityStatus}}". Check whether this update indicates a quote was approved in the Lighting Nurture pipeline; if so, thank the lead by SMS and let them know the team is working on scheduling the job."
4. **What it reads.** Trigger details (opportunity name, contact name, pipeline, stage, status, notes, custom fields, quote information), the contact's phone number, recent conversation history for duplicates.
5. **What it does.** Confirms the event is in the pipeline and shows approval; confirms a valid phone number; checks the SMS was not already sent; sends exactly one SMS: "Hi {{contact.first_name}}, this is the Santa's Lights team. Thank you for approving your lighting quote! We're already working on getting your job scheduled and will be in touch soon with the next steps." Without a first name: "Hi, this is the Santa's Lights team. Thank you for approving your lighting quote! …". If not sent, ends with a brief internal note saying why. No tags, stage moves or fields.
6. **Timing rules.** One SMS on trigger. No send hours, no wait.
7. **Hard rules.** No SMS if approval is unclear or wrong pipeline. No installation date unless present in the event data. No pricing, legal terms or new commitments. Write as the Santa's Lights team, not Clark. No em dashes in customer messages or internal notes. No mention of automation.
8. **Tools.** Model `anthropic/claude-sonnet-5-5`, reasoning medium. Tools: `web_search`. No knowledge base. Plugin `default`.
9. **Depends on or hands off to.** Whatever moves the opportunity to Quote Approved. The team schedules the job. Audited by Lights 05.
10. **Oddities.**
  - **It never checks opt out or DND.** Only "a valid phone number". The Dunzo version checks both.
  - The pipeline is called "Lighting Nurture" here and "Christmas Lighting Nurture" everywhere else.
  - The role says "a lighting business" (generic) although the SMS names Santa's Lights.
  - No winter promo rule, no send hours.

## Santa's Lights: 05. Daily Audit Police

1. **Purpose.** Nightly review of the Christmas Lighting Nurture pipeline that writes a bottom line report for Clark in the run output.
2. **Published.** **No.** Latest draft is version 32 of 33.
3. **Triggers.** `schedule`, "Nightly Pipeline Audit to Clark": every 1 day at 21:00 Pacific from 2026-09-04, never ends. Message: "Run the end-of-day audit inside the platform for the Christmas Lighting Nurture pipeline and show the completed report directly in this agent run output… Focus on giving Clark the bottom line of where each lead is at right now… Do not create a PDF, use Google Drive, attempt internal email delivery, or draft customer reply snippets unless Clark explicitly asks for them."
4. **What it reads.** Same sources and same stage list as Dunzo 06 (**New Lead**, **Photos Received**, **Appointment Set**, **Quote Sent**, **Post Quote Contact Made**, **Quote Approved**, **Lost - Reason for Objection** / objection handling, **Rehash**), plus the knowledge base. Reviews the work of **01. Take Off**, **02. Mr Photos Received**, **03. Post Quote Lead Follow-Up**, **04. Quote Approval SMS**.
5. **What it does.** Writes one report in the run output: title "DAILY LEAD BOTTOM LINE - [DATE]", Audit Window, Delivery Note, Header, Bottom Line Summary, Scorecard, then "Clark's Quick View", "Lead Bottom Line", "Needs Attention", "Operational Blockers" (max 5), "Pipeline Snapshot", "Automated Wins". Same columns, categories and status labels as Dunzo 06. Changes nothing in the CRM and sends nothing.
6. **Timing rules.** Daily 21:00 Pacific, 24 hour window. Same length controls as Dunzo 06.
7. **Hard rules.** Same as Dunzo 06: ignore **Job Scheduled** and **Job Unscheduled**; no email, PDF, Google Drive, contact record or customer conversation delivery; never claim an email was sent; no customer drafts unless Clark asks; no raw notes, message bodies or phone numbers; no fabrication. The prompt states why: the platform has no "standalone direct internal email notification delivery path" that does not go through a contact record or customer thread.
8. **Tools.** Model `anthropic/claude-sonnet-4-6`, reasoning medium. Tools: `kb_search`. Knowledge base `0W3lrg8Z3gcDpCiBs0Ud`. Plugin `default`.
9. **Depends on or hands off to.** Lights agents 01 to 04. Clark; Roheeni named. Jobber and Quo only as reflected in GHL.
10. **Oddities.**
  - Not published, so not running.
  - Two titles: "Daily Ops Audit - [DATE]" in one section and "DAILY LEAD BOTTOM LINE - [DATE]" in another.
  - The description says "email-ready… for manual forwarding or workflow delivery" and the trigger is named "to Clark", but the prompt forbids email and any delivery.
  - Section order is given three times and differs each time.
  - No winter promo rule.

## Santa's Lights: 06. Rehash Follow-Up Reviewer

1. **Purpose.** Reviews leads in the Rehash stage, finds those due for a check in this month, and writes an internal follow up plan with suggested messages. Strictly read only.
2. **Published.** **No.** Latest draft is version 9 of 10.
3. **Triggers.**
 - `opportunity_status_changed`, "Opportunity status changed": pipeline `wfoJW8c5BbVDhZ7BiKo6`, stage `6935da55-64d6-4e0d-b578-b41d819dd641` (Rehash), `opportunityStatuses: []`. Message: "Opportunity "{{opportunityName}}" changed to status "{{opportunityStatus}}". Process this update accordingly."
 - `schedule`, "Monthly Rehash Follow-Up Reconciliation": every 1 month from 2026-10-01 at 09:00 Pacific, never ends. Message: "Review the Rehash — Christmas Lighting Nurture opportunities that are due for follow-up this month, read their chat messages and notes, identify where each lead is at now, and create a warm, human daily follow-up focus plan for the leads that should be worked this month."
4. **What it reads.** Opportunity details, chat messages, contact history, notes, the knowledge base.
5. **What it does.** Report only, per lead: name, why due, backstory, current situation, blocker, best next move, tone, suggested message, daily focus recommendation, priority (High, Medium, Low), status recommendation (including "Status: Abandoned"), Clark review note. Suggested messages are written as the Santa's Lights team. Example: "Hey {{contactName}}, just wanted to check back in like we talked about. Last time, you were waiting to see how the budget and timing looked for the lights. No pressure at all — are you still thinking about doing something this season, or has that moved down the list for now? If you are still interested, we can help get the next step lined up. — The Santa's Lights team". It sends nothing and writes nothing.
6. **Timing rules.** Monthly on the 1st, plus on each move into Rehash. Abandoned only after one full month since due with no movement.
7. **Hard rules.** "Strictly read-only on every run": never create, update, delete, send, schedule or assign anything, including internal notes, tasks, statuses, tags, opportunities, appointments and customer messages; never cause another tool or agent to do so. Never book or confirm appointments. "Automated Rehash reviews are internal only." Never say something was saved or booked unless verified. No invented history or pricing. Clark decides Abandoned leads. Never write as Clark.
8. **Tools.** Model `anthropic/claude-sonnet-4-6`, reasoning medium. Tools: `web_search`, `kb_search`. Knowledge base `0W3lrg8Z3gcDpCiBs0Ud`. Plugin `default`.
9. **Depends on or hands off to.** Clark (Abandoned decisions). The Santa's Lights team sends the messages and books appointments.
10. **Oddities.**
  - Not published.
  - The description says "daily"; the schedule is monthly.
  - The status changed trigger gives no real instruction ("Process this update accordingly").
  - The workflow says "route the final decision to Clark", while the guardrails say that is not an instruction to notify Clark. The report has no stated destination, so nobody is told.
  - The example message contains em dashes, which the other Lights agents forbid. This agent has no punctuation rule.
  - The strength of the read only guardrail suggests an earlier version wrote notes, tasks or bookings it should not have.
  - No winter promo rule (read only, so low risk).

## Santa's Lights: Install Review Publisher

1. **Purpose.** Two days after a contact is tagged as a won lights job, prepares a social media post pairing real installation photos with the customer's Google review, and publishes only after approval.
2. **Published.** Yes (version 4 of 5).
3. **Triggers.** `tag`, "Lead tag": tag `lights won`, action `added`. Message: "Tag "{{tagName}}" was {{tagAction}} for a contact. Carry out the configured follow-up schedule, then prepare the installation-and-review post using available, verified materials." Follow up schedule: "Prepare installation review post", rule "2 days after lights won tag added".
4. **What it reads.** The tagged contact; installation photos and the Google review "through the CRM plugin"; connected social accounts; web search for public review context; `{{location.name}}` for the business name.
5. **What it does, in order.** Wait 2 days from the start of the run. Check the contact, photos and review. Verify the review and the permission to share photos and quote the review. Draft "concise, platform-appropriate copy". Show the draft, photos, destination accounts and proposed time "to the user for approval". If approved, use "the CRM plugin's social publishing capabilities" to check accounts and create the post. If anything is missing or unavailable, explain the blocker and give a ready draft; "if materials or permissions are missing, request them instead". Report the real outcome. No customer messages, tags, stage moves or fields are specified.
6. **Timing rules.** One step: 2 days after the tag. "If a step's time has already passed when the run reaches it, skip that step."
7. **Hard rules.** Never invent review text, ratings, names or project details. Never generate replacement images and present them as real installs. Never quote an unverified review as authentic. No private customer information. Never claim a post is live unless publishing confirms it. A request to "post a Google review" means sharing an existing one, not submitting or altering one. If a review is a complaint or a misleading edit is requested, pause for human review. No publishing before approval.
8. **Tools.** Model `anthropic/claude-sonnet-5-5`, reasoning medium. Tools: `wait_until`, `web_search`. No knowledge base. `computer: null`. Plugin `default` (social publishing skills).
9. **Depends on or hands off to.** Whatever adds the `lights won` tag (not stated). A human "user" who approves (not named). Connected social accounts in GHL.
10. **Oddities.**
  - The workflow is written as a chat with a user ("Ask for the installation photos…", "Show the draft… to the user for approval"), but it runs from a tag trigger with nobody in the chat. Who it asks and who approves is not defined. Most likely it ends with a draft in the run output that nobody sees.
  - "Request them instead" does not say from whom. Read loosely, it could message the customer to ask for a review or photo permission.
  - Two days after a job is won, the install may not be done and a review is unlikely to exist yet.
  - How it finds the photos (CompanyCam is not mentioned) and how it verifies a Google review is not stated.
  - This is the only agent with no Dunzo counterpart, and the only one that can publish publicly.

---

## Differences between the Dunzo and Lights version

Only real differences are listed. Business wording (gutters versus lights) is left out unless it changes behaviour.

### Take Off (Dunzo 01 versus Lights 01)

| | Dunzo | Lights |
|---|---|---|
| Triggers | Opportunity created in New Lead; any status change in the pipeline; daily 09:00 schedule; workflow invoke | Form "Internal Lead Capture" (`SXu7NucKGYnDgmqgs3qj`); opportunity created in New Lead. **No schedule, no status change, no workflow trigger** |
| Can the reminder cadence actually fire | Yes, from the daily 09:00 run | Not from anything in the file |
| Winter promo stop rule | Yes, first rule | None |
| Reasoning effort | high | medium |
| Tools | `web_fetch`, `web_search`, `kb_search` | Same plus `image_generation` |
| Voice | No signing rule | Must speak as the Santa's Lights team, never as Clark |
| Out of area message | "We only serve in and around Sacramento…", always sent, including to fake leads | "We only install in and around Sacramento…", sent "when appropriate" |
| Photo request | Base line plus a specific ask per service (gutters, roof, solar, windows, pressure washing) | One generic ask: front, left, right, back, or the specific area |
| Photo thank you | "Thanks for sending those over, we've got the pics now." Compliment optional | Compliment on the home encouraged: "Beautiful home, thanks for sending those over. We've got the pics now." |
| Business facts it may state | Free quotes, from $249, firm price, service list, what Dunzo does not do | None listed |
| Prompt | About 23,000 characters, structured | About 62,000 characters, same rules repeated many times, version 46 |
| Punctuation rule | No em dashes, no "awkward hyphenated phrasing" | No em dashes or hyphens |

Stage moves, tags (`photos received`, `ghost`, `ai-visualizer`), objection reason `Ghost`, 20 hour guard and the cadence numbers are the same.

### Photos received (Dunzo 02 versus Lights 02)

| | Dunzo | Lights |
|---|---|---|
| Name | "02. Dunzo KB Photo Assistant" | "02. Mr Photos Received" |
| Winter promo stop rule | Yes | None |
| Schedule start | 2026-09-29 21:32, every 4 hours | 2026-09-11 15:30, every 4 hours |
| Schedule trigger scope | No pipeline or stage in the config | Pipeline and New Lead stage in the config |
| Stage names in prompt | "New Lead", "Photos Received" | "New Lead — Christmas Lighting Nurture", "Photos Received — Christmas Lighting Nurture" |
| Thank you ending | "…so we can get your quote sorted." | "…so we can move your lighting project to the next step." |
| Voice | No signing rule | Santa's Lights team, not Clark |
| Role text | Names Dunzo Gutters and its services | "for this business" (generic) |

Detection rules, what qualifies, no tag added, escalation list and scan report are the same.

### Follow up after quote (Dunzo 03 versus Lights 03)

| | Dunzo | Lights |
|---|---|---|
| Customer voice | **As Clark** | **As the Santa's Lights team** (but the stage entry trigger message still says "in Clark's voice") |
| Stages covered | **Quote Sent** and **Post Quote Contact Made** | **Quote Sent** only |
| Triggers | 3 hourly from 00:00; daily 09:00; Quote Sent entry; workflow "Workflow Inbound Rescue" | 3 hourly from 18:55; daily 09:00; Quote Sent entry. **No workflow or inbound trigger** |
| Schedule end | Never | "never" but with `occurrences: 72` |
| Winter promo stop rule | Yes | None |
| Quarantine | Pattern based only, no customer names | Pattern based plus 7 named customers hard coded; 6 more named customers in the note rule |
| Stage move named | None ("a configured next stage") | "Objection Stage" |
| Punctuation rule | No em dashes or hyphens | None |
| Example confirmation | One example line given | None given |
| Allowed facts | Free quotes and inspections, firm price, licensed and insured, 30 day guarantee | None listed |
| Tools | `web_search`, `kb_search` | Same plus `image_generation`, `web_fetch`; `memoryEnabled: false` |
| Plugin detail | Generic wording | Names the "Create Note on Contact" skill and conversation field names |
| Daily trigger message | Copy of the 3 hour message | Its own long message |

Timing numbers (3 hours, 4 hours, 10 minutes, 8 AM to 9 PM) and the safety logic are the same. The Dunzo prompt is a cleaned up rewrite of the Lights one.

### Quote approval SMS (Dunzo 04 versus Lights 04)

| | Dunzo | Lights |
|---|---|---|
| Opt out and DND check | **Yes, both required** | **None.** Only "a valid phone number" |
| Winter promo stop rule | Yes | None |
| Trigger filter | Stage only | Stage plus `opportunityStatuses: ["open"]` |
| SMS | "Hi {{contact.first_name}}, thank you for approving your quote! …" (no company name) | "Hi {{contact.first_name}}, this is the Santa's Lights team. Thank you for approving your lighting quote! …" |
| Service tailoring | 8 allowed service phrases | None |
| Punctuation rule | No em dashes or hyphens | No em dashes only |
| Duplicate rule | If uncertain, do not send | Do not send if history shows it was sent (no "if uncertain" rule) |
| Pipeline name used | "Dunzo Gutters pipeline" | "Lighting Nurture" (elsewhere "Christmas Lighting Nurture") |

### Rehash (Dunzo 05 versus Lights 06)

| | Dunzo | Lights |
|---|---|---|
| Triggers | Monthly only | Monthly plus on every move into the Rehash stage |
| Read only guardrail | **None** | **Explicit and strict**: no notes, tasks, tags, statuses, bookings or messages, even if asked |
| Winter promo stop rule | Yes (excluded from the plan) | None |
| Voice of drafts | Not stated (first person "I") | Santa's Lights team, signed "The Santa's Lights team", never Clark |
| Punctuation rule for drafts | No em dashes or hyphens | None; the example uses em dashes |
| Verified facts list | Free quotes and inspections, firm price, licensed and insured, 30 day guarantee | None |
| Report | Per lead fields plus a five part team summary | Per lead fields only |
| Next step vocabulary | "free inspection", repair versus replacement, cleaning versus guards | "walkthrough" |
| Stage name | "ReHash" | "Rehash" |

Both are unpublished, both use `claude-sonnet-4-6`, both start 2026-10-01 at 09:00.

### Daily audit (Dunzo 06 versus Lights 05)

| | Dunzo | Lights |
|---|---|---|
| Run time | 20:00 Pacific, from 2026-09-30 | 21:00 Pacific, from 2026-09-04 |
| Tools | `web_search`, no knowledge base | `kb_search`, knowledge base attached |
| Agent names it audits | Uses the **Lights** names ("02. Mr Photos Received", "03. Post Quote Lead Follow-Up"), which do not match the Dunzo agents | Names match |
| Title | "DAILY LEAD BOTTOM LINE - [DATE]" only | Both "Daily Ops Audit - [DATE]" and "DAILY LEAD BOTTOM LINE - [DATE]" |
| Blocker examples | Adds story height, gutter length, number of windows or panels, service areas | Measurements, appointment details |
| Prompt | Short rewrite | Long, repetitive, version 32 |

Both are unpublished, both use `claude-sonnet-4-6`, both write only to the run output, both exclude **Job Scheduled** and **Job Unscheduled**, and neither has the winter promo rule.
