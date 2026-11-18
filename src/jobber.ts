import { sb } from "./db";
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
export async function accessToken(env: Env, account: Account): Promise<string> {
  type Row = { provider: string; access_token: string; refresh_token: string; expires_at: string };
  let [row] = await sb<Row[]>(env, "GET", `integrations?provider=eq.${encodeURIComponent(`jobber:${account}`)}&limit=1`);
  // The first connection was saved before accounts existed, under plain "jobber" (the gutters account).
  if (!row && account === "dunzo") [row] = await sb<Row[]>(env, "GET", "integrations?provider=eq.jobber&limit=1");
  if (!row) throw new Error(`Jobber (${account}) is not connected yet. Open /admin/jobber/connect?account=${account} first.`);
  if (new Date(row.expires_at).getTime() - Date.now() > 5 * 60_000) return row.access_token;
  const { id, secret } = appCreds(env, account);
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: row.refresh_token, client_id: id, client_secret: secret });
  await saveTokens(env, account, { ...t, refresh_token: t.refresh_token ?? row.refresh_token });
  return t.access_token;
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
