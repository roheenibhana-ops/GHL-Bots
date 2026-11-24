export type Lane = "live" | "now" | "next" | "soon" | "later";
export interface RoadItem { lane: Lane; area: "Sales" | "Marketing" | "Platform" | "Safety"; emoji: string; title: string; detail: string; who?: string }

/** The plan, in plain words. Edit this list as things get built. */
export const LANES: { key: Lane; title: string; blurb: string }[] = [
  { key: "live", title: "Live", blurb: "Built, tested and working today" },
  { key: "now", title: "Now", blurb: "Before the first real leads" },
  { key: "next", title: "Next", blurb: "Right after the pilot starts" },
  { key: "soon", title: "Soon", blurb: "Once the pilot is proven" },
  { key: "later", title: "Later, after MVP", blurb: "Big ideas, on purpose not yet" },
];

export const ROADMAP: RoadItem[] = [
  // ---- live
  { lane: "live", area: "Sales", emoji: "🧢", title: "Promo Closer", who: "Gus", detail: "Texts the winter offer, answers questions, works objections, gets address and email, creates the Jobber quote and sends the link." },
  { lane: "live", area: "Sales", emoji: "📸", title: "Photos, repairs and handoffs", who: "Flash, Relay", detail: "Photo requests, thank yous, stage moves, and handing the right customers to your team with an alert." },
  { lane: "live", area: "Safety", emoji: "🛡️", title: "The safety layer", who: "Sheriff", detail: "STOP always wins across both companies, send hours, approved prices and links only, honest about being automated." },
  { lane: "live", area: "Platform", emoji: "📚", title: "Full website knowledge", who: "Sage", detail: "Both websites read in full: every service, price range, FAQ, financing and 44 approved page links." },
  { lane: "live", area: "Platform", emoji: "🧭", title: "The Partridge Standard", detail: "Control panel with overview, inbox, approvals, results, settings, light and dark mode and a Dunzo and Lights toggle." },
  { lane: "live", area: "Platform", emoji: "🎛️", title: "Agent Studio", detail: "Chat builder, personality dials, drafts, version history with rollback, and a test pack that checks every change." },
  { lane: "live", area: "Marketing", emoji: "🦅", title: "Marketing Director", who: "Maverick", detail: "Weekly plain English report from your real numbers, with three things to do next." },
  { lane: "live", area: "Sales", emoji: "🎄", title: "Lights referral", detail: "A Dunzo customer who wants Christmas or permanent lighting is added to Santa's Lights, tagged, with a note." },
  { lane: "live", area: "Marketing", emoji: "📰", title: "Marketing writers", who: "Scoop, Comet, Chirp, Vixen, Quill, Holly, Pin, North", detail: "Newsletter, social posts, SEO blog posts and Google Business posts for each company. Drafts only, with prices and links checked." },
  // ---- now
  { lane: "now", area: "Platform", emoji: "✅", title: "Clark's final live check", detail: "One full run on his phone with everything built since the last test: objection, STOP, photo, Lights question." },
  { lane: "now", area: "Safety", emoji: "🔐", title: "Lock down access", detail: "Long admin token, and move the alert phone off Clark's own number." },
  { lane: "now", area: "Safety", emoji: "🔁", title: "Failed quote safeguard", detail: "If Jobber fails, the customer is never told a quote is coming, you get an alert, and it retries." },
  { lane: "now", area: "Safety", emoji: "📞", title: "Quo watcher", detail: "A call or voicemail pauses the bot on that customer so it never texts someone Clark is already talking to." },
  { lane: "now", area: "Sales", emoji: "🚀", title: "First 20 promo leads", detail: "You read the drafts, approve a small batch, and watch the conversations on the day." },
  // ---- next
  { lane: "next", area: "Platform", emoji: "🎙️", title: "Voice learner", detail: "From your boards: learns Clark from every Quo call and GHL conversation, so every agent writes and sells like him. Feeds every studio." },
  { lane: "next", area: "Marketing", emoji: "📍", title: "Google Business posting and review replies", who: "Pin, North", detail: "The quick win from your boards. Pin and North already write the posts. Next: publish them to Google, reply to every review, and add Q and A." },
  { lane: "next", area: "Sales", emoji: "🏃", title: "Morning quote follow ups", who: "Dash", detail: "A fresh message each morning, 8am to 8pm, seven days a week, to quotes that go quiet. Stops on a reply." },
  { lane: "next", area: "Sales", emoji: "📅", title: "Deposit to scheduled job", who: "Cal", detail: "Moves a lead to Job Scheduled or Unscheduled when the deposit lands, then tags dunzo-won when the job closes." },
  { lane: "next", area: "Marketing", emoji: "☀️", title: "After the job", who: "Sunny", detail: "Thank you, review request, referral ask and the 6 month gutter reminder." },
  { lane: "next", area: "Platform", emoji: "📬", title: "Daily report to Clark", detail: "A short summary each morning: what happened, who needs a person, what is cold." },
  { lane: "next", area: "Platform", emoji: "⚡", title: "Prompt caching", detail: "Cuts the cost of every bot reply, worth doing before the big lead run." },
  // ---- soon
  { lane: "soon", area: "Sales", emoji: "📝", title: "Call summariser", detail: "Turns Quo calls into GHL notes and next steps. This is what replaces the Quo Zap." },
  { lane: "soon", area: "Sales", emoji: "📐", title: "Take off from photos", who: "Flash", detail: "Reads CompanyCam and customer photos to measure rooflines, runs and downspouts, so quotes go out faster." },
  { lane: "soon", area: "Sales", emoji: "🔄", title: "Retention and plans", detail: "Rebooks past customers: annual and pre rain cleanings for Dunzo, the 3 year plan and permanent lighting for Lights. Existing customers are your biggest channel." },
  { lane: "soon", area: "Marketing", emoji: "👥", title: "Customer avatars and brand voice guides", detail: "One voice guide per company and clear customer types (before the rains, home sellers, HOAs, repeat lights customers) that every agent follows." },
  { lane: "soon", area: "Sales", emoji: "🔴", title: "Lights sales team", who: "Tinsel, Pixel, Rudolph, Dasher, Dancer, Prancer, Blitzen", detail: "The Santa's Lights team: greeting, design, take off, quotes, follow ups, install planning and service calls, texting from the Lights number." },
  { lane: "soon", area: "Marketing", emoji: "🗓️", title: "Content calendar and approvals", detail: "Every newsletter and post lands in a queue where you approve, edit and schedule." },
  { lane: "soon", area: "Marketing", emoji: "✉️", title: "Send the newsletter", detail: "Approved newsletters go out through GHL email, one click from the queue." },
  { lane: "soon", area: "Sales", emoji: "🏔️", title: "Big job booker", who: "Summit", detail: "Qualifies large jobs and books Clark on site with a briefing note on the customer." },
  { lane: "soon", area: "Marketing", emoji: "⛈️", title: "Seasonal campaigns", who: "Stormy, Frosty", detail: "Storm, leaf drop, early bird and last chance campaigns to past customers and old leads." },
  // ---- later
  { lane: "later", area: "Marketing", emoji: "🔎", title: "SEO reporting", who: "Quill, Holly", detail: "Your Claude setup writes and publishes the blogs. Quill and Holly become the SEO analysts Clark can ask where SEO is at: linked to Google Search Console for rankings, clicks and which posts work, plus what was published each week and which customer questions have no post yet." },
  { lane: "later", area: "Marketing", emoji: "🏘️", title: "Neighbour targeting", detail: "Every finished job triggers door hangers, postcards and geo ads to the homes around it, plus a yard sign and area tracker showing which streets sell." },
  { lane: "later", area: "Marketing", emoji: "📊", title: "Ad reporter and ad variants", detail: "Daily cost per sold job by ad from Meta Ads, and winning ideas turned into new hooks, copy and video cuts." },
  { lane: "later", area: "Sales", emoji: "🏡", title: "Partner channels", detail: "Realtors and inspectors, property managers and HOAs, event planners for off season lighting, and home show leads followed up automatically." },
  { lane: "later", area: "Platform", emoji: "🌐", title: "Santa's Lights site off Lovable", detail: "Move the website to Cloudflare with the same URLs, keeping the SEO." },
  { lane: "later", area: "Marketing", emoji: "🎓", title: "Marketing team coaching", detail: "Copy that sells, content that converts, and reading the numbers: kill or scale ads on sold jobs, not clicks." },
  { lane: "later", area: "Marketing", emoji: "🎬", title: "Video to posts", who: "Chirp, Vixen, Snap, Shutter", detail: "Feed it a video. It writes the captions and hashtags, picks the best clips, schedules it, and posts it after your approval." },
  { lane: "later", area: "Platform", emoji: "🔌", title: "Replace the Zaps, one at a time", detail: "Jobber to GHL, Quo to GHL, CompanyCam to Jobber, and the scoreboard feed move into our own system. Paused on purpose until the bots are proven." },
  { lane: "later", area: "Marketing", emoji: "📣", title: "Ads", who: "Beacon, Donner", detail: "Ad ideas and copy for Google and Facebook, built from the same approved knowledge and judged on sold jobs." },
  { lane: "later", area: "Marketing", emoji: "🖼️", title: "Gallery and job content", who: "Snap, Shutter", detail: "Finished jobs turned into before and after galleries and short video ideas." },
  { lane: "later", area: "Platform", emoji: "📈", title: "Scoreboard connection", detail: "The Santa's Lights scoreboard and this system share data, and Maverick reads it for the weekly plan." },
  { lane: "later", area: "Marketing", emoji: "🧠", title: "Maverick plans the month", detail: "A full monthly plan across both companies, with every spend and mass send waiting for your approval." },
];
