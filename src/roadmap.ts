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
  { lane: "live", area: "Marketing", emoji: "🦅", title: "Sales and Marketing Director", who: "Maverick", detail: "Weekly plain English report from your real numbers, with three things to do next." },
  { lane: "live", area: "Sales", emoji: "🎄", title: "Lights referral", detail: "A Dunzo customer who wants Christmas or permanent lighting is added to Santa's Lights, tagged, with a note." },
  { lane: "live", area: "Marketing", emoji: "📰", title: "Marketing writers", who: "Scoop, Comet, Chirp, Vixen, Quill, Holly, Pin, North", detail: "Newsletter, social posts, SEO blog posts and Google Business posts for each company. Drafts only, with prices and links checked." },
  // ---- now
  { lane: "now", area: "Platform", emoji: "✅", title: "Clark's final live check", detail: "One full run on his phone with everything built since the last test: objection, STOP, photo, Lights question." },
  { lane: "now", area: "Safety", emoji: "🔐", title: "Lock down access", detail: "Long admin token, and move the alert phone off Clark's own number." },
  { lane: "now", area: "Safety", emoji: "🔁", title: "Failed quote safeguard", detail: "If Jobber fails, the customer is never told a quote is coming, you get an alert, and it retries." },
  { lane: "now", area: "Safety", emoji: "📞", title: "Quo watcher", detail: "A call or voicemail pauses the bot on that customer so it never texts someone Clark is already talking to." },
  { lane: "now", area: "Sales", emoji: "🚀", title: "First 20 promo leads", detail: "You read the drafts, approve a small batch, and watch the conversations on the day." },
  // ---- next
  { lane: "next", area: "Platform", emoji: "❓", title: "Common questions builder", who: "Sage", detail: "Sorts what customers actually ask the agents each week, spots questions with no good answer, and proposes new knowledge for you to approve. Idea from the customer support plugin in your skills guide." },
  { lane: "next", area: "Platform", emoji: "🎙️", title: "Voice learner", detail: "From your boards: learns Clark from every Quo call and GHL conversation, so every agent writes and sells like him. Feeds every studio." },
  { lane: "next", area: "Marketing", emoji: "📍", title: "Google Business posting and review replies", who: "Pin, North", detail: "The quick win from your boards. Pin and North already write the posts. Next: publish them to Google, reply to every review, and add Q and A." },
  { lane: "next", area: "Sales", emoji: "🏃", title: "Morning quote follow ups", who: "Dash", detail: "A fresh message each morning, 8am to 8pm, seven days a week, to quotes that go quiet. Stops on a reply." },
  { lane: "next", area: "Sales", emoji: "📅", title: "Deposit to scheduled job", who: "Cal", detail: "Moves a lead to Job Scheduled or Unscheduled when the deposit lands, then tags dunzo-won when the job closes." },
  { lane: "next", area: "Marketing", emoji: "☀️", title: "After the job", who: "Sunny", detail: "Thank you, review request, referral ask and the 6 month gutter reminder." },
  { lane: "next", area: "Platform", emoji: "📬", title: "Daily report to Clark", detail: "A short summary each morning: what happened, who needs a person, what is cold." },
  { lane: "next", area: "Platform", emoji: "⚡", title: "Prompt caching", detail: "Cuts the cost of every bot reply, worth doing before the big lead run." },
  // ---- soon
  { lane: "soon", area: "Platform", emoji: "🧩", title: "Playbooks as Claude skills", detail: "Export each company's voice, knowledge, approved prices and links as a Claude skill, so your own scheduled Claude (blogs, newsletters) writes from the same source Clark edits in the studio. Uses the skill creator approach from your guide." },
  { lane: "soon", area: "Platform", emoji: "📄", title: "Reports you can download", who: "Maverick, Tally", detail: "The weekly report and the numbers as a PDF or an Excel file, ready to send to Clark or keep for the year end review." },
  { lane: "soon", area: "Sales", emoji: "🗒️", title: "Call prep and follow up drafts", who: "Summit", detail: "Before a site visit, a one page brief on the customer. After a call, a drafted follow up for Clark to send. Idea from the sales plugin in your skills guide." },
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
  { lane: "later", area: "Sales", emoji: "📑", title: "Proposals for big jobs", who: "Summit", detail: "A proper written proposal as a Word or PDF file for seamless installs, guards, permanent lighting and commercial work." },
  { lane: "later", area: "Marketing", emoji: "🪧", title: "Flyers, door hangers and postcards", detail: "Print ready designs for neighbour targeting and yard signs, in each company's look. Idea from the poster and graphic design skill in your guide." },
  { lane: "later", area: "Marketing", emoji: "🔎", title: "SEO reporting", who: "Quill, Holly", detail: "Your Claude setup writes and publishes the blogs. Quill and Holly become the SEO analysts Clark can ask where SEO is at: linked to Google Search Console for rankings, clicks and which posts work, plus what was published each week and which customer questions have no post yet." },
  { lane: "later", area: "Marketing", emoji: "🏘️", title: "Neighbour targeting", detail: "Every finished job triggers door hangers, postcards and geo ads to the homes around it, plus a yard sign and area tracker showing which streets sell." },
  { lane: "later", area: "Marketing", emoji: "📊", title: "Ad reporter and ad variants", detail: "Daily cost per sold job by ad from Meta Ads, and winning ideas turned into new hooks, copy and video cuts." },
  { lane: "later", area: "Sales", emoji: "🏡", title: "Partner channels", detail: "Realtors and inspectors, property managers and HOAs, event planners for off season lighting, and home show leads followed up automatically." },
  { lane: "later", area: "Platform", emoji: "🌐", title: "Santa's Lights site off Lovable", detail: "Move the website to Cloudflare with the same URLs, keeping the SEO." },
  { lane: "later", area: "Marketing", emoji: "🎓", title: "Marketing team coaching", detail: "Copy that sells, content that converts, and reading the numbers: kill or scale ads on sold jobs, not clicks." },
  { lane: "later", area: "Marketing", emoji: "🎬", title: "Video to posts", who: "Chirp, Vixen, Snap, Shutter", detail: "Feed it a video. It cuts the dead air, crops for Reels, adds captions and your logo, writes the post and hashtags, then schedules it through GHL after your approval. The tools it needs are in the toolbox below." },
  { lane: "later", area: "Marketing", emoji: "📲", title: "Publish posts through GHL", who: "Chirp, Vixen, Pin, North", detail: "Approved posts go out to Facebook, Instagram and Google Business through GHL Social Planner, which you already have. No new accounts or app approvals." },
  { lane: "later", area: "Platform", emoji: "🔌", title: "Replace the Zaps, one at a time", detail: "Jobber to GHL, Quo to GHL, CompanyCam to Jobber, and the scoreboard feed move into our own system. Paused on purpose until the bots are proven." },
  { lane: "later", area: "Marketing", emoji: "📣", title: "Ads", who: "Beacon, Donner", detail: "Ad ideas and copy for Google and Facebook, built from the same approved knowledge and judged on sold jobs." },
  { lane: "later", area: "Marketing", emoji: "🖼️", title: "Gallery and job content", who: "Snap, Shutter", detail: "Finished jobs turned into before and after galleries and short video ideas." },
  { lane: "later", area: "Platform", emoji: "📈", title: "Scoreboard connection", detail: "The Santa's Lights scoreboard and this system share data, and Maverick reads it for the weekly plan." },
  { lane: "later", area: "Marketing", emoji: "🧠", title: "Maverick plans the month", detail: "A full monthly plan across both companies, with every spend and mass send waiting for your approval." },
];

export interface Tool { group: string; name: string; cost: "Have it" | "Free" | "Free, check the licence" | "Free to start"; what: string; note?: string; url: string }

/** The outside tools the social and video agents will need. Shown on the Roadmap page so nothing is a surprise later. */
export const TOOLS: Tool[] = [
  { group: "Posting", name: "GHL Social Planner", cost: "Have it", what: "Schedules and publishes posts to the Facebook, Instagram, Google Business and TikTok accounts connected in your GHL, through the API we already use.", note: "My first choice. No new accounts or app approvals, and Chirp, Vixen, Pin and North can post through it once you approve a draft.", url: "https://marketplace.gohighlevel.com/docs/2023-02-21/ghl/social-planner/create-post.md" },
  { group: "Posting", name: "Postiz", cost: "Free, check the licence", what: "An open source social media scheduler you host yourself.", note: "Only a fallback if GHL's planner cannot do something. It needs its own server, and its licence (AGPL) matters if you ever resell.", url: "https://github.com/gitroomhq/postiz-app" },
  { group: "Video editing", name: "FFmpeg", cost: "Free", what: "The workhorse: trims clips, crops to vertical for Reels and Shorts, joins clips, burns in captions, adds music and a logo.", url: "https://github.com/FFmpeg/FFmpeg" },
  { group: "Video editing", name: "Remotion", cost: "Free, check the licence", what: "Branded video templates made in code: animated before and after, captions, intro and outro in each company's look.", note: "Free for a team of up to 3 people. A company of 4 or more needs a paid licence, so count heads before relying on it.", url: "https://github.com/remotion-dev/remotion" },
  { group: "Video editing", name: "auto-editor", cost: "Free", what: "Cuts the silent and dead parts out of a raw clip automatically.", url: "https://github.com/WyattBlue/auto-editor" },
  { group: "Video editing", name: "Whisper", cost: "Free", what: "Turns the speech in a video into text, for captions and for writing the post.", note: "Open source, and also available on Cloudflare, where we already run.", url: "https://github.com/ggml-org/whisper.cpp" },
  { group: "Where it runs", name: "GitHub Actions", cost: "Free to start", what: "A machine that does the heavy video work. Our Cloudflare Worker cannot edit video itself, so rendering has to run somewhere like this.", note: "Free monthly minutes on your GitHub plan. Heavy video use could go past them.", url: "https://docs.github.com/en/actions" },
  { group: "Where it runs", name: "Cloudflare R2", cost: "Free to start", what: "Storage for the videos and photos you feed in and the finished posts.", note: "Free up to a storage limit, then a small monthly cost.", url: "https://developers.cloudflare.com/r2/" },
  { group: "Where the content comes from", name: "CompanyCam", cost: "Have it", what: "The crew's job photos and videos, the raw material for before and after posts.", note: "Needs connecting. It is on the systems list as not connected yet.", url: "https://docs.companycam.com/" },
  { group: "Where the content comes from", name: "Claude vision", cost: "Have it", what: "Looks at the photos and video frames to pick the best shots and describe what is in them, so the captions are true to the job.", url: "https://platform.claude.com/docs" },
  { group: "For your own Claude", name: "Marketing, design and video skills", cost: "Free", what: "The skills from your guide (marketing skills, poster design, Remotion) installed in your own Claude apps, for one off creative work outside this system.", note: "Third party skills are not security checked. Look before you install.", url: "https://github.com/anthropics/skills" },
];
