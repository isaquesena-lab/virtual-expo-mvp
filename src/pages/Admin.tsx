import { useState } from "react";
import { adminListBooths, adminUpdateBooth } from "../lib/api";
import type { Booth } from "../lib/types";

const STATUS_FILTERS = ["pending", "approved", "rejected", "hidden", ""] as const;

export function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") ?? "");
  const [authed, setAuthed] = useState(false);
  const [filter, setFilter] = useState<string>("pending");
  const [booths, setBooths] = useState<Booth[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(status: string, tk = token) {
    setError(null);
    setLoading(true);
    try {
      const data = await adminListBooths(tk, status || undefined);
      setBooths(data);
      setAuthed(true);
      sessionStorage.setItem("admin_token", tk);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  async function act(id: string, payload: Parameters<typeof adminUpdateBooth>[2]) {
    try {
      await adminUpdateBooth(token, id, payload);
      await load(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm py-12">
        <h1 className="text-xl font-bold text-slate-900">Moderator sign-in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter the moderator token (set with <code>wrangler secret put ADMIN_TOKEN</code>).
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(filter);
          }}
          className="mt-4 space-y-3"
        >
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Moderator token"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
            Sign in
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Moderation queue</h1>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || "all"}
              onClick={() => {
                setFilter(s);
                load(s);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === s ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s || "all"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-slate-500">Loading…</p>}
      {!loading && booths.length === 0 && <p className="text-slate-500">No booths in this view.</p>}

      <div className="space-y-3">
        {booths.map((b) => (
          <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">{b.company_name}</h3>
                <p className="text-sm text-slate-600">{b.tagline}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {b.category}
                  {b.zone ? ` · ${b.zone}` : ""} · <span className="font-mono">{b.status}</span>
                </p>
              </div>
              <a
                href={b.meet_url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-indigo-600 hover:underline"
              >
                meeting ↗
              </a>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-slate-600">{b.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => act(b.id, { status: "approved" })}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                onClick={() => act(b.id, { status: "rejected" })}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => act(b.id, { status: "hidden" })}
                className="rounded-lg bg-slate-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600"
              >
                Hide
              </button>
              <button
                onClick={() => {
                  const code = prompt(
                    "Stand code (e.g. N-12). Leave blank to un-place from the map:",
                    b.booth_code ?? "",
                  );
                  if (code === null) return; // cancelled
                  act(b.id, { booth_code: code.trim() === "" ? null : code.trim().toUpperCase() });
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Place on map
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
