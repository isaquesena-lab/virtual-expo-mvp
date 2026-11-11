import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">VE</span>
            <span className="hidden sm:inline">Virtual Expo</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>
              Hall
            </NavLink>
            <NavLink to="/register" className={navClass}>
              List a booth
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl space-y-2 px-4 py-6 text-sm text-slate-500">
          <p className="font-medium text-slate-700">
            Independent initiative — not affiliated with or endorsed by any event organizer.
          </p>
          <p>
            We don&apos;t host audio or video. &ldquo;Join meeting&rdquo; opens an external link provided by each
            exhibitor. We don&apos;t collect attendee emails for browsing.
          </p>
          <p>
            To report an incorrect or unsafe listing, or request removal, contact the moderators.{" "}
            <Link to="/admin" className="text-indigo-600 hover:underline">
              Moderator area
            </Link>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
