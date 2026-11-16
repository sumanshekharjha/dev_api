import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProductPreview from "../components/ProductPreview.jsx";

const API_BASE_URL = "http://127.0.0.1:8000";

const AUTH_TYPE_LABELS = {
  no_auth: "No Auth",
  api_key: "API Key",
  bearer: "Bearer Token",
  basic: "Basic Auth",
  oauth2: "OAuth 2.0",
};

const STATUS_COLORS = {
  active: "text-green-600 bg-green-500/10 border-green-500/30",
  warning: "text-amber-600 bg-amber-500/10 border-amber-500/30",
  offline: "text-red-600 bg-red-500/10 border-red-500/30",
  unknown: "text-ink/60 bg-ink/5 border-ink/20",
};

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export default function ApiVaultSection({ showHeading = true, routeApiId = null }) {
  const navigate = useNavigate();

  // APIs list state
  const [apis, setApis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Selected API for Details view
  const [selectedApi, setSelectedApi] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Add API Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newApiForm, setNewApiForm] = useState({
    name: "",
    base_url: "",
    description: "",
    auth_type: "no_auth",
    openapi_url: "",
  });
  const [isSubmittingApi, setIsSubmittingApi] = useState(false);

  // Edit API State
  const [editForm, setEditForm] = useState(null);
  const [isUpdatingApi, setIsUpdatingApi] = useState(false);

  // Credentials State
  const [credentials, setCredentials] = useState([]);
  const [isAddCredModalOpen, setIsAddCredModalOpen] = useState(false);
  const [newCredForm, setNewCredForm] = useState({
    name: "",
    type: "api_key",
    value: "",
    expires_at: "",
  });
  const [isSubmittingCred, setIsSubmittingCred] = useState(false);

  // Edit Credential State
  const [editingCred, setEditingCred] = useState(null);
  const [editCredForm, setEditCredForm] = useState({
    name: "",
    type: "api_key",
    value: "",
    expires_at: "",
  });
  const [isUpdatingCred, setIsUpdatingCred] = useState(false);

  // Environments State
  const [environments, setEnvironments] = useState([]);
  const [isAddEnvModalOpen, setIsAddEnvModalOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [isSubmittingEnv, setIsSubmittingEnv] = useState(false);

  // Edit Environment Name Modal
  const [editingEnv, setEditingEnv] = useState(null);
  const [editEnvName, setEditEnvName] = useState("");
  const [isUpdatingEnv, setIsUpdatingEnv] = useState(false);

  // New variable inputs per environment: { [envId]: { key: '', value: '', is_secret: false } }
  const [newVarInputs, setNewVarInputs] = useState({});

  // Edit Variable Modal
  const [editingVar, setEditingVar] = useState(null);
  const [editVarForm, setEditVarForm] = useState({
    key: "",
    value: "",
    is_secret: false,
  });
  const [isUpdatingVar, setIsUpdatingVar] = useState(false);

  const token = localStorage.getItem("access_token");

  // Fetch list of APIs
  async function fetchApis() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/apis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApis(data);
        return data;
      } else {
        setErrorMessage("Failed to load APIs.");
        return [];
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not connect to backend server.");
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch single API by ID
  async function fetchSingleApi(apiId) {
    try {
      const res = await fetch(`${API_BASE_URL}/apis/${apiId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        handleOpenDetails(data, false);
      }
    } catch (err) {
      console.error("Failed to load API:", err);
    }
  }

  // Initial load
  useEffect(() => {
    fetchApis().then((loadedApis) => {
      if (routeApiId) {
        const match = loadedApis.find((a) => String(a.id) === String(routeApiId));
        if (match) {
          handleOpenDetails(match, false);
        } else {
          fetchSingleApi(routeApiId);
        }
      }
    });
  }, [routeApiId]);

  // Fetch credentials for selected API
  async function fetchCredentials(apiId) {
    try {
      const res = await fetch(`${API_BASE_URL}/apis/${apiId}/credentials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCredentials(data);
      }
    } catch (err) {
      console.error("Failed to load credentials:", err);
    }
  }

  // Fetch environments with variables for selected API
  async function fetchEnvironments(apiId) {
    try {
      const res = await fetch(`${API_BASE_URL}/apis/${apiId}/environments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEnvironments(data);
      }
    } catch (err) {
      console.error("Failed to load environments:", err);
    }
  }

  // Open API Details view
  function handleOpenDetails(api, updateUrl = true) {
    setSelectedApi(api);
    setEditForm({
      name: api.name,
      base_url: api.base_url,
      description: api.description || "",
      auth_type: api.auth_type,
      status: api.status,
      openapi_url: api.openapi_url || "",
    });
    setActiveTab("overview");
    fetchCredentials(api.id);
    fetchEnvironments(api.id);

    if (updateUrl && !routeApiId) {
      navigate(`/api-vault/${api.id}`);
    }
  }

  // Return to list view
  function handleBackToList() {
    setSelectedApi(null);
    navigate("/api-vault");
    fetchApis();
  }

  // Handle Add API Submit
  async function handleCreateApi(e) {
    e.preventDefault();
    if (!newApiForm.name || !newApiForm.base_url) return;

    setIsSubmittingApi(true);
    try {
      const res = await fetch(`${API_BASE_URL}/apis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newApiForm),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setNewApiForm({
          name: "",
          base_url: "",
          description: "",
          auth_type: "no_auth",
          openapi_url: "",
        });
        fetchApis();
      } else {
        alert("Failed to create API. Please check your inputs.");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating API.");
    } finally {
      setIsSubmittingApi(false);
    }
  }

  // Handle Edit API Submit
  async function handleUpdateApi(e) {
    e.preventDefault();
    if (!selectedApi || !editForm) return;

    setIsUpdatingApi(true);
    try {
      const res = await fetch(`${API_BASE_URL}/apis/${selectedApi.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedApi(updated);
        alert("API updated successfully!");
        fetchApis();
      } else {
        alert("Failed to update API.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating API.");
    } finally {
      setIsUpdatingApi(false);
    }
  }

  // Handle Delete API
  async function handleDeleteApi(apiId) {
    if (!confirm("Are you sure you want to delete this API? All associated credentials and environments will also be deleted.")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/apis/${apiId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok || res.status === 204) {
        handleBackToList();
      } else {
        alert("Failed to delete API.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting API.");
    }
  }

  // Handle Add Credential
  async function handleCreateCredential(e) {
    e.preventDefault();
    if (!selectedApi || !newCredForm.name || !newCredForm.value) return;

    setIsSubmittingCred(true);
    try {
      const payload = {
        name: newCredForm.name,
        type: newCredForm.type,
        value: newCredForm.value,
        expires_at: newCredForm.expires_at ? new Date(newCredForm.expires_at).toISOString() : null,
      };

      const res = await fetch(`${API_BASE_URL}/apis/${selectedApi.id}/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAddCredModalOpen(false);
        setNewCredForm({ name: "", type: "api_key", value: "", expires_at: "" });
        fetchCredentials(selectedApi.id);
      } else {
        alert("Failed to add credential.");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding credential.");
    } finally {
      setIsSubmittingCred(false);
    }
  }

  // Open Edit Credential Modal
  function handleOpenEditCred(cred) {
    setEditingCred(cred);
    setEditCredForm({
      name: cred.name,
      type: cred.type,
      value: "", // Leave blank to keep existing password
      expires_at: cred.expires_at ? cred.expires_at.substring(0, 10) : "",
    });
  }

  // Submit Edit Credential
  async function handleUpdateCredential(e) {
    e.preventDefault();
    if (!editingCred) return;

    setIsUpdatingCred(true);
    try {
      const payload = {
        name: editCredForm.name,
        type: editCredForm.type,
        expires_at: editCredForm.expires_at ? new Date(editCredForm.expires_at).toISOString() : null,
      };
      if (editCredForm.value.trim()) {
        payload.value = editCredForm.value.trim();
      }

      const res = await fetch(`${API_BASE_URL}/credentials/${editingCred.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingCred(null);
        fetchCredentials(selectedApi.id);
      } else {
        alert("Failed to update credential.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating credential.");
    } finally {
      setIsUpdatingCred(false);
    }
  }

  // Delete Credential
  async function handleDeleteCredential(credId) {
    if (!confirm("Delete this credential?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/credentials/${credId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        fetchCredentials(selectedApi.id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Handle Add Environment
  async function handleCreateEnvironment(envName) {
    if (!selectedApi || !envName.trim()) return;

    setIsSubmittingEnv(true);
    try {
      const res = await fetch(`${API_BASE_URL}/apis/${selectedApi.id}/environments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: envName.trim() }),
      });

      if (res.ok) {
        setIsAddEnvModalOpen(false);
        setNewEnvName("");
        fetchEnvironments(selectedApi.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingEnv(false);
    }
  }

  // Open Edit Environment Name
  function handleOpenEditEnv(env) {
    setEditingEnv(env);
    setEditEnvName(env.name);
  }

  // Submit Edit Environment Name
  async function handleUpdateEnvironment(e) {
    e.preventDefault();
    if (!editingEnv || !editEnvName.trim()) return;

    setIsUpdatingEnv(true);
    try {
      const res = await fetch(`${API_BASE_URL}/environments/${editingEnv.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editEnvName.trim() }),
      });

      if (res.ok) {
        setEditingEnv(null);
        fetchEnvironments(selectedApi.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingEnv(false);
    }
  }

  // Delete Environment
  async function handleDeleteEnvironment(envId) {
    if (!confirm("Delete this environment and all its variables?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/environments/${envId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        fetchEnvironments(selectedApi.id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Add Variable to an Environment
  async function handleAddVariable(envId) {
    const input = newVarInputs[envId];
    if (!input || !input.key || !input.value) return;

    try {
      const res = await fetch(`${API_BASE_URL}/environments/${envId}/variables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: input.key.trim(),
          value: input.value.trim(),
          is_secret: Boolean(input.is_secret),
        }),
      });

      if (res.ok) {
        setNewVarInputs((prev) => ({
          ...prev,
          [envId]: { key: "", value: "", is_secret: false },
        }));
        fetchEnvironments(selectedApi.id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Open Edit Variable
  function handleOpenEditVar(v) {
    setEditingVar(v);
    setEditVarForm({
      key: v.key,
      value: v.value === "••••••••" ? "" : v.value,
      is_secret: v.is_secret,
    });
  }

  // Submit Edit Variable
  async function handleUpdateVariable(e) {
    e.preventDefault();
    if (!editingVar || !editVarForm.key) return;

    setIsUpdatingVar(true);
    try {
      const payload = {
        key: editVarForm.key.trim(),
        is_secret: Boolean(editVarForm.is_secret),
      };
      if (editVarForm.value) {
        payload.value = editVarForm.value.trim();
      }

      const res = await fetch(`${API_BASE_URL}/variables/${editingVar.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingVar(null);
        fetchEnvironments(selectedApi.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingVar(false);
    }
  }

  // Delete Variable
  async function handleDeleteVariable(varId) {
    try {
      const res = await fetch(`${API_BASE_URL}/variables/${varId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        fetchEnvironments(selectedApi.id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ----------------------------------------------------
  // RENDER: API DETAILS VIEW / PAGE
  // ----------------------------------------------------
  if (selectedApi) {
    return (
      <section id="api-vault" className="space-y-6">
        {/* Top Header Card with Back button and metadata */}
        <div className="border border-ink/10 bg-white p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="border border-ink/20 bg-cloud px-3 py-1 font-mono text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-white"
                >
                  ← All APIs
                </button>
                <span
                  className={`border px-2.5 py-0.5 font-mono text-xs font-semibold uppercase ${
                    STATUS_COLORS[selectedApi.status] || STATUS_COLORS.unknown
                  }`}
                >
                  {selectedApi.status}
                </span>
                <span className="border border-ink/20 bg-cloud px-2.5 py-0.5 font-mono text-xs text-ink/70">
                  {AUTH_TYPE_LABELS[selectedApi.auth_type] || selectedApi.auth_type}
                </span>
              </div>

              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {selectedApi.name}
              </h2>
              <div className="mt-1 font-mono text-xs text-ink/70 break-all">
                {selectedApi.base_url}
              </div>
              {selectedApi.description && (
                <p className="mt-2 text-sm text-ink/70">
                  {selectedApi.description}
                </p>
              )}

              {/* Timestamp information */}
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-ink/10 pt-3 font-mono text-[11px] text-ink/50">
                <span>Created: {formatDate(selectedApi.created_at)}</span>
                <span>Updated: {formatDate(selectedApi.updated_at)}</span>
                {selectedApi.openapi_url && (
                  <span className="truncate max-w-xs text-blue-600">
                    OpenAPI: {selectedApi.openapi_url}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/testspace?api_id=${selectedApi.id}`)}
                className="bg-signal px-3.5 py-1.5 font-mono text-xs font-semibold text-ink transition-opacity hover:opacity-90"
              >
                Test API
              </button>
              <button
                type="button"
                onClick={() => handleDeleteApi(selectedApi.id)}
                className="border border-red-500/30 px-3.5 py-1.5 font-mono text-xs font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-50"
              >
                Delete API
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs: 1. Overview | 2. Credentials | 3. Environments | 4. OpenAPI */}
        <div className="flex gap-6 border-b border-ink/10 font-mono text-sm">
          {[
            { id: "overview", label: "Overview" },
            { id: "credentials", label: `Credentials (${credentials.length})` },
            { id: "environments", label: `Environments (${environments.length})` },
            { id: "openapi", label: "OpenAPI" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px border-b-2 pb-2.5 font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-signal text-ink"
                  : "border-transparent text-ink/50 hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && editForm && (
          <ProductPreview title="API Overview & Configuration" className="bg-white">
            <form onSubmit={handleUpdateApi} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wide text-ink/70">
                    API Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="mt-1.5 w-full border border-ink/20 bg-white px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wide text-ink/70">
                    Base URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.base_url}
                    onChange={(e) =>
                      setEditForm({ ...editForm, base_url: e.target.value })
                    }
                    className="mt-1.5 w-full border border-ink/20 bg-white px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase tracking-wide text-ink/70">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  placeholder="Describe this API and its intended purpose..."
                  className="mt-1.5 w-full border border-ink/20 bg-white p-3 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wide text-ink/70">
                    Authentication Type
                  </label>
                  <select
                    value={editForm.auth_type}
                    onChange={(e) =>
                      setEditForm({ ...editForm, auth_type: e.target.value })
                    }
                    className="mt-1.5 w-full border border-ink/20 bg-white px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="no_auth">No Auth</option>
                    <option value="api_key">API Key</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="oauth2">OAuth 2.0</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wide text-ink/70">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                    className="mt-1.5 w-full border border-ink/20 bg-white px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="active">Active</option>
                    <option value="warning">Warning</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase tracking-wide text-ink/70">
                  OpenAPI Specification URL
                </label>
                <input
                  type="text"
                  value={editForm.openapi_url}
                  onChange={(e) =>
                    setEditForm({ ...editForm, openapi_url: e.target.value })
                  }
                  placeholder="https://api.example.com/openapi.json"
                  className="mt-1.5 w-full border border-ink/20 bg-white px-3 py-2 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div className="border-t border-ink/10 pt-4 flex items-center justify-between">
                <button
                  type="submit"
                  disabled={isUpdatingApi}
                  className="bg-signal px-5 py-2 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isUpdatingApi ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </ProductPreview>
        )}

        {/* TAB 2: CREDENTIALS */}
        {activeTab === "credentials" && (
          <ProductPreview title="API Credentials" className="bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
              <div>
                <h3 className="font-display text-base font-bold text-ink">
                  Stored Credentials
                </h3>
                <p className="font-mono text-xs text-ink/60">
                  Keys and tokens stored for this API. Secret values are never exposed in plaintext.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCredModalOpen(true)}
                className="bg-signal px-3.5 py-1.5 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
              >
                + Add Credential
              </button>
            </div>

            {credentials.length === 0 ? (
              <div className="py-8 text-center font-mono text-xs text-ink/50">
                No credentials stored for this API yet. Click "+ Add Credential" to save an API Key or Token.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-ink/10 font-mono text-xs">
                {credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-3.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink text-sm">{cred.name}</span>
                        <span className="border border-ink/15 bg-cloud px-2 py-0.5 text-[10px] text-ink/70 uppercase">
                          {cred.type}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-ink/60">
                        <span>
                          Value:{" "}
                          <span className="tracking-widest font-bold text-ink">
                            {cred.masked_value}
                          </span>
                        </span>
                        <span>
                          Expires:{" "}
                          <span className="text-ink/80">
                            {cred.expires_at ? formatDate(cred.expires_at) : "Never"}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCred(cred)}
                        className="border border-ink/20 px-3 py-1 font-semibold text-ink hover:border-ink hover:bg-cloud"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCredential(cred.id)}
                        className="border border-red-500/30 px-3 py-1 font-semibold text-red-600 hover:border-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ProductPreview>
        )}

        {/* TAB 3: ENVIRONMENTS & VARIABLES */}
        {activeTab === "environments" && (
          <ProductPreview title="Environments & Variables" className="bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
              <div>
                <h3 className="font-display text-base font-bold text-ink">
                  Environments
                </h3>
                <p className="font-mono text-xs text-ink/60">
                  Manage environment configurations like Development, Staging, Production, and their variables.
                </p>
              </div>

              {/* Quick Add buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateEnvironment("Development")}
                  className="border border-ink/20 bg-cloud px-2.5 py-1 font-mono text-xs font-semibold text-ink hover:border-ink hover:bg-white"
                >
                  + Development
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateEnvironment("Staging")}
                  className="border border-ink/20 bg-cloud px-2.5 py-1 font-mono text-xs font-semibold text-ink hover:border-ink hover:bg-white"
                >
                  + Staging
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateEnvironment("Production")}
                  className="border border-ink/20 bg-cloud px-2.5 py-1 font-mono text-xs font-semibold text-ink hover:border-ink hover:bg-white"
                >
                  + Production
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddEnvModalOpen(true)}
                  className="bg-signal px-3 py-1 font-mono text-xs font-semibold text-ink hover:opacity-90"
                >
                  + Custom Environment
                </button>
              </div>
            </div>

            {environments.length === 0 ? (
              <div className="py-8 text-center font-mono text-xs text-ink/50">
                No environments configured yet. Click one of the quick add buttons above to create an environment.
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {environments.map((env) => {
                  const currentInput = newVarInputs[env.id] || {
                    key: "",
                    value: "",
                    is_secret: false,
                  };

                  return (
                    <div
                      key={env.id}
                      className="border border-ink/15 bg-cloud/30 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-ink">
                            {env.name}
                          </span>
                          <span className="border border-ink/15 bg-white px-2 py-0.5 font-mono text-[10px] text-ink/60">
                            {env.variables ? env.variables.length : 0} variables
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEnv(env)}
                            className="font-mono text-xs text-ink/60 hover:text-ink hover:underline"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEnvironment(env.id)}
                            className="font-mono text-xs text-red-600 hover:underline"
                          >
                            Delete Environment
                          </button>
                        </div>
                      </div>

                      {/* Variables list */}
                      <div className="mt-3">
                        {env.variables && env.variables.length > 0 ? (
                          <div className="divide-y divide-ink/10 font-mono text-xs">
                            {env.variables.map((v) => (
                              <div
                                key={v.id}
                                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-ink">
                                    {v.key}:
                                  </span>
                                  <span className="text-ink/80 tracking-wide">
                                    {v.value}
                                  </span>
                                  {v.is_secret && (
                                    <span className="border border-signal/40 bg-signal/10 px-1.5 py-0.2 font-mono text-[10px] uppercase font-bold text-ink">
                                      Secret
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditVar(v)}
                                    className="border border-ink/15 px-2 py-0.5 text-[11px] text-ink hover:border-ink hover:bg-white"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVariable(v.id)}
                                    className="text-ink/40 hover:text-red-600"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-2 font-mono text-xs text-ink/40">
                            No variables added yet.
                          </div>
                        )}
                      </div>

                      {/* Add variable input row */}
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
                        <input
                          type="text"
                          placeholder="KEY (e.g. API_URL)"
                          value={currentInput.key}
                          onChange={(e) =>
                            setNewVarInputs((prev) => ({
                              ...prev,
                              [env.id]: {
                                ...(prev[env.id] || {}),
                                key: e.target.value,
                              },
                            }))
                          }
                          className="border border-ink/20 bg-white px-2.5 py-1.5 font-mono text-xs text-ink focus:border-ink focus:outline-none sm:w-44"
                        />
                        <input
                          type="text"
                          placeholder="VALUE"
                          value={currentInput.value}
                          onChange={(e) =>
                            setNewVarInputs((prev) => ({
                              ...prev,
                              [env.id]: {
                                ...(prev[env.id] || {}),
                                value: e.target.value,
                              },
                            }))
                          }
                          className="flex-1 min-w-[140px] border border-ink/20 bg-white px-2.5 py-1.5 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                        />
                        <label className="flex items-center gap-1 font-mono text-xs text-ink/70">
                          <input
                            type="checkbox"
                            checked={Boolean(currentInput.is_secret)}
                            onChange={(e) =>
                              setNewVarInputs((prev) => ({
                                ...prev,
                                [env.id]: {
                                  ...(prev[env.id] || {}),
                                  is_secret: e.target.checked,
                                },
                              }))
                            }
                          />
                          Secret
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddVariable(env.id)}
                          className="bg-ink px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-ink/80"
                        >
                          + Add Variable
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ProductPreview>
        )}

        {/* TAB 4: OPENAPI */}
        {activeTab === "openapi" && (
          <ProductPreview title="OpenAPI Specification" className="bg-white">
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-ink">
                  OpenAPI Specification URL
                </h3>
                <p className="mt-1 font-mono text-xs text-ink/60">
                  Store the Swagger / OpenAPI schema endpoint for this API.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={selectedApi.openapi_url || "No OpenAPI URL provided"}
                  className="flex-1 border border-ink/20 bg-cloud px-3.5 py-2 font-mono text-xs text-ink"
                />
                {selectedApi.openapi_url && (
                  <a
                    href={selectedApi.openapi_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-ink/20 bg-white px-4 py-2 font-mono text-xs font-semibold text-ink hover:border-ink hover:bg-cloud"
                  >
                    Open in Browser ↗
                  </a>
                )}
              </div>

              <div className="border border-ink/10 bg-cloud/50 p-4 font-mono text-xs text-ink/70 leading-relaxed">
                ℹ️ OpenAPI specification URL is securely stored. OpenAPI schema parsing, endpoint extraction, and mock generation will be available in future Dev404 updates.
              </div>
            </div>
          </ProductPreview>
        )}

        {/* MODAL: Add Credential */}
        {isAddCredModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
            <div className="w-full max-w-md border border-ink bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <h3 className="font-display text-lg font-bold text-ink">
                  Add API Credential
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddCredModalOpen(false)}
                  className="font-mono text-ink/40 hover:text-ink"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCredential} className="mt-4 space-y-4">
                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    Credential Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staging API Key"
                    value={newCredForm.name}
                    onChange={(e) =>
                      setNewCredForm({ ...newCredForm, name: e.target.value })
                    }
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    Type *
                  </label>
                  <select
                    value={newCredForm.type}
                    onChange={(e) =>
                      setNewCredForm({ ...newCredForm, type: e.target.value })
                    }
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="api_key">API Key</option>
                    <option value="bearer_token">Bearer Token</option>
                    <option value="basic_auth">Basic Auth</option>
                    <option value="custom_header">Custom Header</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    Secret Value *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter secret key or token"
                    value={newCredForm.value}
                    onChange={(e) =>
                      setNewCredForm({ ...newCredForm, value: e.target.value })
                    }
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newCredForm.expires_at}
                    onChange={(e) =>
                      setNewCredForm({
                        ...newCredForm,
                        expires_at: e.target.value,
                      })
                    }
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCredModalOpen(false)}
                    className="px-4 py-2 font-mono text-xs text-ink/60 hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCred}
                    className="bg-signal px-5 py-2 font-mono text-xs font-semibold text-ink hover:opacity-90 disabled:opacity-50"
                  >
                    {isSubmittingCred ? "Saving..." : "Save Credential"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Edit Credential */}
        {editingCred && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
            <div className="w-full max-w-md border border-ink bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <h3 className="font-display text-lg font-bold text-ink">
                  Edit Credential
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCred(null)}
                  className="font-mono text-ink/40 hover:text-ink"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateCredential} className="mt-4 space-y-4">
                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    Credential Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCredForm.name}
                    onChange={(e) =>
                      setEditCredForm({ ...editCredForm, name: e.target.value })
                    }
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    Type *
                  </label>
                  <select
                    value={editCredForm.type}
                    onChange={(e) =>
                      setEditCredForm({ ...editCredForm, type: e.target.value })
                    }
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="api_key">API Key</option>
                    <option value="bearer_token">Bearer Token</option>
                    <option value="basic_auth">Basic Auth</option>
                    <option value="custom_header">Custom Header</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    New Secret Value (leave blank to keep existing)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new secret value or leave empty"
                    value={editCredForm.value}
                    onChange={(e) =>
                      setEditCredForm({ ...editCredForm, value: e.target.value })
                    }
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={editCredForm.expires_at}
                    onChange={(e) =>
                      setEditCredForm({
                        ...editCredForm,
                        expires_at: e.target.value,
                      })
                    }
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCred(null)}
                    className="px-4 py-2 font-mono text-xs text-ink/60 hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingCred}
                    className="bg-signal px-5 py-2 font-mono text-xs font-semibold text-ink hover:opacity-90 disabled:opacity-50"
                  >
                    {isUpdatingCred ? "Saving..." : "Update Credential"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add Environment */}
        {isAddEnvModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
            <div className="w-full max-w-sm border border-ink bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <h3 className="font-display text-lg font-bold text-ink">
                  Add Environment
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddEnvModalOpen(false)}
                  className="font-mono text-ink/40 hover:text-ink"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateEnvironment(newEnvName);
                }}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    Environment Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staging, Production"
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddEnvModalOpen(false)}
                    className="px-4 py-2 font-mono text-xs text-ink/60 hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEnv}
                    className="bg-signal px-5 py-2 font-mono text-xs font-semibold text-ink hover:opacity-90 disabled:opacity-50"
                  >
                    {isSubmittingEnv ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Rename Environment */}
        {editingEnv && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
            <div className="w-full max-w-sm border border-ink bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <h3 className="font-display text-lg font-bold text-ink">
                  Rename Environment
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingEnv(null)}
                  className="font-mono text-ink/40 hover:text-ink"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateEnvironment} className="mt-4 space-y-4">
                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    Environment Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editEnvName}
                    onChange={(e) => setEditEnvName(e.target.value)}
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingEnv(null)}
                    className="px-4 py-2 font-mono text-xs text-ink/60 hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingEnv}
                    className="bg-signal px-5 py-2 font-mono text-xs font-semibold text-ink hover:opacity-90 disabled:opacity-50"
                  >
                    {isUpdatingEnv ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Edit Variable */}
        {editingVar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
            <div className="w-full max-w-md border border-ink bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <h3 className="font-display text-lg font-bold text-ink">
                  Edit Environment Variable
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingVar(null)}
                  className="font-mono text-ink/40 hover:text-ink"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateVariable} className="mt-4 space-y-4">
                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    Variable Key *
                  </label>
                  <input
                    type="text"
                    required
                    value={editVarForm.key}
                    onChange={(e) =>
                      setEditVarForm({ ...editVarForm, key: e.target.value })
                    }
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-ink/70">
                    Variable Value (leave blank to keep unchanged if secret)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter value"
                    value={editVarForm.value}
                    onChange={(e) =>
                      setEditVarForm({ ...editVarForm, value: e.target.value })
                    }
                    className="mt-1 w-full border border-ink/20 p-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <label className="flex items-center gap-2 font-mono text-xs text-ink/70">
                  <input
                    type="checkbox"
                    checked={editVarForm.is_secret}
                    onChange={(e) =>
                      setEditVarForm({
                        ...editVarForm,
                        is_secret: e.target.checked,
                      })
                    }
                  />
                  Mark as Secret (Mask value in responses)
                </label>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingVar(null)}
                    className="px-4 py-2 font-mono text-xs text-ink/60 hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingVar}
                    className="bg-signal px-5 py-2 font-mono text-xs font-semibold text-ink hover:opacity-90 disabled:opacity-50"
                  >
                    {isUpdatingVar ? "Saving..." : "Save Variable"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ----------------------------------------------------
  // RENDER: APIS LIST VIEW
  // ----------------------------------------------------
  return (
    <section id="api-vault" className={showHeading ? "scroll-mt-16 border-t border-ink/10 pt-12" : ""}>
      {showHeading && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
              API Vault
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              Your saved APIs, ready to test.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-signal px-4 py-2 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
            >
              + Add API
            </button>
          </div>
        </div>
      )}

      {/* Top action bar when showHeading is false */}
      {!showHeading && (
        <div className="mb-6 flex items-center justify-between">
          <div className="font-mono text-xs text-ink/60">
            Total APIs: <span className="font-bold text-ink">{apis.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-signal px-4 py-2 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
          >
            + Add API
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 border border-red-500/30 bg-red-50 p-3 font-mono text-xs text-red-600">
          {errorMessage}
        </div>
      )}

      <ProductPreview className={showHeading ? "mt-6" : ""}>
        {isLoading ? (
          <div className="py-12 text-center font-mono text-sm text-ink/50">
            Loading your APIs from database...
          </div>
        ) : apis.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-mono text-sm text-ink/60">
              No APIs saved in your vault yet.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 bg-signal px-5 py-2 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
            >
              + Add Your First API
            </button>
          </div>
        ) : (
          <div className="flex flex-col font-mono text-sm">
            {apis.map((api, index) => (
              <div
                key={api.id}
                className={`flex flex-wrap items-center justify-between gap-4 py-3.5 ${
                  index !== 0 ? "border-t border-ink/10" : ""
                }`}
              >
                <div
                  onClick={() => handleOpenDetails(api)}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-sans text-sm font-bold text-ink hover:text-signal transition-colors truncate">
                      {api.name}
                    </span>
                    <span
                      className={`border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        STATUS_COLORS[api.status] || STATUS_COLORS.unknown
                      }`}
                    >
                      {api.status}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink/50">
                    {api.base_url}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 font-mono">
                  <span className="border border-ink/15 bg-cloud px-2 py-1 text-xs text-ink/70">
                    {AUTH_TYPE_LABELS[api.auth_type] || api.auth_type}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenDetails(api)}
                    className="border border-ink/20 bg-white px-3 py-1 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-cloud"
                  >
                    Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProductPreview>

      {/* MODAL: Add API */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg border border-ink bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <h3 className="font-display text-xl font-bold text-ink">
                Add New API
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="font-mono text-ink/40 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApi} className="mt-5 space-y-4">
              <div>
                <label className="block font-mono text-xs font-semibold uppercase text-ink/70">
                  API Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Products API"
                  value={newApiForm.name}
                  onChange={(e) =>
                    setNewApiForm({ ...newApiForm, name: e.target.value })
                  }
                  className="mt-1 w-full border border-ink/20 p-2.5 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase text-ink/70">
                  Base URL *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://api.example.com/v1"
                  value={newApiForm.base_url}
                  onChange={(e) =>
                    setNewApiForm({ ...newApiForm, base_url: e.target.value })
                  }
                  className="mt-1 w-full border border-ink/20 p-2.5 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase text-ink/70">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of what this API is for..."
                  value={newApiForm.description}
                  onChange={(e) =>
                    setNewApiForm({ ...newApiForm, description: e.target.value })
                  }
                  className="mt-1 w-full border border-ink/20 p-2.5 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase text-ink/70">
                  Authentication Type
                </label>
                <select
                  value={newApiForm.auth_type}
                  onChange={(e) =>
                    setNewApiForm({ ...newApiForm, auth_type: e.target.value })
                  }
                  className="mt-1 w-full border border-ink/20 p-2.5 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                >
                  <option value="no_auth">No Auth</option>
                  <option value="api_key">API Key</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="oauth2">OAuth 2.0</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold uppercase text-ink/70">
                  OpenAPI URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://api.example.com/openapi.json"
                  value={newApiForm.openapi_url}
                  onChange={(e) =>
                    setNewApiForm({ ...newApiForm, openapi_url: e.target.value })
                  }
                  className="mt-1 w-full border border-ink/20 p-2.5 font-mono text-sm text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 font-mono text-xs text-ink/60 hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApi}
                  className="bg-signal px-6 py-2.5 font-mono text-xs font-semibold text-ink hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmittingApi ? "Adding..." : "Add API"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
