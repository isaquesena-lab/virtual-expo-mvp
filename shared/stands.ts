/**
 * Authoritative floor plan — the single source of truth for pavilions and stand slots.
 * Shared by the client (render + selection) and the Worker (validate + place).
 *
 * This models the event's OWN pavilion structure (4 pavilions, 880 stands across
 * the ALPHA / BETA / GROWTH tiers). It is an ORIGINAL layout — not a copy of any
 * other event's floor plan or visual identity.
 *
 * Coordinates are percentages (0–100) of the hall container, used directly for
 * absolute positioning on the map.
 */

export type Tier = "ALPHA" | "BETA" | "GROWTH";

export const TIER_LABELS: Record<Tier, string> = {
  ALPHA: "Alpha",
  BETA: "Beta",
  GROWTH: "Growth",
};

export interface Stand {
  code: string;
  zone: string;
  tier: Tier;
  /** center x of the slot, 0–100 (% of container width) */
  x: number;
  /** center y of the slot, 0–100 (% of container height) */
  y: number;
}

interface PavilionDef {
  zone: string;
  prefix: string;
  /** stand tiers and how many stands each has, in layout order */
  tiers: Array<[Tier, number]>;
  /** bounding box of the pavilion in container %: [x0, x1, y0, y1] */
  box: [number, number, number, number];
}

const PAVILION_DEFS: PavilionDef[] = [
  { zone: "Pavilhão 1", prefix: "P1", tiers: [["ALPHA", 140]], box: [4, 48, 11, 45] },
  { zone: "Pavilhão 2", prefix: "P2", tiers: [["ALPHA", 150], ["BETA", 80]], box: [52, 96, 11, 45] },
  { zone: "Pavilhão 3", prefix: "P3", tiers: [["ALPHA", 170], ["GROWTH", 60]], box: [4, 48, 55, 89] },
  { zone: "Pavilhão 4", prefix: "P4", tiers: [["ALPHA", 200], ["BETA", 80]], box: [52, 96, 55, 89] },
];

export interface Pavilion {
  zone: string;
  prefix: string;
  total: number;
  tiers: Array<{ tier: Tier; count: number }>;
  box: [number, number, number, number];
  cols: number;
  rows: number;
}

/** Container pixel aspect ratio (16:10) — used to keep stand cells roughly square. */
const CONTAINER_ASPECT = 16 / 10;

function layoutFor(def: PavilionDef): { total: number; cols: number; rows: number } {
  const total = def.tiers.reduce((sum, [, n]) => sum + n, 0);
  const [x0, x1, y0, y1] = def.box;
  // Box pixel proportions (width% scaled by container aspect vs height%).
  const boxRatio = ((x1 - x0) * CONTAINER_ASPECT) / (y1 - y0);
  const cols = Math.max(1, Math.round(Math.sqrt(total * boxRatio)));
  const rows = Math.ceil(total / cols);
  return { total, cols, rows };
}

export const PAVILIONS: Pavilion[] = PAVILION_DEFS.map((def) => {
  const { total, cols, rows } = layoutFor(def);
  return {
    zone: def.zone,
    prefix: def.prefix,
    total,
    tiers: def.tiers.map(([tier, count]) => ({ tier, count })),
    box: def.box,
    cols,
    rows,
  };
});

export const ZONES: string[] = PAVILIONS.map((p) => p.zone);

function buildStands(): Stand[] {
  const out: Stand[] = [];
  for (const def of PAVILION_DEFS) {
    const { total, cols, rows } = layoutFor(def);
    const [x0, x1, y0, y1] = def.box;

    // Flatten the tier sequence so stand N knows its tier.
    const tierOf: Tier[] = [];
    for (const [tier, count] of def.tiers) for (let i = 0; i < count; i++) tierOf.push(tier);

    for (let n = 0; n < total; n++) {
      const r = Math.floor(n / cols);
      const c = n % cols;
      const x = x0 + ((c + 0.5) / cols) * (x1 - x0);
      // Center the (possibly short) last row's block vertically within the box.
      const y = y0 + ((r + 0.5) / rows) * (y1 - y0);
      out.push({
        code: `${def.prefix}-${String(n + 1).padStart(3, "0")}`,
        zone: def.zone,
        tier: tierOf[n],
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
      });
    }
  }
  return out;
}

export const STANDS: Stand[] = buildStands();

export const STAND_BY_CODE: Map<string, Stand> = new Map(STANDS.map((s) => [s.code, s]));

export function standsForZone(zone: string): Stand[] {
  return STANDS.filter((s) => s.zone === zone);
}

export function pavilionByZone(zone: string): Pavilion | undefined {
  return PAVILIONS.find((p) => p.zone === zone);
}
