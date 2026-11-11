import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Booth } from "../lib/types";
import { TIER_STYLE, tierGradient } from "../lib/tierStyle";
import { TierPill } from "./TierPill";
import { PAVILIONS, STANDS, STAND_BY_CODE, TIER_LABELS, type Pavilion, type Tier } from "../../shared/stands";

/**
 * Original virtual-hall map: one detailed plan per pavilion, every stand drawn,
 * occupied stands highlighted and tappable. Intentionally not a copy of any other
 * event's map, coordinates or visual identity.
 *
 * Each pavilion is drawn in its own SVG. The shared floor plan stores positions as
 * percentages of a 16:10 hall, so 1% of width = 16 units and 1% of height = 10 units.
 */

/** Representative solid colour per tier (glow, selection); fills use the tier gradient. */
const TIER_COLOR: Record<Tier, string> = {
  PARTNER: TIER_STYLE.PARTNER.from,
  ALPHA: TIER_STYLE.ALPHA.from,
  BETA: TIER_STYLE.BETA.from,
  GROWTH: TIER_STYLE.GROWTH.from,
};

const UX = 16;
const UY = 10;

function PavilionPlan({
  pavilion,
  boothByCode,
  selected,
  onSelect,
}: {
  pavilion: Pavilion;
  boothByCode: Map<string, Booth>;
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const [x0, x1, y0, y1] = pavilion.box;
  const w = (x1 - x0) * UX;
  const h = (y1 - y0) * UY;
  const pitch = w / pavilion.cols;
  const cell = pitch * 0.72;
  const pad = 22;
  const stands = useMemo(() => STANDS.filter((s) => s.zone === pavilion.zone), [pavilion.zone]);
  const filled = stands.filter((s) => boothByCode.has(s.code)).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-100">{pavilion.zone}</h3>
        <p className="text-xs text-slate-400">
          {filled}/{pavilion.total} stands filled
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {pavilion.tiers.map((t) => (
          <span
            key={t.tier}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: tierGradient(t.tier, 135) }} />
            {TIER_LABELS[t.tier]} · {t.count}
          </span>
        ))}
      </div>

      <svg
        viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2 + 26}`}
        className="mt-3 h-auto w-full"
        role="group"
        aria-label={`${pavilion.zone} floor plan`}
      >
        <defs>
          {pavilion.tiers.map((t) => (
            <linearGradient key={t.tier} id={`tier-${pavilion.prefix}-${t.tier}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={TIER_STYLE[t.tier].from} />
              <stop offset="1" stopColor={TIER_STYLE[t.tier].to} />
            </linearGradient>
          ))}
        </defs>
        <rect x={-pad / 2} y={-pad / 2} width={w + pad} height={h + pad} rx="18" className="fill-white/[0.03] stroke-white/15" strokeWidth="3" />
        {stands.map((s) => {
          const booth = boothByCode.get(s.code);
          const cx = (s.x - x0) * UX;
          const cy = (s.y - y0) * UY;
          const color = TIER_COLOR[s.tier];
          const isSel = selected === s.code;
          return (
            <g key={s.code}>
              <rect
                x={cx - cell / 2}
                y={cy - cell / 2}
                width={cell}
                height={cell}
                rx={cell * 0.2}
                fill={booth ? `url(#tier-${pavilion.prefix}-${s.tier})` : color}
                fillOpacity={booth ? 0.95 : 0.14}
                stroke={booth ? "#fff" : color}
                strokeOpacity={booth ? 0.7 : 0.35}
                strokeWidth={booth ? 1.6 : 1}
                style={booth ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
              />
              {booth?.is_live === 1 && (
                <circle cx={cx + cell / 2} cy={cy - cell / 2} r={cell * 0.2} fill="#34d399" stroke="#0a0b14" strokeWidth="1.2">
                  <animate attributeName="opacity" values="1;.35;1" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              {isSel && (
                <rect
                  x={cx - cell / 2 - 3}
                  y={cy - cell / 2 - 3}
                  width={cell + 6}
                  height={cell + 6}
                  rx={cell * 0.3}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.5"
                />
              )}
              {/* generous hit target */}
              <rect
                x={cx - pitch / 2}
                y={cy - pitch / 2}
                width={pitch}
                height={pitch}
                fill="transparent"
                className="cursor-pointer outline-none"
                tabIndex={0}
                role="button"
                aria-label={booth ? `${booth.company_name}, stand ${s.code}` : `Stand ${s.code}, available`}
                onClick={() => onSelect(s.code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(s.code);
                  }
                }}
              />
            </g>
          );
        })}
        {/* entrance */}
        <g transform={`translate(${w / 2} ${h + pad / 2 + 4})`}>
          <rect x="-46" y="0" width="92" height="20" rx="10" fill="#6366f1" fillOpacity="0.85" />
          <text y="14" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="2" fill="#fff">
            ENTRANCE
          </text>
        </g>
      </svg>
    </div>
  );
}

export function HallMap({ booths }: { booths: Booth[] }) {
  const [active, setActive] = useState(PAVILIONS[0].zone);
  const [selected, setSelected] = useState<string | null>(null);

  const boothByCode = useMemo(() => {
    const m = new Map<string, Booth>();
    for (const b of booths) if (b.booth_code && STAND_BY_CODE.has(b.booth_code)) m.set(b.booth_code, b);
    return m;
  }, [booths]);

  const selStand = selected ? STAND_BY_CODE.get(selected) : undefined;
  const selBooth = selected ? boothByCode.get(selected) : undefined;

  function select(code: string) {
    setSelected((cur) => (cur === code ? null : code));
    const z = STAND_BY_CODE.get(code)?.zone;
    if (z) setActive(z);
  }

  return (
    <div>
      {/* pavilion tabs (mobile) */}
      <div className="mb-3 flex gap-2 overflow-x-auto lg:hidden" role="tablist" aria-label="Pavilions">
        {PAVILIONS.map((p) => (
          <button
            key={p.zone}
            role="tab"
            aria-selected={active === p.zone}
            onClick={() => setActive(p.zone)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              active === p.zone
                ? "border-indigo-400/60 bg-indigo-500/20 text-white"
                : "border-white/10 text-slate-300 hover:bg-white/5"
            }`}
          >
            {p.zone}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PAVILIONS.map((p) => (
          <div key={p.zone} className={active === p.zone ? "block" : "hidden lg:block"}>
            <PavilionPlan pavilion={p} boothByCode={boothByCode} selected={selected} onSelect={select} />
          </div>
        ))}
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.9)]" /> occupied stand
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border border-indigo-400/40 bg-indigo-400/15" /> available stand
        </span>
        {(Object.keys(TIER_LABELS) as Tier[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: tierGradient(t, 135) }} /> {TIER_LABELS[t]}
          </span>
        ))}
        <span className="text-slate-500">Tap a stand for details</span>
      </div>

      {/* selection detail */}
      {selStand && (
        <div className="sticky bottom-3 z-10 mt-4 rounded-2xl border border-white/15 bg-[#14152b]/95 p-4 shadow-xl shadow-black/40 backdrop-blur" role="status">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {selStand.zone} · Stand {selStand.code}
                <TierPill tier={selStand.tier} className="!px-2 !py-0.5 !text-[11px]" />
              </p>
              <p className="mt-0.5 truncate text-base font-semibold text-white">
                {selBooth ? selBooth.company_name : "Available stand"}
                {selBooth?.is_live === 1 && <span className="ml-2 align-middle text-xs font-semibold text-emerald-300">● Live now</span>}
              </p>
              {selBooth?.tagline && <p className="truncate text-sm text-slate-400">{selBooth.tagline}</p>}
              {!selBooth && <p className="text-sm text-slate-400">This stand is still free — claim it for your company.</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              {selBooth ? (
                <Link
                  to={`/booths/${selBooth.slug}`}
                  className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                >
                  Visit booth →
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="rounded-full border border-indigo-300/40 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/5"
                >
                  List a booth
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border border-white/15 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
