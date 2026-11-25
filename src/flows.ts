import type { Account } from "./types";

/**
 * Flows: the app's own copy of each Zap (see docs/zap-map.md).
 * Each flow is described here step by step so the dashboard can draw it, and has a planner that turns one real event
 * into the list of things the flow would do. In watch mode that plan is only written down. Nothing is changed anywhere.
 */
export type AppName = "GoHighLevel" | "Jobber" | "Quo" | "CompanyCam" | "Scoreboard" | "AI" | "Filter";
export interface FlowStep { app: AppName; title: string; detail?: string; paths?: { label: string; steps: FlowStep[] }[] }
export interface FlowDef { key: string; account: Account; title: string; zap: string; what: string; trigger: FlowStep; steps: FlowStep[] }

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

// ---------- Planners: one real event in, the list of things the flow would do out. All pure. ----------
export interface Person { name: string; phone?: string | null; email?: string | null; address?: string | null }
export interface Plan { flow: string; account: Account; key: string; subject: string; summary: string; steps: string[]; stage?: string; at: string }
const who = (p: Person) => p.name || p.phone || p.email || "Unknown";
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
    if (a === "lights") out.push({ ...base, flow: "sb_quote", key: `sb_quote:${q.id}`, summary: `Quote ${q.quoteNumber}, ${money(q.total)}`, steps: [`Send to the scoreboard as "quote" with ${money(q.total)}`] });
  }
  if (q.quoteStatus === "approved" || q.quoteStatus === "converted") {
    out.push({ ...base, flow: "quote_approved", key: `quote_approved:${a}:${q.id}`, stage: "Quote Approved", summary: `Quote ${q.quoteNumber} approved, ${money(q.total)}`,
      steps: [`Update the contact for ${who(q.person)} and add the tag quote approved`, "Move the lead to Quote Approved", `Note the quote number ${q.quoteNumber}`] });
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

export function planQuoMessage(a: Account, m: { id: string; direction: string; text: string; other: string; createdAt: string }): Plan {
  const out = m.direction === "outgoing";
  return { flow: out ? "quo_out" : "quo_in", account: a, key: `${out ? "quo_out" : "quo_in"}:${m.id}`, subject: m.other, at: m.createdAt, summary: out ? "Team sent a text" : "Customer sent a text",
    steps: out ? [`Save the text as a note on the contact for ${m.other}`] : ["Ask the AI whether it is positive, negative or neither", "If positive or negative: save it as a note with the matching tag. If neither: stop."] };
}

export function planQuoCall(a: Account, c: { id: string; other: string; duration: number; createdAt: string }): Plan {
  return { flow: "quo_transcript", account: a, key: `quo_transcript:${c.id}`, subject: c.other, at: c.createdAt, summary: `Call of about ${Math.max(1, Math.round(c.duration / 60))} min`, steps: [`Save the call transcript as a note on the contact for ${c.other}`] };
}
