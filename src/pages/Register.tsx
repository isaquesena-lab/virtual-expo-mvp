import { useState } from "react";
import { createBooth, type CreateBoothResult } from "../lib/api";
import { CATEGORIES } from "../lib/types";

export function Register() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateBoothResult | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await createBooth({
        company_name: String(form.get("company_name") || ""),
        tagline: String(form.get("tagline") || "") || undefined,
        description: String(form.get("description") || ""),
        category: String(form.get("category") || ""),
        website_url: String(form.get("website_url") || "") || undefined,
        logo_url: String(form.get("logo_url") || "") || undefined,
        meet_url: String(form.get("meet_url") || ""),
        owner_email: String(form.get("owner_email") || ""),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h1 className="text-lg font-semibold text-emerald-900">Submission received 🎉</h1>
          <p className="mt-1 text-sm text-emerald-800">{result.message}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">Save your private edit link</p>
          <p className="mt-1 text-sm text-amber-800">
            This link is shown only once. Anyone with it can edit your booth — keep it private.
          </p>
          <code className="mt-3 block overflow-x-auto rounded-lg bg-white p-3 text-xs text-slate-700">
            {result.edit_url}
          </code>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(result.edit_url)}
            className="mt-3 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Copy edit link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900">List your booth</h1>
      <p className="mt-1 text-slate-600">
        Submit your company. A moderator reviews every listing before it appears in the hall.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Company name" name="company_name" required placeholder="Acme Inc." maxLength={120} />
        <Field label="Tagline" name="tagline" placeholder="One line about what you do" maxLength={160} />

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Description <span className="text-red-500">*</span>
          </span>
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={2000}
            rows={4}
            placeholder="What visitors should know about your company (min 20 characters)."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Category <span className="text-red-500">*</span>
          </span>
          <select
            name="category"
            required
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="" disabled>
              Select a category…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <Field
          label="Meeting URL"
          name="meet_url"
          required
          type="url"
          placeholder="https://meet.google.com/xxx-xxxx-xxx"
          hint="Must be an https link. Opens in a new tab when visitors join."
        />
        <Field label="Website" name="website_url" type="url" placeholder="https://yourcompany.com" />
        <Field label="Logo URL" name="logo_url" type="url" placeholder="https://.../logo.png" />
        <Field
          label="Owner email"
          name="owner_email"
          required
          type="email"
          placeholder="you@company.com"
          hint="Used only to verify ownership and contact you — never for marketing."
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
        <p className="text-xs text-slate-400">
          By submitting you confirm you represent this company and that the meeting link is yours.
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  hint,
  required,
  type = "text",
  placeholder,
  maxLength,
}: {
  label: string;
  name: string;
  hint?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
