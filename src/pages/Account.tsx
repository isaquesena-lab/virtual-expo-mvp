import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyAccount, logout, renewBooth } from "../lib/api";
import type { Booth } from "../lib/types";
import { TierPill } from "../components/TierPill";
import { STAND_BY_CODE } from "../../shared/stands";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  approved: "Live in the hall",
  rejected: "Rejected",
  hidden: "Hidden",
  expired: "Expired",
};

function daysLeft(b: Booth): number | null {
  if (typeof (b as Booth & { expires_at?: number | null }).expires_at !== "number") return null;
  return Math.ceil(((b as Booth & { expires_at: number }).expires_at * 1000 - Date.now()) / 86400000);
}

export function Account() {
  const [email, setEmail] = useState<string | null>(null);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    getMyAccount()
      .then((a) => {
        setEmail(a.email);
        setBooths(a.booths);
        setError(null);
      })
      .catch(() => setError("Not signed in."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function onRenew(id: string) {
    setNotice(null);
    try {
      const booth = await renewBooth(id);
      setBooths((prev) => prev.map((b) => (b.id === booth.id ? booth : b)));
      setNotice("Renewed — your stand stays public for another 30 days.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not renew");
    }
  }

  if (loading) return <p className="text-slate-400">Loading your account…</p>;
  if (error)
    return (
      <div className="mx-auto max-w-md space-y-3 text-center">
        <p className="text-slate-300">{error}</p>
        <Link to="/login" className="text-indigo-300 underline">
          Sign in
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Your stands</h1>
          <p className="text-sm text-slate-400">Signed in as {email}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            window.location.href = "/";
          }}
          className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
        >
          Sign out
        </button>
      </div>

      {notice && (
        <p className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 p-3 text-sm text-indigo-200" role="status">
          {notice}
        </p>
      )}

      {booths.length === 0 ? (
        <p className="text-slate-400">
          No booths are linked to this email yet.{" "}
          <Link to="/register" className="text-indigo-300 underline">
            Register one
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-4">
          {booths.map((b) => {
            const tier = b.booth_code ? STAND_BY_CODE.get(b.booth_code)?.tier : undefined;
            const left = daysLeft(b);
            return (
              <li key={b.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link to={`/booths/${b.slug}`} className="font-semibold text-white hover:underline">
                      {b.company_name}
                    </Link>
                    {tier && <TierPill tier={tier} />}
                  </div>
                  <span className="text-xs text-slate-400">{STATUS_LABEL[b.status] ?? b.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Stand {b.booth_code ?? "—"} · {b.zone ?? "—"}
                </p>
                {b.status === "approved" && left !== null && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className={`text-sm ${left <= 7 ? "text-amber-300" : "text-slate-300"}`}>
                      {left <= 0 ? "Expiring imminently" : `${left} day${left === 1 ? "" : "s"} left`}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRenew(b.id)}
                      className="rounded-full border border-indigo-300/40 px-3 py-1.5 text-sm font-semibold text-indigo-200 hover:bg-white/5"
                    >
                      Renew 30 days
                    </button>
                  </div>
                )}
                {b.status === "expired" && (
                  <p className="mt-3 text-sm text-amber-300">
                    This stand expired and its slot was released. Contact the moderators to relist.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
