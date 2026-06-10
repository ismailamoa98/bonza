// components/Navigation.jsx — Sticky app header / landing navbar.
// Cream bar rendered above every route: solid terra-cotta "B" mark + wordmark on
// the left, uppercase marketing links + a "Get started" button on the right.
import { Link } from "react-router-dom";

export default function Navigation() {
  return (
    <header className="sticky top-0 z-20 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-bonza text-[15px] font-semibold text-white">
            B
          </span>
          <span className="text-[17px] font-medium tracking-[-0.01em] text-ink">Bonza</span>
        </Link>

        <nav className="flex items-center gap-7">
          <a
            href="/#walkthrough"
            className="hidden text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft hover:text-ink sm:inline"
          >
            Why Bonza
          </a>
          <a
            href="/#pricing"
            className="hidden text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft hover:text-ink sm:inline"
          >
            Pricing
          </a>
          <a
            href="/#security"
            className="hidden text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft hover:text-ink sm:inline"
          >
            Security
          </a>
          <a
            href="/#plan"
            className="rounded-full bg-bonza px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-white hover:bg-bonza-dark"
          >
            Get started
          </a>
        </nav>
      </div>
    </header>
  );
}
