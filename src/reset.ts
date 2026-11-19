import { findClientsByPhones, gql } from "./jobber";
import { assess } from "./check";
import { nameCompatible } from "./quote";
import { sb } from "./db";
import { clearDnd, credsFor, getContact, removeTags } from "./ghl";
import { normalizePhone } from "./safety";
import type { Env } from "./types";

/** The tags the bots add during a conversation. Only these are removed on a reset, never anything else on the contact. */
const BOT_TAG = /^(bot-needs-human|bot-quote-ready|bot-quote-sent|bot-declined|bot-opted-out|bot-paused|photos received|needs-repair-quote)$/i;
export const resettableTags = (tags: string[]): string[] => tags.filter((t) => BOT_TAG.test(t.trim()));

/** Quotes that are still open (not yet approved or converted). Approved quotes are never touched. */
const OPEN_FOR_ARCHIVE = ["draft", "awaiting_response", "changes_requested"];
export const archivable = (quotes: { id: string; quoteStatus: string }[]): string[] => quotes.filter((q) => OPEN_FOR_ARCHIVE.includes(q.quoteStatus)).map((q) => q.id);

/**
 * Puts a TEST contact back to a clean slate so another scenario can be run: forgets the conversation, hides old messages,
 * removes the bot's tags, clears do-not-disturb, and archives the contact's open Jobber quotes.
 * Refuses unless the contact carries the bot-test tag.
 */
export async function resetTestContact(env: Env, contactId: string) {
  const creds = credsFor(env, "dunzo");
  const contact = await getContact(creds, contactId);
  const tags = contact.tags ?? [];
  if (!tags.some((t) => t.toLowerCase() === "bot-test")) throw new Error("Only a contact tagged bot-test can be reset");
  const enc = encodeURIComponent(contactId);
  const done: Record<string, unknown> = {};

  await sb(env, "DELETE", `conversations?contact_id=eq.${enc}`, undefined, "return=minimal");
  await sb(env, "PATCH", `messages?contact_id=eq.${enc}&status=neq.archived`, { status: "archived" }, "return=minimal");
  await sb(env, "DELETE", `optouts?contact_id=eq.${enc}`, undefined, "return=minimal");
  done.conversationAndMessages = "cleared";

  const remove = resettableTags(tags);
  if (remove.length) await removeTags(creds, contactId, remove);
  done.tagsRemoved = remove;

  try { await clearDnd(creds, contactId); done.dnd = "cleared"; } catch (e) { done.dnd = `not cleared: ${(e as Error).message.slice(0, 80)}`; }

  const phone = normalizePhone(contact.phone);
  const archived: string[] = [];
  if (phone) {
    try {
      const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
      const found = await findClientsByPhones(env, "dunzo", [phone]);
      const clients = (found.get(phone) ?? []).filter((c) => assess([c], phone).found && nameCompatible(c.name, fullName));
      for (const c of clients) {
        const d = await gql<{ client: { quotes: { nodes: { id: string; quoteStatus: string }[] } } }>(
          env, "dunzo", `query($id: EncodedId!) { client(id: $id) { quotes(first: 30) { nodes { id quoteStatus } } } }`, { id: c.id });
        for (const id of archivable(d.client.quotes.nodes)) {
          await gql(env, "dunzo", `mutation($id: EncodedId!) { quoteArchive(id: $id) { userErrors { message } } }`, { id });
          archived.push(id);
        }
      }
    } catch (e) { done.jobberError = (e as Error).message.slice(0, 120); }
  }
  done.jobberQuotesArchived = archived.length;
  return done;
}
