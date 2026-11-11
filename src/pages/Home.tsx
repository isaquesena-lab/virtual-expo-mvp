import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listBooths } from "../lib/api";
import type { Booth } from "../lib/types";
import { CATEGORIES, ZONES } from "../lib/types";
import { BoothCard } from "../components/BoothCard";
import { HallMap } from "../components/HallMap";

export function Home() {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [zone, setZone] = useState("");

  // Debounced fetch whenever filters change.
  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      listBooths({ q, category, zone })
        .then((data) => active && setBooths(data))
        .catch((e) => active && setError(e.message))
        .finally(() => active && setLoading(false));
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q, category, zone]);

  const hasFilters = useMemo(() => Boolean(q || category || zone), [q, category, zone]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Explore the virtual hall</h1>
        <p className="mt-2 max-w-2xl text-indigo-100">
          Browse exhibitor booths, read each company&apos;s pitch, and join their meeting — no account needed.
        </p>
        <Link
          to="/register"
          className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
        >
          List your booth →
        </Link>
      </section>

      <section aria-label="Virtual hall map">
        <HallMap booths={booths} />
        <p className="mt-2 text-center text-xs text-slate-500">
          Tap a booth on the map, or use the directory below. The list works even if the map can&apos;t load.
        </p>
      </section>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, pitch or booth number…"
            aria-label="Search booths"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            aria-label="Filter by zone"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All zones</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="py-8 text-center text-slate-500">Loading booths…</p>}

        {error && (
          <p className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-700">
            Could not load booths: {error}
          </p>
        )}

        {!loading && !error && booths.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            {hasFilters ? "No booths match your filters." : "No booths published yet."}
          </div>
        )}

        {!loading && !error && booths.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {booths.map((b) => (
              <BoothCard key={b.id} booth={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
