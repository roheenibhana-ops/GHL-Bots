import type { Opp, PipelineInfo } from "./photo";
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

/** A plain call to the GHL API, for one off lookups. */
export const ghlRaw = <T>(c: GhlCreds, method: string, path: string, body?: unknown) => call<T>(c, method, path, body);

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

export interface GhlContactFull extends GhlContact {
  address1?: string; city?: string; state?: string; postalCode?: string;
}

export async function getContact(c: GhlCreds, contactId: string): Promise<GhlContactFull> {
  const r = await call<{ contact: GhlContactFull }>(c, "GET", `/contacts/${contactId}`);
  return r.contact;
}

export async function updateContact(c: GhlCreds, contactId: string, fields: Record<string, string>): Promise<unknown> {
  return call(c, "PUT", `/contacts/${contactId}`, fields);
}

export async function setEmail(c: GhlCreds, contactId: string, email: string): Promise<unknown> {
  return call(c, "PUT", `/contacts/${contactId}`, { email });
}

// ---- Opportunities (API version 2021-07-28) ----
async function oppCall<T>(c: GhlCreds, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${c.token}`, Version: "2021-07-28", Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GHL ${method} ${path} -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

export async function listOpportunities(c: GhlCreds, contactId: string): Promise<Opp[]> {
  const r = await oppCall<{ opportunities?: Opp[] }>(c, "GET", `/opportunities/search?location_id=${c.locationId}&contact_id=${contactId}&limit=20`);
  return (r.opportunities ?? []).map((o) => ({ id: o.id, name: o.name, pipelineId: o.pipelineId, pipelineStageId: o.pipelineStageId, status: o.status }));
}

export async function getPipelines(c: GhlCreds): Promise<PipelineInfo[]> {
  const r = await oppCall<{ pipelines?: PipelineInfo[] }>(c, "GET", `/opportunities/pipelines?locationId=${c.locationId}`);
  return (r.pipelines ?? []).map((p) => ({ id: p.id, name: p.name, stages: (p.stages ?? []).map((st) => ({ id: st.id, name: st.name })) }));
}

export async function moveOpportunity(c: GhlCreds, oppId: string, stageId: string): Promise<unknown> {
  return oppCall(c, "PUT", `/opportunities/${oppId}`, { pipelineStageId: stageId });
}

/** The opportunity's current stage id, so a move can be verified instead of assumed. */
export async function opportunityStageId(c: GhlCreds, oppId: string): Promise<string | undefined> {
  const r = await oppCall<{ opportunity?: { pipelineStageId?: string }; pipelineStageId?: string }>(c, "GET", `/opportunities/${oppId}`);
  return r.opportunity?.pipelineStageId ?? r.pipelineStageId;
}

export async function removeTags(c: GhlCreds, contactId: string, tags: string[]): Promise<unknown> {
  return call(c, "DELETE", `/contacts/${contactId}/tags`, { tags });
}

/** Clears do-not-disturb on SMS (used only when resetting a test contact after a STOP test). */
export async function clearDnd(c: GhlCreds, contactId: string): Promise<unknown> {
  return call(c, "PUT", `/contacts/${contactId}`, { dnd: false, dndSettings: { SMS: { status: "inactive", message: "", code: "" } } });
}

/** Read only: recent conversations, newest first. */
export async function searchConversations(c: GhlCreds, limit = 20, startAfterDate?: number): Promise<{ id: string; contactId: string; fullName?: string; lastMessageType?: string; lastMessageDate?: number }[]> {
  const q = `/conversations/search?locationId=${encodeURIComponent(c.locationId)}&limit=${limit}&sortBy=last_message_date&sort=desc${startAfterDate ? `&startAfterDate=${startAfterDate}` : ""}`;
  const d = await call<{ conversations?: { id: string; contactId: string; fullName?: string; lastMessageType?: string; lastMessageDate?: number }[] }>(c, "GET", q);
  return d.conversations ?? [];
}

/** Read only: the messages of one conversation. */
export async function conversationMessages(c: GhlCreds, conversationId: string, limit = 60): Promise<{ direction?: string; body?: string; messageType?: string; dateAdded?: string; source?: string; userId?: string }[]> {
  const d = await call<{ messages?: { messages?: { direction?: string; body?: string; messageType?: string; dateAdded?: string; source?: string; userId?: string }[] } }>(c, "GET", `/conversations/${encodeURIComponent(conversationId)}/messages?limit=${limit}`);
  return d.messages?.messages ?? [];
}

export async function createOpportunity(c: GhlCreds, o: { pipelineId: string; stageId: string; contactId: string; name: string }): Promise<unknown> {
  return oppCall(c, "POST", "/opportunities/", { pipelineId: o.pipelineId, locationId: c.locationId, name: o.name, pipelineStageId: o.stageId, status: "open", contactId: o.contactId });
}
