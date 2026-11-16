import { Link, useNavigate } from "react-router-dom";

export default function DashboardHeader({ userName, currentPage = "dashboard" }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  function handleSignOut() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    navigate("/login");
  }

  const initial = userName ? userName.trim().charAt(0).toUpperCase() : "A";

  const allNavLinks = [
    { label: "Dashboard", to: "/dashboard", id: "dashboard" },
    { label: "API Vault", to: "/api-vault", id: "api-vault" },
    { label: "Mock Server", to: "/mock-server", id: "mock-server" },
    { label: "TestSpace", to: "/testspace", id: "testspace" },
  ];

  // Show navigation links to the other three main pages
  const navLinks = allNavLinks.filter((link) => link.id !== currentPage);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-white">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-3.5 sm:px-8">
        <Link
          to="/"
          className="font-display text-4xl font-semibold tracking-tight"
        >
          <span className="text-signal">dev </span>
          <span className="text-ink">404</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.id}
              to={link.to}
              className="text-sm font-medium text-ink/70 transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

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

          <div className="flex h-8 w-8 items-center justify-center border border-ink/15 font-mono text-xs font-semibold text-ink/80">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
