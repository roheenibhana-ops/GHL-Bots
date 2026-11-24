import type { Env } from "./types";

/** Minimal Supabase REST client (PostgREST). Service key stays server-side in the Worker. */
export async function sb<T>(env: Env, method: string, path: string, body?: unknown, prefer?: string): Promise<T> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path} -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Reads every row of a query. Supabase returns at most 1000 rows at a time, so this pages through them. */
export async function sbAll<T>(env: Env, path: string, maxRows = 20000): Promise<T[]> {
  const out: T[] = [];
  for (let off = 0; off < maxRows; off += 1000) {
    const page = await sb<T[]>(env, "GET", `${path}&limit=1000&offset=${off}`);
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}
