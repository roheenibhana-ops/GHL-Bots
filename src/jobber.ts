import { sb } from "./db";
import type { JClient } from "./check";
import type { Account, Env } from "./types";

const AUTH_URL = "https://api.getjobber.com/api/oauth/authorize";
const TOKEN_URL = "https://api.getjobber.com/api/oauth/token";
const GRAPHQL_URL = "https://api.getjobber.com/api/graphql";

export const redirectUri = (origin: string) => `${origin}/admin/jobber/callback`;

// ---- OAuth state: signed with ADMIN_TOKEN so the callback can trust it without a session ----
async function hmac(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function makeState(secret: string, account: Account, now = Date.now()): Promise<string> {
  return `${now}.${account}.${await hmac(secret, `${now}.${account}`)}`;
}
/** Returns the account the state was issued for, or null if the state is invalid, tampered or expired. */
export async function checkState(secret: string, state: string | null, now = Date.now()): Promise<Account | null> {
  if (!state) return null;
  const [ts, account, sig] = state.split(".");
  if (!ts || !sig || (account !== "lights" && account !== "dunzo")) return null;
  if (now - Number(ts) > 10 * 60_000 || now < Number(ts)) return null;
  return (await hmac(secret, `${ts}.${account}`)) === sig ? account : null;
}

function appCreds(env: Env, account: Account): { id: string; secret: string } {
  const id = (account === "lights" ? env.JOBBER_CLIENT_ID_LIGHTS : env.JOBBER_CLIENT_ID_DUNZO) || env.JOBBER_CLIENT_ID;
  const secret = (account === "lights" ? env.JOBBER_CLIENT_SECRET_LIGHTS : env.JOBBER_CLIENT_SECRET_DUNZO) || env.JOBBER_CLIENT_SECRET;
  if (!id || !secret) throw new Error(`Missing Jobber app credentials for ${account}`);
  return { id, secret };
}

export function authorizeUrl(env: Env, account: Account, origin: string, state: string): string {
  const q = new URLSearchParams({ response_type: "code", client_id: appCreds(env, account).id, redirect_uri: redirectUri(origin), state });
  return `${AUTH_URL}?${q}`;
}

interface TokenResponse { access_token: string; refresh_token: string; expires_in?: number }

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
  if (!res.ok) throw new Error(`Jobber token ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as TokenResponse;
}

async function saveTokens(env: Env, account: Account, t: TokenResponse): Promise<void> {
  const expires = new Date(Date.now() + (t.expires_in ?? 55 * 60) * 1000).toISOString();
  await sb(env, "POST", "integrations?on_conflict=provider",
    { provider: `jobber:${account}`, access_token: t.access_token, refresh_token: t.refresh_token, expires_at: expires, updated_at: new Date().toISOString() },
    "resolution=merge-duplicates,return=minimal");
}

export async function exchangeCode(env: Env, account: Account, origin: string, code: string): Promise<void> {
  const { id, secret } = appCreds(env, account);
  await saveTokens(env, account, await tokenRequest({
    grant_type: "authorization_code", code, client_id: id, client_secret: secret, redirect_uri: redirectUri(origin),
  }));
}

/** Current access token; refreshes (and stores the rotated refresh token) when within 5 minutes of expiry. */
const tokenCache = new Map<Account, { token: string; expires: number }>();

export async function accessToken(env: Env, account: Account): Promise<string> {
  // In-memory cache: saves a Supabase call per Jobber request (Workers limit outbound calls per invocation).
  const hit = tokenCache.get(account);
  if (hit && hit.expires - Date.now() > 5 * 60_000) return hit.token;
  const fresh = await loadToken(env, account);
  tokenCache.set(account, fresh);
  return fresh.token;
}

async function loadToken(env: Env, account: Account): Promise<{ token: string; expires: number }> {
  type Row = { provider: string; access_token: string; refresh_token: string; expires_at: string };
  let [row] = await sb<Row[]>(env, "GET", `integrations?provider=eq.${encodeURIComponent(`jobber:${account}`)}&limit=1`);
  // The first connection was saved before accounts existed, under plain "jobber" (the gutters account).
  if (!row && account === "dunzo") [row] = await sb<Row[]>(env, "GET", "integrations?provider=eq.jobber&limit=1");
  if (!row) throw new Error(`Jobber (${account}) is not connected yet. Open /admin/jobber/connect?account=${account} first.`);
  const expires = new Date(row.expires_at).getTime();
  if (expires - Date.now() > 5 * 60_000) return { token: row.access_token, expires };
  const { id, secret } = appCreds(env, account);
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: row.refresh_token, client_id: id, client_secret: secret });
  await saveTokens(env, account, { ...t, refresh_token: t.refresh_token ?? row.refresh_token });
  return { token: t.access_token, expires: Date.now() + (t.expires_in ?? 55 * 60) * 1000 };
}

export async function gql<T>(env: Env, account: Account, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken(env, account)}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": env.JOBBER_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || body.errors?.length) throw new Error(`Jobber GraphQL ${res.status}: ${JSON.stringify(body.errors ?? body).slice(0, 500)}`);
  return body.data as T;
}

// ---- Schema discovery: shows the real field names so we never guess them ----
interface TypeRef { kind: string; name: string | null; ofType?: TypeRef | null }
export const typeName = (t: TypeRef | null | undefined): string =>
  !t ? "?" : t.kind === "NON_NULL" ? `${typeName(t.ofType)}!` : t.kind === "LIST" ? `[${typeName(t.ofType)}]` : (t.name ?? "?");

const TYPE_REF = "kind name ofType { kind name ofType { kind name ofType { kind name } } }";

export async function listMutations(env: Env, account: Account, filter?: string): Promise<string[]> {
  const d = await gql<{ __schema: { mutationType: { fields: { name: string; args: { name: string; type: TypeRef }[] }[] } } }>(
    env, account, `{ __schema { mutationType { fields { name args { name type { ${TYPE_REF} } } } } } }`);
  return d.__schema.mutationType.fields
    .filter((f) => !filter || f.name.toLowerCase().includes(filter.toLowerCase()))
    .map((f) => `${f.name}(${f.args.map((a) => `${a.name}: ${typeName(a.type)}`).join(", ")})`);
}

export async function describeType(env: Env, account: Account, name: string): Promise<Record<string, string> | null> {
  const d = await gql<{ __type: { fields?: { name: string; type: TypeRef }[]; inputFields?: { name: string; type: TypeRef }[]; enumValues?: { name: string }[] } | null }>(
    env, account, `query($n: String!) { __type(name: $n) { fields { name type { ${TYPE_REF} } } inputFields { name type { ${TYPE_REF} } } enumValues { name } } }`, { n: name });
  if (!d.__type) return null;
  const out: Record<string, string> = {};
  for (const f of d.__type.fields ?? d.__type.inputFields ?? []) out[f.name] = typeName(f.type);
  for (const e of d.__type.enumValues ?? []) out[e.name] = "enum value";
  return out;
}

/** Pulls client phone numbers (normalised later by the caller). Returns raw numbers and how many are SMS-stopped in Jobber. */
export async function listClientPhones(env: Env, account: Account, pages: number): Promise<{ numbers: string[]; smsStopped: string[]; total: number; pulled: number }> {
  const numbers: string[] = [];
  const smsStopped: string[] = [];
  let after: string | null = null;
  let total = 0;
  let pulled = 0;
  for (let i = 0; i < pages; i++) {
    const d: { clients: { totalCount: number; nodes: { isArchived: boolean; phones: { number: string; smsStopped: boolean }[] }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
      await gql(env, account, `query($after: String) { clients(first: 50, after: $after) { totalCount nodes { isArchived phones { number smsStopped } } pageInfo { hasNextPage endCursor } } }`, { after });
    total = d.clients.totalCount;
    for (const c of d.clients.nodes) {
      pulled++;
      for (const ph of c.phones) {
        numbers.push(ph.number);
        if (ph.smsStopped) smsStopped.push(ph.number);
      }
    }
    if (!d.clients.pageInfo.hasNextPage) break;
    after = d.clients.pageInfo.endCursor;
  }
  return { numbers, smsStopped, total, pulled };
}

/** Shows the arguments of one field, e.g. Query.clients, so we use real argument names. */
export async function describeField(env: Env, account: Account, typeNameStr: string, field: string): Promise<Record<string, string> | null> {
  const d = await gql<{ __type: { fields: { name: string; args: { name: string; type: TypeRef }[] }[] } | null }>(
    env, account, `query($n: String!) { __type(name: $n) { fields { name args { name type { ${TYPE_REF} } } } } }`, { n: typeNameStr });
  const f = d.__type?.fields.find((x) => x.name === field);
  if (!f) return null;
  return Object.fromEntries(f.args.map((a) => [a.name, typeName(a.type)]));
}

/** Looks up clients by phone, 10 numbers per request (aliased GraphQL). Search is fuzzy: callers must confirm with assess(). */
export async function findClientsByPhones(env: Env, account: Account, phonesE164: string[]): Promise<Map<string, JClient[]>> {
  const out = new Map<string, JClient[]>();
  for (let i = 0; i < phonesE164.length; i += 10) {
    const batch = phonesE164.slice(i, i + 10);
    const vars: Record<string, string> = {};
    const decl = batch.map((_, k) => `$p${k}: String`).join(", ");
    const body = batch.map((p, k) => {
      vars[`p${k}`] = p.replace(/^\+1/, "");
      return `c${k}: clients(searchTerm: $p${k}, searchFields: [PHONES], first: 5) { nodes { id name phones { number normalizedPhoneNumber } quotes(first: 20) { nodes { quoteStatus sentAt createdAt } } jobs(first: 10) { totalCount nodes { jobStatus completedAt } } } }`;
    }).join("\n");
    const d = await gql<Record<string, { nodes: JClient[] }>>(env, account, `query(${decl}) { ${body} }`, vars);
    batch.forEach((p, k) => out.set(p, d[`c${k}`]?.nodes ?? []));
  }
  return out;
}

export interface QuoteTemplateInfo {
  id: string; name: string; message: string | null; disclaimer: string | null;
  requiredDeposit: { rate: number; type: string } | null;
  lineItems: { nodes: { name: string; description: string; quantity: number; unitPrice: number; optional: boolean }[] };
}

export async function listQuoteTemplates(env: Env, account: Account): Promise<QuoteTemplateInfo[]> {
  const d = await gql<{ quoteTemplates: { nodes: QuoteTemplateInfo[] } }>(env, account,
    `{ quoteTemplates(first: 25) { nodes { id name message disclaimer requiredDeposit { rate type } lineItems(first: 20) { nodes { name description quantity unitPrice optional } } } } }`);
  return d.quoteTemplates.nodes;
}
