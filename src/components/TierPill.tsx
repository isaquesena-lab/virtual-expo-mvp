import { TIER_LABELS, type Tier } from "../../shared/stands";
import { tierPillStyle } from "../lib/tierStyle";

export function TierPill({ tier, className = "" }: { tier: Tier; className?: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
      style={tierPillStyle(tier)}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}
