import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getBackendUrl, setBackendUrl } from "../api/backend";
import { clearMyComplaintIds, getMyComplaintIds } from "../api/storage";

export default function ProfileScreen() {
  const [backendUrl, setBackendUrlValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [complaintsCount, setComplaintsCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const url = await getBackendUrl();
        const ids = await getMyComplaintIds();
        if (!mounted) return;
        setBackendUrlValue(url);
        setComplaintsCount(ids.length);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function saveUrl() {
    try {
      const trimmed = backendUrl.trim();
      if (!trimmed) return;
      await setBackendUrl(trimmed);
    } catch {
      // no-op for MVP
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>Backend URL</Text>
            <Text style={styles.help}>Used to connect the app to your Express API.</Text>
            <TextInput value={backendUrl} onChangeText={setBackendUrlValue} style={styles.input} />
            <Pressable style={styles.btn} onPress={saveUrl}>
              <Text style={styles.btnText}>Save</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>My Complaints (on this device)</Text>
            <Text style={styles.help}>{complaintsCount} saved complaint IDs</Text>
            <Pressable
              style={[styles.btn, { backgroundColor: "#ef4444" }]}
              onPress={async () => {
                await clearMyComplaintIds();
                setComplaintsCount(0);
              }}
            >
              <Text style={styles.btnText}>Clear IDs</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Notifications</Text>
            <Text style={styles.help}>MVP placeholder. Push notifications will come in a later iteration.</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 14, backgroundColor: "#fff", flexGrow: 1 },
  center: { padding: 18, alignItems: "center" },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, backgroundColor: "#fff" },
  label: { fontWeight: "900", marginBottom: 8 },
  help: { color: "#64748b", marginBottom: 10, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, backgroundColor: "#f9fafb", marginBottom: 12 },
  btn: { backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "900" },
});

