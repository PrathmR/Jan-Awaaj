import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const BACKEND_URL_KEY = "backendUrl";

// ─── Validate that a string is a valid IPv4 address ──────────────────────────
function isValidIPv4(str) {
  if (!str || typeof str !== "string") return false;
  const parts = str.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

// ─── Auto-detect the dev machine's LAN IP via Expo debugger host ─────────────
function getExpoHostIp() {
  try {
    // Try to load expo-constants dynamically (it may or may not be installed)
    let Constants;
    try {
      Constants = require("expo-constants").default;
    } catch {
      return null;
    }

    // Expo SDK 54+: the debugger host is available in manifest or expoConfig
    const candidates = [
      Constants.expoConfig?.hostUri,
      Constants.manifest2?.extra?.expoGo?.debuggerHost,
      Constants.manifest?.debuggerHost,
    ];

    for (const debuggerHost of candidates) {
      if (!debuggerHost) continue;
      // Format is "192.168.x.x:8081" — strip port
      const ip = debuggerHost.split(":")[0];
      // ONLY accept valid IPv4 addresses — reject tunnel hostnames like
      // "c7hxw_e-anonymous-8081.exp.direct" which happen in --tunnel mode
      if (isValidIPv4(ip) && ip !== "127.0.0.1") {
        return ip;
      }
    }
  } catch {
    // ignore — fallback below
  }
  return null;
}

function buildDefaultUrl() {
  // On web, localhost works fine
  if (Platform.OS === "web") {
    return "http://localhost:4000";
  }

  // Try to auto-detect the dev machine's LAN IP from Expo
  const ip = getExpoHostIp();
  if (ip) {
    return `http://${ip}:4000`;
  }

  // When using --tunnel mode, auto-detect won't work.
  // Return a placeholder — the user MUST set the correct URL in Profile.
  // The backend prints LAN addresses on startup, e.g. "http://192.168.x.x:4000"
  return "http://192.168.1.1:4000";
}

const DEFAULT_BACKEND_URL = buildDefaultUrl();

// Stale IPs from previous dev sessions that should be discarded
const STALE_HOSTS = [
  "localhost",
  "127.0.0.1",
  "192.168.137.125",
  "192.168.156.101",
  "192.168.1.1",      // our own fallback placeholder
  ".exp.direct",       // Expo tunnel hostnames
];

export function getDefaultBackendUrl() {
  return DEFAULT_BACKEND_URL;
}

export async function getBackendUrl() {
  try {
    let v = await AsyncStorage.getItem(BACKEND_URL_KEY);
    // Force override: discard cached URLs containing stale/unreachable hosts
    if (v && Platform.OS !== "web") {
      const isStale = STALE_HOSTS.some((host) => v.includes(host));
      if (isStale) {
        v = null;
      }
    }
    return v || DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

export async function setBackendUrl(url) {
  await AsyncStorage.setItem(BACKEND_URL_KEY, url);
}

export async function backendFetch(path, options = {}) {
  const baseUrl = await getBackendUrl();
  const url = `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  // Add a reasonable timeout so the app doesn't hang forever
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const message = data?.error || data?.message || `HTTP ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    return data;
  } catch (e) {
    clearTimeout(timeoutId);
    // Provide a user-friendly error message for network failures
    if (e.name === "AbortError") {
      throw new Error(
        `Server not reachable (timeout).\nGo to Profile → set Backend URL to your computer's LAN IP.\nThe backend logs it on startup.`
      );
    }
    if (
      e.message === "Network request failed" ||
      e.message?.includes("Network request failed")
    ) {
      throw new Error(
        `Cannot connect to server at:\n${baseUrl}\n\nGo to Profile → Backend URL.\nSet it to the LAN IP shown when your backend starts.`
      );
    }
    throw e;
  }
}
