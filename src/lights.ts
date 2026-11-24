import { addNote, addTags, credsFor, getContact, setDnd, updateContact, upsertByPhone } from "./ghl";
import { OUR_NOTE_PREFIX } from "./profile";
import { isSmsDnd } from "./safety";
import type { Account, Env } from "./types";

/** True when the bot's handoff reason says the customer is interested in Santa's Lights. */
export function isLightsReferral(reason: string | undefined): boolean {
  return !!reason && /lights?\s*interest|christmas light|permanent light|santa'?s lights/i.test(reason);
}

const other = (a: Account): Account => (a === "dunzo" ? "lights" : "dunzo");

/**
 * Someone texted STOP to one company: the other company must not text them either.
 * Sets do not disturb on the same phone in the other GHL account. Best effort, never throws.
 */
export async function propagateOptOut(env: Env, from: Account, phone: string | null): Promise<string> {
  if (!phone) return "no phone, not propagated";
  try {
    const creds = credsFor(env, other(from));
    const { contact } = await upsertByPhone(creds, phone);
    await setDnd(creds, contact.id);
    await addTags(creds, contact.id, ["bot-opted-out"]);
    return "opt out applied to " + other(from);
  } catch (e) { return "opt out not propagated: " + (e as Error).message.slice(0, 80); }
}

export interface Referral { phone: string; firstName?: string; lastName?: string; email?: string; address?: string; lastMessage: string }

/**
 * A Dunzo customer asked about Christmas or permanent lighting. Adds them to the Santa's Lights account, tagged and with a
 * note, and checks first that they have not opted out of Lights. It sends no text: the Lights team follows up from the Lights number.
 */
export async function referToLights(env: Env, r: Referral): Promise<{ referred: boolean; reason: string; contactId?: string }> {
  try {
    const creds = credsFor(env, "lights");
    const { contact } = await upsertByPhone(creds, r.phone);
    const full = await getContact(creds, contact.id);
    if (isSmsDnd(full)) return { referred: false, reason: "they opted out of Santa's Lights texts" };
    const fields: Record<string, string> = {};
    if (r.firstName && !full.firstName) fields.firstName = r.firstName;
    if (r.lastName && !full.lastName) fields.lastName = r.lastName;
    if (r.email && !full.email) fields.email = r.email;
    if (Object.keys(fields).length) await updateContact(creds, contact.id, fields).catch(() => undefined);
    await addTags(creds, contact.id, ["dunzo-referral", "lights interest"]);
    await addNote(creds, contact.id, `${OUR_NOTE_PREFIX}Referred by the Dunzo bot. This customer asked about Christmas or permanent lighting. ${r.address ? "Home: " + r.address + ". " : ""}Their message: "${r.lastMessage.slice(0, 200)}". Please follow up from the Santa's Lights number.`);
    return { referred: true, reason: "added to Santa's Lights", contactId: contact.id };
  } catch (e) { return { referred: false, reason: "could not add to Santa's Lights: " + (e as Error).message.slice(0, 100) }; }
}
