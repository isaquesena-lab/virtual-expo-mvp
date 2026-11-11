import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-5xl font-bold text-indigo-600">404</p>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-indigo-600 hover:underline">
        ← Back to the hall
      </Link>
    </div>
  );
}
