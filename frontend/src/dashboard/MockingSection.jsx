import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";
const MAX_RECORD_COUNT = 1000;

function getSchemaSummary(schema) {
  if (!schema || typeof schema !== "object") return "Schema not provided";
  if (Array.isArray(schema.enum)) return `enum (${schema.enum.length} values)`;
  if (schema.type === "array") {
    const item = schema.items || {};
    const itemType = item.type || (item.properties ? "object" : "unknown");
    return `array of ${itemType}${itemType === "object" ? ` (${Object.keys(item.properties || {}).length} fields)` : ""}`;
  }
  if (schema.type === "object" || schema.properties) {
    return `object (${Object.keys(schema.properties || {}).length} fields)`;
  }
  return [schema.type, schema.format].filter(Boolean).join(" / ") || "Schema available";
}

function getPathParameters(path) {
  return [...path.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]);
}

function getResolvedPath(endpoint, pathParameterValues) {
  return endpoint.path.replace(/\{([^{}]+)\}/g, (_, name) => {
    const value = pathParameterValues[endpoint.id]?.[name] || "1";
    return encodeURIComponent(value);
  });
}

function getEndpointUrl(mockApi, endpoint, count, pathParameterValues) {
  if (!endpoint) return "";
  const path = getResolvedPath(endpoint, pathParameterValues);
  const url = `${API_BASE_URL}/mock/${mockApi.token}${path.startsWith("/") ? path : `/${path}`}`;
  if (!endpoint.is_array) return url;
  const parsedCount = Number(count);
  if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > MAX_RECORD_COUNT) {
    return "";
  }
  return `${url}?count=${parsedCount}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function getErrorMessage(payload, fallback) {
  if (typeof payload?.detail === "string") return payload.detail;
  return fallback;
}

export default function MockingSection({ showHeading = true }) {
  const fileInputRef = useRef(null);
  const [mockApis, setMockApis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState("import");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [apiName, setApiName] = useState("");
  const [recordCount, setRecordCount] = useState("20");
  const [modalMessage, setModalMessage] = useState("");
  const [selectedMock, setSelectedMock] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [generationSuccess, setGenerationSuccess] = useState(null);
  const [copiedMockId, setCopiedMockId] = useState(null);
  const [selectedEndpointIds, setSelectedEndpointIds] = useState({});
  const [endpointCounts, setEndpointCounts] = useState({});
  const [pathParameterValues, setPathParameterValues] = useState({});
  const [manualEndpoints, setManualEndpoints] = useState([
    {
      id: 1,
      path: "/users",
      method: "GET",
      status_code: 200,
      response_type: "array",
      fields: [
        { id: 1, name: "id", type: "integer" },
        { id: 2, name: "name", type: "string" },
        { id: 3, name: "email", type: "email" },
      ],
      raw_json: "",
      is_raw_mode: false,
    },
  ]);

  const token = localStorage.getItem("access_token");
  const parsedCount = Number(recordCount);
  const isCountValid =
    Number.isInteger(parsedCount) &&
    parsedCount > 0 &&
    parsedCount <= MAX_RECORD_COUNT;

  async function loadMockApis() {
    setIsLoading(true);
    setListError("");
    try {
      const response = await fetch(`${API_BASE_URL}/mock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Could not load your Mock APIs.");
      }
      setMockApis(await response.json());
    } catch (error) {
      setListError(error.message || "Could not load your Mock APIs.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMockApis();
  }, []);

  function openCreateModal() {
    setMode("import");
    setSelectedFile(null);
    setPreview(null);
    setApiName("");
    setRecordCount("20");
    setModalMessage("");
    setActionError("");
    setGenerationSuccess(null);
    setManualEndpoints([
      {
        id: 1,
        path: "/users",
        method: "GET",
        status_code: 200,
        response_type: "array",
        fields: [
          { id: 1, name: "id", type: "integer" },
          { id: 2, name: "name", type: "string" },
          { id: 3, name: "email", type: "email" },
        ],
        raw_json: "",
        is_raw_mode: false,
      },
    ]);
    setIsModalOpen(true);
  }

  function acceptFile(file) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["json", "yaml", "yml"].includes(extension)) {
      setSelectedFile(null);
      setPreview(null);
      setModalMessage("Choose a .json, .yaml, or .yml OpenAPI file.");
      return;
    }
    setSelectedFile(file);
    setApiName("");
    setPreview(null);
    setModalMessage("");
  }

  async function previewOpenApi() {
    if (!selectedFile || !isCountValid) return;
    setIsPreviewing(true);
    setModalMessage("");
    setPreview(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch(`${API_BASE_URL}/mock/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not preview this OpenAPI file."));
      }
      setPreview(payload);
      setApiName(payload.title || "");
    } catch (error) {
      setModalMessage(error.message || "Could not preview this OpenAPI file.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function generateMockApi() {
    if (mode !== "import" || !selectedFile || !preview || !isCountValid) return;
    setIsGenerating(true);
    setModalMessage("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("record_count", String(parsedCount));
      formData.append("name", apiName.trim() || preview.title);

      const response = await fetch(`${API_BASE_URL}/mock/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Could not generate this Mock API."),
        );
      }

      const baseUrl = `${API_BASE_URL}/mock/${payload.token}`;
      setIsModalOpen(false);
      setSelectedFile(null);
      setPreview(null);
      setApiName("");
      setRecordCount("20");
      setGenerationSuccess({
        name: payload.name,
        baseUrl,
        recordCount: payload.record_count,
      });
      await loadMockApis();
    } catch (error) {
      setModalMessage(error.message || "Could not generate this Mock API.");
    } finally {
      setIsGenerating(false);
    }
  }

  function addManualEndpoint() {
    setManualEndpoints((prev) => [
      ...prev,
      {
        id: Date.now(),
        path: `/endpoint-${prev.length + 1}`,
        method: "GET",
        status_code: 200,
        response_type: "object",
        fields: [
          { id: 1, name: "id", type: "integer" },
          { id: 2, name: "title", type: "string" },
        ],
        raw_json: "",
        is_raw_mode: false,
      },
    ]);
  }

  function removeManualEndpoint(endpointId) {
    if (manualEndpoints.length <= 1) return;
    setManualEndpoints((prev) => prev.filter((ep) => ep.id !== endpointId));
  }

  function updateManualEndpoint(endpointId, updates) {
    setManualEndpoints((prev) =>
      prev.map((ep) => (ep.id === endpointId ? { ...ep, ...updates } : ep))
    );
  }

  function addFieldToEndpoint(endpointId) {
    setManualEndpoints((prev) =>
      prev.map((ep) => {
        if (ep.id !== endpointId) return ep;
        const nextId =
          ep.fields.length > 0 ? Math.max(...ep.fields.map((f) => f.id)) + 1 : 1;
        return {
          ...ep,
          fields: [
            ...ep.fields,
            { id: nextId, name: `field_${nextId}`, type: "string" },
          ],
        };
      })
    );
  }

  function removeFieldFromEndpoint(endpointId, fieldId) {
    setManualEndpoints((prev) =>
      prev.map((ep) => {
        if (ep.id !== endpointId) return ep;
        if (ep.fields.length <= 1) return ep;
        return {
          ...ep,
          fields: ep.fields.filter((f) => f.id !== fieldId),
        };
      })
    );
  }

  function updateEndpointField(endpointId, fieldId, updates) {
    setManualEndpoints((prev) =>
      prev.map((ep) => {
        if (ep.id !== endpointId) return ep;
        return {
          ...ep,
          fields: ep.fields.map((f) =>
            f.id === fieldId ? { ...f, ...updates } : f
          ),
        };
      })
    );
  }

  function buildSchemaFromEndpoint(endpoint) {
    if (endpoint.is_raw_mode) {
      if (!endpoint.raw_json?.trim()) {
        throw new Error("Raw JSON / Schema cannot be empty.");
      }
      return JSON.parse(endpoint.raw_json.trim());
    }

    const properties = {};
    endpoint.fields.forEach((f) => {
      const key = f.name?.trim();
      if (!key) return;

      if (f.type === "email") {
        properties[key] = { type: "string", format: "email" };
      } else if (f.type === "uuid") {
        properties[key] = { type: "string", format: "uuid" };
      } else if (f.type === "date") {
        properties[key] = { type: "string", format: "date" };
      } else if (f.type === "date-time") {
        properties[key] = { type: "string", format: "date-time" };
      } else if (f.type === "phone") {
        properties[key] = { type: "string", format: "phone" };
      } else if (f.type === "integer") {
        properties[key] = { type: "integer" };
      } else if (f.type === "number") {
        properties[key] = { type: "number" };
      } else if (f.type === "boolean") {
        properties[key] = { type: "boolean" };
      } else {
        properties[key] = { type: "string" };
      }
    });

    const objectSchema = {
      type: "object",
      properties:
        Object.keys(properties).length > 0
          ? properties
          : { id: { type: "integer" } },
    };

    if (endpoint.response_type === "array") {
      return {
        type: "array",
        items: objectSchema,
      };
    }

    return objectSchema;
  }

  async function generateManualMockApi() {
    if (!apiName.trim()) {
      setModalMessage("Please enter an API name.");
      return;
    }
    if (manualEndpoints.length === 0) {
      setModalMessage("Please add at least one endpoint.");
      return;
    }

    const payloadEndpoints = [];
    for (let i = 0; i < manualEndpoints.length; i++) {
      const ep = manualEndpoints[i];
      const cleanPath = ep.path.trim();
      if (!cleanPath) {
        setModalMessage(`Endpoint #${i + 1} path cannot be empty.`);
        return;
      }
      try {
        const schema = buildSchemaFromEndpoint(ep);
        payloadEndpoints.push({
          path: cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`,
          method: ep.method.toUpperCase(),
          status_code: Number(ep.status_code) || 200,
          response_schema: schema,
        });
      } catch (err) {
        setModalMessage(`Invalid schema for endpoint ${cleanPath}: ${err.message}`);
        return;
      }
    }

    setIsGenerating(true);
    setModalMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/mock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: apiName.trim(),
          source_type: "manual",
          endpoints: payloadEndpoints,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Could not generate this Mock API.")
        );
      }

      const baseUrl = `${API_BASE_URL}/mock/${payload.token}`;
      setIsModalOpen(false);
      setApiName("");
      setGenerationSuccess({
        name: payload.name,
        baseUrl,
        recordCount: parsedCount,
      });
      await loadMockApis();
    } catch (error) {
      setModalMessage(error.message || "Could not generate this Mock API.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyMockUrl(mockApi, endpointUrl) {
    if (!endpointUrl) {
      setActionError("Enter a record count between 1 and 1000 before copying the URL.");
      return;
    }
    try {
      await navigator.clipboard.writeText(endpointUrl);
      setCopiedMockId(mockApi.id);
      window.setTimeout(() => setCopiedMockId(null), 1800);
    } catch {
      setActionError("Could not copy the endpoint URL.");
    }
  }

  async function performMockAction(mockApi, action) {
    setActionError("");
    setPendingAction(`${action}-${mockApi.id}`);
    try {
      const endpoint =
        action === "stop"
          ? `${API_BASE_URL}/mock/${mockApi.id}/stop`
          : `${API_BASE_URL}/mock/${mockApi.id}`;
      const response = await fetch(endpoint, {
        method: action === "stop" ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(getErrorMessage(payload, `Could not ${action} this Mock API.`));
      }
      if (action === "delete") {
        setMockApis((current) => current.filter((item) => item.id !== mockApi.id));
        if (selectedMock?.id === mockApi.id) setSelectedMock(null);
      } else {
        setMockApis((current) =>
          current.map((item) =>
            item.id === mockApi.id ? { ...item, status: "stopped" } : item,
          ),
        );
        if (selectedMock?.id === mockApi.id) {
          setSelectedMock({ ...mockApi, status: "stopped" });
        }
      }
    } catch (error) {
      setActionError(error.message || `Could not ${action} this Mock API.`);
    } finally {
      setPendingAction(null);
    }
  }

  function handleFileDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  function renderPreviewTable() {
    if (!preview) return null;
    return (
      <section className="mt-6 border border-ink/10">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 bg-cloud px-4 py-3">
          <div>
            <h3 className="font-display font-semibold text-ink">
              {preview.title}
            </h3>
            <p className="mt-1 text-xs text-ink/60">
              {preview.endpoints.length} endpoint{preview.endpoints.length === 1 ? "" : "s"} found
            </p>
          </div>
          <span className="font-mono text-xs text-ink/50">
            {selectedFile?.name}
          </span>
        </div>
        {preview.endpoints.length > 0 ? (
          <div className="max-h-72 overflow-auto">
            {preview.endpoints.map((endpoint, index) => (
              <div
                key={`${endpoint.method}-${endpoint.path}-${index}`}
                className="grid gap-2 border-b border-ink/10 px-4 py-3 last:border-b-0 md:grid-cols-[70px_minmax(0,1fr)_72px_minmax(130px,0.7fr)] md:items-center"
              >
                <span className="font-mono text-xs font-bold text-signal">
                  {endpoint.method}
                </span>
                <code className="break-all text-xs text-ink">{endpoint.path}</code>
                <span className="font-mono text-xs text-ink/60">
                  {endpoint.status_code ?? "—"}
                </span>
                <span className="text-xs text-ink/60">
                  {getSchemaSummary(endpoint.response_schema)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-5 text-sm text-ink/60">
            No HTTP operations were found in the document.
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      id="mocks"
      className={showHeading ? "scroll-mt-16 border-t border-ink/10 pt-12" : ""}
    >
      {showHeading && (
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
            Mock APIs
          </h2>
          <p className="mt-1 text-sm text-ink/60">
            Preview an OpenAPI definition and manage your generated mock endpoints.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        {!showHeading && (
          <p className="text-sm text-ink/60">
            Create a mock API from an OpenAPI or Swagger document.
          </p>
        )}
        <button
          type="button"
          onClick={openCreateModal}
          className="ml-auto inline-flex items-center gap-2 bg-signal px-4 py-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
        >
          <span aria-hidden="true">+</span> Create Mock API
        </button>
      </div>

      {actionError && (
        <p role="alert" className="mt-4 border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}
      {listError && (
        <p role="alert" className="mt-4 border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700">
          {listError}
        </p>
      )}
      {generationSuccess && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-green-600/25 bg-green-50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">
              {generationSuccess.name} is ready.
            </p>
            <p className="mt-1 break-all font-mono text-xs text-green-800/80">
              {generationSuccess.baseUrl}
            </p>
            <p className="mt-1 text-xs text-green-800/70">
              Selected count: {generationSuccess.recordCount}. Choose an
              endpoint below to generate a complete URL and adjust its record
              count.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard
                .writeText(generationSuccess.baseUrl)
                .catch(() => setActionError("Could not copy the Mock API URL."));
            }}
            className="shrink-0 border border-green-700/25 bg-white px-3 py-2 text-xs font-semibold text-green-800 hover:bg-green-100"
          >
            Copy base URL
          </button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="border border-ink/10 px-5 py-8 text-center text-sm text-ink/60">
            Loading Mock APIs…
          </p>
        ) : mockApis.length === 0 ? (
          <div className="border border-dashed border-ink/20 px-5 py-12 text-center">
            <h3 className="font-display text-lg font-semibold text-ink">
              No Mock APIs yet
            </h3>
            <p className="mt-2 text-sm text-ink/60">
              Import an OpenAPI file to preview its endpoints and get started.
            </p>
          </div>
        ) : (
          mockApis.map((mockApi) => {
            const baseUrl = `${API_BASE_URL}/mock/${mockApi.token}`;
            const isActive = mockApi.status === "active";
            const endpoints = mockApi.endpoints || [];
            const selectedEndpoint =
              endpoints.find((endpoint) => endpoint.id === selectedEndpointIds[mockApi.id]) ||
              endpoints[0];
            const countValue = endpointCounts[mockApi.id] ?? "20";
            const endpointUrl = getEndpointUrl(
              mockApi,
              selectedEndpoint,
              countValue,
              pathParameterValues,
            );
            const endpointSearch = selectedEndpoint && endpointUrl
              ? new URLSearchParams({
                  mock_method: selectedEndpoint.method,
                  mock_url: endpointUrl,
                }).toString()
              : "";
            return (
              <article
                key={mockApi.id}
                className="border border-ink/10 bg-white p-5 transition-colors hover:border-ink/25 sm:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-lg font-semibold text-ink">
                        {mockApi.name}
                      </h3>
                      <span
                        className={`border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase ${
                          isActive
                            ? "border-green-600/30 bg-green-50 text-green-700"
                            : "border-ink/15 bg-cloud text-ink/55"
                        }`}
                      >
                        {mockApi.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-ink/60 sm:grid-cols-3">
                      <span>
                        Endpoints: <strong className="font-semibold text-ink/75">{mockApi.endpoint_count ?? endpoints.length}</strong>
                      </span>
                      <span>
                        Created: <strong className="font-semibold text-ink/75">{formatDate(mockApi.created_at)}</strong>
                      </span>
                      <span className="truncate font-mono" title={baseUrl}>
                        {baseUrl}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMock(mockApi)}
                      className="border border-ink/20 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-cloud"
                    >
                      View
                    </button>
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => performMockAction(mockApi, "stop")}
                        disabled={pendingAction === `stop-${mockApi.id}`}
                        className="border border-ink/20 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-cloud disabled:opacity-50"
                      >
                        Stop
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete "${mockApi.name}"?`)) {
                          performMockAction(mockApi, "delete");
                        }
                      }}
                      disabled={pendingAction === `delete-${mockApi.id}`}
                      className="border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-5 border-t border-ink/10 pt-4">
                  {endpoints.length ? (
                    <>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
                        Endpoints
                      </p>
                      <ul className="mb-4 grid gap-2 text-xs sm:grid-cols-2">
                        {endpoints.map((endpoint) => (
                          <li key={endpoint.id} className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-signal">{endpoint.method}</span>
                            <code className="break-all text-ink">{endpoint.path}</code>
                          </li>
                        ))}
                      </ul>
                      <div className="grid gap-3 border border-ink/10 bg-cloud/50 p-3 lg:grid-cols-[minmax(180px,0.8fr)_minmax(0,1fr)]">
                        <label className="text-xs font-semibold text-ink/70">
                          Select endpoint
                          <select
                            value={selectedEndpoint.id}
                            onChange={(event) =>
                              setSelectedEndpointIds((current) => ({
                                ...current,
                                [mockApi.id]: Number(event.target.value),
                              }))
                            }
                            className="mt-1 block w-full border border-ink/20 bg-white px-2.5 py-2 font-mono text-xs text-ink"
                          >
                            {endpoints.map((endpoint) => (
                              <option key={endpoint.id} value={endpoint.id}>
                                {endpoint.method} {endpoint.path}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="min-w-0">
                          {selectedEndpoint.is_array && (
                            <label className="block max-w-40 text-xs font-semibold text-ink/70">
                              Number of records
                              <input
                                type="number"
                                min="1"
                                max={MAX_RECORD_COUNT}
                                step="1"
                                value={countValue}
                                onChange={(event) =>
                                  setEndpointCounts((current) => ({
                                    ...current,
                                    [mockApi.id]: event.target.value,
                                  }))
                                }
                                className="mt-1 block w-full border border-ink/20 bg-white px-2.5 py-2 font-mono text-xs text-ink"
                              />
                            </label>
                          )}
                          {getPathParameters(selectedEndpoint.path).map((parameter) => (
                            <label key={parameter} className="mt-2 block max-w-60 text-xs font-semibold text-ink/70">
                              Path parameter: {parameter}
                              <input
                                type="text"
                                value={pathParameterValues[selectedEndpoint.id]?.[parameter] ?? "1"}
                                onChange={(event) =>
                                  setPathParameterValues((current) => ({
                                    ...current,
                                    [selectedEndpoint.id]: {
                                      ...current[selectedEndpoint.id],
                                      [parameter]: event.target.value,
                                    },
                                  }))
                                }
                                className="mt-1 block w-full border border-ink/20 bg-white px-2.5 py-2 font-mono text-xs text-ink"
                              />
                            </label>
                          ))}
                          {selectedEndpoint.is_array && !endpointUrl && (
                            <p role="alert" className="mt-2 text-xs text-red-700">
                              Enter a whole number between 1 and {MAX_RECORD_COUNT}.
                            </p>
                          )}
                          <p className="mt-2 break-all font-mono text-xs text-ink/75">
                            {endpointUrl || "Enter a valid record count to generate the URL."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => copyMockUrl(mockApi, endpointUrl)}
                              disabled={!endpointUrl}
                              className="border border-ink/20 bg-white px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-cloud disabled:opacity-40"
                            >
                              {copiedMockId === mockApi.id ? "Copied" : "Copy URL"}
                            </button>
                            <Link
                              to={endpointSearch ? `/testspace?${endpointSearch}` : "/testspace"}
                              className={`border border-ink/20 bg-white px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-cloud ${
                                !endpointUrl ? "pointer-events-none opacity-40" : ""
                              }`}
                              aria-disabled={!endpointUrl}
                              onClick={(event) => {
                                if (!endpointUrl) event.preventDefault();
                              }}
                            >
                              Test in TestSpace
                            </Link>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-ink/55">No stored endpoints.</p>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink/50 px-4 py-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-mock-title"
            className="my-auto w-full max-w-3xl border border-ink/10 bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-ink/10 px-5 py-4 sm:px-7">
              <div>
                <h2 id="create-mock-title" className="font-display text-xl font-bold text-ink">
                  Create Mock API
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  Set up a mock from an OpenAPI document or configure it manually.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="px-2 text-xl leading-none text-ink/50 hover:text-ink"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-5 sm:px-7">
              <div className="flex border-b border-ink/10">
                {[
                  ["import", "Import OpenAPI / Swagger"],
                  ["manual", "Manual"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      setModalMessage("");
                    }}
                    className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                      mode === value
                        ? "border-signal text-ink"
                        : "border-transparent text-ink/50 hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_190px]">
                <label className="block text-sm font-semibold text-ink">
                  API name
                  <input
                    type="text"
                    value={apiName}
                    onChange={(event) => setApiName(event.target.value)}
                    placeholder={mode === "import" ? "Filled from the OpenAPI title" : "Give your Mock API a name"}
                    className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-signal"
                  />
                </label>
                <label className="block text-sm font-semibold text-ink">
                  Number of records
                  <input
                    type="number"
                    min="1"
                    max={MAX_RECORD_COUNT}
                    step="1"
                    value={recordCount}
                    onChange={(event) => setRecordCount(event.target.value)}
                    aria-describedby="record-count-help"
                    className="mt-1.5 w-full border border-ink/20 px-3 py-2.5 text-sm font-normal outline-none focus:border-signal"
                  />
                  <span id="record-count-help" className="mt-1 block text-xs font-normal text-ink/50">
                    Choose 1–{MAX_RECORD_COUNT} records (for example 20, 100, or 500).
                  </span>
                </label>
              </div>

              {mode === "import" ? (
                <div className="mt-5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.yaml,.yml,application/json,text/yaml"
                    className="sr-only"
                    onChange={(event) => acceptFile(event.target.files?.[0])}
                  />
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    className={`border border-dashed px-5 py-8 text-center transition-colors ${
                      isDragging ? "border-signal bg-signal/5" : "border-ink/25 bg-cloud"
                    }`}
                  >
                    <p className="text-sm font-semibold text-ink">
                      Drop an OpenAPI file here
                    </p>
                    <p className="mt-1 text-xs text-ink/55">
                      JSON or YAML files (.json, .yaml, .yml)
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 border border-ink/20 bg-white px-4 py-2 text-xs font-semibold text-ink hover:bg-cloud"
                    >
                      Choose file
                    </button>
                  </div>
                  {selectedFile && (
                    <p className="mt-2 text-xs text-ink/65">
                      Selected: <span className="font-mono">{selectedFile.name}</span>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={previewOpenApi}
                    disabled={!selectedFile || !isCountValid || isPreviewing}
                    className="mt-4 bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isPreviewing ? "Uploading…" : "Upload and preview"}
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-ink/10 pb-2.5">
                    <div>
                      <h3 className="font-display text-sm font-bold text-ink">
                        Endpoints ({manualEndpoints.length})
                      </h3>
                      <p className="text-xs text-ink/60">
                        Configure HTTP method, path, status, and response schema.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addManualEndpoint}
                      className="border border-ink/20 bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-cloud"
                    >
                      + Add Endpoint
                    </button>
                  </div>

                  <div className="max-h-[380px] space-y-4 overflow-y-auto pr-1">
                    {manualEndpoints.map((ep, idx) => (
                      <div
                        key={ep.id}
                        className="border border-ink/15 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between border-b border-ink/10 pb-2.5">
                          <span className="font-mono text-xs font-bold text-signal">
                            Endpoint #{idx + 1}
                          </span>
                          {manualEndpoints.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeManualEndpoint(ep.id)}
                              className="text-xs font-semibold text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {/* Method, Path, Status Code */}
                        <div className="mt-3 grid gap-3 sm:grid-cols-[100px_minmax(0,1fr)_90px]">
                          <label className="block text-xs font-semibold text-ink">
                            Method
                            <select
                              value={ep.method}
                              onChange={(e) =>
                                updateManualEndpoint(ep.id, {
                                  method: e.target.value,
                                })
                              }
                              className="mt-1 w-full border border-ink/20 bg-white px-2 py-1.5 font-mono text-xs font-bold text-ink outline-none focus:border-signal"
                            >
                              {["GET", "POST", "PUT", "PATCH", "DELETE"].map(
                                (m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          <label className="block text-xs font-semibold text-ink">
                            Path
                            <input
                              type="text"
                              value={ep.path}
                              onChange={(e) =>
                                updateManualEndpoint(ep.id, {
                                  path: e.target.value,
                                })
                              }
                              placeholder="/users or /items/{id}"
                              className="mt-1 w-full border border-ink/20 px-2.5 py-1.5 font-mono text-xs outline-none focus:border-signal"
                            />
                          </label>

                          <label className="block text-xs font-semibold text-ink">
                            Status
                            <input
                              type="number"
                              value={ep.status_code}
                              onChange={(e) =>
                                updateManualEndpoint(ep.id, {
                                  status_code: e.target.value,
                                })
                              }
                              className="mt-1 w-full border border-ink/20 px-2.5 py-1.5 font-mono text-xs outline-none focus:border-signal"
                            />
                          </label>
                        </div>

                        {/* Response Schema Controls */}
                        <div className="mt-4 border-t border-ink/10 pt-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-ink">
                                Response Type:
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateManualEndpoint(ep.id, {
                                    response_type: "array",
                                  })
                                }
                                className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                                  ep.response_type === "array"
                                    ? "bg-ink text-white"
                                    : "border border-ink/20 bg-cloud text-ink/70 hover:text-ink"
                                }`}
                              >
                                Array of Items
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateManualEndpoint(ep.id, {
                                    response_type: "object",
                                  })
                                }
                                className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                                  ep.response_type === "object"
                                    ? "bg-ink text-white"
                                    : "border border-ink/20 bg-cloud text-ink/70 hover:text-ink"
                                }`}
                              >
                                Single Object
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                updateManualEndpoint(ep.id, {
                                  is_raw_mode: !ep.is_raw_mode,
                                })
                              }
                              className="text-xs text-signal underline hover:opacity-85"
                            >
                              {ep.is_raw_mode
                                ? "Use Field Builder"
                                : "Edit Raw JSON / Schema"}
                            </button>
                          </div>

                          {/* Field Builder */}
                          {!ep.is_raw_mode ? (
                            <div className="mt-3 space-y-2 bg-cloud p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/60">
                                  Response Fields
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addFieldToEndpoint(ep.id)}
                                  className="text-xs font-semibold text-ink hover:underline"
                                >
                                  + Add Field
                                </button>
                              </div>

                              {ep.fields.map((f) => (
                                <div
                                  key={f.id}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="text"
                                    value={f.name}
                                    onChange={(e) =>
                                      updateEndpointField(ep.id, f.id, {
                                        name: e.target.value,
                                      })
                                    }
                                    placeholder="Field name (e.g. id, title)"
                                    className="flex-1 border border-ink/20 bg-white px-2.5 py-1 text-xs font-mono outline-none focus:border-signal"
                                  />
                                  <select
                                    value={f.type}
                                    onChange={(e) =>
                                      updateEndpointField(ep.id, f.id, {
                                        type: e.target.value,
                                      })
                                    }
                                    className="w-32 border border-ink/20 bg-white px-2 py-1 text-xs font-semibold outline-none focus:border-signal"
                                  >
                                    <option value="string">string</option>
                                    <option value="integer">integer</option>
                                    <option value="number">number</option>
                                    <option value="boolean">boolean</option>
                                    <option value="email">email</option>
                                    <option value="phone">phone</option>
                                    <option value="uuid">uuid</option>
                                    <option value="date">date</option>
                                    <option value="date-time">date-time</option>
                                  </select>
                                  {ep.fields.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeFieldFromEndpoint(ep.id, f.id)
                                      }
                                      className="px-1.5 text-xs text-red-600 hover:text-red-800"
                                      title="Remove field"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3">
                              <textarea
                                rows={4}
                                value={ep.raw_json}
                                onChange={(e) =>
                                  updateManualEndpoint(ep.id, {
                                    raw_json: e.target.value,
                                  })
                                }
                                placeholder='Enter JSON schema: {"type": "object", "properties": {"title": {"type": "string"}}}'
                                className="w-full border border-ink/20 p-2 font-mono text-xs outline-none focus:border-signal"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isCountValid && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  Enter a whole number between 1 and {MAX_RECORD_COUNT}.
                </p>
              )}
              {modalMessage && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {modalMessage}
                </p>
              )}
              {renderPreviewTable()}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
                <p className="text-xs text-ink/50">
                  {mode === "import"
                    ? "Upload the file again on generate; the server validates and parses it before saving."
                    : "Creates a mock API with live endpoints following your configured routes and schemas."}
                </p>
                <button
                  type="button"
                  onClick={
                    mode === "import" ? generateMockApi : generateManualMockApi
                  }
                  disabled={
                    mode === "import"
                      ? !selectedFile ||
                        !preview ||
                        !isCountValid ||
                        isGenerating
                      : !apiName.trim() ||
                        manualEndpoints.length === 0 ||
                        isGenerating
                  }
                  className="bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isGenerating ? "Generating…" : "Generate Mock API"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedMock && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 px-4 py-8">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mock-details-title"
            className="w-full max-w-xl border border-ink/10 bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="mock-details-title" className="font-display text-xl font-bold text-ink">
                  {selectedMock.name}
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  Created {formatDate(selectedMock.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMock(null)}
                aria-label="Close details"
                className="px-2 text-xl leading-none text-ink/50 hover:text-ink"
              >
                ×
              </button>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink/45">Status</dt>
                <dd className="mt-1 text-ink">{selectedMock.status}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink/45">Base URL</dt>
                <dd className="mt-1 break-all font-mono text-xs text-ink">
                  {API_BASE_URL}/mock/{selectedMock.token}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink/45">Endpoint count</dt>
                <dd className="mt-1 text-ink">{selectedMock.endpoint_count ?? selectedMock.endpoints?.length ?? 0}</dd>
              </div>
            </dl>
            {selectedMock.endpoints?.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-xs">
                {selectedMock.endpoints.map((endpoint) => (
                  <li key={endpoint.id} className="flex gap-2 font-mono">
                    <span className="font-bold text-signal">{endpoint.method}</span>
                    <code className="break-all text-ink">{endpoint.path}</code>
                    <span className="ml-auto shrink-0 text-ink/50">{endpoint.status_code}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMock(null)}
                className="border border-ink/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-cloud"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
