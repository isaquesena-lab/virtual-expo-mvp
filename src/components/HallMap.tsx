import { useNavigate } from "react-router-dom";
import type { Booth } from "../lib/types";
import { PAVILIONS, STAND_BY_CODE, TIER_LABELS } from "../../shared/stands";

/**
 * Original virtual-hall floor plan — the event's own pavilions and stand tiers.
 * Intentionally not a copy of any other event's map or visual identity.
 * Occupied stands are shown as glowing markers; the full stand grid for selection
 * lives in the registration flow (there are hundreds of stands per pavilion).
 */
export function HallMap({ booths }: { booths: Booth[] }) {
  const navigate = useNavigate();
  const placed = booths.filter((b) => b.booth_code && STAND_BY_CODE.has(b.booth_code));
  const countFor = (zone: string) => booths.filter((b) => b.zone === zone).length;

  return (
    <div>
      <div className="hall-floor relative w-full overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/30">
        <div className="hall-grid relative aspect-[16/10] w-full">
          {/* pavilion blocks */}
          {PAVILIONS.map((p) => {
            const [x0, x1, y0, y1] = p.box;
            return (
              <div key={p.zone}>
                <div
                  className="absolute rounded-xl border border-indigo-400/20 bg-indigo-400/[0.04]"
                  style={{
                    left: `${x0 - 2}%`,
                    top: `${y0 - 7}%`,
                    width: `${x1 - x0 + 4}%`,
                    height: `${y1 - y0 + 9}%`,
                  }}
                />
                <div className="absolute flex flex-wrap items-baseline gap-x-2" style={{ left: `${x0 - 1}%`, top: `${y0 - 6.5}%` }}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 sm:text-sm">
                    {p.zone}
                  </span>
                  <span className="text-[10px] font-medium text-fuchsia-300/80">
                    {countFor(p.zone)}/{p.total} filled
                  </span>
                </div>
                <div className="absolute flex flex-wrap gap-1" style={{ left: `${x0 - 1}%`, top: `${y1 + 1.5}%` }}>
                  {p.tiers.map((t) => (
                    <span
                      key={t.tier}
                      className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[8px] font-medium text-slate-300"
                    >
                      {TIER_LABELS[t.tier]} · {t.count}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* entrance marker */}
          <div className="absolute bottom-[0.5%] left-1/2 -translate-x-1/2 rounded bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-2 py-0.5 text-[9px] font-bold tracking-widest text-white shadow-lg shadow-fuchsia-500/30">
            ENTRANCE
          </div>

          {/* occupied stands */}
          {placed.map((b) => {
            const stand = STAND_BY_CODE.get(b.booth_code as string)!;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => navigate(`/booths/${b.slug}`)}
                style={{ left: `${stand.x}%`, top: `${stand.y}%` }}
                className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                aria-label={`${b.company_name}, stand ${b.booth_code} — open details`}
                title={`${b.company_name} · ${b.booth_code}`}
              >
                <span className="grid h-3.5 w-3.5 place-items-center rounded-[3px] border border-white/30 bg-gradient-to-br from-indigo-400 to-fuchsia-500 text-white shadow-[0_0_8px_rgba(124,108,255,0.8)] transition group-hover:scale-150 group-focus:ring-2 group-focus:ring-fuchsia-300/60" />
                <span className="pointer-events-none absolute left-1/2 top-4 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-medium text-white group-hover:block">
                  {b.company_name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-gradient-to-br from-indigo-400 to-fuchsia-500 shadow-[0_0_6px_rgba(124,108,255,0.8)]" />{" "}
          occupied stand
        </span>
        <span className="text-slate-500">
          880 stands across {PAVILIONS.length} pavilions · pick yours when you list a booth
        </span>
      </div>
    </div>
  );
}
