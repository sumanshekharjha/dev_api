import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const METHOD_COLORS = {
  GET: "text-emerald-700 bg-emerald-50 border-emerald-300",
  POST: "text-amber-700 bg-amber-50 border-amber-300",
  PUT: "text-blue-700 bg-blue-50 border-blue-300",
  PATCH: "text-purple-700 bg-purple-50 border-purple-300",
  DELETE: "text-rose-700 bg-rose-50 border-rose-300",
};

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "0 B";
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateString;
  }
}

export default function TestSpaceSection({ showHeading = true }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("access_token");
  const routeApiId = searchParams.get("api_id");
  const routeMockUrl = searchParams.get("mock_url");
  const routeMockMethod = searchParams.get("mock_method");

  // Auth redirect helper
  const handleAuthError = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    navigate("/login");
  }, [navigate]);

  // Sidebar Tab: "collections" or "history"
  const [sidebarTab, setSidebarTab] = useState("collections");
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Collections state
  const [collections, setCollections] = useState([]);
  const [collectionRequests, setCollectionRequests] = useState({});
  const [expandedCollections, setExpandedCollections] = useState({});
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true);

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Active saved request info
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [selectedApi, setSelectedApi] = useState(null);
  const [apiLoadMessage, setApiLoadMessage] = useState("");
  const [apiCredentialNotice, setApiCredentialNotice] = useState("");

  // Request Editor State
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [activeRequestTab, setActiveRequestTab] = useState("params");

  // Params rows: [{ id, key, value, enabled }]
  const [paramsList, setParamsList] = useState([
    { id: 1, key: "", value: "", enabled: true },
  ]);

  // Headers rows: [{ id, key, value, enabled }]
  const [headersList, setHeadersList] = useState([
    { id: 1, key: "", value: "", enabled: true },
  ]);

  // Authorization state
  const [authType, setAuthType] = useState("no_auth");
  const [bearerToken, setBearerToken] = useState("");
  const [apiKeyData, setApiKeyData] = useState({
    key: "X-API-Key",
    value: "",
    addTo: "header",
  });
  const [basicAuthData, setBasicAuthData] = useState({
    username: "",
    password: "",
  });

  // Body state (for POST/PUT/PATCH)
  const [bodyContent, setBodyContent] = useState("");

  // Execution & Response State
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState(null);
  const [activeResponseTab, setActiveResponseTab] = useState("body");
  const [validationError, setValidationError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  // New Collection Modal State
  const [isNewColModalOpen, setIsNewColModalOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [isCreatingCol, setIsCreatingCol] = useState(false);
  const [newColError, setNewColError] = useState("");

  // Save Request Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveRequestName, setSaveRequestName] = useState("");
  const [saveTargetColId, setSaveTargetColId] = useState("");
  const [isSavingRequest, setIsSavingRequest] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  // =========================================================
  // 1. DATA FETCHING (Collections & History)
  // =========================================================

  // Fetch Collections
  const fetchCollections = useCallback(async () => {
    if (!token) return;
    setIsCollectionsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/collections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleAuthError();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setCollections(data);

        // Fetch requests for each collection
        data.forEach((col) => {
          fetchCollectionRequests(col.id);
        });
      }
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    } finally {
      setIsCollectionsLoading(false);
    }
  }, [token, handleAuthError]);

  // Fetch requests for a single collection
  const fetchCollectionRequests = async (colId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/collections/${colId}/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCollectionRequests((prev) => ({ ...prev, [colId]: data }));
      }
    } catch (err) {
      console.error(`Failed to fetch requests for collection ${colId}:`, err);
    }
  };

  // Fetch Request History
  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/history?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleAuthError();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [token, handleAuthError]);

  // Initial load
  useEffect(() => {
    fetchCollections();
    fetchHistory();
  }, [fetchCollections, fetchHistory]);

  // Loading an API is deliberately configuration-only: it never sends a request
  // and credentials remain entirely on the server.
  useEffect(() => {
    if (!routeApiId || !token) {
      setSelectedApi(null);
      setApiLoadMessage("");
      setApiCredentialNotice("");
      return;
    }

    let isCurrent = true;
    async function loadSelectedApi() {
      setApiLoadMessage("");
      setApiCredentialNotice("");
      try {
        const res = await fetch(`${API_BASE_URL}/apis/${routeApiId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        if (!res.ok) {
          if (isCurrent) {
            setSelectedApi(null);
            setApiLoadMessage("The selected API was not found.");
          }
          return;
        }
        const api = await res.json();
        if (!isCurrent) return;
        setSelectedApi(api);
        setUrl(api.base_url || "");
        setAuthType(["api_key", "bearer", "basic"].includes(api.auth_type) ? api.auth_type : "no_auth");
        const credentialType = { api_key: "api_key", bearer: "bearer_token", basic: "basic_auth" }[api.auth_type];
        if (credentialType) {
          const credentialsRes = await fetch(`${API_BASE_URL}/apis/${routeApiId}/credentials`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (credentialsRes.ok && isCurrent) {
            const credentials = (await credentialsRes.json()).filter((credential) => credential.type === credentialType);
            const validCredentials = credentials.filter((credential) =>
              !credential.expires_at || new Date(credential.expires_at) > new Date()
            );
            setApiCredentialNotice(
              validCredentials.length > 1
                ? "Multiple saved credentials match this API. Enter authentication manually."
                : validCredentials.length === 0 && credentials.some((credential) => credential.expires_at)
                ? "The saved credential has expired. Enter authentication manually."
                : ""
            );
          }
        }
      } catch (err) {
        if (isCurrent) setApiLoadMessage("Could not load the selected API.");
      }
    }
    loadSelectedApi();
    return () => { isCurrent = false; };
  }, [routeApiId, token, handleAuthError]);

  useEffect(() => {
    if (!routeMockUrl) return;
    setSelectedApi(null);
    setSelectedRequestId(null);
    setSelectedCollectionId(null);
    setUrl(routeMockUrl);
    setMethod(HTTP_METHODS.includes(routeMockMethod) ? routeMockMethod : "GET");
    setAuthType("no_auth");
    setBearerToken("");
    setApiKeyData({ key: "X-API-Key", value: "", addTo: "header" });
    setBasicAuthData({ username: "", password: "" });
    setHeadersList([{ id: 1, key: "", value: "", enabled: true }]);
    setParamsList([{ id: 1, key: "", value: "", enabled: true }]);
    setBodyContent("");
    setApiCredentialNotice("");
    setValidationError("");
  }, [routeMockUrl, routeMockMethod]);

  // =========================================================
  // 2. TOGGLE ACCORDIONS & SELECTION
  // =========================================================

  const toggleCollectionExpand = (colId) => {
    setExpandedCollections((prev) => ({
      ...prev,
      [colId]: !prev[colId],
    }));
    if (!collectionRequests[colId]) {
      fetchCollectionRequests(colId);
    }
  };

  // Load saved request into editor
  const handleSelectSavedRequest = async (savedReq) => {
    setSelectedRequestId(savedReq.id);
    setSelectedCollectionId(savedReq.collection_id);
    if (savedReq.api_id) {
      try {
        const res = await fetch(`${API_BASE_URL}/apis/${savedReq.api_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedApi(res.ok ? await res.json() : null);
      } catch {
        setSelectedApi(null);
      }
    } else {
      setSelectedApi(null);
      setApiCredentialNotice("");
    }
    setMethod(savedReq.method || "GET");
    setUrl(savedReq.url || "");

    // Populate params
    if (savedReq.params && typeof savedReq.params === "object" && Object.keys(savedReq.params).length > 0) {
      const rows = Object.entries(savedReq.params).map(([key, value], idx) => ({
        id: idx + 1,
        key,
        value: String(value),
        enabled: true,
      }));
      setParamsList(rows);
    } else {
      setParamsList([{ id: 1, key: "", value: "", enabled: true }]);
    }

    // Populate headers
    if (savedReq.headers && typeof savedReq.headers === "object" && Object.keys(savedReq.headers).length > 0) {
      const rows = Object.entries(savedReq.headers).map(([key, value], idx) => ({
        id: idx + 1,
        key,
        value: String(value),
        enabled: true,
      }));
      setHeadersList(rows);
    } else {
      setHeadersList([{ id: 1, key: "", value: "", enabled: true }]);
    }

    // Populate auth
    if (savedReq.auth && typeof savedReq.auth === "object") {
      const reqAuthType = savedReq.auth.auth_type || "no_auth";
      const reqAuthData = savedReq.auth.auth_data || {};
      setAuthType(reqAuthType);

      if (reqAuthType === "bearer") {
        setBearerToken(typeof reqAuthData === "string" ? reqAuthData : reqAuthData.token || "");
      } else if (reqAuthType === "api_key") {
        setApiKeyData({
          key: reqAuthData.key || "X-API-Key",
          value: reqAuthData.value || "",
          addTo: reqAuthData.add_to || reqAuthData.addTo || "header",
        });
      } else if (reqAuthType === "basic") {
        setBasicAuthData({
          username: reqAuthData.username || "",
          password: reqAuthData.password || "",
        });
      }
    } else {
      setAuthType("no_auth");
    }

    // Populate body
    if (savedReq.body) {
      if (typeof savedReq.body === "object") {
        setBodyContent(JSON.stringify(savedReq.body, null, 2));
      } else {
        setBodyContent(String(savedReq.body));
      }
    } else {
      setBodyContent("");
    }

    setValidationError("");
  };

  // Load history item into editor
  const handleSelectHistoryItem = (item) => {
    setMethod(item.method || "GET");
    setUrl(item.url || "");
    setSelectedRequestId(item.request_id || null);
    setValidationError("");
  };

  // =========================================================
  // 3. ROW EDITING (Params & Headers)
  // =========================================================

  const addParamRow = () => {
    setParamsList((prev) => [
      ...prev,
      { id: Date.now(), key: "", value: "", enabled: true },
    ]);
  };

  const updateParamRow = (id, field, value) => {
    setParamsList((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const removeParamRow = (id) => {
    if (paramsList.length === 1) {
      setParamsList([{ id: Date.now(), key: "", value: "", enabled: true }]);
      return;
    }
    setParamsList((prev) => prev.filter((row) => row.id !== id));
  };

  const addHeaderRow = () => {
    setHeadersList((prev) => [
      ...prev,
      { id: Date.now(), key: "", value: "", enabled: true },
    ]);
  };

  const updateHeaderRow = (id, field, value) => {
    setHeadersList((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const removeHeaderRow = (id) => {
    if (headersList.length === 1) {
      setHeadersList([{ id: Date.now(), key: "", value: "", enabled: true }]);
      return;
    }
    setHeadersList((prev) => prev.filter((row) => row.id !== id));
  };

  // =========================================================
  // 4. EXECUTE REQUEST (SEND)
  // =========================================================

  const handleSendRequest = async () => {
    setValidationError("");

    if (!url.trim()) {
      setValidationError("Please enter a valid target URL");
      return;
    }

    // Validate JSON body if method has payload
    let parsedBody = null;
    if (["POST", "PUT", "PATCH"].includes(method) && bodyContent.trim()) {
      try {
        parsedBody = JSON.parse(bodyContent);
      } catch (err) {
        setValidationError(`Invalid JSON in request body: ${err.message}`);
        setActiveRequestTab("body");
        return;
      }
    }

    // Prepare query params object
    const queryParamsObj = {};
    paramsList.forEach((row) => {
      if (row.enabled && row.key.trim()) {
        queryParamsObj[row.key.trim()] = row.value;
      }
    });

    // Prepare headers object
    const headersObj = {};
    headersList.forEach((row) => {
      if (row.enabled && row.key.trim()) {
        headersObj[row.key.trim()] = row.value;
      }
    });

    // Prepare auth data
    let authDataPayload = null;
    let effectiveAuthType = authType;

    if (authType === "bearer") {
      authDataPayload = { token: bearerToken.trim() };
    } else if (authType === "api_key") {
      authDataPayload = {
        key: apiKeyData.key.trim(),
        value: apiKeyData.value.trim(),
        add_to: apiKeyData.addTo,
      };
    } else if (authType === "basic") {
      authDataPayload = {
        username: basicAuthData.username.trim(),
        password: basicAuthData.password,
      };
    } else {
      effectiveAuthType = "none";
    }

    setIsSending(true);
    setResponse(null);

    try {
      const res = await fetch(`${API_BASE_URL}/test/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method,
          url: url.trim(),
          query_params: Object.keys(queryParamsObj).length > 0 ? queryParamsObj : null,
          headers: Object.keys(headersObj).length > 0 ? headersObj : null,
          auth_type: effectiveAuthType,
          auth_data: authDataPayload,
          body: parsedBody,
          collection_id: selectedCollectionId || null,
          api_id: selectedApi?.id || null,
          request_id: selectedRequestId || null,
        }),
      });

      if (res.status === 401) {
        handleAuthError();
        return;
      }

      const data = await res.json();
      setResponse(data);
      setActiveResponseTab("body");

      // Refresh history list so the new test immediately appears
      fetchHistory();
    } catch (err) {
      console.error("Test execution failed:", err);
      setResponse({
        status_code: 0,
        headers: {},
        body: { error: `Request failed: ${err.message}` },
        time_ms: 0,
        size_bytes: 0,
        error: `Request failed: ${err.message}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Copy response body
  const handleCopyResponseBody = () => {
    if (!response || !response.body) return;
    const textToCopy =
      typeof response.body === "object"
        ? JSON.stringify(response.body, null, 2)
        : String(response.body);

    navigator.clipboard.writeText(textToCopy);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // =========================================================
  // 5. NEW COLLECTION CREATION
  // =========================================================

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newColName.trim()) {
      setNewColError("Collection name is required");
      return;
    }

    setIsCreatingCol(true);
    setNewColError("");

    try {
      const res = await fetch(`${API_BASE_URL}/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newColName.trim(),
          description: newColDesc.trim() || null,
        }),
      });

      if (res.status === 401) {
        handleAuthError();
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        setNewColError(errData.detail || "Failed to create collection");
        return;
      }

      const created = await res.json();
      setNewColName("");
      setNewColDesc("");
      setIsNewColModalOpen(false);

      await fetchCollections();
      setExpandedCollections((prev) => ({ ...prev, [created.id]: true }));
      setSelectedCollectionId(created.id);
    } catch (err) {
      console.error("Error creating collection:", err);
      setNewColError("An error occurred while creating collection");
    } finally {
      setIsCreatingCol(false);
    }
  };

  // =========================================================
  // 6. SAVE REQUEST TO COLLECTION
  // =========================================================

  const handleOpenSaveModal = () => {
    setSaveErrorMessage("");
    setSaveSuccessMessage("");

    if (collections.length === 0) {
      setSaveErrorMessage("No collections found. Please create a collection first.");
      setSaveTargetColId("");
    } else {
      setSaveTargetColId(selectedCollectionId || collections[0].id);
    }

    if (!saveRequestName) {
      try {
        const parsed = new URL(url);
        const pathPart = parsed.pathname.split("/").filter(Boolean).pop() || "request";
        setSaveRequestName(`${method} ${pathPart}`);
      } catch {
        setSaveRequestName(`${method} Request`);
      }
    }

    setIsSaveModalOpen(true);
  };

  const handleSaveRequestSubmit = async (e) => {
    e.preventDefault();
    if (!saveTargetColId) {
      setSaveErrorMessage("Select a collection first.");
      return;
    }
    if (!saveRequestName.trim()) {
      setSaveErrorMessage("Request name is required");
      return;
    }

    let parsedBody = null;
    if (["POST", "PUT", "PATCH"].includes(method) && bodyContent.trim()) {
      try {
        parsedBody = JSON.parse(bodyContent);
      } catch (err) {
        setSaveErrorMessage(`Invalid JSON body: ${err.message}`);
        return;
      }
    }

    const queryParamsObj = {};
    paramsList.forEach((row) => {
      if (row.enabled && row.key.trim()) {
        queryParamsObj[row.key.trim()] = row.value;
      }
    });

    const headersObj = {};
    headersList.forEach((row) => {
      if (row.enabled && row.key.trim()) {
        headersObj[row.key.trim()] = row.value;
      }
    });

    setIsSavingRequest(true);
    setSaveErrorMessage("");

    try {
      const payload = {
        name: saveRequestName.trim(),
        method,
        url: url.trim(),
        collection_id: Number(saveTargetColId),
        api_id: selectedApi?.id || null,
        params: Object.keys(queryParamsObj).length > 0 ? queryParamsObj : null,
        headers: Object.keys(headersObj).length > 0 ? headersObj : null,
        auth: {
          auth_type: authType,
        },
        body: parsedBody,
      };

      const res = await fetch(`${API_BASE_URL}/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        handleAuthError();
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        setSaveErrorMessage(errData.detail || "Failed to save request");
        return;
      }

      const savedData = await res.json();
      setSelectedRequestId(savedData.id);
      setSelectedCollectionId(savedData.collection_id);

      await fetchCollectionRequests(savedData.collection_id);
      setExpandedCollections((prev) => ({ ...prev, [savedData.collection_id]: true }));

      setIsSaveModalOpen(false);
      setSaveSuccessMessage(`Request "${savedData.name}" saved successfully!`);
      setTimeout(() => setSaveSuccessMessage(""), 4000);
    } catch (err) {
      console.error("Save request error:", err);
      setSaveErrorMessage("Failed to save request");
    } finally {
      setIsSavingRequest(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Notifications / Success Message */}
      {saveSuccessMessage && (
        <div className="flex items-center justify-between border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
          <span>✓ {saveSuccessMessage}</span>
          <button
            type="button"
            onClick={() => setSaveSuccessMessage("")}
            className="text-emerald-700 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {validationError && (
        <div className="flex items-center justify-between border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800">
          <span>⚠️ {validationError}</span>
          <button
            type="button"
            onClick={() => setValidationError("")}
            className="text-rose-700 hover:text-rose-900"
          >
            ✕
          </button>
        </div>
      )}

      {apiLoadMessage && (
        <div className="border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          {apiLoadMessage}
        </div>
      )}

      {response?.auth_notice && (
        <div className="border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          {response.auth_notice}
        </div>
      )}

      {apiCredentialNotice && !response?.auth_notice && (
        <div className="border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          {apiCredentialNotice}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* =========================================================
            LEFT SIDEBAR: Collections & History
            ========================================================= */}
        <aside className="w-full shrink-0 border border-ink/15 bg-white lg:w-80">
          {/* Mobile Collapse Toggle */}
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3 lg:hidden">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
              Workspace Navigator
            </span>
            <button
              type="button"
              onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
              className="border border-ink/20 bg-cloud px-2.5 py-1 text-xs font-semibold text-ink"
            >
              {isSidebarOpenMobile ? "Hide Sidebar ▲" : "Show Sidebar ▼"}
            </button>
          </div>

          <div className={`${isSidebarOpenMobile ? "block" : "hidden"} lg:block`}>
            {/* Sidebar Tab Header */}
            <div className="flex border-b border-ink/10 bg-cloud font-mono text-xs">
              <button
                type="button"
                onClick={() => setSidebarTab("collections")}
                className={`flex-1 py-3 text-center font-semibold transition-colors ${
                  sidebarTab === "collections"
                    ? "border-b-2 border-signal bg-white text-ink"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                Collections ({collections.length})
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("history")}
                className={`flex-1 py-3 text-center font-semibold transition-colors ${
                  sidebarTab === "history"
                    ? "border-b-2 border-signal bg-white text-ink"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                History ({historyList.length})
              </button>
            </div>

            {/* TAB CONTENT: COLLECTIONS */}
            {sidebarTab === "collections" && (
              <div className="p-3">
                {/* New Collection Button */}
                <button
                  type="button"
                  onClick={() => {
                    setNewColError("");
                    setIsNewColModalOpen(true);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 border border-dashed border-ink/30 bg-cloud py-2 font-mono text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-white"
                >
                  <span className="text-sm font-bold text-signal">+</span>
                  New Collection
                </button>

                {/* Collections List */}
                <div className="mt-3 space-y-2 max-h-[560px] overflow-y-auto pr-1">
                  {isCollectionsLoading ? (
                    <div className="py-8 text-center font-mono text-xs text-ink/40">
                      Loading collections...
                    </div>
                  ) : collections.length === 0 ? (
                    <div className="border border-dashed border-ink/15 p-4 text-center">
                      <p className="font-mono text-xs text-ink/60">
                        No collections yet.
                      </p>
                      <p className="mt-1 text-xs text-ink/40">
                        Create one to save and organize requests.
                      </p>
                    </div>
                  ) : (
                    collections.map((col) => {
                      const isExpanded = !!expandedCollections[col.id];
                      const reqs = collectionRequests[col.id] || [];

                      return (
                        <div
                          key={col.id}
                          className="border border-ink/10 bg-white"
                        >
                          {/* Collection Header */}
                          <div
                            onClick={() => toggleCollectionExpand(col.id)}
                            className="flex cursor-pointer items-center justify-between px-3 py-2.5 transition-colors hover:bg-cloud"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="text-xs text-ink/50">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                              <span className="truncate font-mono text-xs font-semibold text-ink">
                                📁 {col.name}
                              </span>
                            </div>
                            <span className="shrink-0 font-mono text-[10px] text-ink/40">
                              {reqs.length} req
                            </span>
                          </div>

                          {/* Expanded Requests List */}
                          {isExpanded && (
                            <div className="border-t border-ink/5 bg-cloud/50 pl-4 pr-2 py-1.5 space-y-1">
                              {reqs.length === 0 ? (
                                <p className="py-2 text-[11px] text-ink/40 italic">
                                  No saved requests yet
                                </p>
                              ) : (
                                reqs.map((savedReq) => {
                                  const isSelected = selectedRequestId === savedReq.id;
                                  return (
                                    <button
                                      key={savedReq.id}
                                      type="button"
                                      onClick={() => handleSelectSavedRequest(savedReq)}
                                      className={`flex w-full items-center justify-between px-2.5 py-1.5 text-left transition-colors ${
                                        isSelected
                                          ? "border-l-2 border-signal bg-white font-semibold text-ink shadow-sm"
                                          : "hover:bg-white/80 text-ink/75"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <span
                                          className={`px-1 py-0.5 font-mono text-[9px] font-bold border ${
                                            METHOD_COLORS[savedReq.method] || "text-ink bg-cloud border-ink/20"
                                          }`}
                                        >
                                          {savedReq.method}
                                        </span>
                                        <span className="truncate font-mono text-xs">
                                          {savedReq.name}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: HISTORY */}
            {sidebarTab === "history" && (
              <div className="p-3">
                <div className="flex items-center justify-between pb-2 border-b border-ink/10">
                  <span className="font-mono text-xs text-ink/50">
                    Recent Executions
                  </span>
                  <button
                    type="button"
                    onClick={fetchHistory}
                    className="font-mono text-[11px] text-ink/70 hover:text-ink underline"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-2 space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
                  {isHistoryLoading ? (
                    <div className="py-8 text-center font-mono text-xs text-ink/40">
                      Loading history...
                    </div>
                  ) : historyList.length === 0 ? (
                    <div className="border border-dashed border-ink/15 p-4 text-center">
                      <p className="font-mono text-xs text-ink/60">
                        No history logs yet.
                      </p>
                      <p className="mt-1 text-xs text-ink/40">
                        Send a request to see execution logs.
                      </p>
                    </div>
                  ) : (
                    historyList.map((hist) => {
                      const statusColor =
                        !hist.status_code || hist.status_code === 0
                          ? "text-rose-600 bg-rose-50 border-rose-200"
                          : hist.status_code < 400
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : "text-amber-700 bg-amber-50 border-amber-200";

                      return (
                        <div
                          key={hist.id}
                          onClick={() => handleSelectHistoryItem(hist)}
                          className="cursor-pointer border border-ink/10 bg-white p-2.5 transition-colors hover:border-ink/30 hover:bg-cloud"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`px-1.5 py-0.5 font-mono text-[9px] font-bold border ${
                                METHOD_COLORS[hist.method] || "text-ink bg-cloud border-ink/20"
                              }`}
                            >
                              {hist.method}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 font-mono text-[10px] font-semibold border ${statusColor}`}
                            >
                              {hist.status_code ? `${hist.status_code}` : "ERR"}
                            </span>
                          </div>

                          <div className="mt-1.5 truncate font-mono text-xs text-ink/80" title={hist.url}>
                            {hist.url}
                          </div>

                          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-ink/40">
                            <span>{hist.response_time !== null ? `${hist.response_time} ms` : "—"}</span>
                            <span>{formatDate(hist.created_at)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* =========================================================
            RIGHT MAIN AREA: Request Editor & Response Viewer
            ========================================================= */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* REQUEST EDITOR PANEL */}
          <div className="border border-ink/15 bg-white p-5 sm:p-6 shadow-sm">
            {selectedApi?.name && (
              <div className="mb-3.5 flex items-center justify-between border-b border-ink/10 pb-2.5 font-mono text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-ink/50">API:</span>
                  <span className="truncate font-bold text-ink">{selectedApi.name}</span>
                  <span className="truncate text-ink/60">{selectedApi.base_url}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedApi(null); setApiLoadMessage(""); setApiCredentialNotice(""); navigate("/testspace"); }}
                  className="shrink-0 text-[11px] text-ink/50 hover:text-ink"
                >
                  ✕ Unlink
                </button>
              </div>
            )}
            {/* Top Bar: Method, URL, Send, Save */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Method Selector */}
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="border border-ink/20 bg-cloud px-3 py-2.5 font-mono text-sm font-bold text-ink focus:border-ink focus:outline-none sm:w-28"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {/* URL Input */}
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/v1/users"
                className="flex-1 border border-ink/20 bg-white px-3.5 py-2.5 font-mono text-sm text-ink placeholder:text-ink/30 focus:border-ink focus:outline-none"
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendRequest}
                  disabled={isSending}
                  className="bg-signal px-6 py-2.5 font-mono text-xs font-bold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isSending ? "Sending..." : "SEND →"}
                </button>

                <button
                  type="button"
                  onClick={handleOpenSaveModal}
                  className="border border-ink/20 bg-cloud px-3.5 py-2.5 font-mono text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-white"
                  title="Save request to a collection"
                >
                  Save Request
                </button>
              </div>
            </div>

            {/* Request Configuration Tabs */}
            <div className="mt-6 flex border-b border-ink/10 font-mono text-xs text-ink/60">
              {["params", "headers", "auth", "body"].map((tab) => {
                const labels = {
                  params: `Params (${paramsList.filter((r) => r.enabled && r.key).length})`,
                  headers: `Headers (${headersList.filter((r) => r.enabled && r.key).length})`,
                  auth: `Authorization (${authType === "no_auth" ? "None" : authType})`,
                  body: "Body",
                };
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveRequestTab(tab)}
                    className={`-mb-px border-b-2 px-4 py-2.5 font-semibold transition-colors ${
                      activeRequestTab === tab
                        ? "border-signal text-ink"
                        : "border-transparent hover:text-ink"
                    }`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: PARAMS */}
            {activeRequestTab === "params" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-ink/50 font-mono">
                  <span>Query Parameters</span>
                  <button
                    type="button"
                    onClick={addParamRow}
                    className="text-signal hover:underline font-semibold"
                  >
                    + Add Parameter
                  </button>
                </div>

                <div className="space-y-2">
                  {paramsList.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => updateParamRow(row.id, "enabled", e.target.checked)}
                        className="h-4 w-4 accent-signal"
                      />
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) => updateParamRow(row.id, "key", e.target.value)}
                        placeholder="Key (e.g. page)"
                        className="flex-1 border border-ink/20 bg-white px-3 py-1.5 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                      />
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) => updateParamRow(row.id, "value", e.target.value)}
                        placeholder="Value (e.g. 1)"
                        className="flex-1 border border-ink/20 bg-white px-3 py-1.5 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeParamRow(row.id)}
                        className="px-2 py-1 text-xs text-ink/40 hover:text-rose-600 font-mono"
                        title="Delete parameter"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: HEADERS */}
            {activeRequestTab === "headers" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-ink/50 font-mono">
                  <span>Request Headers</span>
                  <button
                    type="button"
                    onClick={addHeaderRow}
                    className="text-signal hover:underline font-semibold"
                  >
                    + Add Header
                  </button>
                </div>

                <div className="space-y-2">
                  {headersList.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => updateHeaderRow(row.id, "enabled", e.target.checked)}
                        className="h-4 w-4 accent-signal"
                      />
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) => updateHeaderRow(row.id, "key", e.target.value)}
                        placeholder="Header (e.g. Authorization)"
                        className="flex-1 border border-ink/20 bg-white px-3 py-1.5 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                      />
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) => updateHeaderRow(row.id, "value", e.target.value)}
                        placeholder="Value"
                        className="flex-1 border border-ink/20 bg-white px-3 py-1.5 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeHeaderRow(row.id)}
                        className="px-2 py-1 text-xs text-ink/40 hover:text-rose-600 font-mono"
                        title="Delete header"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: AUTHORIZATION */}
            {activeRequestTab === "auth" && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <label className="font-mono text-xs font-semibold text-ink">
                    Auth Type:
                  </label>
                  <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value)}
                    className="border border-ink/20 bg-white px-3 py-1.5 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="no_auth">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="api_key">API Key</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>

                {authType === "no_auth" && (
                  <p className="text-xs text-ink/50 italic">
                    This request does not use any authentication headers.
                  </p>
                )}

                {authType === "bearer" && (
                  <div className="border border-ink/10 bg-cloud p-3 space-y-2">
                    <label className="block font-mono text-xs font-semibold text-ink">
                      Bearer Token:
                    </label>
                    <input
                      type="password"
                      value={bearerToken}
                      onChange={(e) => setBearerToken(e.target.value)}
                      placeholder="eyJhbGciOi..."
                      className="w-full border border-ink/20 bg-white px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                    />
                    <p className="font-mono text-[11px] text-ink/40">
                      The token will be added as "Authorization: Bearer &lt;token&gt;".
                    </p>
                  </div>
                )}

                {authType === "api_key" && (
                  <div className="border border-ink/10 bg-cloud p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-mono text-xs font-semibold text-ink mb-1">
                          Key:
                        </label>
                        <input
                          type="text"
                          value={apiKeyData.key}
                          onChange={(e) =>
                            setApiKeyData((prev) => ({ ...prev, key: e.target.value }))
                          }
                          placeholder="X-API-Key"
                          className="w-full border border-ink/20 bg-white px-3 py-1.5 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-xs font-semibold text-ink mb-1">
                          Value:
                        </label>
                        <input
                          type="password"
                          value={apiKeyData.value}
                          onChange={(e) =>
                            setApiKeyData((prev) => ({ ...prev, value: e.target.value }))
                          }
                          placeholder="secret_api_key_..."
                          className="w-full border border-ink/20 bg-white px-3 py-1.5 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="font-mono text-xs font-semibold text-ink">
                        Add to:
                      </label>
                      <select
                        value={apiKeyData.addTo}
                        onChange={(e) =>
                          setApiKeyData((prev) => ({ ...prev, addTo: e.target.value }))
                        }
                        className="border border-ink/20 bg-white px-2 py-1 font-mono text-xs text-ink"
                      >
                        <option value="header">Header</option>
                        <option value="query">Query Parameter</option>
                      </select>
                    </div>
                  </div>
                )}

                {authType === "basic" && (
                  <div className="border border-ink/10 bg-cloud p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-xs font-semibold text-ink mb-1">
                        Username:
                      </label>
                      <input
                        type="text"
                        value={basicAuthData.username}
                        onChange={(e) =>
                          setBasicAuthData((prev) => ({ ...prev, username: e.target.value }))
                        }
                        placeholder="admin"
                        className="w-full border border-ink/20 bg-white px-3 py-1.5 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-xs font-semibold text-ink mb-1">
                        Password:
                      </label>
                      <input
                        type="password"
                        value={basicAuthData.password}
                        onChange={(e) =>
                          setBasicAuthData((prev) => ({ ...prev, password: e.target.value }))
                        }
                        placeholder="••••••••"
                        className="w-full border border-ink/20 bg-white px-3 py-1.5 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: BODY */}
            {activeRequestTab === "body" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-ink/50 font-mono">
                  <span>JSON Payload (for POST, PUT, PATCH)</span>
                  {["GET", "DELETE"].includes(method) && (
                    <span className="text-amber-600 italic">
                      Note: Body is typically ignored for {method} requests.
                    </span>
                  )}
                </div>
                <textarea
                  rows={8}
                  value={bodyContent}
                  onChange={(e) => setBodyContent(e.target.value)}
                  placeholder={'{\n  "key": "value"\n}'}
                  className="w-full border border-ink/20 bg-cloud/30 p-3 font-mono text-xs text-ink focus:border-ink focus:bg-white focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* RESPONSE VIEWER PANEL */}
          <div className="border border-ink/15 bg-white p-5 sm:p-6 shadow-sm">
            {/* Header: Response, Status, Metrics, Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                  Response
                </span>

                {response && (
                  <span
                    className={`px-2 py-0.5 font-mono text-xs font-bold border ${
                      !response.status_code || response.status_code === 0
                        ? "text-rose-700 bg-rose-50 border-rose-300"
                        : response.status_code < 400
                        ? "text-emerald-700 bg-emerald-50 border-emerald-300"
                        : "text-amber-700 bg-amber-50 border-amber-300"
                    }`}
                  >
                    {response.status_code === 0
                      ? "ERROR"
                      : `${response.status_code} ${
                          response.status_code === 200
                            ? "OK"
                            : response.status_code === 201
                            ? "Created"
                            : response.status_code === 204
                            ? "No Content"
                            : response.status_code === 400
                            ? "Bad Request"
                            : response.status_code === 401
                            ? "Unauthorized"
                            : response.status_code === 404
                            ? "Not Found"
                            : response.status_code === 500
                            ? "Internal Error"
                            : ""
                        }`}
                  </span>
                )}
              </div>

              {response && (
                <div className="flex items-center gap-4 font-mono text-xs text-ink/60">
                  <span>⏱ {response.time_ms} ms</span>
                  <span>📦 {formatBytes(response.size_bytes)}</span>
                  <button
                    type="button"
                    onClick={handleCopyResponseBody}
                    className="border border-ink/20 bg-cloud px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-white"
                  >
                    {copyFeedback ? "✓ Copied" : "Copy Body"}
                  </button>
                </div>
              )}
            </div>

            {/* Response State */}
            {isSending ? (
              <div className="py-16 text-center font-mono text-xs text-ink/60 animate-pulse">
                Sending request through FastAPI test runner...
              </div>
            ) : !response ? (
              <div className="py-16 text-center font-mono text-xs text-ink/40">
                Enter an endpoint URL above and press <span className="font-bold text-ink">SEND</span> to execute.
              </div>
            ) : (
              <div>
                {/* Response Tabs (Body / Headers) */}
                <div className="mt-4 flex border-b border-ink/10 font-mono text-xs text-ink/60">
                  <button
                    type="button"
                    onClick={() => setActiveResponseTab("body")}
                    className={`-mb-px border-b-2 px-4 py-2 font-semibold transition-colors ${
                      activeResponseTab === "body"
                        ? "border-signal text-ink"
                        : "border-transparent hover:text-ink"
                    }`}
                  >
                    Body
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveResponseTab("headers")}
                    className={`-mb-px border-b-2 px-4 py-2 font-semibold transition-colors ${
                      activeResponseTab === "headers"
                        ? "border-signal text-ink"
                        : "border-transparent hover:text-ink"
                    }`}
                  >
                    Headers ({Object.keys(response.headers || {}).length})
                  </button>
                </div>

                {/* TAB: RESPONSE BODY */}
                {activeResponseTab === "body" && (
                  <div className="mt-3">
                    {response.error && (
                      <div className="mb-3 border border-rose-300 bg-rose-50 p-3 font-mono text-xs text-rose-800">
                        {response.error}
                      </div>
                    )}
                    <pre className="max-h-96 overflow-auto border border-ink/15 bg-cloud p-4 font-mono text-xs leading-relaxed text-ink selection:bg-signal/20">
                      {response.body === null || response.body === undefined
                        ? "/* No Content */"
                        : typeof response.body === "object"
                        ? JSON.stringify(response.body, null, 2)
                        : String(response.body)}
                    </pre>
                  </div>
                )}

                {/* TAB: RESPONSE HEADERS */}
                {activeResponseTab === "headers" && (
                  <div className="mt-3 max-h-96 overflow-auto border border-ink/15">
                    {Object.keys(response.headers || {}).length === 0 ? (
                      <div className="p-4 text-center font-mono text-xs text-ink/40">
                        No response headers available.
                      </div>
                    ) : (
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="border-b border-ink/10 bg-cloud text-ink/60">
                          <tr>
                            <th className="px-4 py-2 font-semibold">Key</th>
                            <th className="px-4 py-2 font-semibold">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink/10">
                          {Object.entries(response.headers).map(([k, v]) => (
                            <tr key={k} className="hover:bg-cloud/40">
                              <td className="px-4 py-2 font-semibold text-ink/80 select-all">
                                {k}
                              </td>
                              <td className="px-4 py-2 text-ink/70 select-all break-all">
                                {String(v)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          MODAL: NEW COLLECTION
          ========================================================= */}
      {isNewColModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md border border-ink/20 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <h3 className="font-display text-lg font-bold text-ink">
                New Collection
              </h3>
              <button
                type="button"
                onClick={() => setIsNewColModalOpen(false)}
                className="font-mono text-sm text-ink/40 hover:text-ink"
              >
                ✕
              </button>
            </div>

            {newColError && (
              <div className="mt-3 border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800">
                {newColError}
              </div>
            )}

            <form onSubmit={handleCreateCollection} className="mt-4 space-y-4">
              <div>
                <label className="block font-mono text-xs font-semibold text-ink mb-1">
                  Collection Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. Users Service, Payment Gateway"
                  className="w-full border border-ink/20 bg-white px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-ink mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="Brief description of this collection..."
                  className="w-full border border-ink/20 bg-white px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-ink/10">
                <button
                  type="button"
                  onClick={() => setIsNewColModalOpen(false)}
                  className="border border-ink/20 bg-white px-4 py-2 font-mono text-xs font-semibold text-ink hover:bg-cloud"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCol}
                  className="bg-signal px-5 py-2 font-mono text-xs font-bold text-ink hover:opacity-90 disabled:opacity-50"
                >
                  {isCreatingCol ? "Creating..." : "Create Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: SAVE REQUEST
          ========================================================= */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md border border-ink/20 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <h3 className="font-display text-lg font-bold text-ink">
                Save Request
              </h3>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="font-mono text-sm text-ink/40 hover:text-ink"
              >
                ✕
              </button>
            </div>

            {saveErrorMessage && (
              <div className="mt-3 border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800">
                {saveErrorMessage}
              </div>
            )}

            <form onSubmit={handleSaveRequestSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block font-mono text-xs font-semibold text-ink mb-1">
                  Request Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={saveRequestName}
                  onChange={(e) => setSaveRequestName(e.target.value)}
                  placeholder="e.g. List Active Users"
                  className="w-full border border-ink/20 bg-white px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-ink mb-1">
                  Save to Collection <span className="text-rose-500">*</span>
                </label>
                {collections.length === 0 ? (
                  <div className="border border-dashed border-ink/20 p-3 text-center">
                    <p className="font-mono text-xs text-ink/60">
                      No collections available.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSaveModalOpen(false);
                        setIsNewColModalOpen(true);
                      }}
                      className="mt-2 bg-signal px-3 py-1 font-mono text-xs font-bold text-ink"
                    >
                      + Create Collection
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    value={saveTargetColId}
                    onChange={(e) => setSaveTargetColId(e.target.value)}
                    className="w-full border border-ink/20 bg-white px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
                  >
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="border border-ink/10 bg-cloud p-3 font-mono text-xs space-y-1 text-ink/70">
                <div>
                  <span className="font-semibold text-ink">Method:</span> {method}
                </div>
                <div className="truncate">
                  <span className="font-semibold text-ink">URL:</span> {url}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-ink/10">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="border border-ink/20 bg-white px-4 py-2 font-mono text-xs font-semibold text-ink hover:bg-cloud"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRequest || collections.length === 0}
                  className="bg-signal px-5 py-2 font-mono text-xs font-bold text-ink hover:opacity-90 disabled:opacity-50"
                >
                  {isSavingRequest ? "Saving..." : "Save to Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
