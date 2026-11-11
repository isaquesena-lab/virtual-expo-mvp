import type { Booth } from "./types";

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = (data.error as string) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface BoothFilters {
  q?: string;
  category?: string;
  zone?: string;
  live?: boolean;
}

export async function listBooths(filters: BoothFilters = {}): Promise<Booth[]> {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.live) params.set("live", "1");
  const qs = params.toString();
  const res = await fetch(`/api/booths${qs ? `?${qs}` : ""}`);
  const data = await parse<{ booths: Booth[] }>(res);
  return data.booths;
}

export async function getBooth(slug: string): Promise<Booth> {
  const res = await fetch(`/api/booths/${encodeURIComponent(slug)}`);
  const data = await parse<{ booth: Booth }>(res);
  return data.booth;
}

export interface CreateBoothPayload {
  company_name: string;
  tagline?: string;
  description: string;
  category: string;
  booth_code: string;
  city?: string;
  country?: string;
  website_url?: string;
  logo_url?: string;
  meet_url: string;
  owner_email: string;
  turnstile_token?: string;
}

export async function getTakenStands(): Promise<string[]> {
  const res = await fetch("/api/stands");
  const data = await parse<{ taken: string[] }>(res);
  return data.taken;
}

export async function getConfig(): Promise<{ turnstile_site_key: string | null }> {
  const res = await fetch("/api/config");
  return parse<{ turnstile_site_key: string | null }>(res);
}

export interface CreateBoothResult {
  id: string;
  slug: string;
  status: string;
  edit_token: string;
  edit_url: string;
  message: string;
}

export async function createBooth(payload: CreateBoothPayload): Promise<CreateBoothResult> {
  const res = await fetch("/api/booths", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parse<CreateBoothResult>(res);
}

export async function getManagedBooth(id: string, token: string): Promise<Booth & { owner_email: string }> {
  const res = await fetch(`/api/booths/${encodeURIComponent(id)}/manage`, {
    headers: { "x-edit-token": token },
  });
  const data = await parse<{ booth: Booth & { owner_email: string } }>(res);
  return data.booth;
}

export async function updateBooth(
  id: string,
  token: string,
  payload: Partial<CreateBoothPayload>,
): Promise<Booth> {
  const res = await fetch(`/api/booths/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-edit-token": token },
    body: JSON.stringify(payload),
  });
  const data = await parse<{ booth: Booth }>(res);
  return data.booth;
}

export async function uploadLogo(id: string, token: string, image: Blob): Promise<Booth> {
  const res = await fetch(`/api/booths/${encodeURIComponent(id)}/logo`, {
    method: "PUT",
    headers: { "x-edit-token": token, "Content-Type": image.type || "application/octet-stream" },
    body: image,
  });
  const data = await parse<{ booth: Booth }>(res);
  return data.booth;
}

export async function deleteLogo(id: string, token: string): Promise<Booth> {
  const res = await fetch(`/api/booths/${encodeURIComponent(id)}/logo`, {
    method: "DELETE",
    headers: { "x-edit-token": token },
  });
  const data = await parse<{ booth: Booth }>(res);
  return data.booth;
}

/** Fetch a (possibly not-yet-public) logo with the owner's token, as an object URL for <img>. */
export async function fetchOwnerLogo(url: string, token: string): Promise<string | null> {
  if (!url.startsWith("/api/")) return url;
  const res = await fetch(url, { headers: { "x-edit-token": token } });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}

/* ------------------------------- Moderator -------------------------------- */

export async function adminListBooths(token: string, status?: string): Promise<Booth[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`/api/admin/booths${qs}`, {
    headers: { "x-admin-token": token.trim() },
  });
  const data = await parse<{ booths: Booth[] }>(res);
  return data.booths;
}

export interface AdminUpdatePayload {
  status?: string;
  /** Assign a stand by code (zone + coordinates derived server-side); null un-places. */
  booth_code?: string | null;
}

export async function adminUpdateBooth(
  token: string,
  id: string,
  payload: AdminUpdatePayload,
): Promise<Booth> {
  const res = await fetch(`/api/admin/booths/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-token": token.trim() },
    body: JSON.stringify(payload),
  });
  const data = await parse<{ booth: Booth }>(res);
  return data.booth;
}

/* ------------------------------ Live presence ----------------------------- */

/** Go live for `minutes` (server clamps to 5..240). Returns the new live_until (unix seconds). */
export async function goLive(id: string, token: string, minutes: number): Promise<number> {
  const res = await fetch(`/api/booths/${encodeURIComponent(id)}/live`, {
    method: "POST",
    headers: { "x-edit-token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ minutes }),
  });
  const data = await parse<{ live_until: number }>(res);
  return data.live_until;
}

export async function goOffline(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/booths/${encodeURIComponent(id)}/live`, {
    method: "DELETE",
    headers: { "x-edit-token": token },
  });
  await parse<{ live: boolean }>(res);
}
