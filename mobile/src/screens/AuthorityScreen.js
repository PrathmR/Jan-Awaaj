import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../i18n";

export default function AuthorityScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const { t } = useLanguage();

  async function handleLogin() {
    setDashboardError("");
    setLoading(true);
    try {
      const { getBackendUrl } = await import("../api/backend");
      const base = await getBackendUrl();
      
      const res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      setToken(data.token);
      setUser({ name: data.name || "Officer", departmentId: data.departmentId || "General" });
      fetchComplaints(data.token);
    } catch (e) {
      setDashboardError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComplaints(authToken = token) {
    if (!authToken) return;
    setRefreshing(true);
    try {
      const { getBackendUrl } = await import("../api/backend");
      const base = await getBackendUrl();
      const res = await fetch(`${base}/api/complaints`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setComplaints(data.complaints || []);
      }
    } catch (e) {
      console.warn("Fetch failed:", e);
    } finally {
      setRefreshing(false);
    }
  }

  async function updateComplaint(status) {
    if (!selectedComplaint || !token) return;
    setUpdateLoading(true);
    try {
      const { getBackendUrl } = await import("../api/backend");
      const base = await getBackendUrl();
      
      const formData = new FormData();
      formData.append("status", status);
      formData.append("officialNote", "Updated via Mobile Dashboard");

      const res = await fetch(`${base}/api/complaints/${selectedComplaint.complaintId}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        setSelectedComplaint(null);
        fetchComplaints();
      } else {
        const data = await res.json();
        alert(data.error || "Update failed");
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setUpdateLoading(false);
    }
  }

  const filteredComplaints = complaints.filter(c => 
    selectedStatus === "all" ? true : c.status === selectedStatus
  );

  const stats = {
    total: complaints.length,
    new: complaints.filter(c => c.status === "new").length,
    active: complaints.filter(c => c.status === "in_progress" || c.status === "assigned").length,
    resolved: complaints.filter(c => c.status === "resolved").length,
  };

  function getStatusColor(status) {
    switch (status) {
      case "new": return "#3b82f6";
      case "in_progress": return "#f59e0b";
      case "resolved": return "#10b981";
      case "rejected": return "#ef4444";
      default: return "#64748b";
    }
  }

  function getUrgencyColor(u) {
    const val = (u || "").toLowerCase();
    if (val === "very high") return "#dc2626";
    if (val === "high") return "#f97316";
    if (val === "medium") return "#eab308";
    return "#22c55e";
  }

  function getUrgencyWidth(u) {
    const val = (u || "").toLowerCase();
    if (val === "very high") return "100%";
    if (val === "high") return "75%";
    if (val === "medium") return "50%";
    return "25%";
  }

  if (token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Hello, {user?.name}</Text>
            <Text style={styles.deptText}>{user?.departmentId} Dept.</Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={() => setToken(null)}>
            <Ionicons name="log-out-outline" size={20} color="#64748b" />
          </Pressable>
        </View>

        <View style={{ backgroundColor: "#fff" }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.statsContainer}
          >
            <View style={[styles.statCard, { backgroundColor: "#f0fdfa" }]}>
              <Text style={[styles.statValue, { color: "#0f766e" }]}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#fef2f2" }]}>
              <Text style={[styles.statValue, { color: "#dc2626" }]}>{stats.new}</Text>
              <Text style={styles.statLabel}>New</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#eff6ff" }]}>
              <Text style={[styles.statValue, { color: "#1d4ed8" }]}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#f0fdf4" }]}>
              <Text style={[styles.statValue, { color: "#16a34a" }]}>{stats.resolved}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </ScrollView>
        </View>

        <View style={styles.filterRow}>
          {["all", "new", "in_progress", "resolved"].map((s) => (
            <Pressable 
              key={s} 
              style={[styles.filterTab, selectedStatus === s && styles.filterTabActive]}
              onPress={() => setSelectedStatus(s)}
            >
              <Text style={[styles.filterTabText, selectedStatus === s && styles.filterTabTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={filteredComplaints}
          keyExtractor={(item) => item.complaintId}
          contentContainerStyle={styles.listContainer}
          onRefresh={fetchComplaints}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <Pressable style={styles.complaintCard} onPress={() => setSelectedComplaint(item)}>
              <View style={styles.complaintHeader}>
                <Text style={styles.complaintId}>{item.complaintId}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.complaintCategory}>{item.category || "General"}</Text>
              <View style={styles.complaintMeta}>
                <Ionicons name="location-outline" size={14} color="#64748b" />
                <Text style={styles.metaText}>{item.locationMention || "Unknown Location"}</Text>
              </View>
              <Text style={styles.complaintSummary} numberOfLines={2}>{item.summary}</Text>
              <View style={styles.urgencyBar}>
                <View style={[styles.urgencyIndicator, { width: getUrgencyWidth(item.urgency), backgroundColor: getUrgencyColor(item.urgency) }]} />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No complaints found</Text>
            </View>
          }
        />

        <Modal visible={!!selectedComplaint} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Complaint</Text>
                <Pressable onPress={() => setSelectedComplaint(null)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </Pressable>
              </View>
              
              {selectedComplaint && (
                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.modalLabel}>ID: {selectedComplaint.complaintId}</Text>
                  <Text style={styles.modalSummary}>{selectedComplaint.summary}</Text>
                  
                  <Text style={styles.modalActionLabel}>Set Status:</Text>
                  <View style={styles.actionButtons}>
                    {["in_progress", "resolved", "rejected"].map((s) => (
                      <Pressable 
                        key={s} 
                        style={[styles.actionBtn, { borderColor: getStatusColor(s) }]}
                        onPress={() => updateComplaint(s)}
                      >
                        <Text style={[styles.actionBtnText, { color: getStatusColor(s) }]}>
                          Mark as {s.replace("_", " ")}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
              {updateLoading && (
                <View style={styles.modalLoading}>
                  <ActivityIndicator color="#0f766e" />
                </View>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>JA</Text>
            </View>
            <View>
              <Text style={styles.title}>Jan-Awaaj</Text>
              <Text style={styles.sub}>Authority Access Portal</Text>
            </View>
          </View>

          {dashboardError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text style={styles.errorText}>{dashboardError}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Official Email / ID</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="officer@district.gov.in"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter secure password"
              secureTextEntry
            />
          </View>

          <Pressable
            style={[styles.loginBtn, (!email || !password || loading) && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={!email || !password || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.loginBtnText}>Login to Authority Dashboard</Text>
              </>
            )}
          </Pressable>

          <View style={styles.secureBadge}>
            <Ionicons name="lock-closed" size={12} color="#065f46" />
            <Text style={styles.secureText}>
              Secure access: All actions are logged in a tamper-proof audit trail.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },
  container: {
    padding: 20,
    gap: 16,
    ...(Platform.OS === "web" ? { maxWidth: 480, width: "100%", alignSelf: "center" } : {}),
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 16,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eefaf9",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#0b5f58", fontWeight: "900", fontSize: 14 },
  title: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  sub: { fontSize: 13, color: "#64748b" },
  field: { gap: 6 },
  fieldLabel: { fontWeight: "700", color: "#374151", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#111827",
  },
  loginBtn: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secureBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 10,
    padding: 10,
  },
  secureText: { color: "#065f46", fontSize: 12, flex: 1, lineHeight: 18 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  welcomeText: { fontSize: 18, fontWeight: "900", color: "#1e293b" },
  deptText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  logoutBtn: { padding: 8, borderRadius: 8, backgroundColor: "#f8fafc" },
  
  statsContainer: { padding: 16, gap: 12 },
  statCard: {
    width: 100,
    height: 80,
    borderRadius: 16,
    padding: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 12, color: "#64748b", fontWeight: "600", marginTop: 2 },

  filterRow: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  filterTabActive: { backgroundColor: "#0f766e" },
  filterTabText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  filterTabTextActive: { color: "#fff" },

  listContainer: { padding: 16, paddingBottom: 40, gap: 16 },
  complaintCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  complaintHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  complaintId: { fontSize: 14, fontWeight: "900", color: "#0f766e" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  complaintCategory: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 4 },
  complaintMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  metaText: { fontSize: 12, color: "#64748b" },
  complaintSummary: { fontSize: 13, color: "#475569", lineHeight: 18, marginBottom: 12 },
  urgencyBar: { height: 4, backgroundColor: "#f1f5f9", borderRadius: 2, overflow: "hidden" },
  urgencyIndicator: { height: "100%" },

  emptyBox: { padding: 40, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { color: "#94a3b8", fontWeight: "600" },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  errorText: { color: "#dc2626", fontWeight: "600", flex: 1, lineHeight: 20, fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#1e293b" },
  modalLabel: { fontSize: 14, fontWeight: "700", color: "#0f766e", marginBottom: 8 },
  modalSummary: { fontSize: 14, color: "#475569", lineHeight: 22, marginBottom: 20, backgroundColor: "#f8fafc", padding: 16, borderRadius: 12 },
  modalActionLabel: { fontSize: 13, fontWeight: "700", color: "#64748b", marginBottom: 12 },
  actionButtons: { gap: 12 },
  actionBtn: { borderWidth: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  actionBtnText: { fontWeight: "800", fontSize: 14 },
  modalLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.7)", justifyContent: "center", alignItems: "center" },
  modalScroll: { marginBottom: 20 },
});
