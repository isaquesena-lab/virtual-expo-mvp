import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-indigo-500/20 text-white ring-1 ring-indigo-400/40"
      : "text-slate-300 hover:bg-white/5 hover:text-white",
  ].join(" ");
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0b14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center" aria-label="WetExpo — home">
            <img src="/logo.png" alt="WetExpo" width={134} height={36} className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>
              Hall
            </NavLink>
            <NavLink
              to="/register"
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110"
            >
              List a booth
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-white/10 bg-[#0a0b14]">
        <div className="mx-auto max-w-5xl space-y-2 px-4 py-6 text-sm text-slate-400">
          <p className="font-medium text-slate-200">
            Independent initiative — not affiliated with or endorsed by any event organizer.
          </p>
          <p>
            We don&apos;t host audio or video. &ldquo;Join meeting&rdquo; opens an external link provided by each
            exhibitor. We don&apos;t collect attendee emails for browsing.
          </p>
          <p>
            To report an incorrect or unsafe listing, or request removal, contact the moderators.{" "}
            <Link to="/admin" className="text-indigo-300 hover:text-indigo-200 hover:underline">
              Moderator area
            </Link>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
