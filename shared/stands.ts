/**
 * Authoritative floor plan — the single source of truth for pavilions and stand slots.
 * Shared by the client (render + selection) and the Worker (validate + place).
 *
 * Coordinates are percentages (0–100) of the hall container, used directly for
 * absolute positioning on the map. This is an ORIGINAL layout — not a copy of any
 * real event's floor plan.
 */

export interface Stand {
  code: string;
  zone: string;
  /** center x of the slot, 0–100 (% of container width) */
  x: number;
  /** center y of the slot, 0–100 (% of container height) */
  y: number;
}

export interface Pavilion {
  zone: string;
  prefix: string;
  cols: number;
  rows: number;
  /** bounding box of the pavilion in container %: [x0, x1, y0, y1] */
  box: [number, number, number, number];
}

export const PAVILIONS: Pavilion[] = [
  { zone: "North Hall", prefix: "N", cols: 6, rows: 4, box: [5, 46, 13, 45] },
  { zone: "South Hall", prefix: "S", cols: 6, rows: 4, box: [54, 95, 13, 45] },
  { zone: "Startup Alley", prefix: "A", cols: 10, rows: 2, box: [5, 95, 61, 89] },
];

export const ZONES: string[] = PAVILIONS.map((p) => p.zone);

function buildStands(): Stand[] {
  const out: Stand[] = [];
  for (const p of PAVILIONS) {
    const [x0, x1, y0, y1] = p.box;
    let n = 1;
    for (let r = 0; r < p.rows; r++) {
      for (let c = 0; c < p.cols; c++) {
        const x = x0 + ((c + 0.5) / p.cols) * (x1 - x0);
        const y = y0 + ((r + 0.5) / p.rows) * (y1 - y0);
        out.push({
          code: `${p.prefix}-${String(n).padStart(2, "0")}`,
          zone: p.zone,
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
        });
        n++;
      }
    }
  }
  return out;
}

export const STANDS: Stand[] = buildStands();

export const STAND_BY_CODE: Map<string, Stand> = new Map(STANDS.map((s) => [s.code, s]));

export function standsForZone(zone: string): Stand[] {
  return STANDS.filter((s) => s.zone === zone);
}
