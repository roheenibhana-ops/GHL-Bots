export interface Env {
  GHL_TOKEN_LIGHTS: string;
  GHL_LOCATION_LIGHTS: string;
  GHL_TOKEN_DUNZO: string;
  GHL_LOCATION_DUNZO: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  ANTHROPIC_API_KEY: string;
  ADMIN_TOKEN: string;
  WEBHOOK_SECRET: string;
  JOBBER_CLIENT_ID: string;
  JOBBER_CLIENT_SECRET: string;
  JOBBER_API_VERSION: string;
  // Optional per-account app credentials. If unset, the shared JOBBER_CLIENT_ID / SECRET are used.
  JOBBER_CLIENT_ID_LIGHTS?: string;
  JOBBER_CLIENT_SECRET_LIGHTS?: string;
  JOBBER_CLIENT_ID_DUNZO?: string;
  JOBBER_CLIENT_SECRET_DUNZO?: string;
  SENDING_ENABLED: string;
  SEND_MODE: string;
  BATCH_SIZE: string;
  QUIET_START_HOUR: string;
  QUIET_END_HOUR: string;
  DAILY_CAP?: string;
  START_ON?: string;
  /** Dates (Pacific, YYYY-MM-DD, comma separated) when no promo or follow up texts are sent. */
  BLACKOUT_DATES?: string;
  /** GHL user id to make the owner of each contact a promo is sent to, when they have no owner yet. */
  PROMO_OWNER_ID?: string;
  BATCH_CAMPAIGN?: string;
  BATCH_MAX_PER_RUN?: string;
  CLAUDE_MODEL: string;
  /** off = capture only | test = reply only to contacts tagged bot-test | live = reply to everyone */
  BOT_MODE: string;
  /** alert = tell the team | draft = draft quote in Jobber + tell the team | link = create, mark sent, text the customer the link */
  QUOTE_MODE: string;
  /** The sales conversation uses a stronger model than the cheap helpers. */
  BOT_MODEL?: string;
  /** off = ignore photos | test = only contacts tagged bot-test | live = every contact. Moves New Lead to Photos Received and thanks them. */
  PHOTO_MODE: string;
  /** Comma separated pipeline names the bots may touch. Anything else is left completely alone. */
  BOT_PIPELINES?: string;
  PROMO_PIPELINE?: string;
  /** The campaign tag. Bots act on contacts carrying it only when the mode is live. Added when a campaign text is approved and sent. */
  BOT_TAG?: string;
  BOT_START_HOUR: string;
  BOT_END_HOUR: string;
  /** Optional secret: mobile number (E.164 or 10 digits) that gets handoff and quote alerts by text. */
  ALERT_PHONE?: string;
  /** Optional secret: a limited token for testing tools only (simulator, dry runs, read-only views). */
  AGENT_TOKEN?: string;
}

export type Account = "lights" | "dunzo";
export const ACCOUNTS: Account[] = ["lights", "dunzo"];

export interface GhlCreds {
  account: Account;
  token: string;
  locationId: string;
}

export interface GhlContact {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  dnd?: boolean;
  dndSettings?: Record<string, { status?: string } | undefined>;
  tags?: string[];
  /** The GHL user who owns the contact. */
  assignedTo?: string;
}
