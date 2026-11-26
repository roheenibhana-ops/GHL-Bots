import type { Account } from "./types";

/**
 * Flows: the app's own copy of each Zap (see docs/zap-map.md).
 * Each flow is described here step by step so the dashboard can draw it, and has a planner that turns one real event
 * into the list of things the flow would do. In watch mode that plan is only written down. Nothing is changed anywhere.
 */
export type AppName = "GoHighLevel" | "Jobber" | "Quo" | "CompanyCam" | "Scoreboard" | "AI" | "Filter" | "Clock" | "You";
export interface FlowStep { app: AppName; title: string; detail?: string; paths?: { label: string; steps: FlowStep[] }[] }
export interface FlowDef { key: string; account: Account; title: string; zap: string; what: string; trigger: FlowStep; steps: FlowStep[]; kind?: "zap" | "agent"; ours?: string }

const NAME = { dunzo: "Dunzo Gutters", lights: "Santa's Lights" } as const;
const PIPELINE = { dunzo: "Lead Nurture Pipeline 2027", lights: "the Santa's Lights pipeline" } as const;
/** Stage ids from the live Zaps, kept for the day a flow goes live. */
export const STAGES: Record<Account, Record<string, string>> = {
  dunzo: { pipeline: "zsWyKWFJMybbPdMehZFE", newLead: "86aa38d0-656c-46b5-bbad-c2b5cc6fd36a", quoteSent: "f52cb263", quoteApproved: "5458517f-9c63-4a76-ad72-71baf2807190", jobScheduled: "84a0da26", jobUnscheduled: "5cdeb439", lost: "092b835e-90cb-4146-a2ab-12510de4b176" },
  lights: { pipeline: "wfoJW8c5BbVDhZ7BiKo6", newLead: "4aa2b2ed", quoteSent: "904ff8d0", quoteApproved: "1e5570bf", jobScheduled: "3d0ccc37", jobUnscheduled: "c387daa8", lost: "8c3828b4-45e6-4ac4-b76e-40b9df4a010c" },
};

const ghlContact = (tag: string): FlowStep => ({ app: "GoHighLevel", title: "Add or update the contact", detail: `Name, phone, email and address from Jobber. Adds the tag ${tag}.` });
const ghlStage = (stage: string, extra = ""): FlowStep => ({ app: "GoHighLevel", title: `Move the lead to ${stage}`, detail: extra || undefined });

function forCompany(a: Account): FlowDef[] {
  const n = NAME[a], lostTag = a === "dunzo" ? "dunzo lost" : "lights lost";
  const f = (key: string, title: string, zap: string, what: string, trigger: FlowStep, steps: FlowStep[]): FlowDef => ({ key, account: a, title, zap, what, trigger, steps });
  return [
    f("new_lead", "New lead to Jobber", a === "dunzo" ? "Dunzo 2027 New Lead Stage to Jobber Client Creation" : "Santas Lights - New Lead Created or Existing Client Lead From GHL To Jobber Coming In From Website",
      "A new lead from the website form or the phone form is copied into Jobber, with its tags and the summary of what they asked for.",
      { app: "GoHighLevel", title: "A lead moves to New Lead", detail: `In ${PIPELINE[a]}.` },
      [{ app: "Jobber", title: "Find the client, or create them", detail: "Matches by phone number as well as email, so no duplicate clients. The Zap matches by email only." },
       { app: "Jobber", title: "Add the lead's tags to the client", detail: "Every tag on the GoHighLevel contact." },
       { app: "Jobber", title: "Add the quote request summary as a note", detail: "From the latest_quote_summary field. Skipped if the same note is already there, so no duplicates." }]),
    f("quote_sent", "Quote sent", `${a === "dunzo" ? "Dunzo 2027 -  Quote Sent From Jobber to GHL" : "Santas Lights- Quote Sent From Jobber to GHL"}`,
      "When a quote goes out in Jobber, the lead moves to Quote Sent and the quote details are noted on it.",
      { app: "Jobber", title: "A quote is sent" },
      [{ ...ghlContact("quote sent"), detail: "Name, phone, email and address from Jobber, the Jobber client link, the date, and the tag quote sent." },
       ghlStage("Quote Sent", "Adds a note with the quote number, each item, its description and the price.")]),
    f("quote_approved", "Quote approved", `${a === "dunzo" ? "Dunzo 2027- Quote Approved from Jobber To GHL" : "Santas Lights- Quote Approved from Jobber To GHL"}`,
      "When the customer approves a quote in Jobber, the lead moves to Quote Approved.",
      { app: "Jobber", title: "A quote is approved" }, [ghlContact("quote approved"), ghlStage("Quote Approved", "Notes the quote number.")]),
    f("job_created", "Job created", `${a === "dunzo" ? "Dunzo 2027 - Job Created & Scheduled from Jobber To GHL" : "Santas Lights - Job Created & Scheduled from Jobber To GHL"}`,
      "When a job is created in Jobber, the lead moves to Job Scheduled.",
      { app: "Jobber", title: "A new job is created" }, [ghlContact("job scheduled"), ghlStage("Job Scheduled")]),
    f("job_schedule", "Job scheduled or unscheduled", `${a === "dunzo" ? "Dunzo 2027 - Scheduled And UnScheduled Jobs In Jobber" : "Santas Lights - Scheduled And UnScheduled Jobs In Jobber"}`,
      "Keeps the lead in step when a job's schedule changes in Jobber.",
      { app: "Jobber", title: "A job changes" },
      [{ app: "Filter", title: "Which way did it change?", paths: [
        { label: "It now has a date", steps: [ghlContact("job scheduled"), ghlStage("Job Scheduled")] },
        { label: "Its date was removed", steps: [ghlContact("job unscheduled"), ghlStage("Job Unscheduled")] }] }]),
    f("job_completed", "Job completed", `${a === "dunzo" ? "Dunzo 2027 - Job Completed Jobber To GHL" : "Santas Lights - Job Completed Jobber To GHL"}`,
      "When a job is closed in Jobber, the contact is tagged so GoHighLevel can follow up.",
      { app: "Jobber", title: "A job is completed" }, [{ ...ghlContact("job closed"), detail: "Name, phone, email and address from Jobber, and the tag job closed. The lead is not moved to another stage." }]),
    f("archived_lost", "Archived to Lost", `${a === "dunzo" ? "Dunzo 2027 Jobber Archived Lead To Lost In GHL" : "Santas Lights Jobber Archived Lead To Lost In GHL"}`,
      "When a job is archived in Jobber, the lead is marked Lost. Careful: finished jobs get archived too, so the Zap marks paying customers as Lost.",
      { app: "Jobber", title: "A job changes" },
      [{ app: "Filter", title: "Only carry on if the job is archived", detail: "The app also checks whether the job was actually completed. If it was, this is a finished customer, not a lost lead, and it would stop here." },
       ghlStage("Lost", `Adds the tag ${lostTag}.`)]),
    f("contact_update", "Contact details updated", `${a === "dunzo" ? "Dunzo 2027- Update Contact Details From Jobber To GHL" : "Santas Lights- Update Contact Details From Jobber To GHL"}`,
      "When a client's details are edited in Jobber, the GoHighLevel contact is brought up to date.",
      { app: "Jobber", title: "A client is edited" }, [{ app: "GoHighLevel", title: "Update the contact", detail: "Name, phone, email and address. Adds the tag contact details updated." }]),
    f("quo_out", "Text sent from Quo", `${a === "dunzo" ? "Dunzo 2027- Outgoing Message From Quo To GHL Trigger" : "Santas Lights - Outgoing Message From Quo To GHL Trigger"}`,
      "A text the team sends from the Quo line is saved on the customer's GoHighLevel contact.",
      { app: "Quo", title: "The team sends a text", detail: `On the ${n} line.` }, [{ app: "GoHighLevel", title: "Save the text as a note on the contact", detail: "Finds the contact by the customer's number, or creates it." }]),
    f("quo_in", "Text received in Quo", `${a === "dunzo" ? "Dunzo 2027- Incoming Message From Quo To GHL Trigger" : "Santas Lights- Incoming Message From Quo To GHL Trigger"}`,
      "A text from a customer to the Quo line is read, labelled, and saved on their GoHighLevel contact.",
      { app: "Quo", title: "A customer sends a text", detail: `To the ${n} line.` },
      [{ app: "AI", title: "Is the message positive, negative or neither?", detail: "The Zap pays OpenAI for this on every text. The app would use Claude, which you already pay for.", paths: [
        { label: "Positive", steps: [{ app: "GoHighLevel", title: "Save as a note, tag quo-message-positive" }] },
        { label: "Negative", steps: [{ app: "GoHighLevel", title: "Save as a note, tag quo-message-negative" }] },
        { label: "Neither", steps: [{ app: "Filter", title: "Stop. Nothing is saved." }] }] }]),
    f("quo_transcript", "Call transcript from Quo", `${a === "dunzo" ? "Dunzo 2027 Quo Transcript to LeadConnector Contact Update" : "Santas Lights Quo Transcript to LeadConnector Contact Update"}`,
      "When Quo finishes transcribing a phone call, the transcript is saved on the customer's GoHighLevel contact.",
      { app: "Quo", title: "A call is transcribed", detail: `On the ${n} line.` }, [{ app: "GoHighLevel", title: "Save the transcript as a note on the contact", detail: "Finds the contact by the caller's number, or creates it." }]),
    f("cc_project", "New client to CompanyCam", `${a === "dunzo" ? "Dunzo 2027 - Jobber new client to CompanyCam project" : "Jobber new client to CompanyCam project - Santas Lights"}`,
      "Every new Jobber client gets a CompanyCam project, ready for the crew's photos.",
      { app: "Jobber", title: "A new client is created" }, [{ app: "CompanyCam", title: "Create a project", detail: "Named after the client, with their street, city and postcode. Skipped if a project with that name and address already exists." }]),
  ];
}

const sb = (key: string, title: string, zap: string, trigger: string, stage: string, sum: boolean): FlowDef => ({
  key, account: "lights", title, zap, what: `Tells the marketing scoreboard about each ${trigger.toLowerCase()}, so ad spend can be matched to real sales. Santa's Lights only.`,
  trigger: { app: "Jobber", title: trigger },
  steps: [...(sum ? [{ app: "Filter" as const, title: "Add up the line item prices" }] : []), { app: "Scoreboard", title: `Send it to the scoreboard as "${stage}"`, detail: "Name, phone, email, address and the amount." }],
});

export const FLOWS: FlowDef[] = [
  ...forCompany("dunzo"), ...forCompany("lights"),
  sb("sb_lead", "Scoreboard: new lead", "Jobber new client to Webhooks", "A new client is created", "lead", false),
  sb("sb_quote", "Scoreboard: quote sent", "scoreboard - quote sent", "A quote is sent", "quote", true),
  sb("sb_sold", "Scoreboard: quote approved", "scoreboard - quote approved", "A quote is approved", "sold", true),
  sb("sb_installed", "Scoreboard: job closed", "scoreboard - job closed", "A job is completed", "installed", true),
];

// ---------- The GoHighLevel Agent Studio agents, rebuilt (see docs/ghl-agents/SUMMARY.md) ----------
/** The fixed wording the GHL agents send today, kept word for word where it is fixed. */
export const AGENT_TEXT = {
  dunzo: {
    photoRequest: "Thanks for requesting a quote. Could you please send through a few pictures so we can give you an accurate price?",
    photoThanks: "Awesome, thank you so much for sending those photos over! We got them, and our team will take a look so we can get your quote sorted. We really appreciate it!",
    outOfArea: "Thanks for reaching out. We only serve in and around Sacramento, so unfortunately we would not be able to help with this address.",
    approved: (first: string) => `Hi${first ? " " + first : ""}, thank you for approving your quote! We're already working on getting your job scheduled and will be in touch soon with the next steps.`,
  },
  lights: {
    photoRequest: "Thanks for requesting a quote. Could you please send through a few pictures so we can prepare it accurately? Photos of the front, left side, right side and back of the house are helpful. If you only need work on a specific part of the house, just send clear photos of that area.",
    photoThanks: "Awesome, thank you so much for sending those photos over! We got them, and our team will take a look so we can move your lighting project to the next step. We really appreciate it!",
    outOfArea: "Thanks for reaching out. We only serve in and around Sacramento, so unfortunately we would not be able to help with this address.",
    approved: (first: string) => `Hi${first ? " " + first : ""}, this is the Santa's Lights team. Thank you for approving your lighting quote! We're already working on getting your job scheduled and will be in touch soon with the next steps.`,
  },
} as const;

const SAFE: FlowStep = { app: "Filter", title: "Is it safe to text this person right now?", detail: "Not opted out, not on do not disturb, between 8am and 8pm, nobody on the team has just phoned them, and they have not had this message already. The GoHighLevel agents skip most of these checks." };

function agentsFor(a: Account): FlowDef[] {
  const dz = a === "dunzo";
  const T = AGENT_TEXT[a];
  const f = (key: string, title: string, ours: string, zap: string, what: string, trigger: FlowStep, steps: FlowStep[]): FlowDef => ({ key, account: a, title, zap, what, trigger, steps, kind: "agent", ours });
  const list: FlowDef[] = [
    f("ag_photos", "Photos: ask, remind, thank", dz ? "Flash" : "Rudolph", dz ? "01. Take Off and 02. Dunzo KB Photo Assistant" : "01. Take Off and 02. Mr Photos Received",
      "Asks a new lead for photos so the team can quote, reminds them, and thanks them when the photos arrive. Two GoHighLevel agents do this today and can both thank the same customer. Here it is one agent.",
      { app: "GoHighLevel", title: "A new lead arrives in New Lead" },
      [{ app: "Filter", title: "Should this lead be left alone?", detail: "Stops if they used the AI visualizer on the website, if photos are already there, or if they are part of a promo.", paths: [
          { label: "Address is clearly outside the area", steps: [{ app: "GoHighLevel", title: "Text a polite no", detail: `"${T.outOfArea}"` }, { app: "GoHighLevel", title: "Tag ghost and move to Lost" }] },
          { label: "Photos are already there", steps: [{ app: "GoHighLevel", title: "Tag photos received, move to Photos Received", detail: "No message." }] },
          { label: "No photos yet", steps: [SAFE, { app: "GoHighLevel", title: "Text the photo request", detail: `"${T.photoRequest}" plus what to photograph for that service.` }, { app: "Clock", title: "Remind at 9am", detail: "Next morning, then daily for 2 days, every second day for the rest of week 1, twice in week 2, once in week 3, then stop and tell the team. The GoHighLevel version has no end." }] }] },
       { app: "GoHighLevel", title: "When photos arrive: thank them once", detail: `"${T.photoThanks}" Then tag photos received and move to Photos Received.` }]),
    f("ag_followup", "Follow up after a quote", dz ? "Dash" : "Dasher", dz ? "03.Lead Follow-Up" : "03. Post Quote Lead Follow-Up",
      "Checks the quote arrived, answers questions, and follows up while the quote is open. Written fresh each time, as the team." + (dz ? " The GoHighLevel version writes as Clark by name." : ""),
      { app: "Jobber", title: "A quote is sent" },
      [{ app: "Clock", title: "Wait 10 minutes" }, SAFE,
       { app: "AI", title: "Text a short check that the quote came through", detail: "Once per quote and household. Skipped if anyone has already confirmed it with them." },
       { app: "AI", title: "Answer questions from what is approved", detail: "Free quotes, firm price before work, licensed and insured, the guarantee. Anything about exact price, availability, refunds or a complaint goes to the team." },
       { app: "Clock", title: "Follow up while the quote is open", detail: "No more than one message in 3 hours and never the same purpose twice in a day. Holds off for a week if they ask for time." }]),
    f("ag_approved", "Thank you when a quote is approved", dz ? "Cal" : "Prancer", "04. Quote Approval SMS",
      "One thank you text when a customer approves their quote. The wording is fixed, so it needs no AI.",
      { app: "Jobber", title: "A quote is approved" },
      [SAFE, { app: "GoHighLevel", title: "Text the thank you, once", detail: `"${T.approved("{first name}")}"` }]),
    f("ag_rehash", "Monthly review of old leads", "Maverick", dz ? "05.Rehash Reviewer (not published in GoHighLevel)" : "06. Rehash Follow-Up Reviewer (not published in GoHighLevel)",
      "On the 1st of each month, reads the leads sitting in Rehash and writes a follow up plan for the team. It never texts a customer.",
      { app: "Clock", title: "The 1st of the month, 9am" },
      [{ app: "GoHighLevel", title: "Read every lead in Rehash", detail: "Notes, conversation and quote history." }, { app: "AI", title: "Write a follow up plan", detail: "Who is worth another try, why, and a suggested message for a person to send." }, { app: "You", title: "Shown on the Director page for you to act on" }]),
    f("ag_audit", "Daily lead report", "Maverick", dz ? "06.Daily Sales Auditor (not published in GoHighLevel)" : "05. Daily Audit Police (not published in GoHighLevel)",
      "Each evening, checks every open lead and reports what moved, what is stuck, and what the agents and flows did that day.",
      { app: "Clock", title: `Every day, ${dz ? "8pm" : "9pm"}` },
      [{ app: "GoHighLevel", title: "Read today's leads, stages and messages" }, { app: "AI", title: "Write the bottom line", detail: "What moved, what is stuck, what needs a person tomorrow." }, { app: "You", title: "Shown on the Director page" }]),
  ];
  if (!dz) list.push(f("ag_review_post", "Install and review post", "Snap", "Install Review Publisher",
    "After a job is won, drafts a social post from the install photos and the customer's Google review, for you to approve. The GoHighLevel version asks for approval but has nobody to ask.",
    { app: "GoHighLevel", title: "The tag lights won is added" },
    [{ app: "Clock", title: "Wait until the install is finished", detail: "The GoHighLevel version waits a flat 2 days, which can be before the install." }, { app: "CompanyCam", title: "Pick the best install photos" }, { app: "AI", title: "Draft the post", detail: "Only quotes a real review. Never invents one." }, { app: "You", title: "Waits on your Approvals page", detail: "Nothing is published unless you approve it." }]));
  return list;
}
export const AGENT_FLOWS: FlowDef[] = [...agentsFor("dunzo"), ...agentsFor("lights")];
export const ALL_FLOWS = (): FlowDef[] => [...FLOWS.map((x) => ({ ...x, kind: "zap" as const })), ...AGENT_FLOWS];

// ---------- Planners: one real event in, the list of things the flow would do out. All pure. ----------
export interface Person { name: string; phone?: string | null; email?: string | null; address?: string | null }
export interface Plan { flow: string; account: Account; key: string; subject: string; summary: string; steps: string[]; stage?: string; at: string }
const who = (p: Person) => p.name || p.phone || p.email || "Unknown";
const first = (p: Person) => (p.name || "").trim().split(/\s+/)[0] || "";
const money = (n: number | null | undefined) => (typeof n === "number" ? "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "");

export interface JQuote { id: string; quoteNumber: string; quoteStatus: string; sentAt?: string | null; updatedAt: string; title?: string | null; total?: number | null; items: { name: string; description?: string | null; totalPrice?: number | null }[]; person: Person }
export interface JJob { id: string; jobNumber: number; jobStatus: string; createdAt: string; updatedAt: string; completedAt?: string | null; startAt?: string | null; total?: number | null; person: Person }
export interface JClientEvent { id: string; createdAt: string; updatedAt: string; person: Person }

export function planQuote(a: Account, q: JQuote, since: string): Plan[] {
  const out: Plan[] = [];
  const base = { account: a, subject: who(q.person), at: q.updatedAt };
  if (q.sentAt && q.sentAt > since) {
    const note = `Quote Number${q.quoteNumber} | Item: ${q.items.map((i) => i.name).join(",")} | Price: ${q.items.map((i) => i.totalPrice ?? "").join(",")}`;
    out.push({ ...base, flow: "quote_sent", key: `quote_sent:${a}:${q.id}`, stage: "Quote Sent", summary: `Quote ${q.quoteNumber} sent, ${money(q.total)}`,
      steps: [`Update the contact for ${who(q.person)} and add the tag quote sent`, "Move the lead to Quote Sent", `Add the note: ${note.slice(0, 220)}`] });
    out.push({ ...base, flow: "ag_followup", key: `ag_followup:${a}:${q.id}`, summary: `Quote ${q.quoteNumber} sent`, steps: ["Wait 10 minutes", "Check it is safe to text them", `Text ${first(q.person)} a short check that the quote came through, written fresh, as the team`, "Then follow up while the quote stays open"] });
    if (a === "lights") out.push({ ...base, flow: "sb_quote", key: `sb_quote:${q.id}`, summary: `Quote ${q.quoteNumber}, ${money(q.total)}`, steps: [`Send to the scoreboard as "quote" with ${money(q.total)}`] });
  }
  if (q.quoteStatus === "approved" || q.quoteStatus === "converted") {
    out.push({ ...base, flow: "quote_approved", key: `quote_approved:${a}:${q.id}`, stage: "Quote Approved", summary: `Quote ${q.quoteNumber} approved, ${money(q.total)}`,
      steps: [`Update the contact for ${who(q.person)} and add the tag quote approved`, "Move the lead to Quote Approved", `Note the quote number ${q.quoteNumber}`] });
    out.push({ ...base, flow: "ag_approved", key: `ag_approved:${a}:${q.id}`, summary: `Quote ${q.quoteNumber} approved`, steps: ["Check it is safe to text them", `Text: ${AGENT_TEXT[a].approved(first(q.person))}`] });
    if (a === "lights") out.push({ ...base, flow: "sb_sold", key: `sb_sold:${q.id}`, summary: `Quote ${q.quoteNumber}, ${money(q.total)}`, steps: [`Send to the scoreboard as "sold" with ${money(q.total)}`] });
  }
  return out;
}

/** prev is the status this job had the last time we looked, if we have seen it before. */
export function planJob(a: Account, j: JJob, since: string, prev?: string): Plan[] {
  const out: Plan[] = [];
  const base = { account: a, subject: who(j.person), at: j.updatedAt };
  if (j.createdAt > since) out.push({ ...base, flow: "job_created", key: `job_created:${a}:${j.id}`, stage: "Job Scheduled", summary: `Job ${j.jobNumber} created`,
    steps: [`Update the contact for ${who(j.person)} and add the tag job scheduled`, "Move the lead to Job Scheduled"] });
  if (prev !== undefined && prev !== j.jobStatus) {
    if (j.jobStatus === "upcoming" || j.jobStatus === "today") out.push({ ...base, flow: "job_schedule", key: `job_schedule:${a}:${j.id}:${j.updatedAt}`, stage: "Job Scheduled", summary: `Job ${j.jobNumber} now has a date`, steps: ["Path: it now has a date", "Add the tag job scheduled", "Move the lead to Job Scheduled"] });
    if (j.jobStatus === "unscheduled") out.push({ ...base, flow: "job_schedule", key: `job_schedule:${a}:${j.id}:${j.updatedAt}`, stage: "Job Unscheduled", summary: `Job ${j.jobNumber} lost its date`, steps: ["Path: its date was removed", "Add the tag job unscheduled", "Move the lead to Job Unscheduled"] });
    if (j.jobStatus === "archived") {
      const finished = !!j.completedAt;
      out.push({ ...base, flow: "archived_lost", key: `archived_lost:${a}:${j.id}`, stage: finished ? undefined : "Lost", summary: finished ? `Job ${j.jobNumber} archived after being completed` : `Job ${j.jobNumber} archived without being done`,
        steps: finished ? ["The job is archived, and it was completed", "STOP: this is a finished customer, not a lost lead. The Zap would mark them Lost here."] : ["The job is archived and was never completed", `Move the lead to Lost and add the tag ${a === "dunzo" ? "dunzo lost" : "lights lost"}`] });
    }
  }
  if (j.completedAt && j.completedAt > since) {
    out.push({ ...base, flow: "job_completed", key: `job_completed:${a}:${j.id}`, summary: `Job ${j.jobNumber} completed`, steps: [`Update the contact for ${who(j.person)} and add the tag job closed`] });
    if (a === "lights") out.push({ ...base, flow: "sb_installed", key: `sb_installed:${j.id}`, summary: `Job ${j.jobNumber}, ${money(j.total)}`, steps: [`Send to the scoreboard as "installed" with ${money(j.total)}`] });
  }
  return out;
}

export function planClient(a: Account, c: JClientEvent, since: string): Plan[] {
  const base = { account: a, subject: who(c.person), at: c.updatedAt };
  if (c.createdAt > since) {
    const out: Plan[] = [{ ...base, flow: "cc_project", key: `cc_project:${a}:${c.id}`, summary: "New client", steps: [`Create a CompanyCam project called ${who(c.person)}${c.person.address ? " at " + c.person.address : ""}`] }];
    if (a === "lights") out.push({ ...base, flow: "sb_lead", key: `sb_lead:${c.id}`, summary: "New client", steps: ['Send to the scoreboard as "lead"'] });
    return out;
  }
  return [{ ...base, flow: "contact_update", key: `contact_update:${a}:${c.id}:${c.updatedAt}`, summary: "Client edited in Jobber", steps: [`Update the GoHighLevel contact for ${who(c.person)} with the latest name, phone, email and address`, "Add the tag contact details updated"] }];
}

export function planNewLead(a: Account, o: { id: string; changedAt: string; person: Person; tags: string[] }): Plan {
  return { flow: "new_lead", account: a, key: `new_lead:${a}:${o.id}:${o.changedAt}`, subject: who(o.person), at: o.changedAt, summary: "Moved to New Lead",
    steps: [`Find ${who(o.person)} in Jobber by phone or email, or create them`, o.tags.length ? `Add the tags: ${o.tags.join(", ")}` : "No tags to add", "Add the quote request summary as a note, unless it is already there"] };
}

/** What the photo agent would do for a brand new lead. */
export function planPhotos(a: Account, o: { id: string; changedAt: string; person: Person; tags: string[] }): Plan {
  const tags = o.tags.map((t) => t.toLowerCase());
  const base = { flow: "ag_photos", account: a, key: `ag_photos:${a}:${o.id}`, subject: who(o.person), at: o.changedAt };
  if (tags.some((t) => t.replace(/-/g, " ") === "ai visualizer")) return { ...base, summary: "New lead who used the AI visualizer", steps: ["STOP: they used the AI visualizer, so no photo request is sent"] };
  if (tags.includes("photos received")) return { ...base, summary: "New lead with photos already", steps: ["Photos are already there", "Move the lead to Photos Received. No message."] };
  if (tags.includes("winter promo")) return { ...base, summary: "New lead from the promo", steps: ["STOP: this lead is part of the promo, so Gus has it"] };
  return { ...base, summary: "New lead, no photos yet", steps: ["Check the address is real and in the area", "Check it is safe to text them", `Text: ${AGENT_TEXT[a].photoRequest}`, "Remind at 9am on the set days until photos arrive, then stop after week 3"] };
}

export function planQuoMessage(a: Account, m: { id: string; direction: string; text: string; other: string; createdAt: string }): Plan {
  const out = m.direction === "outgoing";
  return { flow: out ? "quo_out" : "quo_in", account: a, key: `${out ? "quo_out" : "quo_in"}:${m.id}`, subject: m.other, at: m.createdAt, summary: out ? "Team sent a text" : "Customer sent a text",
    steps: out ? [`Save the text as a note on the contact for ${m.other}`] : ["Ask the AI whether it is positive, negative or neither", "If positive or negative: save it as a note with the matching tag. If neither: stop."] };
}

export function planQuoCall(a: Account, c: { id: string; other: string; duration: number; createdAt: string }): Plan {
  return { flow: "quo_transcript", account: a, key: `quo_transcript:${c.id}`, subject: c.other, at: c.createdAt, summary: `Call of about ${Math.max(1, Math.round(c.duration / 60))} min`, steps: [`Save the call transcript as a note on the contact for ${c.other}`] };
}
