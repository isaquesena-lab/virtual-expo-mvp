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
  const inputClass =
    "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/30 via-fuchsia-600/20 to-transparent p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live virtual expo
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Explore the <span className="text-gradient">virtual hall</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-300 sm:text-lg">
            Walk the floor plan, discover exhibitor booths, and join their meeting in one tap — no account needed.
          </p>
          <Link
            to="/register"
            className="mt-6 inline-block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100"
          >
            List your booth →
          </Link>
        </div>
      </section>

      <section aria-label="Virtual hall map">
        <HallMap booths={booths} />
      </section>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, pitch or booth number…"
            aria-label="Search booths"
            className={inputClass}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className={inputClass}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Filter by zone" className={inputClass}>
            <option value="">All pavilions</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="py-8 text-center text-slate-400">Loading booths…</p>}

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300">
            Could not load booths: {error}
          </p>
        )}

        {!loading && !error && booths.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-slate-400">
            {hasFilters ? "No booths match your filters." : "No booths published yet. Be the first to list one."}
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
