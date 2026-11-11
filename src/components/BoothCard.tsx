import { useState } from "react";
import { Link } from "react-router-dom";
import type { Booth } from "../lib/types";
import { STAND_BY_CODE, TIER_LABELS } from "../../shared/stands";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 12V4h8l10 10-8 8L3 12Z" />
      <circle cx="7.5" cy="8.5" r="1" />
    </svg>
  );
}

export function BoothCard({ booth }: { booth: Booth }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const stand = booth.booth_code ? STAND_BY_CODE.get(booth.booth_code) : undefined;
  const showLogo = booth.logo_url && !logoFailed;

  return (
    <Link
      to={`/booths/${booth.slug}`}
      className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-indigo-500/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/90">
          {showLogo ? (
            <img
              src={booth.logo_url!}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <span className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 bg-clip-text text-xl font-bold text-transparent">
              {initials(booth.company_name)}
            </span>
          )}
        </div>
        {stand && (
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
            {TIER_LABELS[stand.tier]}
          </span>
        )}
      </div>

      <h3 className="mt-4 truncate text-base font-semibold text-slate-100 group-hover:text-white" title={booth.company_name}>
        {booth.company_name}
      </h3>
      {booth.tagline && <p className="mt-0.5 line-clamp-1 text-sm text-slate-400">{booth.tagline}</p>}

      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {booth.zone && (
          <li className="flex items-center gap-2">
            <PinIcon />
            <span className="truncate">
              {booth.zone}
              {booth.booth_code ? ` · ${booth.booth_code}` : ""}
            </span>
          </li>
        )}
        <li className="flex items-center gap-2">
          <TagIcon />
          <span className="truncate">{booth.category}</span>
        </li>
      </ul>

      <span className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-indigo-300/40 px-4 py-2 text-sm font-semibold text-slate-100 transition group-hover:border-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:to-fuchsia-500 group-hover:text-white">
        Visit booth →
      </span>
    </Link>
  );
}
