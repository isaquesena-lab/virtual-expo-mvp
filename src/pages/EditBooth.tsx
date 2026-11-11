import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getManagedBooth, updateBooth } from "../lib/api";
import type { Booth } from "../lib/types";
import { CATEGORIES } from "../lib/types";

/** Reads the capability token from the URL fragment (never sent to the server in logs). */
function tokenFromHash(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(hash).get("token") ?? "";
}

const STATUS_COPY: Record<string, { label: string; className: string; note: string }> = {
  pending: {
    label: "Pending review",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    note: "Your booth is awaiting moderator approval. It is not visible in the public hall yet — you'll see it there once it's approved.",
  },
  approved: {
    label: "Approved · live",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    note: "Your booth is live in the public hall. Edits below go live immediately.",
  },
  rejected: {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-900",
    note: "A moderator rejected this listing. Edit it and it will be re-reviewed, or contact the moderators.",
  },
  hidden: {
    label: "Hidden",
    className: "border-slate-200 bg-slate-100 text-slate-700",
    note: "This booth is currently hidden from the public hall.",
  },
};

export function EditBooth() {
  const { id } = useParams<{ id: string }>();
  const [token] = useState(tokenFromHash);
  const [booth, setBooth] = useState<Booth | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id || !token) {
      setLoading(false);
      return;
    }
    let active = true;
    getManagedBooth(id, token)
      .then((b) => active && setBooth(b))
      .catch((e) => active && setLoadError(e instanceof Error ? e.message : "Could not load booth"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, token]);

  if (!token) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Missing edit token</h1>
        <p className="mt-2 text-slate-500">
          Open the private edit link you received when submitting your booth (it ends with
          <code className="mx-1 rounded bg-slate-100 px-1">#token=…</code>).
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

  if (loading) return <p className="py-12 text-center text-slate-500">Loading your booth…</p>;

  if (loadError)
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Couldn&apos;t open this booth</h1>
        <p className="mt-2 text-slate-500">{loadError}</p>
        <p className="mt-1 text-sm text-slate-400">Check that your edit link is complete and correct.</p>
      </div>
    );

  const status = booth ? STATUS_COPY[booth.status] ?? STATUS_COPY.pending : null;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900">Manage your booth</h1>
      {booth && <p className="mt-1 text-slate-600">{booth.company_name}</p>}

      {status && (
        <div className={`mt-4 rounded-xl border p-4 ${status.className}`}>
          <p className="text-sm font-semibold">Status: {status.label}</p>
          <p className="mt-1 text-sm">{status.note}</p>
          {booth?.status === "approved" && (
            <Link to={`/booths/${booth.slug}`} className="mt-2 inline-block text-sm font-medium underline">
              View your public booth page →
            </Link>
          )}
        </div>
      )}

      {saved && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Saved. Your changes are stored.</p>
      )}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input name="company_name" defaultValue={booth?.company_name ?? ""} placeholder="Company name" className="field" />
        <input name="tagline" defaultValue={booth?.tagline ?? ""} placeholder="Tagline" className="field" />
        <textarea name="description" defaultValue={booth?.description ?? ""} rows={4} placeholder="Description" className="field" />
        <select name="category" defaultValue={booth?.category ?? ""} className="field">
          <option value="">Keep current category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input name="meet_url" type="url" defaultValue={booth?.meet_url ?? ""} placeholder="Meeting URL (https://…)" className="field" />
        <input name="website_url" type="url" defaultValue={booth?.website_url ?? ""} placeholder="Website (https://…)" className="field" />
        <input name="logo_url" type="url" defaultValue={booth?.logo_url ?? ""} placeholder="Logo URL (https://…)" className="field" />
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <style>{`.field{width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.field:focus{border-color:#6366f1;box-shadow:0 0 0 2px #c7d2fe}`}</style>
    </div>
  );
}
