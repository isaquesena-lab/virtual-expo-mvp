/** Placeholder with the same footprint as BoothCard, shown while the first load is pending. */
export function BoothCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="skeleton h-16 w-16 rounded-xl" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton mt-4 h-4 w-2/3 rounded" />
      <div className="skeleton mt-2 h-3 w-1/2 rounded" />
      <div className="mt-4 space-y-2">
        <div className="skeleton h-3 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
      <div className="skeleton mt-5 h-9 w-full rounded-full" />
    </div>
  );
}
