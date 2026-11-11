import { useState } from "react";
import { useParams } from "react-router-dom";
import { updateBooth } from "../lib/api";
import { CATEGORIES } from "../lib/types";

/** Reads the capability token from the URL fragment (never sent to the server in logs). */
function tokenFromHash(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(hash).get("token") ?? "";
}

export function EditBooth() {
  const { id } = useParams<{ id: string }>();
  const [token] = useState(tokenFromHash);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    for (const key of ["company_name", "tagline", "description", "category", "website_url", "logo_url", "meet_url"]) {
      const v = String(form.get(key) || "");
      if (v) payload[key] = v;
    }
    try {
      await updateBooth(id, token, payload);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900">Edit your booth</h1>
      <p className="mt-1 text-slate-600">Changes are saved with your private edit token.</p>

      {saved && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Saved. Your changes are live.</p>
      )}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input name="company_name" placeholder="Company name" className="field" />
        <input name="tagline" placeholder="Tagline" className="field" />
        <textarea name="description" rows={4} placeholder="Description" className="field" />
        <select name="category" defaultValue="" className="field">
          <option value="">Keep current category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input name="meet_url" type="url" placeholder="Meeting URL (https://…)" className="field" />
        <input name="website_url" type="url" placeholder="Website (https://…)" className="field" />
        <input name="logo_url" type="url" placeholder="Logo URL (https://…)" className="field" />
        <p className="text-xs text-slate-400">Leave a field blank to keep its current value.</p>
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
