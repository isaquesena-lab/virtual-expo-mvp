import { useNavigate } from "react-router-dom";
import type { Booth } from "../lib/types";

/** Original, generic virtual hall. Booths render at their percentage coordinates. */
export function HallMap({ booths }: { booths: Booth[] }) {
  const navigate = useNavigate();
  const placed = booths.filter((b) => b.position_x != null && b.position_y != null);

  return (
    <div className="hall-floor relative w-full overflow-hidden rounded-2xl border border-indigo-100">
      <div className="relative aspect-[16/10] w-full">
        <svg viewBox="0 0 100 62.5" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {/* zone blocks */}
          <rect x="4" y="6" width="44" height="22" rx="2" fill="#c7d2fe" opacity="0.5" />
          <rect x="52" y="6" width="44" height="22" rx="2" fill="#c7d2fe" opacity="0.5" />
          <rect x="4" y="34" width="92" height="24" rx="2" fill="#a5b4fc" opacity="0.35" />
          <text x="26" y="17" textAnchor="middle" fontSize="2.6" fill="#4338ca" opacity="0.8">
            North Hall
          </text>
          <text x="74" y="17" textAnchor="middle" fontSize="2.6" fill="#4338ca" opacity="0.8">
            South Hall
          </text>
          <text x="50" y="46" textAnchor="middle" fontSize="2.6" fill="#4338ca" opacity="0.8">
            Startup Alley
          </text>
        </svg>

        {placed.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => navigate(`/booths/${b.slug}`)}
            style={{ left: `${b.position_x}%`, top: `${b.position_y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            title={`${b.company_name}${b.booth_code ? ` · ${b.booth_code}` : ""}`}
          >
            <span className="flex flex-col items-center">
              <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-indigo-600 text-[10px] font-bold text-white shadow-md transition hover:scale-110">
                {b.company_name.slice(0, 2).toUpperCase()}
              </span>
              <span className="mt-1 max-w-[90px] truncate rounded bg-white/90 px-1 text-[10px] font-medium text-slate-700 shadow-sm">
                {b.company_name}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
