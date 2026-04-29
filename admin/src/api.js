import axios from "axios";

export function createApiClient(baseUrl, apiKey) {
  const normalizedBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
  const headers = {};

  if (apiKey && String(apiKey).trim()) {
    headers["x-api-key"] = String(apiKey).trim();
  }

  return axios.create({
    baseURL: normalizedBaseUrl,
    headers,
  });
}
