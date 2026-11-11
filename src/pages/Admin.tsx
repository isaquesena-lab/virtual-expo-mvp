import { useState } from "react";
import { adminIssueEditLink, adminListBooths, adminUpdateBooth } from "../lib/api";
import type { Booth } from "../lib/types";

const STATUS_FILTERS = ["pending", "approved", "rejected", "hidden", ""] as const;

export function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") ?? "");
  const [authed, setAuthed] = useState(false);
  const [filter, setFilter] = useState<string>("pending");
  const [booths, setBooths] = useState<Booth[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // New edit links, shown once per booth until dismissed.
  const [links, setLinks] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

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

  async function issueLink(b: Booth) {
    const ok = confirm(
      `Create a NEW edit link for "${b.company_name}"?\n\nThe current link stops working immediately. ` +
        `Send the new one only to ${b.owner_email ?? "the registered e-mail"}, after confirming they control that address.`,
    );
    if (!ok) return;
    try {
      const { edit_url } = await adminIssueEditLink(token, b.id);
      setLinks((prev) => ({ ...prev, [b.id]: edit_url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the link");
    }
  }

  async function copyLink(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch {
      /* clipboard unavailable: the field below is selectable */
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
                {b.owner_email && <p className="mt-1 text-xs text-slate-500">Owner: <span className="text-slate-300">{b.owner_email}</span></p>}
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
              <button
                onClick={() => issueLink(b)}
                className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-sm font-medium text-amber-200 hover:bg-amber-500/10"
              >
                New edit link
              </button>
            </div>
            {links[b.id] && (
              <div className="msg-in mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
                <p className="text-xs font-semibold text-amber-100">
                  New edit link. Shown once: copy it now and send it only to {b.owner_email ?? "the owner"}.
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    readOnly
                    value={links[b.id]}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-slate-100"
                  />
                  <button
                    onClick={() => copyLink(b.id, links[b.id])}
                    className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:brightness-110"
                  >
                    {copied === b.id ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() =>
                      setLinks((prev) => {
                        const { [b.id]: _drop, ...rest } = prev;
                        return rest;
                      })
                    }
                    className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
