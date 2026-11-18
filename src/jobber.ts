import { sb } from "./db";
import type { Env } from "./types";

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
export async function makeState(secret: string, now = Date.now()): Promise<string> {
  return `${now}.${await hmac(secret, String(now))}`;
}
export async function checkState(secret: string, state: string | null, now = Date.now()): Promise<boolean> {
  if (!state) return false;
  const [ts, sig] = state.split(".");
  if (!ts || !sig || now - Number(ts) > 10 * 60_000 || now < Number(ts)) return false;
  return (await hmac(secret, ts)) === sig;
}

export function authorizeUrl(env: Env, origin: string, state: string): string {
  const q = new URLSearchParams({ response_type: "code", client_id: env.JOBBER_CLIENT_ID, redirect_uri: redirectUri(origin), state });
  return `${AUTH_URL}?${q}`;
}

interface TokenResponse { access_token: string; refresh_token: string; expires_in?: number }

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) });
  if (!res.ok) throw new Error(`Jobber token ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as TokenResponse;
}

async function saveTokens(env: Env, t: TokenResponse): Promise<void> {
  const expires = new Date(Date.now() + (t.expires_in ?? 55 * 60) * 1000).toISOString();
  await sb(env, "POST", "integrations?on_conflict=provider",
    { provider: "jobber", access_token: t.access_token, refresh_token: t.refresh_token, expires_at: expires, updated_at: new Date().toISOString() },
    "resolution=merge-duplicates,return=minimal");
}

export async function exchangeCode(env: Env, origin: string, code: string): Promise<void> {
  await saveTokens(env, await tokenRequest({
    grant_type: "authorization_code", code, client_id: env.JOBBER_CLIENT_ID, client_secret: env.JOBBER_CLIENT_SECRET, redirect_uri: redirectUri(origin),
  }));
}

/** Current access token; refreshes (and stores the rotated refresh token) when within 5 minutes of expiry. */
export async function accessToken(env: Env): Promise<string> {
  const [row] = await sb<{ access_token: string; refresh_token: string; expires_at: string }[]>(env, "GET", "integrations?provider=eq.jobber&limit=1");
  if (!row) throw new Error("Jobber is not connected yet. Open /admin/jobber/connect first.");
  if (new Date(row.expires_at).getTime() - Date.now() > 5 * 60_000) return row.access_token;
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: row.refresh_token, client_id: env.JOBBER_CLIENT_ID, client_secret: env.JOBBER_CLIENT_SECRET });
  await saveTokens(env, { ...t, refresh_token: t.refresh_token ?? row.refresh_token });
  return t.access_token;
}

export async function gql<T>(env: Env, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken(env)}`,
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

export async function listMutations(env: Env, filter?: string): Promise<string[]> {
  const d = await gql<{ __schema: { mutationType: { fields: { name: string; args: { name: string; type: TypeRef }[] }[] } } }>(
    env, `{ __schema { mutationType { fields { name args { name type { ${TYPE_REF} } } } } } }`);
  return d.__schema.mutationType.fields
    .filter((f) => !filter || f.name.toLowerCase().includes(filter.toLowerCase()))
    .map((f) => `${f.name}(${f.args.map((a) => `${a.name}: ${typeName(a.type)}`).join(", ")})`);
}

export async function describeType(env: Env, name: string): Promise<Record<string, string> | null> {
  const d = await gql<{ __type: { fields?: { name: string; type: TypeRef }[]; inputFields?: { name: string; type: TypeRef }[]; enumValues?: { name: string }[] } | null }>(
    env, `query($n: String!) { __type(name: $n) { fields { name type { ${TYPE_REF} } } inputFields { name type { ${TYPE_REF} } } enumValues { name } } }`, { n: name });
  if (!d.__type) return null;
  const out: Record<string, string> = {};
  for (const f of d.__type.fields ?? d.__type.inputFields ?? []) out[f.name] = typeName(f.type);
  for (const e of d.__type.enumValues ?? []) out[e.name] = "enum value";
  return out;
}
