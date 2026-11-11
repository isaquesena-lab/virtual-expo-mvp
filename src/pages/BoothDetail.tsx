import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, getBooth } from "../lib/api";
import type { Booth } from "../lib/types";
import { LiveBadge } from "../components/LiveBadge";
import { TierPill } from "../components/TierPill";
import { STAND_BY_CODE } from "../../shared/stands";
import { formatOrigin } from "../../shared/countries";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

const CHIP = "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200";

export function BoothDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [booth, setBooth] = useState<Booth | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);
    setError(null);
    getBooth(slug)
      .then((b) => active && setBooth(b))
      .catch((e) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(e.message);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (loading) return <p className="py-12 text-center text-slate-400">Loading…</p>;

  if (notFound)
    return (
      <div className="py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-100">Booth not available</h1>
        <p className="mt-2 text-slate-400">It may be pending review, hidden, or the link is wrong.</p>
        <Link to="/" className="mt-4 inline-block text-indigo-300 hover:underline">
          ← Back to the hall
        </Link>
      </div>
    );

  if (error || !booth)
    return (
      <div className="py-12 text-center">
        <p className="text-red-300">Could not load this booth: {error}</p>
        <Link to="/" className="mt-4 inline-block text-indigo-300 hover:underline">
          ← Back to the hall
        </Link>
      </div>
    );

  const stand = booth.booth_code ? STAND_BY_CODE.get(booth.booth_code) : undefined;
  const showLogo = booth.logo_url && !logoFailed;
  const origin = formatOrigin(booth.city, booth.country, typeof navigator !== "undefined" ? navigator.language : undefined);

  return (
    <article className="mx-auto max-w-4xl">
      <Link to="/" className="text-sm text-indigo-300 hover:underline">
        ← Back to the hall
      </Link>

      {/* Banner */}
      <div
        className="mt-4 h-32 rounded-3xl sm:h-44"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, rgba(99,102,241,.9), transparent 55%), radial-gradient(circle at 80% 30%, rgba(217,70,239,.85), transparent 55%), radial-gradient(circle at 50% 110%, rgba(20,184,166,.8), transparent 60%), #14152b",
        }}
        aria-hidden="true"
      />

      <div className="-mt-12 grid gap-5 px-2 sm:-mt-16 sm:px-6 md:grid-cols-[13rem_1fr]">
        {/* Left: logo + CTA */}
        <aside className="space-y-3">
          <div className="grid aspect-square w-32 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white shadow-xl shadow-black/30 md:w-full">
            {showLogo ? (
              <img
                src={booth.logo_url!}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="h-full w-full object-contain p-4"
              />
            ) : (
              <span className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 bg-clip-text text-5xl font-bold text-transparent">
                {initials(booth.company_name)}
              </span>
            )}
          </div>
          <a
            href={booth.meet_url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110 md:max-w-none"
          >
            Join meeting ↗
          </a>
        </aside>

        {/* Right: details card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {booth.is_live === 1 && <LiveBadge />}
              {stand && <TierPill tier={stand.tier} />}
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/5"
            >
              {copied ? "Copied ✓" : "Copy company link"}
            </button>
          </div>

          <h1 className="mt-3 text-3xl font-bold text-white">{booth.company_name}</h1>
          {booth.tagline && <p className="mt-1 text-slate-400">{booth.tagline}</p>}

          <p className="mt-5 whitespace-pre-line leading-relaxed text-slate-300">{booth.description}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-200">
            {booth.zone && (
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                {booth.zone}
                {booth.booth_code ? ` · Stand ${booth.booth_code}` : ""}
              </span>
            )}
            {origin && (
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </svg>
                From {origin}
              </span>
            )}
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 12V4h8l10 10-8 8L3 12Z" />
                <circle cx="7.5" cy="8.5" r="1" />
              </svg>
              {booth.category}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className={CHIP}>{booth.category}</span>
            {booth.zone && <span className={CHIP}>{booth.zone}</span>}
          </div>

          <hr className="my-5 border-white/10" />

          <div className="flex flex-wrap items-center gap-3">
            {booth.website_url && (
              <a
                href={booth.website_url}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Visit website ↗
              </a>
            )}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            The meeting opens in a new tab on an external service. This directory does not host the call.
          </p>
        </div>
      </div>
    </article>
  );
}
