# Zap map

Every Zap in the Zapier account as read on 2026-11-25, step by step, so each can be rebuilt in the app and then switched off. Secrets are left out. The Zaps themselves were not changed.

# Zap details (read from switched-off copies, 2026-11-25)

Shared ids. Dunzo GHL pipeline "Lead Nurture Pipeline 2027" = `zsWyKWFJMybbPdMehZFE`. Dunzo Jobber connection = 55717450. Dunzo GHL (LeadConnector) connection = 66625482.

## 381861271 — Dunzo 2027 New Lead Stage to Jobber Client Creation (read earlier)
- Trigger: LeadConnector `pipeline_trigger` (HighLevelCLIAPI@3.0.5), connection 66625482, params pipelineId `zsWyKWFJMybbPdMehZFE`, pipelineStageId `86aa38d0-656c-46b5-bbad-c2b5cc6fd36a` (New Lead).
- Trigger fields used: email, first_name, last_name, phone, address1, city, postal_code, state, tags, "Quote Request Summary".
- Step 1 Jobber `clientSearch` (search_or_write, create if missing; `_zap_search_success_on_miss: false`, `_zap_search_multiple_results: "first"`): searchable_name=email, c_first_name, c_last_name, c_email_address=email, c_phone_number=phone, c_street1=address1, c_city, c_postalCode=postal_code, c_province=state.
- Step 2 Jobber `clientTagCreate`: c_add_tag_id = step1 data[0].id, c_add_tag_tags_to_add = [tags] (the whole GHL tags string as one item).
- Step 3 Jobber custom action `ae:657133` (Add Note to Jobber Client): clientId = step1 data[0].id, message = "Quote Request Summary".
- Import issues: step 1 is search_or_write, data[0] undefined on empty result (non blocking).

## 384206949 — Dunzo 2027- Update Contact Details From Jobber To GHL
- Trigger: Jobber `clientUpdate` (JobberCLIAPI@3.0.9), connection 55717450, no params.
- Trigger fields used: firstName, lastName, primaryPhone.number, primaryEmail.address, properties[]street1, properties[]city, properties[]postalCode.
- Step 1 LeadConnector `add_update_contact` (connection 66625482): firstName, lastName, phone=primaryPhone.number, email=primaryEmail.address, address1=properties[]street1, city=properties[]city, postalCode=properties[]postalCode, tags=`contact details updated`, source=`Jobber`, lead=true.
- No filters. Issues: none.

## 384206689 — Dunzo 2027 Jobber Archived Lead To Lost In GHL
- Trigger: Jobber `jobUpdate`, connection 55717450, no params.
- Filter: continue only if lowercase(jobStatus) === `archived`.
- Trigger fields used: jobStatus, client.firstName, client.lastName, client.primaryPhone.number, client.primaryEmail.address, property.street1, property.city, property.postalCode.
- Step 1 LeadConnector `add_update_opportunity` (connection 66625482): firstName, lastName, phone, email, address1=property.street1, city, postalCode, tags=`dunzo lost`, lead=true, pipelineId=`zsWyKWFJMybbPdMehZFE`, stageId=`092b835e-90cb-4146-a2ab-12510de4b176`.
- Note: the trigger is a JOB update with status archived (not a lead/request). Issues: none.

## 382022281 — Dunzo 2027- Quote Approved from Jobber To GHL
- Trigger: Jobber `quoteApproved`, connection 55717450, no params.
- Trigger fields used: client.firstName, client.lastName, client.primaryPhone.number, client.primaryEmail.address, client.jobberWebUri, property.street1, property.city, property.postalCode, quoteNumber, quoteCreatedAt.
- Step 1 LeadConnector `add_update_contact`: firstName, lastName, phone, email, lead=true, address1, city, postalCode, jobber_client_url=client.jobberWebUri, message=quoteNumber, jobber_created_date=quoteCreatedAt, tags=`quote approved`, source=`jobber`.
- Step 2 LeadConnector `add_update_opportunity`: same contact fields, pipelineId=`zsWyKWFJMybbPdMehZFE`, stageId=`5458517f-9c63-4a76-ad72-71baf2807190`, jobber_client_url, message=quoteNumber, jobber_created_date, address1, city, postalCode, source=`jobber`, tags=`quote approved`.
- No filters. Issues: none.

## 382022193 — Dunzo 2027 - Job Created & Scheduled from Jobber To GHL
- Trigger: Jobber `jobHook` (new job), connection 55717450, no params.
- Trigger fields used: client.firstName, client.lastName, client.primaryPhone.number, client.primaryEmail.address, client.jobberWebUri, property.street1, property.city, property.postalCode, createdAt.
- Step 1 LeadConnector `add_update_contact`: firstName, lastName, phone, email, lead=true, address1, city, postalCode, jobber_created_date=createdAt, jobber_client_url=client.jobberWebUri, tags=`job scheduled`, source=`jobber`.
- Step 2 LeadConnector `add_update_opportunity`: firstName, lastName, phone, email, lead=true, pipelineId=`zsWyKWFJMybbPdMehZFE`, stageId=`84a0da26-172e-4b29-a4ab-f2d8b4652aef` (Job Scheduled), jobber_client_url, message=`` (empty), jobber_created_date=`` (empty), address1, city, postalCode, source=`Jobber`, tags=`job scheduled`.
- No filters: every new job goes to Job Scheduled whether or not it has a date. Issues: none.

## 382021851 — Dunzo 2027 - Scheduled And UnScheduled Jobs In Jobber
- Trigger: Jobber `jobUpdate`, connection 55717450, no params.
- Trigger fields used: jobStatus, client.firstName, client.lastName, client.primaryPhone.number, client.primaryEmail.address, property.street1, property.city, property.postalCode, createdAt.
- Path A, if lowercase(jobStatus) === `upcoming`: LeadConnector `add_update_opportunity`: firstName, lastName, phone, email, address1, city, postalCode, tags=`job scheduled`, source=`jobber`, lead=true, pipelineId=`zsWyKWFJMybbPdMehZFE`, stageId=`84a0da26-172e-4b29-a4ab-f2d8b4652aef`, jobber_created_date=createdAt.
- Path B, if lowercase(jobStatus) === `unscheduled`: same action and fields but tags=`job unscheduled`, stageId=`5cdeb439-5a5f-4401-a09b-ecd67bd3b8cb`.
- Other statuses: nothing. Issues: none.

## 382021713 — Dunzo 2027 - Job Completed Jobber To GHL
- Trigger: Jobber `jobClosed`, connection 55717450, no params.
- Trigger fields used: client.firstName, client.lastName, client.primaryPhone.number, client.primaryEmail.address.
- Step 1 LeadConnector `add_update_contact`: firstName, lastName, phone, email, lead=true, source=`Jobber`, tags=`job closed`.
- No opportunity step: it only tags the contact `job closed`. (A GHL workflow presumably acts on that tag.) Issues: none.

Quo (OpenPhone) connection for Dunzo Zaps = 63237787. Dunzo Quo line id = `PNoFRrHMiM`.

## 382021540 — Dunzo 2027- Outgoing Message From Quo To GHL Trigger
- Trigger: Quo `message_delivered` (OpenPhoneCLIAPI@1.4.3), connection 63237787, params resource_ids=[`PNoFRrHMiM`].
- Trigger fields used: to, body.
- Step 1 LeadConnector `add_update_contact` (connection 66625482): tags=`` (empty), phone=to, source=`Quo Call`, lead=true, notes=body, message=``.
- Effect: every text the team sends from Quo becomes a NOTE on the GHL contact (created if missing, source "Quo Call"). No filters. Issues: none.

## 382021277 — Dunzo 2027- Incoming Message From Quo To GHL Trigger
- Trigger: Quo `new_incoming_message`, connection 63237787, params resource_ids=[`PNoFRrHMiM`].
- Trigger fields used: body, from, media[]url, media.
- Step 1 AI by Zapier `get_completion` (step name "AI To Read to Call Summary"): provider `openai`, model `openai/gpt-4o-mini`, isOutputArray=true, input = body, outputSchema { classification: "(Positive / Negative / None)", reason: "Short explanation" }. Instructions verbatim:
  "You are reviewing a customer message for a home services company.\n\nClassify the customer's response into one of these 3 categories:\n\n1. Positive - They showed interest, asked questions, or said they will get back / think about it.\n2. Negative - They said no thanks, not interested, too expensive, or clearly declined.\n3. No real response - Mostly voicemail, very short hello, or no meaningful conversation.\n\nAnswer ONLY with one of these three words: Positive, Negative, or None\n\nIf Positive or Negative, also write one short sentence with the reason."
- Path A, if lowercase(result[0].classification) === `positive`: LeadConnector `add_update_contact`: tags=`quo-message-positive`, phone=from, source=`Quo Call`, lead=true, notes = body + media[]url + media (concatenated), message=``.
- Path B, if === `negative`: LeadConnector `add_update_contact`: phone=from, tags=`quo-message-negative`, lead=true, message=``, notes=body. (No source set.)
- None: nothing is written to GHL.
- Issues: none reported, but the path conditions were copied as untranslated Zap expressions (`{{=output['382021278']["result"][0]["classification"]}}`).

## 382020257 — Dunzo 2027 Quo Transcript to LeadConnector Contact Update
- Trigger: Quo `call_transcripts`, connection 63237787, params resource_ids=[`PNoFRrHMiM`].
- Trigger fields used: object, dialogue[]content, dialogue[0].identifier.
- Step 1 LeadConnector `add_update_contact`: phone = dialogue[0].identifier (the first speaker's number), lead=true, notes = object + dialogue[]content (this is why GHL notes start with "callTranscript" followed by the lines joined by commas).
- No tags, no source, no filters.
- Issues: phone field is a Zap expression the import could not translate (`{{=output['382020257']["dialogue"][0]["identifier"]}}`).

## 382019864 — Dunzo 2027 - Quote Sent From Jobber to GHL
- Trigger: Jobber `quoteSent`, connection 55717450, no params.
- Trigger fields used: client.firstName, client.lastName, client.primaryEmail.address, client.primaryPhone.number, client.jobberWebUri, property.street1, property.city, property.postalCode, quoteCreatedAt, quoteNumber, lineItems[]name, lineItems[]description, lineItems[]totalPrice.
- Step 1 LeadConnector `add_update_contact`: firstName, email, phone, lastName, lead=true, address1, city, postalCode, jobber_client_url=client.jobberWebUri, jobber_created_date=quoteCreatedAt, source=`jobber`, tags=`quote sent`, notes__remarks=``.
- Step 2 LeadConnector `add_update_opportunity`: lead=true, pipelineId=`zsWyKWFJMybbPdMehZFE`, stageId=`f52cb263-87c1-44e8-960e-cc98cded9a9a` (Quote Sent), firstName, lastName, phone, email, jobber_client_url, name=``, message=quoteNumber, jobber_created_date=quoteCreatedAt, address1, city, postalCode, tags=`quote sent`, source=`jobber`, notes = `Quote Number{quoteNumber} | Item: {lineItems[]name} | Description: {lineItems[]description} | Price: {lineItems[]totalPrice}` (no space after "Quote Number", verbatim).
- No filters. Issues: none.

## 376192137 — Dunzo 2027 - Jobber new client to CompanyCam project
- Trigger: Jobber `clientHook` (new client), connection 55717450, no params.
- Trigger fields used: firstName, lastName, properties[]street1, properties[]city, properties[]postalCode.
- Step 1 CompanyCam `create_project` (CompanyCamCLIAPI@2.3.2, connection 41022755): name=`{firstName} {lastName}`, street_address_1=properties[]street1, city=properties[]city, postal_code=properties[]postalCode.
- No state, no contact, no filters. Issues: none.

Santa's Lights ids. GHL pipeline = `wfoJW8c5BbVDhZ7BiKo6`. Santa's Lights GHL (LeadConnector) connection = 66625483. Santa's Lights Jobber connection = 55804005.

## 369944018 — Santas Lights - New Lead Created or Existing Client Lead From GHL To Jobber Coming In From Website
- Trigger: LeadConnector `pipeline_trigger`, connection 66625483, params pipelineId=`wfoJW8c5BbVDhZ7BiKo6`, pipelineStageId=`4aa2b2ed-e728-4ba0-9628-adf3c915b09b` (New Lead).
- Trigger fields used: first_name, last_name, email, phone, address1, city, country, state, postal_code, tags, latest_quote_summary.
- Step 1 Jobber `clientSearch` (search_or_write, create if missing; `_zap_search_success_on_miss: false`, `_zap_search_multiple_results: "first"`), connection 55804005: c_first_name, c_last_name, c_email_address=email, c_phone_number=phone, c_street1=address1, c_city, c_country=country, c_province=state, c_postalCode=postal_code, searchable_name=email.
- Step 2 Jobber `clientTagCreate`: c_add_tag_id=step1 data[0].id, c_add_tag_tags_to_add=[tags].
- Step 3 Jobber custom action `ae:657133` (add note): clientId=step1 data[0].id, message=latest_quote_summary.
- Same as the Dunzo version plus country. Issues: step 1 search_or_write data[0] undefined on empty result (non blocking).

Santa's Lights Quo line id = `PN2d58Mbjk` (same Quo connection 63237787).

## 383585414 — Santas Lights Jobber Archived Lead To Lost In GHL
- Trigger: Jobber `jobUpdate`, connection 55804005, no params.
- Filter: continue only if lowercase(jobStatus) === `archived`.
- Step 1 LeadConnector `add_update_opportunity` (connection 66625483): firstName, lastName, phone, email (client.*), address1=property.street1, city, postalCode, tags=`lights lost`, lead=true, pipelineId=`wfoJW8c5BbVDhZ7BiKo6`, stageId=`8c3828b4-45e6-4ac4-b76e-40b9df4a010c`.
- Issues: none.

## 376191870 — Jobber new client to CompanyCam project - Santas Lights
- Trigger: Jobber `clientHook` (new client), connection 55804005, no params.
- Step 1 CompanyCam `create_project` (connection 41022755, the same CompanyCam account as Dunzo): name=`{firstName} {lastName}`, street_address_1=properties[]street1, city=properties[]city, postal_code=properties[]postalCode.
- Issues: none.

## 376165590 — Santas Lights Quo Transcript to LeadConnector Contact Update
- Trigger: Quo `call_transcripts`, connection 63237787, params resource_ids=[`PN2d58Mbjk`].
- Step 1 LeadConnector `add_update_contact` (connection 66625483): phone = dialogue[0].identifier, lead=true, notes = object + dialogue[]content.
- Issues: phone is an untranslated Zap expression (`{{=output["376165590"]["dialogue"][0]["identifier"]}}`).

## 371462108 — Santas Lights - Outgoing Message From Quo To GHL Trigger
- Trigger: Quo `message_delivered`, connection 63237787, params resource_ids=[`PN2d58Mbjk`].
- Step 1 LeadConnector `add_update_contact` (connection 66625483): tags=``, phone=to, source=`Quo Call`, lead=true, notes=body, message=``.
- Identical to the Dunzo version apart from the Quo line and GHL account. Issues: none.

## 371461929 — Santas Lights- Incoming Message From Quo To GHL Trigger
- Trigger: Quo `new_incoming_message`, connection 63237787, params resource_ids=[`PN2d58Mbjk`].
- Step 1 AI by Zapier `get_completion`: provider `openai`, model `openai/gpt-4o-mini`, same instructions and output schema word for word as Dunzo 382021277 (classify Positive / Negative / None, with a short reason).
- Path A positive: LeadConnector `add_update_contact` (connection 66625483): tags=`quo-message-positive`, phone=from, source=`Quo Call`, lead=true, notes = body + media[]url + media, message=``.
- Path B negative: `add_update_contact`: phone=from, tags=`quo-message-negative`, lead=true, message=``, notes=body.
- None: nothing written.
- Issues: none reported; path conditions are untranslated Zap expressions (`{{=output['371461931']["result"][0]["classification"]}}`).

## 371461678 — Santas Lights - Job Completed Jobber To GHL
- Trigger: Jobber `jobClosed`, connection 55804005, no params.
- Step 1 LeadConnector `add_update_contact` (connection 66625483): firstName, lastName, phone, email (client.*), lead=true, source=`Jobber`, tags=`job closed`.
- Tag only, no opportunity move. Issues: none.

## 371461515 — Santas Lights - Scheduled And UnScheduled Jobs In Jobber
- Trigger: Jobber `jobUpdate`, connection 55804005, no params.
- Path A, if lowercase(jobStatus) === `upcoming`: LeadConnector `add_update_opportunity` (connection 66625483): firstName, lastName, phone, email, address1, city, postalCode, tags=`job scheduled`, source=`jobber`, lead=true, pipelineId=`wfoJW8c5BbVDhZ7BiKo6`, stageId=`3d0ccc37-1635-48e6-9fdb-56ccf7fa3f1a`, jobber_created_date=createdAt.
- Path B, if === `unscheduled`: same but tags=`job unscheduled`, stageId=`c387daa8-a192-4af1-8343-2f13c640a0e6`.
- Issues: none.

## 371461409 — Santas Lights- Update Contact Details From Jobber To GHL
- Trigger: Jobber `clientUpdate`, connection 55804005, no params.
- Step 1 LeadConnector `add_update_contact` (connection 66625483): firstName, lastName, phone=primaryPhone.number, email=primaryEmail.address, address1=properties[]street1, city=properties[]city, postalCode=properties[]postalCode, tags=`contact details updated`, source=`Jobber`, lead=true.
- Issues: none.

## 371461284 — Santas Lights - Job Created & Scheduled from Jobber To GHL
- Trigger: Jobber `jobHook` (new job), connection 55804005, no params.
- Step 1 LeadConnector `add_update_contact` (connection 66625483): firstName, lastName, phone, email, lead=true, address1, city, postalCode, jobber_created_date=createdAt, jobber_client_url=client.jobberWebUri, tags=`job scheduled`, source=`jobber`.
- Step 2 LeadConnector `add_update_opportunity`: firstName, lastName, phone, email, lead=true, pipelineId=`wfoJW8c5BbVDhZ7BiKo6`, stageId=`3d0ccc37-1635-48e6-9fdb-56ccf7fa3f1a` (Job Scheduled), jobber_client_url, message=``, jobber_created_date=``, address1, city, postalCode, source=`Jobber`, tags=`job scheduled`.
- Issues: none.

## 371461100 — Santas Lights- Quote Approved from Jobber To GHL
- Trigger: Jobber `quoteApproved`, connection 55804005, no params.
- Step 1 LeadConnector `add_update_contact` (connection 66625483): firstName, lastName, phone, email, lead=true, address1, city, postalCode, jobber_client_url=client.jobberWebUri, message=quoteNumber, jobber_created_date=quoteCreatedAt, tags=`quote approved`, source=`jobber`.
- Step 2 LeadConnector `add_update_opportunity`: same contact fields, pipelineId=`wfoJW8c5BbVDhZ7BiKo6`, stageId=`1e5570bf-692f-479c-a642-dbe960640482` (Quote Approved), jobber_client_url, message=quoteNumber, jobber_created_date, address1, city, postalCode, source=`jobber`, tags=`quote approved`.
- Issues: none.

## 371460954 — Santas Lights- Quote Sent From Jobber to GHL
- Trigger: Jobber `quoteSent`, connection 55804005, no params.
- Step 1 LeadConnector `add_update_contact` (connection 66625483): firstName, email, phone, lastName, lead=true, address1, city, postalCode, jobber_client_url, jobber_created_date=quoteCreatedAt, source=`jobber`, tags=`quote sent`, notes__remarks=``.
- Step 2 LeadConnector `add_update_opportunity`: lead=true, pipelineId=`wfoJW8c5BbVDhZ7BiKo6`, stageId=`904ff8d0-e002-44a0-8b1e-6f033fd1fa33` (Quote Sent), firstName, lastName, phone, email, jobber_client_url, name=``, message=quoteNumber, jobber_created_date, address1, city, postalCode, tags=`quote sent`, source=`jobber`, notes = `Quote Number{quoteNumber} | Item: {lineItems[]name} | Description: {lineItems[]description} | Price: {lineItems[]totalPrice}`.
- Issues: none.

## 382670189 — scoreboard - job closed
- Trigger: Jobber `jobClosed`, connection 55804005 (the SANTA'S LIGHTS Jobber only), no params.
- Trigger fields used: completedAt, jobNumber, total, client.id, lineItems[]totalPrice.
- Step 1 Code by Zapier (JavaScript), input prices = lineItems[]totalPrice:
  ```
  const prices = (String(inputData.prices || '').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  if (prices.length === 0) throw new Error('No line item prices received: ' + inputData.prices);
  const total = prices.reduce((a, b) => a + b, 0);
  return { total, count: prices.length };
  ```
- Step 2 Webhooks by Zapier `post`: url `https://pcjzinbwevnjvojoqdrd.supabase.co/functions/v1/ingest`, payload_type json, wrap_in_array false, unflatten true, header `x-ingest-secret: [secret present]`, data: stage=`installed`, occurred_at=completedAt, source=`jobber`, external_id=jobNumber, value=total (as imported it maps to the trigger's `total`; in the live Zap it most likely uses the code step's summed total), client_id=client.id.
- Issues: credential in headers was stripped by the import; Code step is not supported in the new format.

## 382669901 — scoreboard - quote approved
- Trigger: Jobber `quoteApproved`, connection 55804005 (Santa's Lights Jobber only), no params.
- Trigger fields used: approvedAt, quoteNumber, total, client.id, lineItems[]totalPrice.
- Step 1 Code by Zapier (JavaScript), input prices = lineItems[]totalPrice:
  ```
  const prices = String(inputData.prices || '').split(',').map(Number).filter(n => !isNaN(n));
  const total = prices.reduce((a, b) => a + b, 0);
  return { total, count: prices.length };
  ```
- Step 2 Webhooks `post`: url `https://pcjzinbwevnjvojoqdrd.supabase.co/functions/v1/ingest`, json, header `x-ingest-secret: [secret present]`, data: stage=`sold`, occurred_at=approvedAt, source=`jobber`, external_id=quoteNumber, value=total, client_id=client.id.
- Issues: credential stripped by import; Code step unsupported in new format.

## 382669774 — scoreboard - quote sent
- Trigger: Jobber `quoteSent`, connection 55804005 (Santa's Lights Jobber only), no params.
- Trigger fields used: quoteCreatedAt, quoteNumber, total, client.id, lineItems[]totalPrice.
- Step 1 Code by Zapier: same code as quote approved (split on commas, sum).
- Step 2 Webhooks `post`: same url and header, data: stage=`quote`, occurred_at=quoteCreatedAt, source=`jobber`, external_id=quoteNumber, value=total, client_id=client.id.
- Issues: credential stripped; Code step unsupported.

## 382669282 — Jobber new client to Webhooks
- Trigger: Jobber `clientHook` (new client), connection 55804005 (Santa's Lights Jobber only), no params.
- Step 1 Webhooks `post`: url `https://pcjzinbwevnjvojoqdrd.supabase.co/functions/v1/ingest`, json, header `x-ingest-secret: [secret present]`, data: stage=`lead`, external_id=id, occurred_at=createdAt, source=`jobber`, client_id=id.
- This is the scoreboard's "lead" event: it is the fourth scoreboard Zap. Issues: credential stripped by import.

## Scoreboard note
All four scoreboard Zaps post to the santas-lights-scoreboard Supabase ingest function with stages lead, quote, sold, installed, and all four listen to the Santa's Lights Jobber only. Dunzo sends nothing to the scoreboard. In the "value" field the import shows the trigger's `total`; the code step's summed total may be what the live Zap actually sends (the import could not carry the reference across).
