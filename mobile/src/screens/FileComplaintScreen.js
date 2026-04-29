import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
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
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";

import { getBackendUrl, backendFetch } from "../api/backend";
import { addMyComplaintId } from "../api/storage";
import { useLanguage } from "../i18n";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_KEYS = [
  { key: "category_PublicWorks",  value: "Public Works" },
  { key: "category_WaterSupply",  value: "Water Supply" },
  { key: "category_Electricity",  value: "Electricity" },
  { key: "category_Roads",        value: "Roads & Transport" },
  { key: "category_Health",       value: "Health Services" },
  { key: "category_Education",    value: "Education" },
  { key: "category_Sanitation",   value: "Sanitation" },
  { key: "category_Other",        value: "Other" },
];

// ─── Mode Toggle ──────────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange, t }) {
  return (
    <View style={styles.modeRow}>
      {["voice", "text"].map((m) => (
        <Pressable
          key={m}
          style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
          onPress={() => onChange(m)}
        >
          <Ionicons
            name={m === "voice" ? "mic" : "create-outline"}
            size={18}
            color={mode === m ? "#fff" : "#64748b"}
          />
          <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
            {m === "voice" ? t("voiceMode") : t("textMode")}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Voice Recorder ───────────────────────────────────────────────────────────

function VoiceRecorder({ t, onRecordingComplete }) {
  const recordingRef = useRef(null);
  const soundRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);     // ms
  const [position, setPosition] = useState(0);     // ms
  const [permissionGranted, setPermissionGranted] = useState(false);
  const intervalRef = useRef(null);

  // Request mic permission on mount
  useEffect(() => {
    (async () => {
      const { granted } = await Audio.requestPermissionsAsync();
      setPermissionGranted(granted);
      // Configure audio session for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();
    return () => {
      cleanupSound();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function cleanupSound() {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch { /* ignore */ }
      soundRef.current = null;
    }
  }

  async function startRecording() {
    if (!permissionGranted) return;
    try {
      await cleanupSound();
      recordingRef.current = new Audio.Recording();
      await recordingRef.current.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recordingRef.current.startAsync();
      setIsRecording(true);
      setAudioUri(null);
      if (onRecordingComplete) onRecordingComplete(null);
      setPosition(0);
      // Tick duration while recording
      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1000);
      }, 1000);
    } catch (e) {
      console.warn("Recording failed:", e);
    }
  }

  async function stopRecording() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setAudioUri(uri);
      if (onRecordingComplete) onRecordingComplete(uri);
    } catch (e) {
      console.warn("Stop recording failed:", e);
    }
    recordingRef.current = null;
    setIsRecording(false);
  }

  async function togglePlayback() {
    if (isPlaying) {
      await soundRef.current?.pauseAsync();
      setIsPlaying(false);
      return;
    }
    try {
      if (!soundRef.current) {
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true },
          (s) => {
            setPosition(s.positionMillis || 0);
            setDuration(s.durationMillis || duration);
            if (s.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
              soundRef.current = null;
            }
          }
        );
        soundRef.current = sound;
      } else {
        await soundRef.current.playAsync();
      }
      setIsPlaying(true);
    } catch (e) {
      console.warn("Playback failed:", e);
    }
  }

  function formatMs(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  }

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <View style={styles.voiceArea}>
      {/* Big mic / stop button */}
      <Pressable
        style={[styles.micBtn, isRecording && styles.micBtnRecording]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={!permissionGranted && Platform.OS !== "web"}
      >
        <Ionicons name={isRecording ? "stop" : "mic"} size={44} color="#fff" />
      </Pressable>

      {/* Status text */}
      <Text style={[styles.micLabel, isRecording && styles.micLabelRecording]}>
        {isRecording
          ? `${t("recording")} (${formatMs(duration)})`
          : audioUri
          ? t("voiceReady")
          : t("tapMic")}
      </Text>
      <Text style={styles.micHint}>{t("micLabel")}</Text>

      {/* Recording pulse dots */}
      {isRecording && (
        <View style={styles.recordingDots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, { opacity: 0.4 + i * 0.2 }]} />
          ))}
        </View>
      )}

      {/* Playback bar (only shown after recording) */}
      {audioUri && !isRecording && (
        <View style={styles.playbackRow}>
          <Pressable style={styles.playBtn} onPress={togglePlayback}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#fff" />
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.playbackTime}>
            {formatMs(position)} / {formatMs(duration)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────

function Label({ text }) {
  return <Text style={styles.label}>{text}</Text>;
}

// ─── FileComplaintScreen ──────────────────────────────────────────────────────

export default function FileComplaintScreen({ navigation }) {
  const { t, language } = useLanguage();

  const [step, setStep] = useState(1);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const [inputMode, setInputMode] = useState("text");
  const [category, setCategory] = useState(CATEGORY_KEYS[0].value);
  const [description, setDescription] = useState("");
  const [sharePublic, setSharePublic] = useState(false);
  const [citizenPhone, setCitizenPhone] = useState("");
  const [coords, setCoords] = useState(null);
  const [media, setMedia] = useState(null); // photo OR video
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // NGO organization targeting
  const [primaryChannel, setPrimaryChannel] = useState("GOVERNMENT"); // GOVERNMENT | NGO | BOTH
  const [ngos, setNgos] = useState([]);
  const [selectedNgoId, setSelectedNgoId] = useState(null);
  const [loadingNgos, setLoadingNgos] = useState(false);

  const [voiceUri, setVoiceUri] = useState(null);

  const sharePublicValue = sharePublic === true || sharePublic === "true";

  // Auto-get location
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
    return () => { mounted = false; };
  }, []);

  // Fetch available NGOs
  useEffect(() => {
    (async () => {
      try {
        setLoadingNgos(true);
        const data = await backendFetch("/api/organizations?type=NGO");
        setNgos(Array.isArray(data?.organizations) ? data.organizations : []);
      } catch {
        // NGO list is optional
      } finally {
        setLoadingNgos(false);
      }
    })();
  }, []);

  function handleModeChange(m) {
    setInputMode(m);
    setError("");
  }

  // ── Pick photo OR video ───────────────────────────────────────────────────

  async function pickPhoto() {
    try {
      const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!res.granted) { setError("Media library permission not granted"); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3],
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      setMedia({ uri: asset.uri, type: asset.mimeType || "image/jpeg", name: asset.fileName || "photo.jpg", isVideo: false });
    } catch (e) { setError(e?.message || "Photo selection failed"); }
  }

  async function pickVideo() {
    try {
      const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!res.granted) { setError("Media library permission not granted"); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.7,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      setMedia({ uri: asset.uri, type: asset.mimeType || "video/mp4", name: asset.fileName || "video.mp4", isVideo: true });
    } catch (e) { setError(e?.message || "Video selection failed"); }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const canSummarize = inputMode === "voice" ? Boolean(voiceUri) : description.trim().length >= 5;

  const canSubmit = useMemo(() => {
    return Boolean(coords && category && description.trim().length >= 5);
  }, [coords, category, description]);

  async function summarize() {
    try {
      setIsSummarizing(true);
      setError("");

      const backendUrl = await getBackendUrl();
      const formData = new FormData();
      formData.append("language", language);

      if (inputMode === "text") {
        formData.append("description", description.trim());
      } else {
        formData.append("voice", { uri: voiceUri, type: "audio/m4a", name: "voice.m4a" });
      }

      const res = await fetch(`${backendUrl}/api/complaints/summarize`, { method: "POST", body: formData });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setDescription(data.summary);
      if (data.category) {
        setCategory(data.category);
      }
      setStep(2);
    } catch (e) {
      setError(e?.message || "Summarization failed");
    } finally {
      setIsSummarizing(false);
    }
  }

  async function submit() {
    try {
      setSubmitting(true);
      setError("");
      if (!coords) throw new Error("Location not available yet");

      const backendUrl = await getBackendUrl();
      if (backendUrl.includes("localhost") && Platform.OS !== "web") {
        throw new Error(
          "Network error: 'localhost' won't work on a real device.\n\nGo to Profile → set your computer's LAN IP (e.g. http://192.168.x.x:4000)"
        );
      }

      const formData = new FormData();
      formData.append("category", category);
      formData.append("sharePublic", String(sharePublicValue));
      formData.append("citizenPhone", citizenPhone.trim());
      formData.append("lat", String(coords.lat));
      formData.append("lon", String(coords.lon));

      formData.append("description", description.trim());
      formData.append("isSummarized", "true");
      formData.append("language", language);
      
      if (inputMode === "voice" && voiceUri) {
        formData.append("hasVoiceRecording", "true");
        formData.append("voice", { uri: voiceUri, type: "audio/m4a", name: "voice.m4a" });
      }

      if (media?.uri) {
        formData.append("photo", { uri: media.uri, type: media.type, name: media.name });
      }

      // NGO targeting
      if (primaryChannel !== "GOVERNMENT" && selectedNgoId) {
        formData.append("targetOrganizationId", selectedNgoId);
        formData.append("primaryChannel", primaryChannel);
      } else {
        formData.append("primaryChannel", primaryChannel);
      }

      const res = await fetch(`${backendUrl}/api/complaints`, { method: "POST", body: formData });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
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

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Error banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {step === 1 ? (
          <>
            {/* Mode toggle */}
            <ModeToggle mode={inputMode} onChange={handleModeChange} t={t} />

            {/* Voice recorder OR text input */}
            {inputMode === "voice" ? (
              <VoiceRecorder t={t} onRecordingComplete={setVoiceUri} />
            ) : (
              <View>
                <Label text={t("typeLabel")} />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("typeLabel")}
                  style={styles.textArea}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            )}

            <Pressable
              style={[styles.submitBtn, (!canSummarize || isSummarizing) && { opacity: 0.55 }]}
              onPress={summarize}
              disabled={!canSummarize || isSummarizing}
            >
              {isSummarizing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t("summarizeBtn")}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            {/* AI Summary View */}
            <View>
              <View style={[styles.rowBetween, { padding: 0, borderWidth: 0, marginBottom: 8 }]}>
                <Label text={t("aiSummary")} />
                <Pressable onPress={() => setStep(1)}>
                  <Text style={{ color: "#2563eb", fontWeight: "600", fontSize: 13 }}>{t("editOriginal")}</Text>
                </Pressable>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={styles.textArea}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

        {/* Category */}
        <View>
          <Label text={t("categoryLabel")} />
          <View style={styles.pickerWrap}>
            <Picker selectedValue={category} onValueChange={(v) => setCategory(v)} mode="dropdown">
              {CATEGORY_KEYS.map(({ key, value }) => (
                <Picker.Item key={value} label={t(key)} value={value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Photo / Video pickers */}
        <View>
          <Label text={t("photoVideoLabel")} />
          <View style={styles.mediaRow}>
            <Pressable style={[styles.mediaBtn, { flex: 1 }]} onPress={pickPhoto}>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.mediaBtnText}>{media && !media.isVideo ? t("changePhoto") : t("pickPhoto")}</Text>
            </Pressable>
            <Pressable style={[styles.mediaBtn, { flex: 1, backgroundColor: "#374151" }]} onPress={pickVideo}>
              <Ionicons name="videocam" size={18} color="#fff" />
              <Text style={styles.mediaBtnText}>
                {media && media.isVideo ? "Change Video" : "Pick Video"}
              </Text>
            </Pressable>
          </View>
          {media?.uri && !media.isVideo ? (
            <Image source={{ uri: media.uri }} style={styles.photoPreview} />
          ) : media?.isVideo ? (
            <View style={styles.videoPreview}>
              <Ionicons name="videocam" size={32} color="#64748b" />
              <Text style={styles.videoPreviewText}>{media.name}</Text>
            </View>
          ) : null}
        </View>

        {/* Who should receive this? */}
        <View>
          <Label text={t("whoShouldReceive")} />
          <View style={styles.channelRow}>
            {[
              { key: "GOVERNMENT", label: t("target_Government"), icon: "shield" },
              { key: "NGO", label: t("target_NGO"), icon: "people" },
              { key: "BOTH", label: t("target_Both"), icon: "git-merge" },
            ].map((ch) => (
              <Pressable
                key={ch.key}
                style={[styles.channelBtn, primaryChannel === ch.key && styles.channelBtnActive]}
                onPress={() => {
                  setPrimaryChannel(ch.key);
                  if (ch.key === "GOVERNMENT") setSelectedNgoId(null);
                }}
              >
                <Ionicons
                  name={ch.icon}
                  size={16}
                  color={primaryChannel === ch.key ? "#fff" : "#475569"}
                />
                <Text style={[styles.channelBtnText, primaryChannel === ch.key && styles.channelBtnTextActive]}>
                  {ch.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* NGO selector (only if NGO or BOTH selected) */}
          {primaryChannel !== "GOVERNMENT" && ngos.length > 0 && (
            <View style={styles.ngoSelector}>
              <Text style={styles.ngoSelectorLabel}>{t("ngoSelectorLabel")}</Text>
              {ngos.map((ngo) => (
                <Pressable
                  key={ngo.orgId}
                  style={[styles.ngoCard, selectedNgoId === ngo.orgId && styles.ngoCardSelected]}
                  onPress={() => setSelectedNgoId(ngo.orgId)}
                >
                  <View style={styles.ngoCardRow}>
                    <Ionicons
                      name={selectedNgoId === ngo.orgId ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={selectedNgoId === ngo.orgId ? "#0f766e" : "#94a3b8"}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ngoCardName}>{ngo.name}</Text>
                      <Text style={styles.ngoCardAreas}>
                        {(ngo.focusAreas || []).slice(0, 3).map((a) => a.replace(/_/g, " ")).join(", ")}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Phone */}
        <View>
          <Label text={t("phoneLabel")} />
          <TextInput
            value={citizenPhone}
            onChangeText={setCitizenPhone}
            placeholder={t("phoneLabel")}
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View>

        {/* Location */}
        <View>
          <Label text={t("locationLabel")} />
          <View style={styles.locationBox}>
            {loadingLocation ? (
              <ActivityIndicator color="#2563eb" />
            ) : coords ? (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#16a34a" />
                <Text style={styles.locationText}>
                  {t("locationCaptured")}: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
                </Text>
              </View>
            ) : (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color="#94a3b8" />
                <Text style={styles.locationTextMissing}>{t("locationUnavailable")}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Share toggle */}
        <View style={styles.rowBetween}>
          <Label text={t("sharePublicLabel")} />
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: sharePublicValue }}
            onPress={() => setSharePublic((prev) => !(prev === true || prev === "true"))}
            style={[styles.fakeSwitch, sharePublicValue && styles.fakeSwitchOn]}
          >
            <View style={[styles.fakeSwitchKnob, sharePublicValue && styles.fakeSwitchKnobOn]} />
          </Pressable>
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, (!canSubmit || submitting) && { opacity: 0.55 }]}
          onPress={submit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>{t("submitComplaint")}</Text>
            </>
          )}
        </Pressable>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
    ...(Platform.OS === "web" ? { maxWidth: 600, width: "100%", alignSelf: "center" } : {}),
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: "#dc2626", fontWeight: "600", flex: 1, lineHeight: 20 },
  modeRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeBtnActive: { backgroundColor: "#2563eb", elevation: 3 },
  modeBtnText: { fontWeight: "700", color: "#64748b", fontSize: 14 },
  modeBtnTextActive: { color: "#fff" },

  // Voice area
  voiceArea: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  micBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  micBtnRecording: { backgroundColor: "#dc2626", shadowColor: "#dc2626" },
  micLabel: { fontWeight: "700", fontSize: 15, color: "#1e293b", textAlign: "center", paddingHorizontal: 20 },
  micLabelRecording: { color: "#dc2626" },
  micHint: { fontSize: 13, color: "#94a3b8" },
  recordingDots: { flexDirection: "row", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#dc2626" },

  // Playback
  playbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    width: "100%",
    marginTop: 4,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#2563eb", borderRadius: 3 },
  playbackTime: { fontSize: 11, color: "#64748b", minWidth: 70, textAlign: "right" },

  label: { fontWeight: "700", color: "#1e293b", marginBottom: 6, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 13,
    minHeight: 48,
    backgroundColor: "#fff",
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 13,
    minHeight: 120,
    backgroundColor: "#fff",
    fontSize: 15,
  },
  pickerWrap: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" },

  // Media
  mediaRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  mediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  mediaBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  photoPreview: { width: "100%", height: 200, borderRadius: 14, backgroundColor: "#f3f4f6", resizeMode: "cover" },
  videoPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 14,
  },
  videoPreviewText: { color: "#475569", fontSize: 13, flex: 1 },

  // Channel selector
  channelRow: { flexDirection: "row", gap: 6 },
  channelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  channelBtnActive: { backgroundColor: "#0f766e", borderColor: "#0f766e" },
  channelBtnText: { fontWeight: "700", fontSize: 12, color: "#475569" },
  channelBtnTextActive: { color: "#fff" },
  ngoSelector: { marginTop: 10, gap: 8 },
  ngoSelectorLabel: { fontWeight: "700", fontSize: 13, color: "#0f766e" },
  ngoCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
  },
  ngoCardSelected: { borderColor: "#0f766e", backgroundColor: "#f0fdfa" },
  ngoCardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ngoCardName: { fontWeight: "800", fontSize: 14, color: "#1e293b" },
  ngoCardAreas: { fontSize: 12, color: "#64748b", marginTop: 2 },

  locationBox: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, backgroundColor: "#fff" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  locationText: { color: "#16a34a", fontWeight: "600", fontSize: 13, flex: 1 },
  locationTextMissing: { color: "#94a3b8", fontSize: 13 },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  fakeSwitch: {
    width: 52, height: 30, borderRadius: 999, backgroundColor: "#e2e8f0",
    padding: 3, alignItems: "flex-start", justifyContent: "center",
  },
  fakeSwitchOn: { backgroundColor: "#2563eb", alignItems: "flex-end" },
  fakeSwitchKnob: {
    width: 24, height: 24, borderRadius: 999, backgroundColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
  },
  fakeSwitchKnobOn: {},
  submitBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 6,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
