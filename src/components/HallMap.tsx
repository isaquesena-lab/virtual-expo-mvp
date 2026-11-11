import { useNavigate } from "react-router-dom";
import type { Booth } from "../lib/types";
import { ZONES } from "../lib/types";

/**
 * Original, generic virtual hall — intentionally not a copy of any real event map.
 * Booths render at their percentage coordinates (set by a moderator).
 */
export function HallMap({ booths }: { booths: Booth[] }) {
  const navigate = useNavigate();
  const placed = booths.filter((b) => b.position_x != null && b.position_y != null);

  const countFor = (zone: string) => booths.filter((b) => b.zone === zone).length;
  const boothsLabel = (n: number) => `${n} booth${n === 1 ? "" : "s"}`;

  return (
    <div>
      <div className="hall-floor relative w-full overflow-hidden rounded-2xl border border-indigo-100 shadow-sm">
        <div className="relative aspect-[16/10] w-full">
          <svg viewBox="0 0 160 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="zoneFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eef2ff" />
                <stop offset="100%" stopColor="#c7d2fe" />
              </linearGradient>
              <linearGradient id="alleyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e0e7ff" />
                <stop offset="100%" stopColor="#a5b4fc" />
              </linearGradient>
            </defs>

            {/* aisles */}
            <rect x="0" y="0" width="160" height="100" fill="transparent" />
            <line x1="80" y1="6" x2="80" y2="46" stroke="#c7d2fe" strokeWidth="1.5" strokeDasharray="2 2" />
            <line x1="6" y1="52" x2="154" y2="52" stroke="#c7d2fe" strokeWidth="1.5" strokeDasharray="2 2" />

            {/* zone blocks */}
            <rect x="8" y="8" width="66" height="36" rx="4" fill="url(#zoneFill)" stroke="#a5b4fc" strokeWidth="0.6" />
            <rect x="86" y="8" width="66" height="36" rx="4" fill="url(#zoneFill)" stroke="#a5b4fc" strokeWidth="0.6" />
            <rect x="8" y="58" width="144" height="34" rx="4" fill="url(#alleyFill)" stroke="#818cf8" strokeWidth="0.6" />

            {/* entrance */}
            <rect x="72" y="95" width="16" height="4" rx="1" fill="#6366f1" />
            <text x="80" y="98.2" textAnchor="middle" fontSize="2.4" fill="#fff" fontWeight="700">
              ENTRANCE
            </text>

            {/* zone labels + counts */}
            <text x="41" y="15.5" textAnchor="middle" fontSize="3.4" fill="#4338ca" fontWeight="700">
              North Hall
            </text>
            <text x="41" y="20" textAnchor="middle" fontSize="2.3" fill="#6366f1">
              {boothsLabel(countFor("North Hall"))}
            </text>
            <text x="119" y="15.5" textAnchor="middle" fontSize="3.4" fill="#4338ca" fontWeight="700">
              South Hall
            </text>
            <text x="119" y="20" textAnchor="middle" fontSize="2.3" fill="#6366f1">
              {boothsLabel(countFor("South Hall"))}
            </text>
            <text x="80" y="65.5" textAnchor="middle" fontSize="3.4" fill="#3730a3" fontWeight="700">
              Startup Alley
            </text>
            <text x="80" y="70" textAnchor="middle" fontSize="2.3" fill="#4f46e5">
              {boothsLabel(countFor("Startup Alley"))}
            </text>
          </svg>

          {placed.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate(`/booths/${b.slug}`)}
              style={{ left: `${b.position_x}%`, top: `${b.position_y}%` }}
              className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
              aria-label={`${b.company_name}${b.booth_code ? `, booth ${b.booth_code}` : ""} — open details`}
            >
              <span className="flex flex-col items-center">
                <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-indigo-600 text-[10px] font-bold text-white shadow-md ring-indigo-300 transition group-hover:scale-110 group-hover:bg-indigo-700 group-focus:ring-4">
                  {b.company_name.slice(0, 2).toUpperCase()}
                </span>
                <span className="mt-1 max-w-[96px] truncate rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm group-hover:text-indigo-700">
                  {b.company_name}
                </span>
              </span>
            </button>
          ))}

          {placed.length === 0 && (
            <div className="absolute inset-0 grid place-items-center">
              <p className="rounded-lg bg-white/85 px-4 py-2 text-center text-sm text-slate-500 shadow-sm">
                No booths placed on the map yet. Browse the directory below.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-white bg-indigo-600 shadow-sm" /> exhibitor booth
        </span>
        {ZONES.map((z) => (
          <span key={z}>
            {z}: <span className="font-medium text-slate-700">{countFor(z)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
