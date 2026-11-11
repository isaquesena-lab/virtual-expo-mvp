import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, getBooth } from "../lib/api";
import type { Booth } from "../lib/types";

export function BoothDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [booth, setBooth] = useState<Booth | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);
    setError(null);
    getBooth(slug)
      .then((b) => active && setBooth(b))
      .catch((e) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(e.message);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) return <p className="py-12 text-center text-slate-500">Loading…</p>;

  if (notFound)
    return (
      <div className="py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Booth not available</h1>
        <p className="mt-2 text-slate-500">It may be pending review, hidden, or the link is wrong.</p>
        <Link to="/" className="mt-4 inline-block text-indigo-600 hover:underline">
          ← Back to the hall
        </Link>
      </div>
    );

  if (error || !booth)
    return (
      <div className="py-12 text-center">
        <p className="text-red-700">Could not load this booth: {error}</p>
        <Link to="/" className="mt-4 inline-block text-indigo-600 hover:underline">
          ← Back to the hall
        </Link>
      </div>
    );

  return (
    <article className="mx-auto max-w-2xl">
      <Link to="/" className="text-sm text-indigo-600 hover:underline">
        ← Back to the hall
      </Link>

      <header className="mt-4 flex items-start gap-4">
        {booth.logo_url ? (
          <img
            src={booth.logo_url}
            alt=""
            className="h-16 w-16 rounded-xl border border-slate-200 object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            {booth.company_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{booth.company_name}</h1>
          {booth.tagline && <p className="text-slate-600">{booth.tagline}</p>}
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">{booth.category}</span>
        {booth.zone && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{booth.zone}</span>}
        {booth.booth_code && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Booth {booth.booth_code}</span>
        )}
      </div>

      <p className="mt-6 whitespace-pre-line leading-relaxed text-slate-700">{booth.description}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href={booth.meet_url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Join meeting ↗
        </a>
        {booth.website_url && (
          <a
            href={booth.website_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Visit website ↗
          </a>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        The meeting opens in a new tab on an external service. This directory does not host the call.
      </p>
    </article>
  );
}
