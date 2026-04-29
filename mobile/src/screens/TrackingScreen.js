import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

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
  { key: "acknowledged", label: "Acknowledged" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "Action" },
  { key: "resolved", label: "Resolution" },
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
        // Sequential for simpler MVP reliability on slower devices.
        const data = await backendFetch(`/api/complaints/${id}`);
        if (data?.complaint) results.push(data.complaint);
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
            <Text style={styles.bannerText}>{ackMessage}</Text>
          </View>
        ) : null}

        <View style={styles.segment}>
          <Pressable style={[styles.segBtn, tab === "active" && styles.segBtnActive]} onPress={() => setTab("active")}>
            <Text style={styles.segText}>Active</Text>
          </Pressable>
          <Pressable style={[styles.segBtn, tab === "completed" && styles.segBtnActive]} onPress={() => setTab("completed")}>
            <Text style={styles.segText}>Completed</Text>
          </Pressable>
        </View>

        <View style={styles.manualBox}>
          <Text style={styles.label}>Track by Complaint ID</Text>
          <View style={styles.manualRow}>
            <TextInput value={manualId} onChangeText={setManualId} placeholder="e.g. 123e4567..." style={styles.manualInput} />
            <Pressable style={styles.manualBtn} onPress={trackByManualId}>
              <Text style={styles.manualBtnText}>Track</Text>
            </Pressable>
          </View>
          <Pressable onPress={async () => { await clearMyComplaintIds(); await refresh(); }} style={{ marginTop: 8 }}>
            <Text style={{ color: "#64748b" }}>Clear saved IDs</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.small}>Loading your complaints…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.small, { color: "crimson" }]}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item) => item.complaintId}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => {
              const isSelected = item.complaintId === selectedId;
              return (
                <Pressable
                  onPress={() => setSelectedId(item.complaintId)}
                  style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                >
                  <Text style={styles.itemTitle}>{item.complaintId}</Text>
                  <Text style={styles.itemMeta}>
                    {new Date(item.createdAt).toLocaleDateString()} • {item.status?.replace("_", " ")}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.small}>No complaints in this tab.</Text>}
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
                    <Text style={[styles.stepIcon, { color: done ? "#16a34a" : "#94a3b8" }]}>{done ? "X" : "O"}</Text>
                    <Text style={styles.stepText}>{s.label}</Text>
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
                  <Text style={styles.timelineStatus}>{u.status?.replace("_", " ")}</Text>
                  <Text style={styles.timelineMeta}>
                    {u.actorType === "authority" ? "Authority" : u.actorType === "citizen" ? "Citizen" : "System"} •{" "}
                    {new Date(u.createdAt).toLocaleString()}
                  </Text>
                  {u.note ? <Text style={styles.timelineNote}>{u.note}</Text> : null}
                  {u.proofUrl ? <Text style={styles.timelineNote}>Proof: {u.proofUrl}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 14, flexGrow: 1 },
  banner: { backgroundColor: "#ecfeff", borderWidth: 1, borderColor: "#99f6e4", padding: 12, borderRadius: 12 },
  bannerText: { fontWeight: "800", color: "#0f766e" },
  segment: { flexDirection: "row", gap: 10, backgroundColor: "#f1f5f9", padding: 6, borderRadius: 14 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: "transparent" },
  segBtnActive: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbeafe" },
  segText: { fontWeight: "800", color: "#0f172a" },
  manualBox: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, backgroundColor: "#fafafa" },
  label: { fontWeight: "800", color: "#111827", marginBottom: 8 },
  manualRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  manualInput: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, backgroundColor: "#fff" },
  manualBtn: { backgroundColor: "#2563eb", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10 },
  manualBtnText: { color: "#fff", fontWeight: "900" },
  center: { alignItems: "center", justifyContent: "center", gap: 8, padding: 18 },
  small: { color: "#64748b" },
  itemCard: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, backgroundColor: "#fff" },
  itemCardSelected: { borderColor: "#93c5fd", backgroundColor: "#eff6ff" },
  itemTitle: { fontWeight: "900", fontSize: 14 },
  itemMeta: { color: "#64748b", marginTop: 4 },
  details: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, backgroundColor: "#fff" },
  detailsTitle: { fontWeight: "900", flexShrink: 1, flexWrap: "wrap" },
  progressOuter: { height: 10, width: "100%", backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: 10 },
  progressInner: { height: 10, backgroundColor: "#2563eb" },
  percentText: { marginTop: 8, fontWeight: "900", color: "#0f172a" },
  stepRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  stepIcon: { fontSize: 18, fontWeight: "900" },
  stepText: { fontWeight: "800" },
  timelineRow: { padding: 10, borderRadius: 10, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e5e7eb" },
  timelineStatus: { fontWeight: "900" },
  timelineMeta: { color: "#64748b", marginTop: 4, fontSize: 12 },
  timelineNote: { marginTop: 6, color: "#334155" },
});

