import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Catches render-time errors in its subtree and shows a recovery panel
 * instead of letting React unmount the whole tree (blank page).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught a render error:", error, errorInfo);
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <h2 className="text-lg font-semibold text-white">Something went wrong on this page.</h2>
        <p className="mt-2 text-sm text-slate-400">
          An unexpected error occurred while rendering. You can reload the page or head back to the
          hall.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110"
          >
            Reload
          </button>
          <a
            href="/"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Go to the hall
          </a>
        </div>
      </div>
    );
  }
}
