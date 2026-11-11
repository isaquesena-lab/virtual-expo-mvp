import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  deleteLogo,
  fetchOwnerLogo,
  getManagedBooth,
  goLive,
  goOffline,
  updateBooth,
  uploadLogo,
} from "../lib/api";
import { LogoPicker } from "../components/LogoPicker";
import { CountrySelect } from "../components/CountrySelect";
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

/** A form row with a persistent visible label (placeholders vanish once a field is filled). */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      {hint && <span className="mb-1.5 block text-xs text-slate-500">{hint}</span>}
      {!hint && <span className="mb-1.5 block" />}
      {children}
    </label>
  );
}

export function EditBooth() {
  const { id } = useParams<{ id: string }>();
  const [token] = useState(tokenFromHash);
  const [booth, setBooth] = useState<Booth | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // The "Saved" confirmation fades away on its own.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 4500);
    return () => clearTimeout(t);
  }, [saved]);
  const [liveUntil, setLiveUntil] = useState<number | null>(null);
  const [liveMinutes, setLiveMinutes] = useState(60);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Re-render every 20s so "live until" flips to off when it expires.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);

  const isLive = liveUntil !== null && liveUntil * 1000 > now;

  async function changeLive(action: "on" | "off") {
    if (!id) return;
    setLiveBusy(true);
    setLiveError(null);
    try {
      if (action === "on") setLiveUntil(await goLive(id, token, liveMinutes));
      else {
        await goOffline(id, token);
        setLiveUntil(null);
      }
      setNow(Date.now());
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : "Could not update live status");
    } finally {
      setLiveBusy(false);
    }
  }

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
        setLiveUntil(b.live_until ?? null);
        saveMyBooth({ id, token });
      })
      .catch((e) => active && setLoadError(e instanceof Error ? e.message : "Could not load booth"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, token]);

  // Resolve the current logo with the owner token (it may not be public yet).
  const logoUrl = booth?.logo_url ?? null;
  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    if (!logoUrl) {
      setLogoSrc(null);
      return;
    }
    fetchOwnerLogo(logoUrl, token)
      .then((u) => {
        if (revoked) return;
        objectUrl = u && u.startsWith("blob:") ? u : null;
        setLogoSrc(u);
      })
      .catch(() => !revoked && setLogoSrc(null));
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [logoUrl, token]);

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
    for (const key of ["company_name", "tagline", "description", "category", "website_url", "meet_url"]) {
      const v = String(form.get(key) || "");
      if (v) payload[key] = v;
    }
    // City and country may be cleared, so they are always sent (empty string = remove).
    payload.city = String(form.get("city") || "").trim();
    payload.country = String(form.get("country") || "");
    try {
      let updated = await updateBooth(id, token, payload);
      if (logoBlob) {
        updated = await uploadLogo(id, token, logoBlob);
        setLogoBlob(null);
      }
      setBooth(updated);
      setSaved(true);
      setDirty(false);
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
        <p role="status" className="msg-in mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Saved. Your changes are stored.
        </p>
      )}
      {error && (
        <p role="alert" className="msg-in mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
      )}

      {booth?.status === "approved" && (
        <section className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
          <h2 className="text-sm font-semibold text-emerald-100">Live now</h2>
          <p className="mt-1 text-sm text-emerald-100/90">
            Show a <strong>Live now</strong> badge on your booth while you are in your meeting room. It is saved on
            the server for the time you choose, so you can leave this page. It switches off by itself when the time
            is up, or any time with the button below.
          </p>
          {isLive ? (
            <p className="mt-3 text-sm font-semibold text-emerald-200">
              You are live until{" "}
              {new Date(liveUntil! * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
            </p>
          ) : (
            <p className="mt-3 text-sm text-emerald-100/70">You are not live right now.</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={liveMinutes}
              onChange={(e) => setLiveMinutes(Number(e.target.value))}
              aria-label="Live duration"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
            </select>
            <button
              type="button"
              onClick={() => changeLive("on")}
              disabled={liveBusy}
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-110 disabled:opacity-60"
            >
              {isLive ? "Extend" : "Go live"}
            </button>
            {isLive && (
              <button
                type="button"
                onClick={() => changeLive("off")}
                disabled={liveBusy}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5 disabled:opacity-60"
              >
                Go offline
              </button>
            )}
          </div>
          {liveError && <p role="alert" className="msg-in mt-2 text-xs text-red-300">{liveError}</p>}
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

      <form
        onSubmit={onSubmit}
        onChange={() => setDirty(true)}
        className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-300">Editing booth</p>
            <p className="truncate text-lg font-semibold text-white">{booth?.company_name}</p>
            {booth?.booth_code && (
              <p className="text-xs text-slate-400">
                {booth.zone ? `${booth.zone} · ` : ""}Stand {booth.booth_code}
              </p>
            )}
          </div>
          {dirty && (
            <span className="msg-in rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
              Unsaved changes
            </span>
          )}
        </div>

        <Field label="Company name" hint="Shown as the title on your card and page.">
          <input name="company_name" defaultValue={booth?.company_name ?? ""} className={INPUT} />
        </Field>
        <Field label="Tagline" hint="One short line under the company name (optional).">
          <input name="tagline" defaultValue={booth?.tagline ?? ""} placeholder="e.g. Climate control, simplified" className={INPUT} />
        </Field>
        <Field label="Description" hint="What visitors will read on your booth page.">
          <textarea name="description" defaultValue={booth?.description ?? ""} rows={4} className={INPUT} />
        </Field>
        <Field label="Category" hint="Used by the directory filters.">
          <select name="category" defaultValue={booth?.category ?? ""} className={INPUT}>
            <option value="">Keep current category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="City" hint="Where the company is based.">
            <input name="city" defaultValue={booth?.city ?? ""} maxLength={80} placeholder="e.g. Lisbon" className={INPUT} />
          </Field>
          <Field label="Country" hint="Shown on your card and page.">
            <CountrySelect name="country" defaultValue={booth?.country} className={INPUT} />
          </Field>
        </div>
        <Field label="Meeting link" hint="Where the Join meeting button sends visitors.">
          <input name="meet_url" type="url" defaultValue={booth?.meet_url ?? ""} placeholder="https://meet.google.com/…" className={INPUT} />
        </Field>
        <Field label="Website" hint="Optional link to your company site.">
          <input name="website_url" type="url" defaultValue={booth?.website_url ?? ""} placeholder="https://…" className={INPUT} />
        </Field>
        <div>
          <p className="text-sm font-medium text-slate-200">Company logo / photo</p>
          <p className="mb-1.5 text-xs text-slate-500">Shown on your card and booth page.</p>
          <LogoPicker
            key={booth?.logo_url ?? "none"}
            currentUrl={logoSrc}
            onChange={setLogoBlob}
            disabled={saving}
            onRemoveCurrent={async () => {
              if (!id) return;
              setError(null);
              try {
                setBooth(await deleteLogo(id, token));
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not remove the logo");
              }
            }}
          />
        </div>
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
