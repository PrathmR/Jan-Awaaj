import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

import { backendFetch, getBackendUrl } from "../api/backend";
import { useLanguage } from "../i18n";

// ─── Constants ────────────────────────────────────────────────────────────────

const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

const STATUS_COLORS = {
  resolved:    { bg: "#d1fae5", fg: "#065f46" },
  in_progress: { bg: "#dbeafe", fg: "#1e40af" },
  assigned:    { bg: "#e9d5ff", fg: "#6b21a8" },
  acknowledged:{ bg: "#fef3c7", fg: "#92400e" },
  new:         { bg: "#fee2e2", fg: "#991b1b" },
  pending:     { bg: "#fef3c7", fg: "#92400e" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Resolve relative image URLs to full backend URLs
function resolveMediaUrl(url, baseUrl) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

// ─── Language Dropdown Logo ───────────────────────────────────────────────────

function LanguageLogo({ language, setLanguage }) {
  const [open, setOpen] = useState(false);
  const current = LANG_OPTIONS.find((o) => o.code === language) || LANG_OPTIONS[0];

  return (
    <View style={styles.logoWrap}>
      {/* "JA" monogram + current language pill — tap to open dropdown */}
      <Pressable style={styles.logoPressable} onPress={() => setOpen(true)}>
        <View style={styles.logoMonogram}>
          <Text style={styles.logoMonogramText}>JA</Text>
        </View>
        <View style={styles.logoLangPill}>
          <Text style={styles.logoLangPillText}>{current.label}</Text>
          <Ionicons name="chevron-down" size={12} color="#bfdbfe" style={{ marginLeft: 3 }} />
        </View>
      </Pressable>

      {/* Dropdown modal */}
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Select Language</Text>
            {LANG_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.code}
                style={[styles.dropdownItem, language === opt.code && styles.dropdownItemActive]}
                onPress={() => {
                  setLanguage(opt.code);
                  setOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, language === opt.code && styles.dropdownItemTextActive]}>
                  {opt.label}
                </Text>
                {language === opt.code && (
                  <Ionicons name="checkmark" size={16} color="#2563eb" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const label = status
    ? status.split("_").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ")
    : "Pending";
  return (
    <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.fg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

function CategoryTag({ category }) {
  if (!category) return null;
  return (
    <View style={styles.categoryTag}>
      <Text style={styles.categoryTagText}>{category}</Text>
    </View>
  );
}

// ─── Comment Section ──────────────────────────────────────────────────────────

function CommentSection({ postId, initialComments, t }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [comments, setComments] = useState(initialComments || []);

  async function sendComment() {
    if (!text.trim()) return;
    try {
      setSending(true);
      const result = await backendFetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      setText("");
      // Update comments from server response
      if (result?.comments) {
        setComments(result.comments);
      } else {
        // Optimistic: add locally
        setComments((prev) => [...prev, { text: text.trim(), createdAt: new Date().toISOString() }]);
      }
    } catch {
      // silent fail MVP
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.commentBox}>
      {/* Show existing comments */}
      {comments.length > 0 && (
        <View style={styles.commentList}>
          {comments.slice(-5).map((c, i) => (
            <View key={`comment-${i}`} style={styles.commentItem}>
              <Ionicons name="chatbubble-ellipses" size={12} color="#94a3b8" />
              <Text style={styles.commentItemText}>{c.text}</Text>
            </View>
          ))}
          {comments.length > 5 && (
            <Text style={styles.commentMore}>
              +{comments.length - 5} more comments
            </Text>
          )}
        </View>
      )}

      {/* Comment input */}
      <View style={styles.commentRow}>
        <TextInput
          style={styles.commentInput}
          placeholder={t("addComment")}
          value={text}
          onChangeText={setText}
          editable={!sending}
        />
        <Pressable
          style={[styles.commentSendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
          onPress={sendComment}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.commentSendText}>{t("send")}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ item, onVote, t, baseUrl }) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [votes, setVotes] = useState({
    up: item.voteCounts?.up ?? 0,
    down: item.voteCounts?.down ?? 0,
  });
  const [voted, setVoted] = useState(null);

  // Resolve photo URL — could be from post or complaint
  const photoUrl = resolveMediaUrl(item.photoUrl || item.complaintPhotoUrl, baseUrl);
  const isVoice = item.text === "Voice complaint" || item.complaintDescription === "Voice complaint";
  const displayText = (item.text && item.text !== "Voice complaint") ? item.text :
                      (item.complaintDescription && item.complaintDescription !== "Voice complaint") ?
                      item.complaintDescription : item.text || "—";
  const commentCount = item.comments?.length ?? 0;

  async function handleVote(value) {
    if (voted === value) return;
    setVoted(value);
    setVotes((v) => ({
      ...v,
      [value]: v[value] + 1,
      ...(voted ? { [voted]: v[voted] - 1 } : {}),
    }));
    // Call server and update from response
    const result = await onVote(item.postId, value);
    if (result?.voteCounts) {
      setVotes(result.voteCounts);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardMeta}>
        <CategoryTag category={item.category} />
        <StatusPill status={item.complaintStatus} />
      </View>

      {/* Photo/Image */}
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.thumb} />
      ) : null}

      {/* Voice indicator */}
      {isVoice && !photoUrl ? (
        <View style={styles.voiceIndicator}>
          <Ionicons name="mic" size={28} color="#2563eb" />
          <Text style={styles.voiceIndicatorText}>🎙️ Voice Complaint</Text>
        </View>
      ) : null}

      <Text style={styles.cardText} numberOfLines={3}>{displayText}</Text>
      <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleString()}</Text>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionBtn, voted === "up" && styles.actionBtnActive]}
          onPress={() => handleVote("up")}
        >
          <Text style={[styles.actionText, voted === "up" && styles.actionTextActive]}>
            {t("support")}
          </Text>
          <Text style={[styles.voteCount, voted === "up" && { color: "#2563eb" }]}>
            {votes.up}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, voted === "down" && styles.actionBtnActiveRed]}
          onPress={() => handleVote("down")}
        >
          <Text style={[styles.actionText, voted === "down" && styles.actionTextActiveRed]}>
            {t("disagree")}
          </Text>
          <Text style={[styles.voteCount, voted === "down" && { color: "#dc2626" }]}>
            {votes.down}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, commentOpen && styles.actionBtnActiveGray]}
          onPress={() => setCommentOpen((o) => !o)}
        >
          <Text style={styles.actionText}>
            {t("comment")} {commentCount > 0 ? `(${commentCount})` : ""}
          </Text>
        </Pressable>
      </View>

      {commentOpen && (
        <CommentSection
          postId={item.postId}
          initialComments={item.comments || []}
          t={t}
        />
      )}
    </View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { language, setLanguage, t } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);
  const [baseUrl, setBaseUrl] = useState("");

  const radiusKm = 3;

  // Get backend URL for resolving media paths
  useEffect(() => {
    (async () => {
      const url = await getBackendUrl();
      setBaseUrl(url);
    })();
  }, []);

  // Fetch location
  const fetchLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error("Location permission not granted");
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      return { lat: loc.coords.latitude, lon: loc.coords.longitude };
    } catch (e) {
      throw e;
    }
  }, []);

  // Fetch posts
  const fetchPosts = useCallback(async (loc) => {
    if (!loc) return;
    const ep = `/api/posts?nearby=${loc.lat},${loc.lon}&radiusKm=${radiusKm}`;
    const data = await backendFetch(ep);
    setPosts(Array.isArray(data?.posts) ? data.posts : []);
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const loc = await fetchLocation();
        if (!mounted) return;
        await fetchPosts(loc);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || t("errorLoadingFeed"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const loc = coords || (await fetchLocation());
      await fetchPosts(loc);
    } catch (e) {
      setError(e?.message || t("errorLoadingFeed"));
    } finally {
      setRefreshing(false);
    }
  }, [coords, fetchLocation, fetchPosts, t]);

  // Retry handler (used from error state)
  const onRetry = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const loc = coords || (await fetchLocation());
      await fetchPosts(loc);
    } catch (e) {
      setError(e?.message || t("errorLoadingFeed"));
    } finally {
      setLoading(false);
    }
  }, [coords, fetchLocation, fetchPosts, t]);

  const handleVote = useCallback(async (postId, value) => {
    try {
      const result = await backendFetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      return result; // Return server response so PostCard can update
    } catch {
      return null;
    }
  }, []);

  return (
    <View style={styles.root}>
      {/* ── Hero ── */}
      <View style={styles.hero}>
        {/* Logo row: monogram+dropdown left, title center */}
        <View style={styles.heroTopRow}>
          <LanguageLogo language={language} setLanguage={setLanguage} />
          <Text style={styles.appTitle}>{t("appTitle")}</Text>
          <View style={{ width: 80 }} />{/* spacer to center title */}
        </View>

        <Text style={styles.heroSub}>{t("homeTitle")}</Text>

        <Pressable style={styles.ctaBtn} onPress={() => navigation.navigate("FileComplaint")}>
          <Text style={styles.ctaBtnText}>{t("fileComplaintCTA")}</Text>
        </Pressable>
      </View>

      {/* ── Authority ── */}
      <Pressable
        style={styles.authorityBtn}
        onPress={() => navigation.navigate("Authority")}
      >
        <Ionicons name="shield-checkmark" size={16} color="#0f766e" style={{ marginRight: 8 }} />
        <Text style={styles.authorityBtnText}>Sign In as Authority</Text>
      </Pressable>

      {/* ── Feed ── */}
      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>{t("feedTitle")}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.muted}>{t("loading")}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Pressable style={styles.retryBtn} onPress={onRetry}>
            <Text style={styles.retryBtnText}>↻ Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.postId}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />
          }
          renderItem={({ item }) => (
            <PostCard item={item} onVote={handleVote} t={t} baseUrl={baseUrl} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.muted}>{t("noPosts")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },

  // Hero
  hero: {
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "web" ? 20 : 14,
    paddingBottom: 18,
    gap: 10,
  },
  authorityBtn: {
    backgroundColor: "#ccfbf1",
    borderRadius: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0f766e",
  },
  authorityBtnText: { color: "#0f766e", fontWeight: "900", fontSize: 14 },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
    flex: 1,
  },

  // Language Logo
  logoWrap: {},
  logoPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logoMonogram: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
  logoMonogramText: { color: "#1e3a8a", fontWeight: "900", fontSize: 11 },
  logoLangPill: { flexDirection: "row", alignItems: "center" },
  logoLangPillText: { color: "#bfdbfe", fontSize: 12, fontWeight: "700" },

  // Dropdown Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-start",
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    width: 200,
  },
  dropdownTitle: {
    fontWeight: "700",
    color: "#1e293b",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  dropdownItemActive: { backgroundColor: "#eff6ff" },
  dropdownItemText: { fontSize: 14, color: "#475569", fontWeight: "600" },
  dropdownItemTextActive: { color: "#2563eb" },

  // Hero sub
  heroSub: { color: "#bfdbfe", fontSize: 13, textAlign: "center" },
  ctaBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 2,
    alignItems: "center",
    shadowColor: "#f59e0b",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaBtnText: { color: "#1e3a8a", fontWeight: "900", fontSize: 16 },

  // Feed
  feedHeader: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#f1f5f9" },
  feedTitle: { fontWeight: "800", fontSize: 15, color: "#1e293b", letterSpacing: 0.3 },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 12 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 8,
  },
  cardMeta: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  categoryTag: { backgroundColor: "#eff6ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  categoryTagText: { color: "#1d4ed8", fontWeight: "700", fontSize: 12 },
  pill: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontWeight: "700", fontSize: 12 },
  thumb: { width: "100%", height: 170, borderRadius: 12, backgroundColor: "#f3f4f6", resizeMode: "cover" },
  cardText: { fontSize: 15, color: "#1e293b", lineHeight: 22 },
  timestamp: { fontSize: 12, color: "#94a3b8" },

  // Voice indicator
  voiceIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  voiceIndicatorText: { color: "#1d4ed8", fontWeight: "700", fontSize: 14 },

  // Actions
  actionRow: { flexDirection: "row", gap: 8, marginTop: 2, flexWrap: "wrap" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionBtnActive: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  actionBtnActiveRed: { backgroundColor: "#fff1f2", borderColor: "#fecaca" },
  actionBtnActiveGray: { backgroundColor: "#f1f5f9", borderColor: "#cbd5e1" },
  actionText: { fontSize: 13, color: "#475569", fontWeight: "600" },
  actionTextActive: { color: "#2563eb" },
  actionTextActiveRed: { color: "#dc2626" },
  voteCount: { fontWeight: "800", fontSize: 13, color: "#475569" },

  // Comment
  commentBox: { marginTop: 4, gap: 8 },
  commentList: { gap: 6, backgroundColor: "#f8fafc", borderRadius: 10, padding: 10 },
  commentItem: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  commentItemText: { color: "#334155", fontSize: 13, flex: 1, lineHeight: 18 },
  commentMore: { color: "#94a3b8", fontSize: 12, fontStyle: "italic", marginTop: 2 },
  commentRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#f8fafc",
  },
  commentSendBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  commentSendText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // States
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  muted: { color: "#94a3b8", fontSize: 14, textAlign: "center" },
  errorText: { color: "#dc2626", fontWeight: "700", fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyIcon: { fontSize: 42 },
  retryBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 6,
  },
  retryBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
