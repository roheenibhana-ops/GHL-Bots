/**
 * What the bot knows about Dunzo Gutters. Everything here comes from dunzogutters.com and Jobber's quote template.
 * If the bot is asked something that is not here, it hands off instead of guessing.
 */
export const BUSINESS_KNOWLEDGE = `
COMPANY: Dunzo Gutters, a local Sacramento-area gutter and exterior-care company, founded by Clark in 2014 (it started with "a ladder and a truck"). Based at 11440 Sunrise Gold Cir #20, Rancho Cordova. Phone (916) 571-6644. Fast responses Monday to Saturday. California licence #1135420, fully licensed and insured, BBB accredited. 4.9 stars from 76 Google reviews.
STYLE OF THE COMPANY: straightforward. Firm price before work starts, "the price we quote is the price you pay", no hidden extras. They tell customers the truth (for example, if a repair is all that is needed they say so, even if it is the smaller job).
GUARANTEES: 30-day money-back promise on every visit. 30-day no-clog guarantee on gutter cleaning. "Guaranteed Excellence, or we pay you". Every visit includes a Gutter Health Report Card (a written, photographed condition report).

THE CURRENT PROMO (Winter Warm Up): one-time gutter cleaning at $219 for a single-story home or $319 for a two-story home. The customer pays a 50% deposit when they approve the quote online ($109.50 on single story, $159.50 on two story). Regular gutter cleaning on the website "starts at $249", so the single-story promo price is below the regular starting price. Do not claim savings on the two-story price.
WHAT THE CLEANING INCLUDES: hand-cleared debris from every run (leaves, seed pods, roof grit, not just blown out from the ground); full downspout flush test to confirm water exits away from the foundation; the Dunzo 360 Home Check, with findings photographed and reported (Gutter Health Report Card); full clean-up, debris bagged and hauled away, yard and driveway left as found; 30-day no-clog guarantee; underground drainage connected to downspouts is inspected, and if clogged they disconnect it and restore flow at no additional charge (underground drainage replacement is a separate service). Optional add-on, NOT included: Clog Hog downspout filter installation, $59 per downspout, highly recommended to prevent future clogs.
The customer does not need to be home as long as the crew can reach the outside of the house and any gates. The Gutter Health Report Card is emailed after the job.
They come equipped for two- and three-story homes and steep or complex rooflines. If something is unusually difficult or unsafe to reach, the crew says so plainly.

WHY CLEAN GUTTERS (true, from the site): over half of Sacramento's yearly rain falls between November and February, which is when clogged gutters do the most damage. Failed or overflowing gutters can lead to foundation and fascia damage, often cited at roughly $7,500 to $8,000. Water damage is the second most common cause of homeowners insurance claims (Insurance Information Institute, 2023). Leaves and seed pods break down into soil and weeds can root in a neglected gutter. Most Sacramento homes do well with two cleanings a year (late fall after leaf drop, and after the rainy season); homes under mature oaks or pines may need a third.
SIGNS GUTTERS NEED CLEANING: plants or debris growing from the gutter, water spilling over the sides in rain, gutters sagging or pulling from the fascia, water stains or streaks on the siding, pooling water or soggy patches near the foundation, pests nesting in standing debris.

SERVICE AREA (23 communities): Sacramento County: Sacramento, Elk Grove, Rancho Cordova, Folsom, Carmichael, Arden Arcade, Citrus Heights, Fair Oaks, Orangevale, Antelope, Florin, Foothill Farms, Mather, Vineyard, Gold River, La Riviera. Placer County: Roseville, Rocklin, Lincoln, Granite Bay, Auburn, Loomis. El Dorado County: El Dorado Hills. One crew, no travel upcharge. If a customer's city is not on this list, do not promise service: hand off.

OTHER SERVICES (do not quote these; the team prices them): seamless gutter installation, gutter guards, gutter repair (website says repairs start at $300; the team prices a repair from photos or a visit), roof cleaning, solar panel cleaning, window cleaning, pressure washing, bird proofing, virtual inspections (free virtual assessment from a quick video or photos). An on-site assessment is $149, credited toward the job if the customer goes ahead. Financing exists (0% APR promotional plans, soft credit check, no early-payment penalty) for projects of $1,000 or more, so it does not apply to the cleaning promo.
`.trim();

/** Dollar amounts the bot is allowed to say. Anything else is blocked and retried. */
export const ALLOWED_PRICES = [219, 319, 109.5, 159.5, 249, 59, 300, 149, 7500, 8000];
