import { Link } from "react-router-dom";
import type { Booth } from "../lib/types";

export function BoothCard({ booth }: { booth: Booth }) {
  return (
    <Link
      to={`/booths/${booth.slug}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700">{booth.company_name}</h3>
        {booth.booth_code && (
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {booth.booth_code}
          </span>
        )}
      </div>
      {booth.tagline && <p className="mt-1 text-sm text-slate-600">{booth.tagline}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-indigo-50 px-2 py-1 font-medium text-indigo-700">{booth.category}</span>
        {booth.zone && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{booth.zone}</span>}
      </div>
    </Link>
  );
}
