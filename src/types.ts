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
  CLAUDE_MODEL: string;
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
}
