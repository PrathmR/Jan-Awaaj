import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { backendFetch } from "../api/backend";
import { addMyComplaintId, clearMyComplaintIds, getMyComplaintIds } from "../api/storage";

const STATUS_ORDER = {
  new: 0,
  acknowledged: 1,
  assigned: 2,
  in_progress: 3,
  resolved: 4,
};

const STEPS = [
  { key: "acknowledged", label: "Acknowledged", icon: "checkmark-circle" },
  { key: "assigned", label: "Assigned", icon: "person-add" },
  { key: "in_progress", label: "Action Taken", icon: "hammer" },
  { key: "resolved", label: "Resolved", icon: "trophy" },
];

function ProgressBar({ percent }) {
  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${Math.min(100, Math.max(0, percent))}%` }]} />
    </View>
  );
}

export default function TrackingScreen({ route }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(() => complaints.find((c) => c.complaintId === selectedId) || null, [complaints, selectedId]);

  const [tab, setTab] = useState("active"); // active | completed

  const [manualId, setManualId] = useState("");
  const [ackMessage, setAckMessage] = useState("");
  const { width } = useWindowDimensions();
  const detailsTitleSize = width < 360 ? 15 : 16;

  const refresh = async () => {
    try {
      setLoading(true);
      setError("");
      const ids = await getMyComplaintIds();
      const toFetch = ids.slice(0, 10);
      const results = [];
      for (const id of toFetch) {
        try {
          const data = await backendFetch(`/api/complaints/${id}`);
          if (data?.complaint) results.push(data.complaint);
        } catch {
          // Skip individual fetch failures
        }
      }
      setComplaints(results);
      if (!selectedId && results[0]) setSelectedId(results[0].complaintId);
    } catch (e) {
      setError(e?.message || "Failed to load tracking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (route?.params?.complaintId) {
        await addMyComplaintId(route.params.complaintId);
        setSelectedId(route.params.complaintId);
        if (route.params?.justSubmittedAck) setAckMessage(route.params.justSubmittedAck);
        setTimeout(() => setAckMessage(""), 3500);
      }
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.complaintId]);

  const lists = useMemo(() => {
    const active = [];
    const completed = [];
    for (const c of complaints) {
      if (c.status === "resolved") completed.push(c);
      else active.push(c);
    }
    return { active, completed };
  }, [complaints]);

  const listData = tab === "active" ? lists.active : lists.completed;

  async function trackByManualId() {
    try {
      setError("");
      const id = manualId.trim();
      if (!id) return;
      await addMyComplaintId(id);
      setManualId("");
      setSelectedId(id);
      await refresh();
    } catch (e) {
      setError(e?.message || "Tracking failed");
    }
  }

  const progress = useMemo(() => {
    if (!selected) return 0;
    const order = STATUS_ORDER[selected.status] ?? 0;
    return (order / 4) * 100;
  }, [selected]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {ackMessage ? (
          <View style={styles.banner}>
            <Ionicons name="checkmark-circle" size={18} color="#0f766e" />
            <Text style={styles.bannerText}>{ackMessage}</Text>
          </View>
        ) : null}

        <View style={styles.segment}>
          <Pressable style={[styles.segBtn, tab === "active" && styles.segBtnActive]} onPress={() => setTab("active")}>
            <Text style={[styles.segText, tab === "active" && styles.segTextActive]}>
              Active ({lists.active.length})
            </Text>
          </Pressable>
          <Pressable style={[styles.segBtn, tab === "completed" && styles.segBtnActive]} onPress={() => setTab("completed")}>
            <Text style={[styles.segText, tab === "completed" && styles.segTextActive]}>
              Completed ({lists.completed.length})
            </Text>
          </Pressable>
        </View>

        <View style={styles.manualBox}>
          <Text style={styles.label}>Track by Complaint ID</Text>
          <View style={styles.manualRow}>
            <TextInput value={manualId} onChangeText={setManualId} placeholder="Paste complaint ID here…" style={styles.manualInput} autoCapitalize="none" />
            <Pressable style={[styles.manualBtn, !manualId.trim() && { opacity: 0.5 }]} onPress={trackByManualId} disabled={!manualId.trim()}>
              <Ionicons name="search" size={16} color="#fff" />
              <Text style={styles.manualBtnText}>Track</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#2563eb" />
            <Text style={styles.small}>Loading your complaints…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.small, { color: "crimson" }]}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={refresh}>
              <Text style={styles.retryBtnText}>↻ Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item) => item.complaintId}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => {
              const isSelected = item.complaintId === selectedId;
              const sc = { new: "#991b1b", acknowledged: "#92400e", assigned: "#6b21a8", in_progress: "#1e40af", resolved: "#065f46" };
              return (
                <Pressable
                  onPress={() => setSelectedId(item.complaintId)}
                  style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                >
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>#{item.complaintId}</Text>
                      <Text style={styles.itemCategory}>{item.category || "General"}</Text>
                    </View>
                    <View style={[styles.itemStatusBadge, { backgroundColor: (sc[item.status] || "#94a3b8") + "18" }]}>
                      <Text style={[styles.itemStatusText, { color: sc[item.status] || "#94a3b8" }]}>
                        {(item.status || "new").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemDesc} numberOfLines={1}>{item.description || "—"}</Text>
                  <Text style={styles.itemMeta}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="clipboard-outline" size={36} color="#cbd5e1" />
                <Text style={styles.small}>No complaints in this tab.</Text>
              </View>
            }
          />
        )}

        {selected ? (
          <View style={styles.details}>
            <Text style={[styles.detailsTitle, { fontSize: detailsTitleSize }]} numberOfLines={1}>
              Progress
            </Text>
            <ProgressBar percent={progress} />
            <Text style={styles.percentText}>{Math.round(progress)}%</Text>

            <View style={{ gap: 10, marginTop: 10 }}>
              {STEPS.map((s) => {
                const done = (STATUS_ORDER[selected.status] ?? 0) >= (STATUS_ORDER[s.key] ?? 0);
                return (
                  <View key={s.key} style={styles.stepRow}>
                    <Ionicons
                      name={done ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={done ? "#16a34a" : "#cbd5e1"}
                    />
                    <Text style={[styles.stepText, done && { color: "#16a34a" }]}>{s.label}</Text>
                  </View>
                );
              })}
            </View>

            <Text
              style={[styles.detailsTitle, { fontSize: detailsTitleSize, marginTop: 18 }]}
              numberOfLines={1}
            >
              Timeline
            </Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {[...(selected.updates || [])].map((u, idx) => (
                <View key={`${u.status}-${idx}`} style={styles.timelineRow}>
                  <View style={styles.timelineHeader}>
                    <Ionicons
                      name={u.actorType === "ngo" ? "people" : u.actorType === "authority" ? "shield" : "time"}
                      size={14}
                      color={u.actorType === "ngo" ? "#0f766e" : u.actorType === "authority" ? "#1e40af" : "#94a3b8"}
                    />
                    <Text style={styles.timelineStatus}>
                      {(u.status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                  </View>
                  <Text style={styles.timelineMeta}>
                    {u.actorType === "ngo" ? "NGO Partner" : u.actorType === "authority" ? "Authority" : "System"} •{" "}
                    {new Date(u.createdAt).toLocaleString()}
                  </Text>
                  {u.note ? <Text style={styles.timelineNote}>{u.note}</Text> : null}
                </View>
              ))}
            </View>

            {/* NGO Actions */}
            {selected.actions?.filter((a) => a.source === "NGO").length > 0 && (
              <>
                <Text style={[styles.detailsTitle, { fontSize: detailsTitleSize, marginTop: 18 }]}>
                  NGO Support Actions
                </Text>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {selected.actions.filter((a) => a.source === "NGO").map((a, i) => (
                    <View key={`ngo-${i}`} style={[styles.timelineRow, { borderLeftWidth: 3, borderLeftColor: "#0f766e" }]}>
                      <Text style={[styles.timelineStatus, { color: "#0f766e" }]}>{a.title}</Text>
                      <Text style={styles.timelineMeta}>
                        {a.organizationName || "NGO"} • {a.actionType?.replace(/_/g, " ")}
                      </Text>
                      {a.description ? <Text style={styles.timelineNote}>{a.description}</Text> : null}
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        ) : null}

        {complaints.length > 0 && (
          <Pressable onPress={async () => { await clearMyComplaintIds(); setComplaints([]); setSelectedId(null); }} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={14} color="#64748b" />
            <Text style={styles.clearBtnText}>Clear saved IDs</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 14, flexGrow: 1 },
  banner: { backgroundColor: "#ecfeff", borderWidth: 1, borderColor: "#99f6e4", padding: 12, borderRadius: 12, flexDirection: "row", gap: 8, alignItems: "center" },
  bannerText: { fontWeight: "800", color: "#0f766e", flex: 1 },
  segment: { flexDirection: "row", gap: 4, backgroundColor: "#f1f5f9", padding: 4, borderRadius: 14 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: "transparent" },
  segBtnActive: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbeafe", elevation: 1 },
  segText: { fontWeight: "800", color: "#64748b" },
  segTextActive: { color: "#2563eb" },
  manualBox: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12, backgroundColor: "#fff" },
  label: { fontWeight: "800", color: "#111827", marginBottom: 8 },
  manualRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  manualInput: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 10, backgroundColor: "#f8fafc", fontSize: 13 },
  manualBtn: { backgroundColor: "#2563eb", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, flexDirection: "row", gap: 6, alignItems: "center" },
  manualBtnText: { color: "#fff", fontWeight: "900" },
  center: { alignItems: "center", justifyContent: "center", gap: 8, padding: 18 },
  small: { color: "#64748b" },
  retryBtn: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryBtnText: { color: "#fff", fontWeight: "800" },

  // Complaint items
  itemCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12, backgroundColor: "#fff", gap: 4 },
  itemCardSelected: { borderColor: "#93c5fd", backgroundColor: "#eff6ff" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemTitle: { fontWeight: "900", fontSize: 14 },
  itemCategory: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  itemStatusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  itemStatusText: { fontSize: 11, fontWeight: "800" },
  itemDesc: { fontSize: 13, color: "#475569" },
  itemMeta: { color: "#94a3b8", fontSize: 12 },

  // Details
  details: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, padding: 14, backgroundColor: "#fff" },
  detailsTitle: { fontWeight: "900", flexShrink: 1, flexWrap: "wrap" },
  progressOuter: { height: 10, width: "100%", backgroundColor: "#e2e8f0", borderRadius: 999, overflow: "hidden", marginTop: 10 },
  progressInner: { height: 10, backgroundColor: "#2563eb", borderRadius: 999 },
  percentText: { marginTop: 8, fontWeight: "900", color: "#0f172a" },
  stepRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  stepText: { fontWeight: "700", color: "#475569" },
  timelineRow: { padding: 10, borderRadius: 10, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0" },
  timelineHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  timelineStatus: { fontWeight: "900" },
  timelineMeta: { color: "#64748b", marginTop: 4, fontSize: 12 },
  timelineNote: { marginTop: 6, color: "#334155", fontSize: 13 },
  clearBtn: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  clearBtnText: { color: "#64748b", fontSize: 13 },
});
