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
}

export async function listBooths(filters: BoothFilters = {}): Promise<Booth[]> {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.zone) params.set("zone", filters.zone);
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
  website_url?: string;
  logo_url?: string;
  meet_url: string;
  owner_email: string;
  turnstile_token?: string;
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

/* ------------------------------- Moderator -------------------------------- */

export async function adminListBooths(token: string, status?: string): Promise<Booth[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`/api/admin/booths${qs}`, {
    headers: { "x-admin-token": token },
  });
  const data = await parse<{ booths: Booth[] }>(res);
  return data.booths;
}

export interface AdminUpdatePayload {
  status?: string;
  zone?: string | null;
  booth_code?: string | null;
  position_x?: number | null;
  position_y?: number | null;
}

export async function adminUpdateBooth(
  token: string,
  id: string,
  payload: AdminUpdatePayload,
): Promise<Booth> {
  const res = await fetch(`/api/admin/booths/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-token": token },
    body: JSON.stringify(payload),
  });
  const data = await parse<{ booth: Booth }>(res);
  return data.booth;
}
