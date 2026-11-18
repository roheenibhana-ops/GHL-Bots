import type { Account, Env, GhlContact, GhlCreds } from "./types";

const BASE = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-04-15";

export function credsFor(env: Env, account: Account): GhlCreds {
  const token = account === "lights" ? env.GHL_TOKEN_LIGHTS : env.GHL_TOKEN_DUNZO;
  const locationId = account === "lights" ? env.GHL_LOCATION_LIGHTS : env.GHL_LOCATION_DUNZO;
  if (!token || !locationId) throw new Error(`Missing GHL secrets for account "${account}"`);
  return { account, token, locationId };
}

async function call<T>(c: GhlCreds, method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${c.token}`,
      Version: API_VERSION,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 429 && attempt < 4) {
    const wait = 500 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, wait));
    return call<T>(c, method, path, body, attempt + 1);
  }
  if (!res.ok) throw new Error(`GHL ${method} ${path} -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

/** One page of contacts. NOTE: body shape is from the OpenAPI spec; verify against a live account in the dry run. */
export async function searchContacts(
  c: GhlCreds,
  opts: { pageLimit?: number; page?: number } = {},
): Promise<{ contacts: GhlContact[]; total?: number }> {
  return call(c, "POST", "/contacts/search", {
    locationId: c.locationId,
    pageLimit: opts.pageLimit ?? 100,
    page: opts.page ?? 1,
  });
}

export async function sendSms(c: GhlCreds, contactId: string, message: string): Promise<{ messageId?: string; conversationId?: string }> {
  return call(c, "POST", "/conversations/messages", { type: "SMS", contactId, message });
}

export async function addTags(c: GhlCreds, contactId: string, tags: string[]): Promise<unknown> {
  return call(c, "POST", `/contacts/${contactId}/tags`, { tags });
}

export async function addNote(c: GhlCreds, contactId: string, body: string): Promise<unknown> {
  return call(c, "POST", `/contacts/${contactId}/notes`, { body });
}

export async function setDnd(c: GhlCreds, contactId: string): Promise<unknown> {
  return call(c, "PUT", `/contacts/${contactId}`, { dnd: true });
}

/** Find-or-create by phone only (name and tags on an existing contact are not touched). */
export async function upsertByPhone(c: GhlCreds, phone: string): Promise<{ new?: boolean; contact: GhlContact }> {
  return call(c, "POST", "/contacts/upsert", { locationId: c.locationId, phone });
}
