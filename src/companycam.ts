import type { Env } from "./types";

/** CompanyCam: the crew's job photos. Read only here: nothing is changed in CompanyCam. */
const BASE = "https://api.companycam.com/public_api/v1";
export const ccToken = (env: Env): string | undefined => (env as unknown as Record<string, string | undefined>).COMPANYCAM_TOKEN || undefined;

export async function ccGet<T>(env: Env, path: string, params: Record<string, string | number | undefined> = {}, token = ccToken(env)): Promise<T> {
  if (!token) throw new Error("CompanyCam is not connected. Add the access token in Settings.");
  const q = Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
  const res = await fetch(`${BASE}${path}${q ? "?" + q : ""}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if (!res.ok) throw new Error(`CompanyCam ${path} -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

export async function ccCheckToken(token: string): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${BASE}/companies/current`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }).catch(() => null);
  return { ok: !!res?.ok, status: res?.status ?? 0 };
}

export interface CcProject {
  id: string; name: string; photo_count?: number; last_activity_at?: string; created_at?: string; project_url?: string;
  address?: { street_address_1?: string | null; city?: string | null; state?: string | null; postal_code?: string | null };
  primary_contact?: { name?: string | null; first_name?: string | null; phone_number?: string | null; email?: string | null } | null;
}
export interface CcPhoto { id: string; captured_at?: string; creator_name?: string; uris?: { type: string; uri?: string; url?: string }[]; photo_url?: string; description?: { plain_text_content?: string | null } | null }
type List<T> = { data: T[]; meta?: { next_cursor?: string | null; has_next?: boolean } };

export const ccSearchProjects = async (env: Env, query: string) => (await ccGet<List<CcProject>>(env, query.trim() ? "/projects/search" : "/projects", query.trim() ? { query: query.trim(), limit: 20 } : { limit: 20 })).data;
export const ccProject = async (env: Env, id: string) => (await ccGet<{ data: CcProject }>(env, `/projects/${encodeURIComponent(id)}`)).data;
export const ccProjectPhotos = async (env: Env, id: string, limit = 60) => (await ccGet<List<CcPhoto>>(env, `/projects/${encodeURIComponent(id)}/photos`, { limit })).data;

export function addressLine(p: CcProject): string {
  const a = p.address ?? {};
  return [a.street_address_1, a.city, a.state, a.postal_code].filter(Boolean).join(", ");
}

/** The best picture address for one photo: a mid sized one for looking at, a small one for lists. Pure. */
export function photoUrl(p: CcPhoto, want: "view" | "thumb" = "view"): string | null {
  const by = new Map((p.uris ?? []).map((u) => [String(u.type).toLowerCase(), u.uri ?? u.url ?? ""]));
  const order = want === "thumb" ? ["thumbnail", "thumb", "web", "medium", "large", "original"] : ["web", "large", "medium", "original", "thumbnail"];
  for (const k of order) if (by.get(k)) return by.get(k) as string;
  const any = [...by.values()].find(Boolean);
  return any || p.photo_url || null;
}
