import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getManagedBooth, goOffline, sendLiveHeartbeat, updateBooth } from "../lib/api";
import type { Booth } from "../lib/types";
import { CATEGORIES } from "../lib/types";
import { saveMyBooth } from "../lib/myBooth";

function tokenFromHash(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(hash).get("token") ?? "";
}

const STATUS_COPY: Record<string, { label: string; className: string; note: string }> = {
  pending: {
    label: "Pending review",
    className: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    note: "Your booth is awaiting moderator approval. It is not visible in the public hall yet — you'll see it there once it's approved. Your stand is reserved for you.",
  },
  approved: {
    label: "Approved · live",
    className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    note: "Your booth is live in the public hall. Edits below go live immediately.",
  },
  rejected: {
    label: "Rejected",
    className: "border-red-400/30 bg-red-500/10 text-red-200",
    note: "A moderator rejected this listing. Edit it and it will be re-reviewed, or contact the moderators.",
  },
  hidden: {
    label: "Hidden",
    className: "border-white/15 bg-white/5 text-slate-300",
    note: "This booth is currently hidden from the public hall.",
  },
};

const INPUT =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30";

export function EditBooth() {
  const { id } = useParams<{ id: string }>();
  const [token] = useState(tokenFromHash);
  const [booth, setBooth] = useState<Booth | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [live, setLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // While "live" is on, ping every 30s (server TTL is 90s). Closing the tab or
  // losing the connection simply lets the presence expire.
  useEffect(() => {
    if (!live || !id || !token) return;
    let stopped = false;
    const ping = () =>
      sendLiveHeartbeat(id, token)
        .then(() => !stopped && setLiveError(null))
        .catch((e) => {
          if (stopped) return;
          setLiveError(e instanceof Error ? e.message : "Presence update failed");
          setLive(false);
        });
    void ping();
    const timer = setInterval(ping, 30_000);
    const onHide = () => void goOffline(id, token).catch(() => {});
    window.addEventListener("pagehide", onHide);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("pagehide", onHide);
      void goOffline(id, token).catch(() => {});
    };
  }, [live, id, token]);

  useEffect(() => {
    if (!id || !token) {
      setLoading(false);
      return;
    }
    let active = true;
    getManagedBooth(id, token)
      .then((b) => {
        if (!active) return;
        setBooth(b);
        saveMyBooth({ id, token });
      })
      .catch((e) => active && setLoadError(e instanceof Error ? e.message : "Could not load booth"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, token]);

  if (!token) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-100">Missing edit token</h1>
        <p className="mt-2 text-slate-400">
          Open the private edit link you received when submitting your booth (it ends with
          <code className="mx-1 rounded bg-white/10 px-1">#token=…</code>).
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    for (const key of ["company_name", "tagline", "description", "category", "website_url", "logo_url", "meet_url"]) {
      const v = String(form.get(key) || "");
      if (v) payload[key] = v;
    }
    try {
      const updated = await updateBooth(id, token, payload);
      setBooth(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onRefreshMeet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    const meet = String(new FormData(e.currentTarget).get("new_meet_url") || "").trim();
    try {
      const updated = await updateBooth(id, token, { meet_url: meet });
      setBooth(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="py-12 text-center text-slate-400">Loading your booth…</p>;

  if (loadError)
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-100">Couldn&apos;t open this booth</h1>
        <p className="mt-2 text-slate-400">{loadError}</p>
        <p className="mt-1 text-sm text-slate-500">Check that your edit link is complete and correct.</p>
      </div>
    );

  const status = booth ? STATUS_COPY[booth.status] ?? STATUS_COPY.pending : null;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-white">Manage your booth</h1>
      {booth && <p className="mt-1 text-slate-400">{booth.company_name}</p>}

      {status && (
        <div className={`mt-4 rounded-xl border p-4 ${status.className}`}>
          <p className="text-sm font-semibold">Status: {status.label}</p>
          <p className="mt-1 text-sm opacity-90">{status.note}</p>
          {booth?.status === "approved" && (
            <Link to={`/booths/${booth.slug}`} className="mt-2 inline-block text-sm font-medium underline">
              View your public booth page →
            </Link>
          )}
        </div>
      )}

      {saved && (
        <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Saved. Your changes are stored.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
      )}

      {booth?.status === "approved" && (
        <section className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-emerald-100">Live presence</h2>
              <p className="mt-1 text-sm text-emerald-100/90">
                Turn this on when you are in your meeting room. Your booth shows a <strong>Live now</strong> badge
                and appears in the &ldquo;Live now only&rdquo; filter. Keep this page open: it checks in every 30
                seconds, and you go offline automatically a minute or so after closing it.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={live}
              onClick={() => setLive((v) => !v)}
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${live ? "bg-emerald-400" : "bg-white/20"}`}
            >
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition ${live ? "translate-x-5" : ""}`} />
              <span className="sr-only">Live presence</span>
            </button>
          </div>
          {live && <p className="mt-2 text-xs font-medium text-emerald-200">You are live.</p>}
          {liveError && <p className="mt-2 text-xs text-red-300">{liveError}</p>}
        </section>
      )}

      <section className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
        <h2 className="text-sm font-semibold text-amber-100">Meeting link</h2>
        <p className="mt-1 text-sm text-amber-100/90">
          Google Meet links from accounts without Google Workspace end after <strong>1 hour</strong>. When yours
          expires, create a new meeting at{" "}
          <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" className="underline">
            meet.google.com/new
          </a>{" "}
          and paste it here — visitors get the new link immediately.
        </p>
        {booth?.meet_url && (
          <p className="mt-2 break-all text-xs text-amber-100/70">
            Current:{" "}
            <a href={booth.meet_url} target="_blank" rel="noopener noreferrer" className="underline">
              {booth.meet_url}
            </a>
          </p>
        )}
        <form onSubmit={onRefreshMeet} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            key={booth?.meet_url}
            name="new_meet_url"
            type="url"
            required
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            className={INPUT}
          />
          <button
            type="submit"
            disabled={saving}
            className="shrink-0 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Updating…" : "Update link"}
          </button>
        </form>
      </section>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input name="company_name" defaultValue={booth?.company_name ?? ""} placeholder="Company name" className={INPUT} />
        <input name="tagline" defaultValue={booth?.tagline ?? ""} placeholder="Tagline" className={INPUT} />
        <textarea name="description" defaultValue={booth?.description ?? ""} rows={4} placeholder="Description" className={INPUT} />
        <select name="category" defaultValue={booth?.category ?? ""} className={INPUT}>
          <option value="">Keep current category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input name="meet_url" type="url" defaultValue={booth?.meet_url ?? ""} placeholder="Meeting URL (https://meet.google.com/…)" className={INPUT} />
        <input name="website_url" type="url" defaultValue={booth?.website_url ?? ""} placeholder="Website (https://…)" className={INPUT} />
        <input name="logo_url" type="url" defaultValue={booth?.logo_url ?? ""} placeholder="Logo URL (https://…)" className={INPUT} />
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
