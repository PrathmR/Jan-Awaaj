import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";

import { getBackendUrl } from "../api/backend";
import { addMyComplaintId } from "../api/storage";

const CATEGORIES = [
  "Public Works",
  "Water Supply",
  "Electricity",
  "Roads & Transport",
  "Health Services",
  "Education",
  "Sanitation",
  "Other",
];

export default function FileComplaintScreen({ navigation }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [sharePublic, setSharePublic] = useState(false);
  const [citizenPhone, setCitizenPhone] = useState("");

  // React Native native views (Switch) expect a boolean.
  // If sharePublic ever becomes a string (from a future refactor or persisted state),
  // this keeps it type-safe.
  const sharePublicValue = sharePublic === true || sharePublic === "true";

  const [coords, setCoords] = useState(null);
  const [photo, setPhoto] = useState(null);

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingLocation(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") throw new Error("Location permission not granted");
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!mounted) return;
        setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to get location");
      } finally {
        if (mounted) setLoadingLocation(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(coords && category && description.trim().length >= 5);
  }, [coords, category, description]);

  async function pickPhoto() {
    try {
      const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!res.granted) {
        setError("Media library permission not granted");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3],
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      setPhoto({
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || "photo.jpg",
      });
    } catch (e) {
      setError(e?.message || "Photo selection failed");
    }
  }

  async function submit() {
    try {
      setSubmitting(true);
      setError("");
      if (!coords) throw new Error("Location not available yet");
      const trimmed = description.trim();
      if (trimmed.length < 5) throw new Error("Description must be at least 5 characters");

      const formData = new FormData();
      formData.append("category", category);
      formData.append("description", trimmed);
      formData.append("sharePublic", String(sharePublic));
      formData.append("citizenPhone", citizenPhone.trim());
      formData.append("lat", String(coords.lat));
      formData.append("lon", String(coords.lon));
      if (photo?.uri) {
        formData.append("photo", {
          uri: photo.uri,
          type: photo.type,
          name: photo.name,
        });
      }

      const backendUrl = await getBackendUrl();
      const res = await fetch(`${backendUrl}/api/complaints`, {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);

      const { complaintId, ackMessage } = data || {};
      if (!complaintId) throw new Error("Server did not return complaintId");
      await addMyComplaintId(complaintId);
      navigation.navigate("Tracking", { complaintId, justSubmittedAck: ackMessage || "" });
    } catch (e) {
      setError(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={category} onValueChange={(v) => setCategory(v)} mode="dropdown">
            {CATEGORIES.map((c) => (
              <Picker.Item key={c} label={c} value={c} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Briefly describe the issue"
          style={styles.input}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Attach Photo (optional)</Text>
        <Pressable style={styles.photoBtn} onPress={pickPhoto}>
          <Text style={styles.photoBtnText}>{photo ? "Change Photo" : "Pick Photo"}</Text>
        </Pressable>
        {photo?.uri ? <Image source={{ uri: photo.uri }} style={styles.photoPreview} /> : null}

        <Text style={styles.label}>Anonymous phone (optional)</Text>
        <TextInput
          value={citizenPhone}
          onChangeText={setCitizenPhone}
          placeholder="Mobile number (optional)"
          style={styles.input}
          keyboardType="phone-pad"
        />

        <View style={styles.rowBetween}>
          <Text style={styles.label}>Share this grievance</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: sharePublicValue }}
            onPress={() => setSharePublic((prev) => !(prev === true || prev === "true"))}
            style={[styles.fakeSwitch, sharePublicValue && styles.fakeSwitchOn]}
          >
            <View style={[styles.fakeSwitchKnob, sharePublicValue && styles.fakeSwitchKnobOn]} />
          </Pressable>
        </View>

        <View style={styles.locationBox}>
          {loadingLocation ? (
            <ActivityIndicator />
          ) : coords ? (
            <Text style={styles.locationText}>
              Location captured: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
            </Text>
          ) : (
            <Text style={styles.locationText}>Location not available</Text>
          )}
        </View>

        <Pressable
          onPress={submit}
          style={[styles.submitBtn, { opacity: canSubmit && !submitting ? 1 : 0.6 }]}
          disabled={!canSubmit || submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 14, flexGrow: 1 },
  label: { fontWeight: "700", color: "#111", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    minHeight: 44,
    backgroundColor: "#fff",
  },
  error: { color: "crimson", fontWeight: "700" },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
  },
  photoBtn: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
  photoBtnText: { color: "#fff", fontWeight: "800" },
  photoPreview: { width: "100%", height: 220, marginTop: 8, borderRadius: 12, backgroundColor: "#f3f4f6" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  locationBox: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, backgroundColor: "#f9fafb" },
  locationText: { color: "#111" },
  submitBtn: { backgroundColor: "#2563eb", borderRadius: 14, paddingVertical: 14, marginTop: 10, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  fakeSwitch: {
    width: 52,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    padding: 3,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  fakeSwitchOn: {
    backgroundColor: "#2563eb",
    alignItems: "flex-end",
  },
  fakeSwitchKnob: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  fakeSwitchKnobOn: {},
});

