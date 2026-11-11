import { Link } from "react-router-dom";
import type { Booth } from "../lib/types";

export function BoothCard({ booth }: { booth: Booth }) {
  return (
    <Link
      to={`/booths/${booth.slug}`}
      className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-indigo-400/50 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-indigo-500/10"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-100 group-hover:text-white">{booth.company_name}</h3>
        {booth.booth_code && (
          <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-slate-300">
            {booth.booth_code}
          </span>
        )}
      </div>
      {booth.tagline && <p className="mt-1 text-sm text-slate-400">{booth.tagline}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-1 font-medium text-indigo-200">
          {booth.category}
        </span>
        {booth.zone && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-300">{booth.zone}</span>
        )}
      </div>
    </Link>
  );
}
