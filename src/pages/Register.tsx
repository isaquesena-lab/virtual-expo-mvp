import { useEffect, useMemo, useState } from "react";
import { createBooth, getConfig, getTakenStands, type CreateBoothResult } from "../lib/api";
import { saveMyBooth } from "../lib/myBooth";
import { CATEGORIES } from "../lib/types";
import { PAVILIONS, pavilionByZone, standsForZone, TIER_LABELS, type Tier } from "../../shared/stands";
import { Turnstile } from "../components/Turnstile";

const INPUT =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30";
const LABEL = "text-sm font-medium text-slate-200";

export function Register() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateBoothResult | null>(null);

  const [zone, setZone] = useState<string>(PAVILIONS[0].zone);
  const [tier, setTier] = useState<Tier | "">("");
  const [standCode, setStandCode] = useState<string>("");
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [siteKey, setSiteKey] = useState<string | null | undefined>(undefined);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileAttempt, setTurnstileAttempt] = useState(0);
  const [configAttempt, setConfigAttempt] = useState(0);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setConfigError(null);
    getConfig().then((config) => {
      if (active) setSiteKey(config.turnstile_site_key);
    }).catch(() => {
      if (active) setConfigError("Could not load anti-bot configuration. Please retry.");
    });
    return () => { active = false; };
  }, [configAttempt]);

  async function refreshTaken() {
    try {
      setTaken(new Set(await getTakenStands()));
    } catch {
      /* non-fatal: server re-checks on submit */
    }
  }
  useEffect(() => {
    refreshTaken();
  }, []);

  const pavilion = useMemo(() => pavilionByZone(zone), [zone]);
  const zoneStands = useMemo(
    () => standsForZone(zone).filter((s) => !tier || s.tier === tier),
    [zone, tier],
  );
  const availableInZone = zoneStands.filter((s) => !taken.has(s.code)).length;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (siteKey === undefined || (siteKey && !turnstileToken)) {
      setError("Please complete anti-bot verification before submitting.");
      return;
    }
    if (!standCode) {
      setError("Please pick an available stand.");
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
        turnstile_token: turnstileToken ?? undefined,
      });
      saveMyBooth({ id: res.id, token: res.edit_token });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      await refreshTaken();
      setStandCode("");
    } finally {
      // Turnstile tokens are single-use, including after failed submissions.
      setTurnstileToken(null);
      setTurnstileAttempt((attempt) => attempt + 1);
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5">
          <h1 className="text-lg font-semibold text-emerald-300">Submission received 🎉</h1>
          <p className="mt-1 text-sm text-emerald-200/90">{result.message}</p>
          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
            <p className="font-medium text-white">What happens next</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-slate-300">
              <li>A moderator reviews your booth.</li>
              <li>
                Once approved, it appears in the public hall. Until then it is{" "}
                <span className="font-medium text-white">not visible there yet</span> — this is normal. Your stand is
                already reserved for you.
              </li>
              <li>Use your private link below to check the status and edit anytime.</li>
            </ol>
          </div>
          <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p className="font-medium">⚠ Google Meet links from free accounts end after 1 hour</p>
            <p className="mt-1 text-amber-100/90">
              Without a Google Workspace account, meetings are capped at 60 minutes. When that happens, create a
              new Meet link and paste it into your booth using the link below — your edit link is the only way back,
              so bookmark it.
            </p>
          </div>
          <a
            href={result.edit_url}
            className="mt-3 inline-block rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Check status / edit my booth →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-white">List your booth</h1>
      <p className="mt-1 text-slate-400">
        Pick your pavilion and stand, then tell us about your company. A moderator reviews every listing before it
        appears in the hall.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <fieldset className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <legend className="px-1 text-sm font-semibold text-slate-200">Choose your stand</legend>

          <label className="block">
            <span className={LABEL}>Pavilion</span>
            <select
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                setStandCode("");
              }}
              className={INPUT}
            >
              {PAVILIONS.map((p) => (
                <option key={p.zone} value={p.zone}>
                  {p.zone}
                </option>
              ))}
            </select>
          </label>

          {pavilion && pavilion.tiers.length > 1 && (
            <label className="mt-3 block">
              <span className={LABEL}>Tier</span>
              <select
                value={tier}
                onChange={(e) => {
                  setTier(e.target.value as Tier | "");
                  setStandCode("");
                }}
                className={INPUT}
              >
                <option value="">All tiers</option>
                {pavilion.tiers.map((t) => (
                  <option key={t.tier} value={t.tier}>
                    {TIER_LABELS[t.tier]} ({t.count} stands)
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className={LABEL}>Stand</span>
            <span className="text-xs text-slate-400">{availableInZone} available</span>
          </div>
          <div className="mt-2 grid max-h-56 grid-cols-5 gap-1 overflow-y-auto rounded-lg border border-white/5 bg-black/20 p-2 sm:grid-cols-8">
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
                      ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600 line-through"
                      : isSelected
                        ? "border-transparent bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-[0_0_10px_rgba(124,108,255,0.5)]"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-indigo-400/60 hover:text-white",
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
                Selected stand: <span className="font-semibold text-indigo-300">{standCode}</span> ({zone})
              </>
            ) : (
              "Pick an available (non-greyed) stand. Taken stands are locked to one company each."
            )}
          </p>
        </fieldset>

        <Field label="Company name" name="company_name" required placeholder="Acme Inc." maxLength={120} />
        <Field label="Tagline" name="tagline" placeholder="One line about what you do" maxLength={160} />

        <label className="block">
          <span className={LABEL}>
            Description <span className="text-red-400">*</span>
          </span>
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={2000}
            rows={4}
            placeholder="What visitors should know about your company (min 20 characters)."
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className={LABEL}>
            Category <span className="text-red-400">*</span>
          </span>
          <select name="category" required defaultValue="" className={INPUT}>
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
          hint="Must be a Google Meet link (https://meet.google.com/…). Opens in a new tab when visitors join."
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

        {siteKey === undefined && (
          <div className="space-y-2 text-sm text-slate-400">
            <p role={configError ? "alert" : "status"}>
              {configError ?? "Loading anti-bot configuration…"}
            </p>
            {configError && (
              <button
                type="button"
                className="text-indigo-300 underline"
                onClick={() => setConfigAttempt((attempt) => attempt + 1)}
              >
                Retry configuration
              </button>
            )}
          </div>
        )}
        {siteKey && (
          <div>
            <span className={LABEL}>Anti-bot check</span>
            <Turnstile key={turnstileAttempt} siteKey={siteKey} onToken={setTurnstileToken} />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || siteKey === undefined || Boolean(siteKey && !turnstileToken)}
          className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
        <p className="text-xs text-slate-500">
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
      <span className={LABEL}>
        {label} {required && <span className="text-red-400">*</span>}
      </span>
      <input name={name} type={type} required={required} placeholder={placeholder} maxLength={maxLength} className={INPUT} />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
