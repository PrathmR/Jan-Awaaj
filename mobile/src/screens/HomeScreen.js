import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";

import { backendFetch } from "../api/backend";

function StatusPill({ status }) {
  const bg =
    status === "resolved"
      ? "#d1fae5"
      : status === "in_progress"
        ? "#dbeafe"
        : status === "assigned"
          ? "#e9d5ff"
          : "#fef3c7";
  const fg =
    status === "resolved"
      ? "#065f46"
      : status === "in_progress"
        ? "#1d4ed8"
        : status === "assigned"
          ? "#6b21a8"
          : "#92400e";
  const label = status
    ? status
        .split("_")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ")
    : "—";

  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: fg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);

  const radiusKm = 3;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          throw new Error("Location permission not granted");
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!mounted) return;
        setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to get location");
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const endpoint = useMemo(() => {
    if (!coords) return null;
    return `/api/posts?nearby=${coords.lat},${coords.lon}&radiusKm=${radiusKm}`;
  }, [coords]);

  useEffect(() => {
    if (!endpoint) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await backendFetch(endpoint);
        if (!mounted) return;
        setPosts(Array.isArray(data?.posts) ? data.posts : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load feed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [endpoint]);

  async function vote(postId, value) {
    try {
      await backendFetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      // Refresh quickly for MVP.
      if (endpoint) {
        const data = await backendFetch(endpoint);
        setPosts(Array.isArray(data?.posts) ? data.posts : []);
      }
    } catch (e) {
      setError(e?.message || "Vote failed");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle} numberOfLines={2}>
          Community Feed
        </Text>
        <Text style={styles.heroSub} numberOfLines={2}>
          See shared grievances near you
        </Text>
        <Pressable style={styles.fileButton} onPress={() => navigation.navigate("FileComplaint")}>
          <Text style={styles.fileButtonText}>File Complaint</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.small}>Loading posts…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.small, { color: "crimson" }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.postId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.thumb} /> : null}
              <Text style={styles.cardText}>{item.text}</Text>
              <View style={styles.row}>
                <StatusPill status={item.complaintStatus} />
                <Text style={styles.muted}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.voteRow}>
                <Pressable onPress={() => vote(item.postId, "up")} style={styles.voteBtn}>
                  <Text style={styles.voteText}>UP</Text>
                  <Text style={styles.voteCount}>{item.voteCounts?.up ?? 0}</Text>
                </Pressable>
                <Pressable onPress={() => vote(item.postId, "down")} style={styles.voteBtn}>
                  <Text style={styles.voteText}>DOWN</Text>
                  <Text style={styles.voteCount}>{item.voteCounts?.down ?? 0}</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.small}>No shared grievances found nearby.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#f8fbff",
  },
  heroTitle: { fontWeight: "700", marginBottom: 6, flexShrink: 1, flexWrap: "wrap", fontSize: 16, maxWidth: "100%" },
  heroSub: {
    color: "#555",
    marginBottom: 12,
    flexShrink: 1,
    flexWrap: "wrap",
    fontSize: 13,
    maxWidth: "100%",
  },
  fileButton: { backgroundColor: "#2563eb", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10 },
  fileButtonText: { color: "#fff", fontWeight: "700" },
  list: { padding: 12, gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
  },
  thumb: { width: "100%", height: 160, borderRadius: 10, backgroundColor: "#f2f2f2", marginBottom: 8 },
  cardText: { fontSize: 15, marginBottom: 8, color: "#111" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  muted: { color: "#666" },
  pill: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontWeight: "700", fontSize: 12 },
  voteRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  voteBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "#f3f4f6", borderRadius: 10 },
  voteText: { fontSize: 16 },
  voteCount: { fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  small: { color: "#666" },
});

