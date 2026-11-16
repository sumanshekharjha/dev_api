import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardHeader from "../dashboard/DashboardHeader.jsx";
import ApiVaultSection from "../dashboard/ApiVaultSection.jsx";

export default function ApiVaultPage() {
  const navigate = useNavigate();
  const { apiId } = useParams();
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
      <DashboardHeader userName={userName} currentPage="api-vault" />

      <main className="mx-auto max-w-content px-6 py-10 sm:px-8 sm:py-12">
        {/* Page Header with cross-navigation: Dashboard | Mock Server | TestSpace */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
              API Vault
            </h1>
            <p className="mt-1.5 text-sm text-ink/60">
              Your saved APIs, ready to test and manage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="border border-ink/20 bg-white px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-cloud"
            >
              Dashboard
            </Link>
            <Link
              to="/mock-server"
              className="border border-ink/20 bg-white px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-cloud"
            >
              Mock Server
            </Link>
            <Link
              to="/testspace"
              className="border border-ink/20 bg-white px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-cloud"
            >
              TestSpace
            </Link>
          </div>
        </div>

        {/* API Vault Section */}
        <div className="mt-8">
          <ApiVaultSection showHeading={false} routeApiId={apiId} />
        </div>
      </main>
    </div>
  );
}
