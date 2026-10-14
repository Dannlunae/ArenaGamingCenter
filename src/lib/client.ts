export async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && !url.includes("/login")) { location.href = "/login"; }
  if (!r.ok) throw new Error(d.error ?? "Error");
  return d as T;
}
