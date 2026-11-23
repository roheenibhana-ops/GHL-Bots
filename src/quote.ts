import { assess, type JClient } from "./check";
import { findClientsByPhones, gql, listQuoteTemplates, type QuoteTemplateInfo } from "./jobber";
import type { Env } from "./types";

export interface Address { street1: string; city: string; province: string; postalCode: string }
export interface QuoteRequest {
  phone: string; // E.164
  firstName: string; lastName?: string; email?: string;
  address: Address;
  stories: 1 | 2;
}

export const DEPOSIT_PERCENT = 50;
export const PRICE: Record<1 | 2, number> = { 1: 219, 2: 319 };
export const depositFor = (stories: 1 | 2): string => ((PRICE[stories] * DEPOSIT_PERCENT) / 100).toFixed(2);

/** The text that carries the quote link. The customer must type the same email we saved on their Jobber client. */
export function linkMessage(email: string, stories: 1 | 2, link: string): string {
  return `Sorted, here's your quote: ${link} Pop ${email} in when it asks, grab the login link from your inbox, then approve it and the $${depositFor(stories)} deposit locks it in. Oh and who else do you know that could use this? Send them our way, same deal.`;
}

/** Picks the Winter Warm Up promo template for the story count, by name. */
export function pickTemplate(templates: QuoteTemplateInfo[], stories: 1 | 2): QuoteTemplateInfo | null {
  const re = stories === 1 ? /winter (warm up|ready) promo.*single story/i : /winter (warm up|ready) promo.*two story/i;
  return templates.find((t) => re.test(t.name)) ?? null;
}

const SUFFIX: Record<string, string> = { street: "st", avenue: "ave", road: "rd", drive: "dr", lane: "ln", court: "ct", boulevard: "blvd", circle: "cir", place: "pl", way: "way", terrace: "ter" };

/** "123 Main Street, Apt 4" and "123 main st" compare equal on street + ZIP. */
export function addressKey(street: string, postalCode: string): string {
  const s = street.toLowerCase().replace(/[.,#]/g, " ").split(/\s+/).filter(Boolean).map((w) => SUFFIX[w] ?? w);
  return `${s.slice(0, 3).join(" ")}|${postalCode.trim().slice(0, 5)}`;
}

export function findProperty(props: { id: string; address: { street1: string; postalCode: string } }[], a: Address): string | null {
  const want = addressKey(a.street1, a.postalCode);
  return props.find((p) => addressKey(p.address.street1, p.address.postalCode) === want)?.id ?? null;
}

interface ClientRef { id: string; properties: { id: string; address: { street1: string; postalCode: string } }[]; emails: { address: string }[] }

async function loadClient(env: Env, id: string): Promise<ClientRef> {
  const d = await gql<{ client: { id: string; clientProperties: { nodes: { id: string; address: { street1: string; postalCode: string } }[] }; emails: { address: string }[] } }>(
    env, "dunzo", `query($id: EncodedId!) { client(id: $id) { id clientProperties(first: 25) { nodes { id address { street1 postalCode } } } emails { address } } }`, { id });
  return { id: d.client.id, properties: d.client.clientProperties.nodes, emails: d.client.emails ?? [] };
}

const tokens = (n: string) => n.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);

/** Does the Jobber client's first name show up in the contact's name ("Wilson & Cathy SooHoo" contains Cathy)? Allows short forms (Rob / Robert). */
export function nameCompatible(jobberName: string, contactFullName: string): boolean {
  const j = tokens(jobberName)[0];
  if (!j) return false;
  return tokens(contactFullName).some((t) => t === j || (t.length >= 3 && j.length >= 3 && (t.startsWith(j) || j.startsWith(t))));
}

/**
 * Picks the Jobber client for a contact. A phone match alone is not enough: couples, families and test records share numbers,
 * so the contact's name has to fit too. Anything else is flagged for a human, never guessed.
 */
export function pickClient<T extends { name: string }>(hits: T[], firstName: string, fullName = firstName): { client: T | null; ambiguous: boolean; by?: "phone and name" | "first name" } {
  if (hits.length === 0) return { client: null, ambiguous: false };
  const fits = hits.filter((h) => nameCompatible(h.name, fullName));
  if (fits.length === 1) return { client: fits[0], ambiguous: false, by: hits.length === 1 ? "phone and name" : "first name" };
  return { client: null, ambiguous: true };
}

const errs = (e: { message: string }[]) => e.map((x) => x.message).join("; ");

export interface QuotePlan {
  template: { id: string; name: string; unitPrice: number } | null;
  client: "will create" | "existing" | "ambiguous";
  clientId?: string;
  /** Every Jobber client that matched the phone, so duplicates are easy to find and tidy. */
  matches: { id: string; name: string }[];
  matchedBy?: "phone and name" | "first name";
  property: "will create" | "existing" | "n/a";
  problems: string[];
}

/** Plans (and with create=true, performs) client + property + quote creation in Dunzo's Jobber. Creates a draft; sends no text and no email. */
export async function createGutterQuote(env: Env, r: QuoteRequest, create: boolean, markSent = false) {
  const problems: string[] = [];
  const templates = await listQuoteTemplates(env, "dunzo");
  const tpl = pickTemplate(templates, r.stories);
  if (!tpl) problems.push(`No Winter Warm Up Promo template found for ${r.stories} story`);
  const line = tpl?.lineItems.nodes.find((l) => !l.optional) ?? tpl?.lineItems.nodes[0];
  if (tpl && !line) problems.push("Template has no line item");

  const found = await findClientsByPhones(env, "dunzo", [r.phone]);
  const hits = (found.get(r.phone) ?? []).filter((c: JClient) => assess([c], r.phone).found);
  const pick = pickClient(hits, r.firstName, `${r.firstName} ${r.lastName ?? ""}`);
  const plan: QuotePlan = {
    template: tpl && line ? { id: tpl.id, name: tpl.name, unitPrice: line.unitPrice } : null,
    client: pick.ambiguous ? "ambiguous" : pick.client ? "existing" : "will create",
    clientId: pick.client?.id,
    matches: hits.map((h) => ({ id: h.id, name: h.name })),
    matchedBy: pick.by,
    property: "n/a",
    problems,
  };
  if (pick.ambiguous) problems.push("A Jobber client has this phone number but the name does not clearly match one person: needs a human to check");

  let clientId = pick.client?.id;
  let propertyId: string | null = null;
  let existing: ClientRef | undefined;
  if (clientId) {
    const c = await loadClient(env, clientId);
    existing = c;
    propertyId = findProperty(c.properties, r.address);
    plan.property = propertyId ? "existing" : "will create";
  } else if (!pick.ambiguous) {
    plan.property = "will create";
  }

  if (!create || problems.length || !tpl || !line) return { created: false, plan };

  // 1. client (with property) if new
  if (!clientId) {
    const d = await gql<{ clientCreate: { client: { id: string; clientProperties: { nodes: { id: string }[] } } | null; userErrors: { message: string }[] } }>(
      env, "dunzo",
      `mutation($input: ClientCreateInput!) { clientCreate(input: $input) { client { id clientProperties(first: 5) { nodes { id } } } userErrors { message } } }`,
      { input: {
          firstName: r.firstName, lastName: r.lastName ?? "",
          phones: [{ number: r.phone, description: "MOBILE", smsAllowed: true, primary: true }],
          ...(r.email ? { emails: [{ address: r.email, primary: true }] } : {}),
          properties: [{ address: { ...r.address, country: "US" } }],
          receivesQuoteFollowUps: false,
        } });
    if (!d.clientCreate.client) throw new Error(`clientCreate failed: ${errs(d.clientCreate.userErrors)}`);
    clientId = d.clientCreate.client.id;
    propertyId = d.clientCreate.client.clientProperties.nodes[0]?.id ?? null;
  } else if (!propertyId) {
    const d = await gql<{ propertyCreate: { properties: { id: string }[]; userErrors: { message: string }[] } }>(
      env, "dunzo",
      `mutation($clientId: EncodedId!, $input: PropertyCreateInput!) { propertyCreate(clientId: $clientId, input: $input) { properties { id } userErrors { message } } }`,
      { clientId, input: { properties: [{ address: { ...r.address, country: "US" } }] } });
    propertyId = d.propertyCreate.properties[0]?.id ?? null;
    if (!propertyId) throw new Error(`propertyCreate failed: ${errs(d.propertyCreate.userErrors)}`);
  }
  if (!propertyId) throw new Error("No property for the quote");

  // The client hub login only works with an email that is on the Jobber client. Add the one the customer gave us.
  let emailAdded = false;
  const wantEmail = r.email;
  if (existing && wantEmail && !existing.emails.some((e) => e.address.toLowerCase() === wantEmail.toLowerCase())) {
    const e = await gql<{ clientEdit: { userErrors: { message: string }[] } }>(
      env, "dunzo",
      `mutation($clientId: EncodedId!, $input: ClientEditInput!) { clientEdit(clientId: $clientId, input: $input) { userErrors { message } } }`,
      { clientId, input: { emailsToAdd: [{ address: wantEmail, primary: existing.emails.length === 0 }] } });
    if (e.clientEdit.userErrors.length) throw new Error(`Could not save the email on the Jobber client: ${errs(e.clientEdit.userErrors)}`);
    emailAdded = true;
  }

  // 2. quote from the template's line item, 50% deposit, card + bank payment on, marked awaiting response
  const q = await gql<{ quoteCreate: { quote: { id: string; quoteNumber: string; quoteStatus: string; clientHubUri: string | null; jobberWebUri: string } | null; userErrors: { message: string }[] } }>(
    env, "dunzo",
    `mutation($a: QuoteCreateAttributes!) { quoteCreate(attributes: $a) { quote { id quoteNumber quoteStatus clientHubUri jobberWebUri } userErrors { message } } }`,
    { a: {
        clientId, propertyId, quoteTemplateId: tpl.id,
        title: line.name,
        lineItems: [{ name: line.name, description: line.description, quantity: line.quantity, unitPrice: line.unitPrice, saveToProductsAndServices: false }],
        deposit: { rate: DEPOSIT_PERCENT, type: "Percent" },
        allowClientHubCreditCardPayments: true,
        allowClientHubAchPayments: true,
        // Default is a DRAFT: nothing downstream (GHL stage, tags, alerts) fires until a person presses Send in Jobber.
        // markSent=true sets "awaiting response" without delivering anything to the customer, which misleads the pipeline.
        ...(markSent ? { transitionQuoteTo: "AWAITING_RESPONSE" } : {}),
      } });
  if (!q.quoteCreate.quote) throw new Error(`quoteCreate failed: ${errs(q.quoteCreate.userErrors)}`);
  return { created: true, plan, clientId, emailAdded, quote: q.quoteCreate.quote };
}
