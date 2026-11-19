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

/** Picks the Winter Warm Up promo template for the story count, by name. */
export function pickTemplate(templates: QuoteTemplateInfo[], stories: 1 | 2): QuoteTemplateInfo | null {
  const re = stories === 1 ? /winter warm up promo.*single story/i : /winter warm up promo.*two story/i;
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

interface ClientRef { id: string; properties: { id: string; address: { street1: string; postalCode: string } }[] }

async function loadClient(env: Env, id: string): Promise<ClientRef> {
  const d = await gql<{ client: { id: string; clientProperties: { nodes: { id: string; address: { street1: string; postalCode: string } }[] } } }>(
    env, "dunzo", `query($id: EncodedId!) { client(id: $id) { id clientProperties(first: 25) { nodes { id address { street1 postalCode } } } } }`, { id });
  return { id: d.client.id, properties: d.client.clientProperties.nodes };
}

const errs = (e: { message: string }[]) => e.map((x) => x.message).join("; ");

export interface QuotePlan {
  template: { id: string; name: string; unitPrice: number } | null;
  client: "will create" | "existing" | "ambiguous";
  clientId?: string;
  property: "will create" | "existing" | "n/a";
  problems: string[];
}

/** Plans (and with create=true, performs) client + property + quote creation in Dunzo's Jobber. Sends no text and no email. */
export async function createGutterQuote(env: Env, r: QuoteRequest, create: boolean) {
  const problems: string[] = [];
  const templates = await listQuoteTemplates(env, "dunzo");
  const tpl = pickTemplate(templates, r.stories);
  if (!tpl) problems.push(`No Winter Warm Up Promo template found for ${r.stories} story`);
  const line = tpl?.lineItems.nodes.find((l) => !l.optional) ?? tpl?.lineItems.nodes[0];
  if (tpl && !line) problems.push("Template has no line item");

  const found = await findClientsByPhones(env, "dunzo", [r.phone]);
  const hits = (found.get(r.phone) ?? []).filter((c: JClient) => assess([c], r.phone).found);
  const plan: QuotePlan = {
    template: tpl && line ? { id: tpl.id, name: tpl.name, unitPrice: line.unitPrice } : null,
    client: hits.length === 0 ? "will create" : hits.length === 1 ? "existing" : "ambiguous",
    clientId: hits[0]?.id,
    property: "n/a",
    problems,
  };
  if (hits.length > 1) problems.push("More than one Jobber client has this phone number: needs a human to pick one");

  let clientId = hits.length === 1 ? hits[0].id : undefined;
  let propertyId: string | null = null;
  if (clientId) {
    const c = await loadClient(env, clientId);
    propertyId = findProperty(c.properties, r.address);
    plan.property = propertyId ? "existing" : "will create";
  } else if (hits.length === 0) {
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
        transitionQuoteTo: "AWAITING_RESPONSE",
      } });
  if (!q.quoteCreate.quote) throw new Error(`quoteCreate failed: ${errs(q.quoteCreate.userErrors)}`);
  return { created: true, plan, clientId, quote: q.quoteCreate.quote };
}
