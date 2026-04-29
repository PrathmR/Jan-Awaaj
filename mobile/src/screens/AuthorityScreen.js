import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { WebView } from "react-native-webview";
import { useLanguage } from "../i18n";

export default function AuthorityScreen() {
  const [officialId, setOfficialId] = useState("");
  const [password, setPassword] = useState("");
  const [loggedInUrl, setLoggedInUrl] = useState(null);
  const [htmlContent, setHtmlContent] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const { t } = useLanguage();

  async function openDashboard() {
    setDashboardError("");
    setLoadingDashboard(true);
    try {
      const { getBackendUrl } = await import("../api/backend");
      const base = await getBackendUrl();
      const url = `${base}/authority`;

      if (Platform.OS !== "web") {
        // Fetch the HTML and inject it into WebView to avoid CORS / connection issues
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
        const text = await res.text();
        if (!text || text.length < 50) {
          throw new Error("Empty or invalid response from server");
        }
        setHtmlContent(text);
      }
      setLoggedInUrl(url);
    } catch (e) {
      let msg = e?.message || "Failed to load dashboard";
      if (e.name === "AbortError") {
        msg = "Connection timed out. Make sure the backend is running and reachable.";
      } else if (msg.includes("Network request failed")) {
        msg = "Cannot connect to the server. Check your backend URL in Profile settings.";
      }
      setDashboardError(msg);
    } finally {
      setLoadingDashboard(false);
    }
  }

  // ── Dashboard loaded: show WebView ─────────────────────────────────────────
  if (loggedInUrl) {
    if (Platform.OS === "web") {
      return (
        <iframe
          src={loggedInUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
          title="Authority Dashboard"
        />
      );
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f1f5f9" }}>
        {htmlContent ? (
          <WebView
            source={{ html: htmlContent, baseUrl: loggedInUrl }}
            style={{ flex: 1 }}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mixedContentMode="always"
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn("WebView error:", nativeEvent);
            }}
            renderError={(errorDomain, errorCode, errorDesc) => (
              <View style={styles.webviewError}>
                <Ionicons name="warning" size={36} color="#dc2626" />
                <Text style={styles.webviewErrorTitle}>Dashboard Loading Issue</Text>
                <Text style={styles.webviewErrorText}>{errorDesc || "Unknown error"}</Text>
                <Pressable
                  style={styles.retryBtn}
                  onPress={() => {
                    setLoggedInUrl(null);
                    setHtmlContent(null);
                    setDashboardError("");
                  }}
                >
                  <Text style={styles.retryBtnText}>Go Back</Text>
                </Pressable>
              </View>
            )}
          />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0f766e" />
            <Text style={styles.loadingText}>Loading dashboard…</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Login form ─────────────────────────────────────────────────────────────
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

          {/* Error banner */}
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
              value={officialId}
              onChangeText={setOfficialId}
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
            style={[styles.loginBtn, (!officialId || !password || loadingDashboard) && { opacity: 0.6 }]}
            onPress={openDashboard}
            disabled={!officialId || !password || loadingDashboard}
          >
            {loadingDashboard ? (
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

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={18} color="#1d4ed8" />
          <Text style={styles.infoText}>
            The dashboard will open directly inside this app.
          </Text>
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
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 12,
  },
  infoText: { color: "#1d4ed8", fontSize: 12, flex: 1, lineHeight: 18 },

  // Error states
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
  errorText: { color: "#dc2626", fontWeight: "600", flex: 1, lineHeight: 20, fontSize: 13 },

  // WebView error fallback
  webviewError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    padding: 32,
    gap: 12,
  },
  webviewErrorTitle: { fontSize: 17, fontWeight: "900", color: "#1e293b" },
  webviewErrorText: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 20 },
  retryBtn: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Loading state
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#64748b", fontSize: 14 },
});
