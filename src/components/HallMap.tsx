import { useNavigate } from "react-router-dom";
import type { Booth } from "../lib/types";
import { PAVILIONS, STANDS } from "../../shared/stands";

/**
 * Original virtual-hall floor plan — a grid of numbered stands per pavilion.
 * Intentionally not a copy of any real event's map or visual identity.
 * Occupied stands link to the booth; empty ones invite registration.
 */
export function HallMap({ booths }: { booths: Booth[] }) {
  const navigate = useNavigate();
  const byCode = new Map(booths.filter((b) => b.booth_code).map((b) => [b.booth_code as string, b]));
  const countFor = (zone: string) => booths.filter((b) => b.zone === zone).length;

  return (
    <div>
      <div className="hall-floor relative w-full overflow-hidden rounded-2xl border border-indigo-100 shadow-sm">
        <div className="relative aspect-[16/10] w-full">
          {/* pavilion blocks */}
          {PAVILIONS.map((p) => {
            const [x0, x1, y0, y1] = p.box;
            return (
              <div key={p.zone}>
                <div
                  className="absolute rounded-xl border border-indigo-200/70 bg-white/35"
                  style={{
                    left: `${x0 - 2}%`,
                    top: `${y0 - 7}%`,
                    width: `${x1 - x0 + 4}%`,
                    height: `${y1 - y0 + 9}%`,
                  }}
                />
                <div
                  className="absolute flex items-baseline gap-2"
                  style={{ left: `${x0 - 1}%`, top: `${y0 - 6.5}%` }}
                >
                  <span className="text-[11px] font-bold tracking-wide text-indigo-800 sm:text-sm">{p.zone}</span>
                  <span className="text-[10px] font-medium text-indigo-500">{countFor(p.zone)} live</span>
                </div>
              </div>
            );
          })}

          {/* entrance marker */}
          <div className="absolute left-1/2 bottom-[1%] -translate-x-1/2 rounded bg-indigo-600 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white">
            ENTRANCE
          </div>

          {/* stand cells */}
          {STANDS.map((s) => {
            const b = byCode.get(s.code);
            const occupied = Boolean(b);
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => (b ? navigate(`/booths/${b.slug}`) : navigate("/register"))}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                aria-label={
                  occupied
                    ? `${b!.company_name}, stand ${s.code} — open details`
                    : `Stand ${s.code} available — register`
                }
                title={occupied ? `${b!.company_name} · ${s.code}` : `${s.code} · available`}
              >
                <span
                  className={[
                    "grid h-[5.2vw] max-h-7 min-h-[16px] w-[5.2vw] min-w-[16px] max-w-7 place-items-center rounded-[4px] border text-[9px] font-bold transition",
                    occupied
                      ? "border-white bg-indigo-600 text-white shadow-sm group-hover:scale-110 group-hover:bg-indigo-700 group-focus:ring-2 group-focus:ring-indigo-300"
                      : "border-dashed border-indigo-300 bg-white/70 text-indigo-300 group-hover:border-indigo-500 group-hover:text-indigo-600",
                  ].join(" ")}
                >
                  {occupied ? b!.company_name.slice(0, 2).toUpperCase() : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border border-white bg-indigo-600 shadow-sm" /> occupied
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border border-dashed border-indigo-300 bg-white/70" /> available
        </span>
        <span className="text-slate-400">tap an empty stand to list your company</span>
      </div>
    </div>
  );
}
