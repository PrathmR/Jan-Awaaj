import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND_URL_KEY = "backendUrl";

const DEFAULT_BACKEND_URL = "http://localhost:4000";

export async function getBackendUrl() {
  try {
    const v = await AsyncStorage.getItem(BACKEND_URL_KEY);
    return v || DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

export async function setBackendUrl(url) {
  await AsyncStorage.setItem(BACKEND_URL_KEY, url);
}

export async function backendFetch(path, options) {
  const baseUrl = await getBackendUrl();
  const url = `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, options);
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
}

