import { credsFor, ghlRaw } from "./ghl";
import { gql } from "./jobber";
import { ghlNotes, ghlOpportunities } from "./profile";
import type { Account, Env } from "./types";

/**
 * Read only: everything the two systems hold about one customer, side by side.
 * Used to study how a lead looks in GoHighLevel and in Jobber before the app takes over a Zap.
 */
export async function lookupCustomer(env: Env, account: Account, query: string) {
  const creds = credsFor(env, account);
  const found = await ghlRaw<{ contacts?: Record<string, unknown>[] }>(creds, "POST", "/contacts/search", { locationId: creds.locationId, pageLimit: 5, page: 1, query });
  const fields = await ghlRaw<{ customFields?: { id: string; name: string; fieldKey?: string; model?: string }[] }>(creds, "GET", `/locations/${creds.locationId}/customFields?model=all`).catch(() => ({ customFields: [] }));
  const names = new Map((fields.customFields ?? []).map((f) => [f.id, `${f.name} [${f.model ?? "contact"}: ${f.fieldKey ?? ""}]`]));
  const out = [];
  for (const c of (found.contacts ?? []).slice(0, 3)) {
    const id = String(c.id);
    const [full, notes, opps] = await Promise.all([
      ghlRaw<{ contact: Record<string, unknown> }>(creds, "GET", `/contacts/${id}`).then((r) => r.contact).catch(() => c),
      ghlNotes(creds, id),
      ghlOpportunities(creds, id),
    ]);
    const custom = ((full.customFields as { id: string; value: unknown }[]) ?? []).filter((f) => f.value !== "" && f.value != null).map((f) => ({ field: names.get(f.id) ?? f.id, value: f.value }));
    const phone = String(full.phone ?? "");
    const email = String(full.email ?? "");
    const term = email || phone.replace(/^\+1/, "");
    const jobber = term ? await gql<{ clients: { nodes: unknown[] } }>(env, account, `query($t: String!) { clients(searchTerm: $t, first: 3) { nodes { id name createdAt emails { address } phones { number } tags { nodes { label } } billingAddress { street1 city province postalCode } notes(first: 10) { nodes { ... on ClientNote { message createdAt } } } requests(first: 5) { nodes { title requestStatus createdAt source } } quotes(first: 5) { nodes { quoteNumber quoteStatus title createdAt } } } } }`, { t: term }).then((d) => d.clients.nodes).catch((e) => [{ error: (e as Error).message.slice(0, 300) }]) : [];
    out.push({ ghl: { id, name: [full.firstName, full.lastName].filter(Boolean).join(" "), email, phone, source: full.source, dateAdded: full.dateAdded, tags: full.tags, address: [full.address1, full.city, full.state, full.postalCode].filter(Boolean).join(", "), customFields: custom, notes, opportunities: opps }, jobber });
  }
  return { account, query, matches: out };
}
