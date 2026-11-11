import { useEffect, useMemo, useState } from "react";
import { createBooth, getTakenStands, type CreateBoothResult } from "../lib/api";
import { CATEGORIES } from "../lib/types";
import { PAVILIONS, standsForZone } from "../../shared/stands";

export function Register() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateBoothResult | null>(null);

  const [zone, setZone] = useState<string>(PAVILIONS[0].zone);
  const [standCode, setStandCode] = useState<string>("");
  const [taken, setTaken] = useState<Set<string>>(new Set());

  async function refreshTaken() {
    try {
      const list = await getTakenStands();
      setTaken(new Set(list));
    } catch {
      /* non-fatal: picker still works, server re-checks on submit */
    }
  }
  useEffect(() => {
    refreshTaken();
  }, []);

  const zoneStands = useMemo(() => standsForZone(zone), [zone]);
  const availableInZone = zoneStands.filter((s) => !taken.has(s.code)).length;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!standCode) {
      setError("Please pick an available stand on the map.");
      return;
    }
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await createBooth({
        company_name: String(form.get("company_name") || ""),
        tagline: String(form.get("tagline") || "") || undefined,
        description: String(form.get("description") || ""),
        category: String(form.get("category") || ""),
        booth_code: standCode,
        website_url: String(form.get("website_url") || "") || undefined,
        logo_url: String(form.get("logo_url") || "") || undefined,
        meet_url: String(form.get("meet_url") || ""),
        owner_email: String(form.get("owner_email") || ""),
      });
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
      // Someone may have grabbed the slot — refresh availability.
      await refreshTaken();
      setStandCode("");
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
          <div className="mt-3 rounded-lg bg-white/70 p-3 text-sm text-emerald-900">
            <p className="font-medium">What happens next</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              <li>A moderator reviews your booth.</li>
              <li>
                Once approved, it appears in the public hall. Until then it is{" "}
                <span className="font-medium">not visible there yet</span> — this is normal. Your stand is already
                reserved for you.
              </li>
              <li>Use your private link below to check the status and edit anytime.</li>
            </ol>
          </div>
          <a
            href={result.edit_url}
            className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Check status / edit my booth →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900">List your booth</h1>
      <p className="mt-1 text-slate-600">
        Pick your pavilion and stand, then tell us about your company. A moderator reviews every listing before it
        appears in the hall.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        {/* Pavilion + stand picker */}
        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">Choose your stand</legend>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Pavilion</span>
            <select
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                setStandCode("");
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {PAVILIONS.map((p) => (
                <option key={p.zone} value={p.zone}>
                  {p.zone}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Stand</span>
            <span className="text-xs text-slate-400">{availableInZone} available</span>
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {zoneStands.map((s) => {
              const isTaken = taken.has(s.code);
              const isSelected = standCode === s.code;
              return (
                <button
                  key={s.code}
                  type="button"
                  disabled={isTaken}
                  onClick={() => setStandCode(s.code)}
                  title={isTaken ? `${s.code} — taken` : `${s.code} — available`}
                  className={[
                    "rounded-md border px-1 py-1.5 text-[11px] font-medium transition",
                    isTaken
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 line-through"
                      : isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                        : "border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-700",
                  ].join(" ")}
                >
                  {s.code}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {standCode ? (
              <>
                Selected stand: <span className="font-semibold text-indigo-700">{standCode}</span> ({zone})
              </>
            ) : (
              "Pick an available (non-greyed) stand. Taken stands are locked to one company each."
            )}
          </p>
        </fieldset>

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
