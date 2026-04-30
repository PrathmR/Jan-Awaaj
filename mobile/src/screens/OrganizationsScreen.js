import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { backendFetch } from "../api/backend";

const TYPE_COLORS = {
  NGO: { bg: "#dcfce7", fg: "#166534", icon: "people" },
  CSR: { bg: "#dbeafe", fg: "#1e40af", icon: "business" },
  SDG: { bg: "#fef2f2", fg: "#991b1b", icon: "globe" },
  ABVP: { bg: "#fff7ed", fg: "#9a3412", icon: "school" },
  GOV_PARTNER: { bg: "#fef3c7", fg: "#92400e", icon: "shield" },
};

const FOCUS_ICONS = {
  labour: "hammer",
  water: "water",
  sanitation: "trash-bin",
  health: "medkit",
  education: "school",
  gender_violence: "shield-checkmark",
  road_safety: "car",
  infrastructure: "construct",
  legal_aid: "document-text",
  public_works: "build",
  public_health: "fitness",
  digital_literacy: "laptop",
};

function OrgCard({ org }) {
  const typeStyle = TYPE_COLORS[org.type] || TYPE_COLORS.NGO;
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable style={styles.card} onPress={() => setExpanded((e) => !e)}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.typeIcon, { backgroundColor: typeStyle.bg }]}>
          <Ionicons name={typeStyle.icon} size={20} color={typeStyle.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.orgName}>{org.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={[styles.typeBadgeText, { color: typeStyle.fg }]}>{org.type}</Text>
          </View>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#94a3b8" />
      </View>

      {/* Focus areas pills */}
      {org.focusAreas?.length > 0 && (
        <View style={styles.focusList}>
          {org.focusAreas.map((area) => (
            <View key={area} style={styles.focusPill}>
              <Ionicons
                name={FOCUS_ICONS[area] || "ellipse"}
                size={12}
                color="#475569"
              />
              <Text style={styles.focusPillText}>
                {area.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Jurisdictions */}
      {org.jurisdictions?.length > 0 && (
        <View style={styles.jurisdictionRow}>
          <Ionicons name="location" size={13} color="#64748b" />
          <Text style={styles.jurisdictionText}>
            {org.jurisdictions.join(", ")}
          </Text>
        </View>
      )}

      {/* Expanded details */}
      {expanded && (
        <View style={styles.expandedSection}>
          {org.description ? (
            <Text style={styles.descText}>{org.description}</Text>
          ) : null}

          {org.contactEmail ? (
            <View style={styles.contactRow}>
              <Ionicons name="mail" size={14} color="#2563eb" />
              <Text style={styles.contactText}>{org.contactEmail}</Text>
            </View>
          ) : null}

          {org.website ? (
            <View style={styles.contactRow}>
              <Ionicons name="globe" size={14} color="#2563eb" />
              <Text style={styles.contactText}>{org.website}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export default function OrganizationsScreen() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL | NGO | CSR

  const fetchOrgs = useCallback(async () => {
    try {
      setError("");
      const data = await backendFetch("/api/organizations");
      setOrgs(Array.isArray(data?.organizations) ? data.organizations : []);
    } catch (e) {
      setError(e?.message || "Failed to load organizations");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchOrgs();
      setLoading(false);
    })();
  }, [fetchOrgs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrgs();
    setRefreshing(false);
  }, [fetchOrgs]);

  const filtered = filter === "ALL" ? orgs : orgs.filter((o) => o.type === filter);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Trusted Partners</Text>
        <Text style={styles.heroSub}>
          NGOs and CSR organizations working alongside citizens and authorities
        </Text>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {["ALL", "NGO", "CSR", "SDG", "ABVP"].map((f) => (
          <Pressable
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
              {f === "ALL" ? "All" : f}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Pressable style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>↻ Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.orgId}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />
          }
          renderItem={({ item }) => <OrgCard org={item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color="#cbd5e1" />
              <Text style={styles.muted}>No organizations found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },
  hero: {
    backgroundColor: "#0f766e",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  heroTitle: { color: "#fff", fontWeight: "900", fontSize: 22 },
  heroSub: { color: "#99f6e4", fontSize: 13, marginTop: 4 },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterPillActive: { backgroundColor: "#0f766e", borderColor: "#0f766e" },
  filterPillText: { fontWeight: "700", fontSize: 13, color: "#475569" },
  filterPillTextActive: { color: "#fff" },

  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  muted: { color: "#94a3b8", fontSize: 14 },
  errorText: { color: "#dc2626", fontWeight: "700", textAlign: "center" },
  retryBtn: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  retryBtnText: { color: "#fff", fontWeight: "800" },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  typeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  orgName: { fontWeight: "900", fontSize: 15, color: "#1e293b" },
  typeBadge: { marginTop: 2 },
  typeBadgeText: { fontWeight: "700", fontSize: 11 },
  focusList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  focusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  focusPillText: { fontSize: 11, color: "#475569", fontWeight: "600" },
  jurisdictionRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  jurisdictionText: { fontSize: 12, color: "#64748b" },
  expandedSection: { gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  descText: { fontSize: 13, color: "#475569", lineHeight: 20 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
});
