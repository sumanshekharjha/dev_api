import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const navLinks = [
  { label: "About", href: "#what-is-an-api" },
  { label: "Features", href: "#api-vault" },
  { label: "Documentation", href: "#api-request" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  function handleSignOut() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-white">
      <nav className="mx-auto flex  items-center justify-between px-6 py-4 sm:px-8">
        <Link
          to="/"
          className="font-display text-4xl font-semibold tracking-tight"
        >
          <span className="text-signal">dev </span>
          <span className="text-ink">404</span>
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          <ul className="flex items-center gap-10">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-sm text-ink/70 transition-colors hover:text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-6">
            {token ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm font-medium text-ink/80 transition-colors hover:text-ink"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-ink/80 transition-colors hover:text-ink"
              >
                Sign in
              </Link>
            )}
            <Link
              to="/dashboard"
              className="bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation menu"
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span
            className={`h-px w-6 bg-ink transition-transform ${
              isMenuOpen ? "translate-y-[3.5px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-px w-6 bg-ink transition-transform ${
              isMenuOpen ? "-translate-y-[3.5px] -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      {isMenuOpen ? (
        <div className="border-t border-ink/10 bg-white px-6 py-5 md:hidden">
          <ul className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-base text-ink/80"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-3 border-t border-ink/10 pt-5">
            {token ? (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleSignOut();
                }}
                className="text-left text-base font-medium text-ink/80"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="text-base font-medium text-ink/80"
              >
                Sign in
              </Link>
            )}
            <Link
              to="/dashboard"
              onClick={() => setIsMenuOpen(false)}
              className="bg-signal px-5 py-3 text-center text-sm font-semibold text-ink"
            >
              Get Started
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}