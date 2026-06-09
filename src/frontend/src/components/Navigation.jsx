// components/Navigation.jsx — Sticky app header / landing navbar.
// Teal-branded bar rendered above every route: logo + brand on the left,
// marketing links on the right (presentational — no routes yet).
import { Link } from "react-router-dom";

export default function Navigation() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-bonza to-bonza-light text-sm font-bold text-white">
            B
          </span>
          <span className="text-[15px] font-medium text-bonza">Bonza</span>
        </Link>

        <nav className="flex items-center gap-5 text-sm text-slate-600">
          <a href="#pricing" className="hidden hover:text-bonza sm:inline">
            Pricing
          </a>
          <a href="#security" className="hidden hover:text-bonza sm:inline">
            Security
          </a>
          <button
            type="button"
            className="rounded-lg border border-bonza px-3 py-1.5 text-sm font-medium text-bonza hover:bg-bonza-50"
          >
            Sign In
          </button>
        </nav>
      </div>
    </header>
  );
}
