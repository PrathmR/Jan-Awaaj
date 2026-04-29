import React, { useEffect, useMemo, useState } from "react";

const AUDIT_TYPE_LABELS = {
  COMPLAINT_CREATED: "Complaint created",
  STATUS_UPDATED: "Status updated",
  ACTION_ADDED: "Authority action added",
  PROOF_UPLOADED: "Proof uploaded",
  COMMUNITY_SIGNAL: "Community signal recorded",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatLocation(complaint) {
  if (!complaint) return "—";
  if (typeof complaint.locationText === "string" && complaint.locationText.trim()) {
    return complaint.locationText.trim();
  }
  if (typeof complaint.location === "string" && complaint.location.trim()) {
    return complaint.location.trim();
  }
  if (complaint.location && typeof complaint.location === "object") {
    const lat = complaint.location.lat ?? complaint.location.latitude;
    const lon = complaint.location.lon ?? complaint.location.lng ?? complaint.location.longitude;
    if (lat != null && lon != null) return `${lat}, ${lon}`;
  }
  if (complaint.lat != null && complaint.lon != null) return `${complaint.lat}, ${complaint.lon}`;
  return "—";
}

function displayComplaintCode(complaint) {
  if (!complaint) return "—";
  if (complaint.complaintCode) return complaint.complaintCode;
  if (complaint.code) return complaint.code;
  if (complaint.complaintId) return complaint.complaintId;
  if (complaint._id) return String(complaint._id).slice(0, 8);
  return "—";
}

function toAbsoluteFileUrl(fileUrl, baseUrl) {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const root = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!root) return fileUrl;
  return `${root}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
}

function extractComplaint(data) {
  if (!data) return null;
  if (data.complaint && typeof data.complaint === "object") return data.complaint;
  if (typeof data === "object") return data;
  return null;
}

function extractPosts(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.posts)) return data.posts;
  if (data.post && typeof data.post === "object") return [data.post];
  return [];
}

export default function CaseDetail({ complaintId, apiClient }) {
  const [complaint, setComplaint] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [posts, setPosts] = useState([]);

  const [loadingComplaint, setLoadingComplaint] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [complaintError, setComplaintError] = useState("");
  const [auditError, setAuditError] = useState("");
  const [postsError, setPostsError] = useState("");

  useEffect(() => {
    if (!complaintId) {
      setComplaint(null);
      setAuditEvents([]);
      setPosts([]);
      setComplaintError("");
      setAuditError("");
      setPostsError("");
      return;
    }

    let mounted = true;
    setComplaint(null);
    setAuditEvents([]);
    setPosts([]);
    setComplaintError("");
    setAuditError("");
    setPostsError("");
    setLoadingComplaint(true);
    setLoadingAudit(true);
    setLoadingPosts(true);

    (async () => {
      try {
        const response = await apiClient.get(`/api/complaints/${complaintId}`);
        if (!mounted) return;
        setComplaint(extractComplaint(response?.data));
      } catch (error) {
        if (!mounted) return;
        setComplaintError(error?.response?.data?.error || error?.message || "Failed to load complaint");
      } finally {
        if (mounted) setLoadingComplaint(false);
      }
    })();

    (async () => {
      try {
        const response = await apiClient.get(`/api/complaints/${complaintId}/audit`);
        if (!mounted) return;
        const rows = Array.isArray(response?.data) ? response.data : [];
        rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setAuditEvents(rows);
      } catch (error) {
        if (!mounted) return;
        setAuditError(error?.response?.data?.error || error?.message || "Failed to load audit events");
      } finally {
        if (mounted) setLoadingAudit(false);
      }
    })();

    (async () => {
      try {
        const response = await apiClient.get(`/api/posts/by-complaint/${complaintId}`);
        if (!mounted) return;
        const rows = extractPosts(response?.data);
        setPosts(rows);
      } catch (error) {
        if (!mounted) return;
        setPostsError(error?.response?.data?.error || error?.message || "Failed to load community signals");
      } finally {
        if (mounted) setLoadingPosts(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [complaintId, apiClient]);

  const isLoading = loadingComplaint || loadingAudit || loadingPosts;
  const hasAnyError = complaintError || auditError || postsError;

  const actions = useMemo(() => {
    const rows = Array.isArray(complaint?.actions) ? [...complaint.actions] : [];
    rows.sort((a, b) => new Date(b.takenAt || 0) - new Date(a.takenAt || 0));
    return rows;
  }, [complaint]);

  const backendBaseUrl = apiClient?.defaults?.baseURL || "";

  if (!complaintId) {
    return (
      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>Case Detail</h2>
        <p>Select a complaint from the list to view details.</p>
      </section>
    );
  }

  return (
    <section style={panelStyle}>
      <h2 style={sectionTitleStyle}>Case Detail</h2>
      <p style={metaStyle}>Complaint ID: {complaintId}</p>
      {isLoading ? <p>Loading case workspace…</p> : null}
      {hasAnyError ? <p style={errorStyle}>Some sections could not be loaded completely.</p> : null}

      <div style={sectionBoxStyle}>
        <h3 style={subTitleStyle}>Complaint Header</h3>
        {loadingComplaint ? <p>Loading complaint info…</p> : null}
        {complaintError ? <p style={errorStyle}>{complaintError}</p> : null}
        {!loadingComplaint && !complaintError && complaint ? (
          <div style={gridStyle}>
            <p><strong>Code:</strong> {displayComplaintCode(complaint)}</p>
            <p><strong>Status:</strong> {complaint.status || "—"}</p>
            <p><strong>Category:</strong> {complaint.category || "—"}</p>
            <p><strong>Severity:</strong> {complaint.severity || "—"}</p>
            <p><strong>Created:</strong> {formatDate(complaint.createdAt)}</p>
            <p><strong>Location:</strong> {formatLocation(complaint)}</p>
          </div>
        ) : null}
      </div>

      <div style={sectionBoxStyle}>
        <h3 style={subTitleStyle}>AI / System Summary</h3>
        {!complaint ? <p>AI summary not available yet.</p> : null}
        {complaint ? (
          <>
            {complaint.aiSummary || complaint.summary ? (
              <>
                <p><strong>Summary:</strong> {complaint.aiSummary || complaint.summary}</p>
                <p><strong>AI Category:</strong> {complaint.aiCategory || "—"}</p>
                <p><strong>AI Severity:</strong> {complaint.aiSeverity || "—"}</p>
              </>
            ) : (
              <p>AI summary not available yet.</p>
            )}
          </>
        ) : null}
      </div>

      <div style={sectionBoxStyle}>
        <h3 style={subTitleStyle}>Actions Taken</h3>
        {loadingComplaint ? <p>Loading actions…</p> : null}
        {complaintError ? <p style={errorStyle}>Could not load actions.</p> : null}
        {!loadingComplaint && !complaintError && !actions.length ? <p>No actions recorded yet.</p> : null}
        {!loadingComplaint && !complaintError && actions.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {actions.map((action) => (
              <div key={action._id || `${action.actionType}-${action.takenAt}`} style={itemCardStyle}>
                <p><strong>{action.actionType || "OTHER"}</strong> — {action.title || "Untitled action"}</p>
                <p>{action.description || "No description."}</p>
                <p style={metaStyle}>
                  {formatDate(action.takenAt)} • {action.takenByLabel || action.takenBy || action.takenByUser || "authority"}
                </p>
                {Array.isArray(action.attachments) && action.attachments.length ? (
                  <div>
                    <strong>Attachments:</strong>
                    <ul style={{ marginTop: 6 }}>
                      {action.attachments.map((att, idx) => {
                        const url = toAbsoluteFileUrl(att.fileUrl, backendBaseUrl);
                        return (
                          <li key={`${att.fileUrl || "file"}-${idx}`}>
                            <a href={url} target="_blank" rel="noreferrer">
                              {att.proofType || "FILE"}: {att.fileUrl}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={sectionBoxStyle}>
        <h3 style={subTitleStyle}>Audit (Blockchain-lite) Timeline</h3>
        <p style={metaStyle}>
          Immutable audit trail (blockchain-lite): each event is hash-chained to detect tampering.
        </p>
        {loadingAudit ? <p>Loading audit events…</p> : null}
        {auditError ? <p style={errorStyle}>{auditError}</p> : null}
        {!loadingAudit && !auditError && !auditEvents.length ? <p>No audit events found.</p> : null}
        {!loadingAudit && !auditError && auditEvents.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {auditEvents.map((event) => (
              <div key={event.id || `${event.type}-${event.createdAt}`} style={itemCardStyle}>
                <p><strong>{event.type}</strong> — {AUDIT_TYPE_LABELS[event.type] || "Audit event"}</p>
                <p style={metaStyle}>{formatDate(event.createdAt)}</p>
                <p style={metaStyle}>
                  current: {(event.currentHash || "").slice(0, 10)}{event.currentHash ? "..." : ""}
                  {event.previousHash ? ` | prev: ${String(event.previousHash).slice(0, 10)}...` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={sectionBoxStyle}>
        <h3 style={subTitleStyle}>Community Signals</h3>
        {loadingPosts ? <p>Loading community signals…</p> : null}
        {postsError ? <p style={errorStyle}>{postsError}</p> : null}
        {!loadingPosts && !postsError ? <p style={metaStyle}>Total posts: {posts.length}</p> : null}
        {!loadingPosts && !postsError && !posts.length ? <p>No community feedback yet.</p> : null}
        {!loadingPosts && !postsError && posts.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {posts.map((post) => (
              <div key={post._id || post.postId} style={itemCardStyle}>
                <p>{(post.text || "").slice(0, 180) || "No text"}</p>
                <p style={metaStyle}>
                  Up: {post.voteCounts?.up ?? 0} | Down: {post.voteCounts?.down ?? 0} | Comments: {post.comments?.length ?? 0}
                </p>
                <p style={metaStyle}>{formatDate(post.createdAt)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

const panelStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
};

const sectionBoxStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 10,
  marginTop: 10,
};

const sectionTitleStyle = { marginTop: 0, fontSize: 18 };
const subTitleStyle = { marginTop: 0, marginBottom: 8, fontSize: 15 };
const metaStyle = { color: "#475569", fontSize: 13 };
const errorStyle = { color: "crimson" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 };
const itemCardStyle = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 };
