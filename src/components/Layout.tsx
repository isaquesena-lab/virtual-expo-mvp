import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { editPath, loadMyBooth } from "../lib/myBooth";

/**
 * iOS-style segmented switch for the two main destinations. A single gradient thumb
 * glides between the segments (soft ease-out, disabled under prefers-reduced-motion).
 * Off these two sections (booth page, edit, admin) the thumb fades out.
 */
function NavToggle() {
  const { pathname } = useLocation();
  const position = pathname === "/register" ? 1 : pathname === "/" || pathname.startsWith("/booths/") ? 0 : -1;
  const seg =
    "relative z-10 flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-500 ease-out motion-reduce:transition-none";

  return (
    <div className="relative grid grid-cols-2 rounded-full border border-white/10 bg-white/5 p-1">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 shadow-lg shadow-fuchsia-500/25 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(${Math.max(position, 0) * 100}%)`, opacity: position < 0 ? 0 : 1 }}
      />
      <NavLink to="/" end className={`${seg} ${position === 0 ? "text-white" : "text-slate-300 hover:text-white"}`}>
        Hall
      </NavLink>
      <NavLink to="/register" className={`${seg} ${position === 1 ? "text-white" : "text-slate-300 hover:text-white"}`}>
        List a booth
      </NavLink>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const mine = loadMyBooth();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0b14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center" aria-label="WetExpo — home">
            <img src="/logo.png" alt="WetExpo" width={134} height={36} className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-2">
            {mine && (
              <a href={editPath(mine)} className="rounded-lg px-3 py-2 text-sm font-medium text-amber-200 hover:bg-white/5">
                My booth
              </a>
            )}
            <NavToggle />
          </nav>
        </div>
      </header>

      {/* key on the path so each page re-runs the soft entrance animation */}
      <main key={pathname} className="page-in mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>

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
