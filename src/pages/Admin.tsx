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
        <h1 className="text-xl font-bold text-white">Moderator sign-in</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enter the moderator token (set with <code className="rounded bg-white/10 px-1">wrangler secret put ADMIN_TOKEN</code>).
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
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
          />
          <button className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 font-semibold text-white hover:brightness-110">
            Sign in
          </button>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">Moderation queue</h1>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || "all"}
              onClick={() => {
                setFilter(s);
                load(s);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === s
                  ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {s || "all"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {loading && <p className="text-slate-400">Loading…</p>}
      {!loading && booths.length === 0 && <p className="text-slate-400">No booths in this view.</p>}

      <div className="space-y-3">
        {booths.map((b) => (
          <div key={b.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white">{b.company_name}</h3>
                <p className="text-sm text-slate-400">{b.tagline}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {b.category}
                  {b.zone ? ` · ${b.zone}` : ""}
                  {b.booth_code ? ` · ${b.booth_code}` : ""} · <span className="font-mono text-slate-300">{b.status}</span>
                </p>
              </div>
              <a
                href={b.meet_url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-indigo-300 hover:underline"
              >
                meeting ↗
              </a>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-slate-400">{b.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => act(b.id, { status: "approved" })}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Approve
              </button>
              <button
                onClick={() => act(b.id, { status: "rejected" })}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
              >
                Reject
              </button>
              <button
                onClick={() => act(b.id, { status: "hidden" })}
                className="rounded-lg bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-500"
              >
                Hide
              </button>
              <button
                onClick={() => {
                  const code = prompt(
                    "Stand code (e.g. N-12). Leave blank to un-place from the map:",
                    b.booth_code ?? "",
                  );
                  if (code === null) return;
                  act(b.id, { booth_code: code.trim() === "" ? null : code.trim().toUpperCase() });
                }}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/5"
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
