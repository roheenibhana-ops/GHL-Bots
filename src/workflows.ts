/**
 * The workflow each agent follows, drawn as a flow diagram in the dashboard.
 * Keep these true to the code: when an agent's behaviour changes, change its flow here too.
 */
export interface FlowStep {
  /** start: what sets it off. step: something it does. check: a decision. hand: passes to another agent. end: the result. */
  k: "start" | "step" | "check" | "hand" | "end";
  t: string;
  d?: string;
  /** The tools touched in this step, shown as chips. */
  sys?: string[];
  /** For a hand off: the agent it goes to, so the diagram can link to their workflow. */
  to?: string;
  /** For a check: what happens on each side branch. The main path continues below. */
  br?: [string, string][];
}

const s = (t: string, d?: string, sys?: string[]): FlowStep => ({ k: "step", t, d, sys });
const start = (t: string, d?: string, sys?: string[]): FlowStep => ({ k: "start", t, d, sys });
const end = (t: string, d?: string, sys?: string[]): FlowStep => ({ k: "end", t, d, sys });
const check = (t: string, br: [string, string][], d?: string, sys?: string[]): FlowStep => ({ k: "check", t, d, br, sys });
const hand = (to: string, t: string, d?: string): FlowStep => ({ k: "hand", to, t, d });

const writer = (what: string, where: string): FlowStep[] => [
  start("You open the agent and ask for this week's " + what, "Nothing runs on a timer. It writes when you ask.", ["You"]),
  s("Reads its playbook and personality dials", "The instructions you can edit in its studio."),
  s("Reads what it is allowed to say", "Approved prices, page links and the season, so the copy fits the time of year.", ["Claude"]),
  s("Writes the drafts", "Fresh each time, with a photo idea for every post.", ["Claude"]),
  check("Checks its own work", [["A price or link is not on the approved list", "The draft is flagged so you can see it before using it"]], "Prices, links and punctuation are checked in code, not left to the AI."),
  end("Drafts are ready for you to copy", "You post them to " + where + " yourself. Nothing is published automatically.", ["You"]),
];

const external = (what: string): FlowStep[] => [
  start("Your own Claude setup runs on its schedule", "This work is done outside this app, by the Claude setup you already have.", ["You"]),
  s("It writes and publishes the " + what, "On its own timetable, in your own project."),
  end("Nothing for this agent to do today", "It is kept on the chart so the whole department is visible. Later it can report on results here."),
];

export const WORKFLOWS: Record<string, FlowStep[]> = {
  Gus: [
    start("A promo text is approved and its turn comes up", "Between 8am and 8pm Sacramento time, inside the daily limit, never on a day off."),
    check("Is this person safe to text?", [
      ["Opted out, do not disturb, or paused", "Skipped. No text is sent"],
      ["Open quote, cleaning quote, or a recent or unfinished job", "Held back. No text is sent"],
      ["Already got this promo", "Skipped. Nobody is texted twice"],
    ], "Checked at the moment of sending, every time.", ["GHL", "Jobber"]),
    s("Sends the promo text", "With the price deadline on the end. Tags the contact winter promo and makes Clark the owner.", ["GHL"]),
    start("The customer replies", "Any time, any day. Replies outside 8am to 8pm are answered at 8am.", ["GHL"]),
    check("Did they say stop?", [["Stop, unsubscribe, take me off", "Opted out in both companies. The conversation closes"]], undefined, ["GHL"]),
    check("Has someone just been on the phone with them?", [["A real call in the last 24 hours, or they left a voicemail", "Gus steps back and alerts the team, so he never talks over a person"]], "Checked in the phone system every time they text.", ["Quo"]),
    s("Gets to know who he is talking to", "Their history, notes, past quotes and jobs, and everything already said.", ["GHL", "Jobber"]),
    s("Has the conversation", "Answers questions, works through objections, and talks like a mate. Finds out one or two stories, confirms the address, gets the email.", ["Claude"]),
    check("Is it something he should not decide?", [
      ["Windows pricing, an upset customer, out of area, wants a person", "Passed to the team with an alert. See Relay"],
      ["Interested in Christmas lights", "Referred across to Santa's Lights"],
      ["Sends a photo or asks about a repair", "Photos are handled. See Flash"],
    ]),
    check("Is the reply safe to send?", [["Wrong price, unapproved link, a promised date", "The reply is blocked and rewritten or passed to the team"]], "Checked in code before anything is sent."),
    s("Creates the quote", "Client, property and quote from the Winter Promo template.", ["Jobber"]),
    s("Texts the quote link", "One message, with how to approve it and pay the deposit, and the ask for a referral.", ["GHL"]),
    s("The lead moves to Quote Sent", "Your existing Zap does this when the quote goes out.", ["Zapier", "GHL"]),
    hand("Dash", "If they go quiet, Dash follows up", "After 20 hours with no answer."),
    end("The customer approves and pays the deposit", "In Jobber. The team then gets in touch to schedule the job.", ["Jobber"]),
  ],
  Dash: [
    start("Every 10 minutes during sending hours", "Only when follow ups are switched on in Settings."),
    s("Looks for people who have gone quiet", "Anyone who never answered the promo after 3 days, and anyone sitting on a quote for 20 hours or more."),
    check("Should this person be left alone?", [
      ["Opted out, with the team, or already approved", "Left alone"],
      ["The customer spoke last", "Left for Gus to answer"],
      ["Already followed up enough", "One nudge for a promo, two for a quote, then no more"],
    ]),
    s("Reads the whole conversation", "So the follow up fits what was actually said.", ["Claude"]),
    check("Did they ask for time?", [["Yes, they want to wait", "Holds off for a week, then comes back to them"]]),
    s("Writes a fresh follow up", "Never the same line twice. Mentions the price deadline once if there is one.", ["Claude"]),
    check("How are follow ups set?", [["Set to approve", "Waits on your Approvals page until you approve it"]], "Auto sends straight away.", ["You"]),
    end("The follow up is sent", "If the customer answers, Gus picks the conversation back up.", ["GHL"]),
  ],
  Flash: [
    start("A customer sends a photo", "Or asks about a repair, in either company.", ["GHL"]),
    check("Is there a lead waiting on photos?", [["No lead in New Lead", "The message goes to Gus as a normal reply"]], undefined, ["GHL"]),
    s("Moves the lead to Photos Received", undefined, ["GHL"]),
    s("Thanks the customer", "And tells them the team will take a look."),
    end("Alerts the team that photos are in", "A person prices the repair. Flash never prices it himself."),
  ],
  Relay: [
    start("An agent hits something it should not decide", "Windows pricing, an upset customer, out of area, a request for a person, or Christmas lights interest."),
    s("Marks the conversation as With the team", "The agents stop replying on that conversation."),
    check("Is it Christmas lights interest?", [["Yes", "Creates the referral in the Santa's Lights account"]], undefined, ["GHL"]),
    s("Texts the team an alert", "With who it is and why. No more than one alert per customer every 15 minutes.", ["GHL"]),
    s("Shows it in the Inbox under With the team", undefined, ["You"]),
    end("A person takes over", "When it is dealt with, press Mark handled.", ["You"]),
  ],
  Maverick: [
    start("You open the Director page and ask for the report", undefined, ["You"]),
    s("Pulls the week's numbers", "Texts sent, replies, quotes created, quotes approved, opt outs, for both companies."),
    s("Reads how the conversations actually went", "Not just counts: where people dropped off and why."),
    s("Writes the report", "What is working, what is not, and the few things to change this week.", ["Claude"]),
    end("You read it and decide what to change", "Maverick advises. He never changes an agent himself.", ["You"]),
  ],
  Mentor: [
    start("You press Review in an agent's studio", undefined, ["You"]),
    s("Reads the last two weeks of real conversations", "Pulled from GHL, including ones the old bots and the team handled.", ["GHL"]),
    s("Compares the ones that won with the ones that lost", undefined, ["Claude"]),
    s("Suggests specific changes", "In plain words, each with the conversations that back it up.", ["Claude"]),
    check("Do you agree with a suggestion?", [["No", "Dismissed. Nothing changes"]], undefined, ["You"]),
    s("The change is added to a draft", "The live agent is not touched."),
    s("You run the test pack on the draft", undefined, ["You"]),
    end("You publish it", "Only then does the agent behave differently with customers.", ["You"]),    start("You press Study our calls and texts", "On this page, once Quo is connected.", ["You"]),
    s("Reads thousands of real texts and phone calls", "Everything in the phone system and the CRM, in batches. Only what a person on the team wrote or said counts as the voice.", ["Quo", "GHL"]),
    s("Writes one playbook per company", "How the team talks, what customers ask, why they hesitate, the words they use, and post ideas.", ["Claude"]),
    s("Writes down how the team really talks", "Habits, never lines to copy, and no customer details.", ["Claude"]),
    check("Do you like the voice?", [["No", "Edit it, study again, or leave it off"]], undefined, ["You"]),
    end("The voice is switched on for every agent", "Gus and Dash use it straight away. The safety rules still win.", ["You"]),
  ],
  Memo: [
    start("A customer texts in, or an agent is about to text them"),
    s("Pulls the contact", "Tags, owner, notes and where they sit in the pipeline.", ["GHL"]),
    s("Pulls their history", "Past quotes and jobs, matched by phone number.", ["Jobber"]),
    s("Pulls recent phone calls", "Call summaries and voicemails from the last 60 days, when Quo is connected.", ["Quo"]),
    s("Adds what has already been said", "The whole conversation and the facts collected so far.", ["Supabase"]),
    check("Is there a note saying do not contact?", [["Yes", "The agent is told to hold off"]]),
    end("Hands the agent one short briefing", "So nobody is ever treated like a stranger."),
  ],
  Sheriff: [
    start("Any agent is about to send a text"),
    check("Has this person opted out?", [["Yes, in either company", "Blocked. Nothing is sent"]], undefined, ["GHL"]),
    check("Is it inside sending hours?", [["Before 8am or after 8pm, or a day off", "Held until the next allowed time"]]),
    check("Is the daily limit reached?", [["Yes", "Waits until tomorrow"]]),
    check("Have they already had this message?", [["Yes", "Blocked. No double texting"]]),
    check("Is the wording safe?", [["A price, link or date that is not approved", "Blocked before it leaves"]]),
    end("The text is allowed out", "These rules live in code. No agent and no instruction can switch them off."),
  ],
  Tally: [
    start("You open Overview or Results", "The numbers refresh while the page is open.", ["You"]),
    s("Counts what was sent, held and answered", undefined, ["Supabase"]),
    s("Follows each conversation down the funnel", "Replied, home size, address, email, quote created, quote approved."),
    s("Checks quote status", undefined, ["Jobber"]),
    end("Shows the numbers and the day by day send plan"),
  ],
  Sage: [
    start("An agent needs to answer a question or share a link"),
    s("Supplies what the agents are allowed to say", "Services, prices, areas, guarantees and page links from both websites."),
    check("Is the answer in the knowledge?", [["No", "The agent says it will check with the team. It never makes one up"]]),
    end("The reply is checked against the approved prices and links before it is sent"),
  ],
  Chirp: writer("Facebook and Instagram posts", "Facebook and Instagram"),
  Vixen: writer("Facebook and Instagram posts", "Facebook and Instagram"),
  Pin: writer("Google Business posts", "your Google Business Profile"),
  North: writer("Google Business posts", "your Google Business Profile"),
  Scoop: external("weekly Dunzo Gutters newsletter"),
  Comet: external("weekly Santa's Lights newsletter"),
  Quill: [...external("Dunzo blog posts").slice(0, 2), s("Planned: reads Google Search Console", "Which pages and searches are bringing people in."), end("Planned: tells you where SEO is at when you ask", "A plain report, with what to write next.")],
  Holly: [...external("Santa's Lights blog posts").slice(0, 2), s("Planned: reads Google Search Console", "Which pages and searches are bringing people in."), end("Planned: tells you where SEO is at when you ask", "A plain report, with what to write next.")],

  // ---------- Planned agents: how each will work once it is built ----------
  Cal: [
    start("The deposit is paid on a quote", undefined, ["Jobber"]),
    s("Looks for open days", "On the crew calendar, by area.", ["Jobber"]),
    s("Offers the customer two or three times by text", undefined, ["GHL"]),
    check("Do any of them suit?", [["No", "Offers the next ones, or passes to the team"]]),
    s("Books the job and confirms by text", undefined, ["Jobber", "GHL"]),
    end("The lead moves to Job Scheduled", "With a reminder the day before."),
  ],
  Summit: [
    start("A lead looks like a big job", "Full replacements, large homes, commercial."),
    s("Asks the questions that size the job", "Property type, what they want done, timing, photos."),
    check("Is it worth a site visit?", [["No", "Goes back to the normal quote path"]]),
    s("Books Clark on site", "At a time the customer picks.", ["GHL"]),
    end("Sends Clark a short briefing note", "Who, where, what they want, and what to look for."),
  ],
  Sunny: [
    start("A job is marked complete", undefined, ["Jobber"]),
    s("Sends a thank you"),
    check("Was the customer happy?", [["No", "Passed to the team before any review is asked for"]]),
    s("Asks for a Google review", "With the direct link."),
    s("Asks who else could use the service"),
    end("Sets a reminder to rebook in 6 months"),
  ],
  Stormy: [
    start("A season or a weather event arrives", "First rains, leaf drop, storm warnings, spring."),
    s("Picks the right past customers and old leads"),
    s("Writes the campaign for your approval", undefined, ["Claude"]),
    check("Do you approve it?", [["No", "Nothing is sent"]], undefined, ["You"]),
    end("Sends it through the same safe sender as the promo", "Then Gus handles the replies."),
  ],
  Beacon: [
    start("You ask for ad ideas, or the weekly review is due", undefined, ["You"]),
    s("Reads what each ad cost and what it sold", undefined, ["Meta"]),
    s("Writes new ad ideas and copy", undefined, ["Claude"]),
    end("Tells you which ads to keep, change or stop", "Judged on sold jobs, not clicks."),
  ],
  Shutter: [
    start("The crew uploads photos of a finished job", undefined, ["CompanyCam"]),
    s("Picks the best before and after pair"),
    s("Writes a caption and a short video idea", undefined, ["Claude"]),
    end("Adds it to the gallery drafts for you to approve", undefined, ["You"]),
  ],
  Rudolph: [
    start("A new Santa's Lights lead comes in", "From the website, a form, an ad or a text.", ["GHL"]),
    s("Greets them and finds out what they want", "Christmas lights, permanent lighting, an event, or a service call."),
    check("Which kind of job is it?", [
      ["Christmas lighting", "Goes to Tinsel"],
      ["Permanent lighting", "Goes to Pixel"],
      ["Commercial or an event", "Goes to Dancer"],
      ["A light is out", "Goes to Blitzen"],
    ]),
    end("The right agent takes over, already knowing the details"),
  ],
  Tinsel: [
    start("Rudolph passes over a Christmas lighting lead"),
    s("Asks for photos of the house and what they picture"),
    s("Works out the design and the take off", "Roofline, trees, bushes, extras."),
    s("Builds the quote", undefined, ["Jobber"]),
    s("Texts the quote and answers questions", undefined, ["GHL"]),
    hand("Dasher", "If they go quiet, Dasher follows up"),
    end("The customer approves and pays the deposit", undefined, ["Jobber"]),
  ],
  Pixel: [
    start("Rudolph passes over a permanent lighting lead"),
    s("Explains how it works", "Scenes, the app, colours for every holiday."),
    s("Asks for photos and measures the roofline"),
    s("Builds the quote", undefined, ["Jobber"]),
    end("Books the install or a visit", "Bigger homes get a person on site."),
  ],
  Dasher: [
    start("A Santa's Lights quote has had no answer"),
    s("Reads the conversation and the quote"),
    check("Did they ask for time?", [["Yes", "Waits, then comes back"]]),
    s("Writes a fresh follow up", "A different message each time.", ["Claude"]),
    end("Sends it, or waits for your approval", undefined, ["You"]),
  ],
  Dancer: [
    start("Rudolph passes over a commercial or event enquiry"),
    s("Finds out the site, the dates and the budget"),
    check("Is it a fit?", [["No", "Politely declined or passed to the team"]]),
    end("Books a call or a site visit with the team"),
  ],
  Prancer: [
    start("A Santa's Lights deposit is paid", undefined, ["Jobber"]),
    s("Finds an install week with the right crew"),
    s("Confirms the install date with the customer", undefined, ["GHL"]),
    end("Books the takedown date at the same time"),
  ],
  Blitzen: [
    start("A customer says a light is out"),
    s("Asks which part and for a photo"),
    s("Logs the service call and tells the crew", undefined, ["Jobber"]),
    end("Confirms with the customer when it is fixed", "The aim is within one business day."),
  ],
  Cupid: [
    start("An install is finished", undefined, ["Jobber"]),
    s("Sends a thank you with a photo of their house lit up"),
    check("Was the customer happy?", [["No", "Passed to the team first"]]),
    s("Asks for a review"),
    end("Asks for a referral, with a reason to give one"),
  ],
  Frosty: [
    start("The season calendar says it is time", "Early bird, last chance, and holidays through the year."),
    s("Picks who to contact", "Past customers first, then old leads."),
    s("Writes the campaign for your approval", undefined, ["Claude"]),
    check("Do you approve it?", [["No", "Nothing is sent"]], undefined, ["You"]),
    end("Sends it through the same safe sender", "Then the sales agents handle the replies."),
  ],
  Donner: [
    start("You ask for ad ideas, or the weekly review is due", undefined, ["You"]),
    s("Reads what each ad cost and what it sold", undefined, ["Meta"]),
    s("Writes new ad ideas and copy", undefined, ["Claude"]),
    end("Tells you which ads to keep, change or stop", "Judged on sold jobs, not clicks."),
  ],
  Snap: [
    start("The crew uploads photos of a finished install", undefined, ["CompanyCam"]),
    s("Picks the best night shot"),
    s("Writes a caption and a short video idea", undefined, ["Claude"]),
    end("Adds it to the gallery drafts for you to approve", undefined, ["You"]),
  ],
};
