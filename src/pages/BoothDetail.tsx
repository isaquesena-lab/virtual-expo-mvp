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

  if (loading) return <p className="py-12 text-center text-slate-400">Loading…</p>;

  if (notFound)
    return (
      <div className="py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-100">Booth not available</h1>
        <p className="mt-2 text-slate-400">It may be pending review, hidden, or the link is wrong.</p>
        <Link to="/" className="mt-4 inline-block text-indigo-300 hover:underline">
          ← Back to the hall
        </Link>
      </div>
    );

  if (error || !booth)
    return (
      <div className="py-12 text-center">
        <p className="text-red-300">Could not load this booth: {error}</p>
        <Link to="/" className="mt-4 inline-block text-indigo-300 hover:underline">
          ← Back to the hall
        </Link>
      </div>
    );

  return (
    <article className="mx-auto max-w-2xl">
      <Link to="/" className="text-sm text-indigo-300 hover:underline">
        ← Back to the hall
      </Link>

      <header className="mt-4 flex items-start gap-4">
        {booth.logo_url ? (
          <img
            src={booth.logo_url}
            alt=""
            className="h-16 w-16 rounded-xl border border-white/10 bg-white/5 object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xl font-bold text-white shadow-lg shadow-indigo-500/30">
            {booth.company_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">{booth.company_name}</h1>
          {booth.tagline && <p className="text-slate-400">{booth.tagline}</p>}
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 font-medium text-indigo-200">
          {booth.category}
        </span>
        {booth.zone && (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">{booth.zone}</span>
        )}
        {booth.booth_code && (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
            Stand {booth.booth_code}
          </span>
        )}
      </div>

      <p className="mt-6 whitespace-pre-line leading-relaxed text-slate-300">{booth.description}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href={booth.meet_url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110"
        >
          Join meeting ↗
        </a>
        {booth.website_url && (
          <a
            href={booth.website_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
          >
            Visit website ↗
          </a>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        The meeting opens in a new tab on an external service. This directory does not host the call.
      </p>
    </article>
  );
}
