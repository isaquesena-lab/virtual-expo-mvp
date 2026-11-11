import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listBooths } from "../lib/api";
import type { Booth } from "../lib/types";
import { CATEGORIES, ZONES } from "../lib/types";
import { STAND_BY_CODE, TIER_LABELS, type Tier } from "../../shared/stands";
import { Select } from "../components/Select";
import { BoothCard } from "../components/BoothCard";
import { BoothCardSkeleton } from "../components/BoothCardSkeleton";
import { HallMap } from "../components/HallMap";

export function Home() {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [zone, setZone] = useState("");
  const [tier, setTier] = useState("");
  const [liveOnly, setLiveOnly] = useState(false);
  // Filter selections are staged here and only applied on "Apply Filters".
  const [draft, setDraft] = useState({ category: "", zone: "", tier: "" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = () =>
      listBooths({ q, category, zone, live: liveOnly })
        .then((data) => active && (setBooths(data), setError(null)))
        .catch((e) => active && setError(e.message))
        .finally(() => active && setLoading(false));
    const t = setTimeout(load, 200);
    // Keep presence fresh while the tab is visible.
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    return () => {
      active = false;
      clearTimeout(t);
      clearInterval(poll);
    };
  }, [q, category, zone, liveOnly]);

  const visible = useMemo(
    () => (tier ? booths.filter((b) => b.booth_code && STAND_BY_CODE.get(b.booth_code)?.tier === tier) : booths),
    [booths, tier],
  );
  const hasFilters = Boolean(q || category || zone || tier || liveOnly);
  const hasPending = Boolean(draft.category || draft.zone || draft.tier);
  function clearFilters() {
    setQ("");
    setCategory("");
    setZone("");
    setTier("");
    setLiveOnly(false);
    setDraft({ category: "", zone: "", tier: "" });
  }
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
        <HallMap booths={visible} />
      </section>

      <section className="space-y-5" aria-label="Discover companies">
        <div>
          <h2 className="text-3xl font-bold text-white">Discover Companies</h2>
          <p className="mt-1 text-sm text-slate-400">Explore all the exhibitors at the virtual expo.</p>
        </div>

        <div className="relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, pitch or booth number…"
            aria-label="Search booths"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-base text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="order-2 min-w-0 lg:order-1">
            {loading && booths.length === 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading booths">
                {Array.from({ length: 6 }, (_, i) => (
                  <BoothCardSkeleton key={i} />
                ))}
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300">
                Could not load booths: {error}
              </p>
            )}

            {!loading && !error && visible.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-slate-400">
                {hasFilters ? "No booths match your filters." : "No booths published yet. Be the first to list one."}
              </div>
            )}

            {!error && visible.length > 0 && (
              <>
                <p className="mb-3 text-sm text-slate-400">
                  {visible.length} {visible.length === 1 ? "company" : "companies"}
                </p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((b, i) => (
                    <div key={b.id} className="card-in flex [&>*]:min-w-0 [&>*]:flex-1" style={{ animationDelay: `${Math.min(i, 11) * 45}ms` }}>
                      <BoothCard booth={b} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="order-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:sticky lg:top-20 lg:order-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">Filters</h3>
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasFilters && !hasPending}
                className="text-sm font-medium text-slate-400 transition hover:text-white disabled:opacity-40"
              >
                ⊗ Clear
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCategory(draft.category);
                setZone(draft.zone);
                setTier(draft.tier);
              }}
              className="space-y-3"
            >
              <Select
                value={draft.category}
                onChange={(v) => setDraft({ ...draft, category: v })}
                placeholder="Category"
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <Select
                value={draft.zone}
                onChange={(v) => setDraft({ ...draft, zone: v })}
                placeholder="Pavilion"
                options={ZONES.map((z) => ({ value: z, label: z }))}
              />
              <Select
                value={draft.tier}
                onChange={(v) => setDraft({ ...draft, tier: v })}
                placeholder="Tier"
                options={(Object.keys(TIER_LABELS) as Tier[]).map((t) => ({ value: t, label: TIER_LABELS[t] }))}
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={liveOnly}
                  onChange={(e) => setLiveOnly(e.target.checked)}
                  className="h-4 w-4 accent-emerald-400"
                />
                Live now only
              </label>
              <button
                type="submit"
                className="w-full rounded-full border border-indigo-300/40 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-transparent hover:bg-gradient-to-r hover:from-indigo-500 hover:to-fuchsia-500"
              >
                Apply Filters
              </button>
            </form>
          </aside>
        </div>
      </section>
    </div>
  );
}
