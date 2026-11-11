import type { CSSProperties } from "react";
import type { Tier } from "../../shared/stands";

/**
 * One colour identity per hierarchy tier, used by every widget that shows a company
 * (cards, detail page, hall map) so a tier always reads the same everywhere.
 * PARTNER: gold. ALPHA: orange to red. BETA: green to light blue. GROWTH: purple to a deeper blue.
 */
export const TIER_STYLE: Record<Tier, { from: string; to: string; text: string }> = {
  PARTNER: { from: "#facc15", to: "#fef08a", text: "#fef9c3" },
  ALPHA: { from: "#fb923c", to: "#ef4444", text: "#fed7aa" },
  BETA: { from: "#4ade80", to: "#38bdf8", text: "#bbf7d0" },
  GROWTH: { from: "#a855f7", to: "#2563eb", text: "#e9d5ff" },
};

export const tierGradient = (t: Tier, angle = 90): string =>
  `linear-gradient(${angle}deg, ${TIER_STYLE[t].from}, ${TIER_STYLE[t].to})`;

/** Tinted pill: translucent gradient fill with a matching border. */
export function tierPillStyle(t: Tier): CSSProperties {
  const s = TIER_STYLE[t];
  return {
    background: `linear-gradient(90deg, ${s.from}2e, ${s.to}2e)`,
    borderColor: `${s.from}80`,
    color: s.text,
  };
}
