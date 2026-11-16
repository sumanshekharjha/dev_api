import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardHeader from "../dashboard/DashboardHeader.jsx";


export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    async function fetchUser() {
      try {
        const response = await fetch("http://127.0.0.1:8000/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401 || !response.ok) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user_email");
          navigate("/login");
          return;
        }

        const data = await response.json();
        setUserName(data.name || "");
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_email");
        navigate("/login");
      }
    }

    fetchUser();
  }, [navigate]);

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <DashboardHeader userName={userName} currentPage="dashboard" />

      <main className="mx-auto max-w-content px-6 py-10 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Welcome, {userName}
          </h1>
          <p className="text-sm text-ink/60">Your API workspace overview</p>
        </div>

       

        {/* Navigation & Overview Cards for API Vault, Mock Server, and TestSpace */}
        <section className="mt-12">
          <div className="grid gap-8 md:grid-cols-3">
            {/* API Vault Card */}
            <div className="flex flex-col justify-between border border-ink/10 bg-white p-7 transition-all hover:border-ink/30">
              <div>
                <div className="inline-block border border-ink/20 bg-cloud px-2.5 py-1 font-mono text-xs font-semibold text-ink">
                  API VAULT
                </div>
                <h2 className="mt-4 font-display text-xl font-bold text-ink">
                  API Vault
                </h2>
                <p className="mt-1 font-medium text-xs text-ink/80">
                  Your saved APIs, ready to test
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">
                  Manage and organize your saved endpoints, inspect request structures, and launch tests directly from your personal library.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-ink/10">
                <Link
                  to="/api-vault"
                  className="inline-flex items-center gap-2 bg-signal px-4 py-2 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
                >
                  Open API Vault →
                </Link>
              </div>
            </div>

            {/* Mock Server Card */}
            <div className="flex flex-col justify-between border border-ink/10 bg-white p-7 transition-all hover:border-ink/30">
              <div>
                <div className="inline-block border border-signal/30 bg-signal/10 px-2.5 py-1 font-mono text-xs font-semibold text-ink">
                  MOCK SERVER
                </div>
                <h2 className="mt-4 font-display text-xl font-bold text-ink">
                  Mock Server
                </h2>
                <p className="mt-1 font-medium text-xs text-ink/80">
                  Create and manage mock APIs
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">
                  Simulate endpoints with custom status codes, delays, and dynamic JSON responses before backend services are ready.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-ink/10">
                <Link
                  to="/mock-server"
                  className="inline-flex items-center gap-2 bg-signal px-4 py-2 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
                >
                  Open Mock Server →
                </Link>
              </div>
            </div>

            {/* TestSpace Card */}
            <div className="flex flex-col justify-between border border-ink/10 bg-white p-7 transition-all hover:border-ink/30">
              <div>
                <div className="inline-block border border-ink/20 bg-cloud px-2.5 py-1 font-mono text-xs font-semibold text-ink">
                  TESTSPACE
                </div>
                <h2 className="mt-4 font-display text-xl font-bold text-ink">
                  TestSpace
                </h2>
                <p className="mt-1 font-medium text-xs text-ink/80">
                  Test and send API requests
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">
                  Build and execute HTTP requests with parameters, headers, authorization, and payloads, and inspect live responses.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-ink/10">
                <Link
                  to="/testspace"
                  className="inline-flex items-center gap-2 bg-signal px-4 py-2 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
                >
                  Open TestSpace →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
