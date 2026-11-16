import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-white">
      <div className="mx-auto max-w-content px-6 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Left: Brand + Tagline */}
          <div className="max-w-xs">
            <Link
              to="/"
              className="font-display text-3xl font-semibold tracking-tight"
            >
              <span className="text-signal">dev </span>
              <span className="text-ink">404</span>
            </Link>
            <p className="mt-2 text-sm text-ink/60 font-bold">
              CHAI CODE CLAUDE
            </p>
          </div>

          {/* Right: Navigation Links */}
          <div className="flex flex-wrap gap-12 sm:gap-16">
            <div className="flex flex-col gap-3">
              <a
                href="#what-is-an-api"
                className="text-sm text-ink/70 transition-colors hover:text-ink"
              >
                About
              </a>
              <a
                href="#api-vault"
                className="text-sm text-ink/70 transition-colors hover:text-ink"
              >
                Features
              </a>
              <a
                href="#api-request"
                className="text-sm text-ink/70 transition-colors hover:text-ink"
              >
                Documentation
              </a>
            </div>

          </div>
        </div>

        {/* Bottom: Divider & Meta */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-ink/10 pt-6 text-xs text-ink/50 sm:flex-row">
          <span>© 2026 dev 404</span>
          <span>Built for developers</span>
        </div>
      </div>
    </footer>
  );
}
