import React, { useEffect, useMemo, useState } from "react";
import { createApiClient } from "./api";
import CaseDetail from "./CaseDetail";

const STORAGE_KEYS = {
  backendBaseUrl: "admin.backendBaseUrl",
  apiKey: "admin.apiKey",
};

const DEFAULT_BACKEND_URL = "http://localhost:4000";

function readFromStorage(key, fallback = "") {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function formatLocation(complaint) {
  if (typeof complaint.location === "string") return complaint.location;
  if (complaint.location && typeof complaint.location === "object") {
    const lat = complaint.location.lat ?? complaint.location.latitude;
    const lon = complaint.location.lon ?? complaint.location.lng ?? complaint.location.longitude;
    if (lat != null && lon != null) return `${lat}, ${lon}`;
  }
  if (complaint.lat != null && complaint.lon != null) return `${complaint.lat}, ${complaint.lon}`;
  return "—";
}

function displayComplaintCode(complaint) {
  if (complaint.complaintCode) return complaint.complaintCode;
  if (complaint.code) return complaint.code;
  if (complaint.complaintId) return complaint.complaintId;
  if (complaint._id) return String(complaint._id).slice(0, 10);
  return "—";
}

function getComplaintLookupId(complaint) {
  return complaint.complaintId || complaint._id || "";
}

export default function App() {
  const [backendBaseUrlInput, setBackendBaseUrlInput] = useState(() =>
    readFromStorage(STORAGE_KEYS.backendBaseUrl, DEFAULT_BACKEND_URL)
  );
  const [savedBackendBaseUrl, setSavedBackendBaseUrl] = useState(() =>
    readFromStorage(STORAGE_KEYS.backendBaseUrl, DEFAULT_BACKEND_URL)
  );
  const [apiKeyInput, setApiKeyInput] = useState(() => readFromStorage(STORAGE_KEYS.apiKey, ""));
  const [savedApiKey, setSavedApiKey] = useState(() => readFromStorage(STORAGE_KEYS.apiKey, ""));

  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState({ testing: false, ok: false, message: "" });

  const [selectedComplaintId, setSelectedComplaintId] = useState("");
  const [isNarrowScreen, setIsNarrowScreen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });

  const apiClient = useMemo(
    () => createApiClient(savedBackendBaseUrl, savedApiKey),
    [savedBackendBaseUrl, savedApiKey]
  );

  function saveBackendBaseUrl() {
    const next = backendBaseUrlInput.trim() || DEFAULT_BACKEND_URL;
    setSavedBackendBaseUrl(next);
    try {
      localStorage.setItem(STORAGE_KEYS.backendBaseUrl, next);
    } catch {
      // no-op
    }
  }

  function saveApiKey() {
    const next = apiKeyInput.trim();
    setSavedApiKey(next);
    try {
      localStorage.setItem(STORAGE_KEYS.apiKey, next);
    } catch {
      // no-op
    }
  }

  async function testBackendConnection() {
    setConnectionStatus({ testing: true, ok: false, message: "" });
    try {
      await apiClient.get("/api/health");
      setConnectionStatus({
        testing: false,
        ok: true,
        message: `Connected to ${savedBackendBaseUrl}`,
      });
    } catch (error) {
      const message = error?.response?.data?.error
        || error?.message
        || "Unable to reach backend";
      setConnectionStatus({
        testing: false,
        ok: false,
        message: `Cannot reach ${savedBackendBaseUrl}. ${message}`,
      });
    }
  }

  useEffect(() => {
    function handleResize() {
      setIsNarrowScreen(window.innerWidth < 1024);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadComplaints() {
      setLoadingComplaints(true);
      setComplaintsError("");
      try {
        const response = await apiClient.get("/api/complaints");
        const responseData = response?.data;
        const rows = Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.complaints)
            ? responseData.complaints
            : [];
        if (!mounted) return;
        setComplaints(rows);
        if (rows[0]) {
          const defaultId = getComplaintLookupId(rows[0]);
          if (defaultId) {
            setSelectedComplaintId((prev) => prev || defaultId);
          }
        }
      } catch (error) {
        if (!mounted) return;
        setComplaints([]);
        const isNetworkError = !error?.response;
        const message = isNetworkError
          ? `Cannot connect to ${savedBackendBaseUrl}. Start backend (npm run dev in backend/) and verify URL.`
          : (error?.response?.data?.error || error?.message || "Failed to load complaints");
        setComplaintsError(message);
      } finally {
        if (mounted) setLoadingComplaints(false);
      }
    }

    loadComplaints();
    return () => {
      mounted = false;
    };
  }, [apiClient]);

  function viewComplaint(complaint) {
    const lookupId = getComplaintLookupId(complaint);
    if (!lookupId) return;
    setSelectedComplaintId(lookupId);
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", minHeight: "100vh", background: "#f6f7fb" }}>
      <header style={{ background: "#0f4c81", color: "#fff", padding: "16px 20px" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Jan-Awaaj Authority Dashboard</h1>
      </header>

      <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
        <section style={{ display: "grid", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ width: 150 }}>Backend Base URL</label>
            <input
              style={{ flex: 1, padding: 8 }}
              value={backendBaseUrlInput}
              onChange={(e) => setBackendBaseUrlInput(e.target.value)}
              placeholder="http://localhost:4000"
            />
            <button onClick={saveBackendBaseUrl}>Save</button>
            <button onClick={testBackendConnection} disabled={connectionStatus.testing}>
              {connectionStatus.testing ? "Testing..." : "Test"}
            </button>
          </div>
          {connectionStatus.message ? (
            <p style={{ margin: 0, color: connectionStatus.ok ? "#166534" : "crimson" }}>
              {connectionStatus.message}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ width: 150 }}>API Key</label>
            <input
              style={{ flex: 1, padding: 8 }}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste authority API key"
            />
            <button onClick={saveApiKey}>Save</button>
          </div>
        </section>

        <div style={workspaceStyle(isNarrowScreen)}>
          <section style={{ ...panelStyle, minWidth: 0 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Complaints</h2>
            {loadingComplaints ? <p>Loading complaints…</p> : null}
            {complaintsError ? <p style={{ color: "crimson" }}>{complaintsError}</p> : null}

            {!loadingComplaints && !complaintsError ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Complaint ID / Code</th>
                      <th style={thStyle}>Category</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Location</th>
                      <th style={thStyle}>Created At</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((complaint) => {
                      const lookupId = getComplaintLookupId(complaint);
                      const isSelected = selectedComplaintId && lookupId === selectedComplaintId;
                      return (
                        <tr key={complaint._id || complaint.complaintId} style={isSelected ? selectedRowStyle : undefined}>
                          <td style={tdStyle}>{displayComplaintCode(complaint)}</td>
                          <td style={tdStyle}>{complaint.category || "—"}</td>
                          <td style={tdStyle}>{complaint.status || "—"}</td>
                          <td style={tdStyle}>{formatLocation(complaint)}</td>
                          <td style={tdStyle}>
                            {complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : "—"}
                          </td>
                          <td style={tdStyle}>
                            <button onClick={() => viewComplaint(complaint)}>View</button>
                          </td>
                        </tr>
                      );
                    })}
                    {!complaints.length ? (
                      <tr>
                        <td style={tdStyle} colSpan={6}>
                          No complaints found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <div style={{ minWidth: 0 }}>
            {selectedComplaintId ? (
              <CaseDetail complaintId={selectedComplaintId} apiClient={apiClient} />
            ) : (
              <section style={panelStyle}>
                <h2 style={{ marginTop: 0, fontSize: 18 }}>Case Detail</h2>
                <p>Select a complaint from the list to view details.</p>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const workspaceStyle = (isNarrowScreen) => ({
  display: "grid",
  gridTemplateColumns: isNarrowScreen
    ? "minmax(0, 1fr)"
    : "minmax(380px, 1.05fr) minmax(420px, 1fr)",
  gap: 14,
  alignItems: "start",
});

const panelStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
};

const selectedRowStyle = {
  backgroundColor: "#eff6ff",
};

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #d1d5db",
  padding: "8px 6px",
  fontSize: 13,
};

const tdStyle = {
  borderBottom: "1px solid #e5e7eb",
  padding: "8px 6px",
  verticalAlign: "top",
  fontSize: 13,
};
