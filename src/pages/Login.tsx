import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestLogin, startSession } from "../lib/api";

const INPUT =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Arriving from the magic link: /login#code=...
  useEffect(() => {
    const code = new URLSearchParams(window.location.hash.slice(1)).get("code");
    if (!code) return;
    window.history.replaceState(null, "", "/login");
    startSession(code)
      .then(() => navigate("/account", { replace: true }))
      .catch((e) => setError(e instanceof Error ? e.message : "Sign-in failed"));
  }, [navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await requestLogin(email);
      setSent(true);
      void res;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the sign-in link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-white">Sign in to manage your stands</h1>
      <p className="mt-1 text-slate-400">
        We email you a one-time link for the address you used when registering your booth.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {sent ? (
        <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-sm text-emerald-200/90">
          If that email manages a booth, a sign-in link is on its way (valid 15 minutes). Check your inbox and spam
          folder.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-200">Owner email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={INPUT}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-xs text-slate-500">
        Prefer the old way? Your private edit link (with <code>#token=…</code>) still works and will keep working.
      </p>
    </div>
  );
}
