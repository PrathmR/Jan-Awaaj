import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBackendUrl, setBackendUrl, getDefaultBackendUrl, backendFetch } from "../api/backend";
import { clearMyComplaintIds, getMyComplaintIds, ensureCitizenId } from "../api/storage";

const STATUS_COLORS = {
  resolved: { bg: "#d1fae5", fg: "#065f46" },
  in_progress: { bg: "#dbeafe", fg: "#1e40af" },
  assigned: { bg: "#e9d5ff", fg: "#6b21a8" },
  acknowledged: { bg: "#fef3c7", fg: "#92400e" },
  new: { bg: "#fee2e2", fg: "#991b1b" },
};

function ComplaintCard({ complaint, onPress }) {
  const sc = STATUS_COLORS[complaint.status] || STATUS_COLORS.new;
  const statusLabel = (complaint.status || "new").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const displayId = complaint.complaintId?.startsWith("JA") ? complaint.complaintId : (complaint.complaintId?.slice(0, 8) + "…");

  return (
    <Pressable style={styles.complaintCard} onPress={() => onPress(complaint.complaintId)}>
      <View style={styles.complaintCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.complaintId}>#{displayId}</Text>
          <Text style={styles.complaintCategory}>{complaint.category || "General"}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusBadgeText, { color: sc.fg }]}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.complaintDesc} numberOfLines={2}>
        {complaint.description || "No description"}
      </Text>
      <Text style={styles.complaintDate}>
        {new Date(complaint.createdAt).toLocaleDateString()}
      </Text>
    </Pressable>
  );
}

export default function ProfileScreen({ navigation }) {
  const [backendUrl, setBackendUrlValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [citizenId, setCitizenId] = useState("");

  const fetchComplaints = useCallback(async () => {
    try {
      setLoadingComplaints(true);
      const cId = await ensureCitizenId();
      setCitizenId(cId);
      
      const data = await backendFetch(`/api/complaints/my?citizenId=${cId}`);
      setComplaints(Array.isArray(data?.complaints) ? data.complaints : []);
    } catch {
      // ignore
    } finally {
      setLoadingComplaints(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const url = await getBackendUrl();
        if (!mounted) return;
        setBackendUrlValue(url);
      } finally {
        if (mounted) setLoading(false);
      }
      await fetchComplaints();
    })();
    return () => { mounted = false; };
  }, [fetchComplaints]);

  async function saveUrl() {
    const trimmed = backendUrl.trim();
    if (!trimmed) return;
    await setBackendUrl(trimmed);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testConnection() {
    const trimmed = backendUrl.trim();
    if (!trimmed) return;
    setTesting(true);
    setTestResult(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${trimmed}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      setTestResult(data?.ok ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  }

  function goToTracking(complaintId) {
    navigation.navigate("Tracking", { complaintId });
  }

  const detectedUrl = getDefaultBackendUrl();
  const isPlaceholder = detectedUrl.includes("192.168.1.1");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#2563eb" /></View>
      ) : (
        <>
          {/* ── My Identity ── */}
          <View style={[styles.card, { backgroundColor: "#1e3a8a" }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="finger-print" size={18} color="#fff" />
              <Text style={[styles.label, { color: "#fff" }]}>Jan Awaaj Identity</Text>
            </View>
            <View style={styles.idDisplayCard}>
              <Text style={styles.idDisplayText}>{citizenId}</Text>
            </View>
            <Text style={[styles.help, { color: "#bfdbfe" }]}>
              This unique ID is stored securely on your device. It allows you to track your complaints anonymously without sharing personal data.
            </Text>
          </View>

          {/* ── My Complaints ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={18} color="#2563eb" />
              <Text style={styles.label}>My Complaints</Text>
              <Text style={styles.countBadge}>{complaints.length}</Text>
            </View>

            {loadingComplaints ? (
              <ActivityIndicator color="#2563eb" />
            ) : complaints.length > 0 ? (
              <View style={{ gap: 8 }}>
                {complaints.map((c) => (
                  <ComplaintCard key={c.complaintId} complaint={c} onPress={goToTracking} />
                ))}
              </View>
            ) : (
              <Text style={styles.help}>
                No complaints filed yet. Go to the File tab to submit your first complaint.
              </Text>
            )}

            {complaints.length > 0 && (
              <Pressable
                style={[styles.btn, { backgroundColor: "#ef4444" }]}
                onPress={async () => {
                  await clearMyComplaintIds();
                  setComplaints([]);
                }}
              >
                <Text style={styles.btnText}>Clear All Saved IDs</Text>
              </Pressable>
            )}
          </View>

          {/* ── Network / Backend URL ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="server-outline" size={18} color="#2563eb" />
              <Text style={styles.label}>Backend URL</Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={14} color="#1d4ed8" />
              <Text style={styles.infoText}>
                Enter the LAN IP shown when your backend starts.{"\n"}
                Look for: <Text style={{ fontWeight: "900" }}>http://192.168.x.x:4000</Text>
              </Text>
            </View>

            <TextInput
              value={backendUrl}
              onChangeText={(v) => {
                setBackendUrlValue(v);
                setTestResult(null);
              }}
              style={styles.input}
              autoCapitalize="none"
              placeholder="http://192.168.x.x:4000"
            />

            {!isPlaceholder && (
              <Text style={styles.autoDetectHint}>
                Auto-detected: {detectedUrl}
              </Text>
            )}

            {testResult === "ok" && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={styles.successText}>Connected!</Text>
              </View>
            )}
            {testResult === "fail" && (
              <View style={styles.errorBox}>
                <Ionicons name="close-circle" size={16} color="#dc2626" />
                <Text style={styles.errorBoxText}>Cannot reach server.</Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <Pressable style={[styles.btn, { flex: 1 }]} onPress={saveUrl}>
                <Text style={styles.btnText}>{saved ? "✓ Saved!" : "Save URL"}</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, { flex: 1, backgroundColor: "#0f766e" }]}
                onPress={testConnection}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>Test</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* ── About ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
              <Text style={styles.label}>About JanAwaaj</Text>
            </View>
            <Text style={styles.help}>
              A trust-mediated grievance platform for low-literacy and vulnerable communities.
              Voice submissions, community verification, and tamper-proof audit logs.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, backgroundColor: "#f1f5f9", flexGrow: 1 },
  center: { padding: 32, alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  idDisplayCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },
  idDisplayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontWeight: "800", color: "#1e293b", fontSize: 15, flex: 1 },
  countBadge: {
    backgroundColor: "#2563eb",
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  help: { color: "#64748b", lineHeight: 18, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f8fafc",
    fontSize: 14,
  },
  btnRow: { flexDirection: "row", gap: 8 },
  btn: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    padding: 10,
    alignItems: "flex-start",
  },
  infoText: { color: "#1d4ed8", fontSize: 12, flex: 1, lineHeight: 18 },
  autoDetectHint: { color: "#16a34a", fontSize: 12, fontWeight: "600", marginTop: -4 },
  successBox: { flexDirection: "row", gap: 6, backgroundColor: "#dcfce7", borderRadius: 8, padding: 8, alignItems: "center" },
  successText: { color: "#16a34a", fontSize: 13, fontWeight: "700" },
  errorBox: { flexDirection: "row", gap: 6, backgroundColor: "#fef2f2", borderRadius: 8, padding: 8, alignItems: "center" },
  errorBoxText: { color: "#dc2626", fontSize: 12, fontWeight: "600" },

  // Complaint cards
  complaintCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: "#f8fafc",
  },
  complaintCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  complaintId: { fontWeight: "900", fontSize: 13, color: "#1e293b" },
  complaintCategory: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: "800" },
  complaintDesc: { fontSize: 13, color: "#475569", lineHeight: 18 },
  complaintDate: { fontSize: 11, color: "#94a3b8" },
});
