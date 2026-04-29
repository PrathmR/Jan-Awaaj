import AsyncStorage from "@react-native-async-storage/async-storage";

const MY_COMPLAINTS_KEY = "myComplaintIds";

export async function getMyComplaintIds() {
  try {
    const raw = await AsyncStorage.getItem(MY_COMPLAINTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}

export async function addMyComplaintId(complaintId) {
  if (!complaintId) return;
  const id = String(complaintId).trim();
  if (!id) return;
  const current = await getMyComplaintIds();
  const next = [id, ...current.filter((x) => x !== id)].slice(0, 20);
  await AsyncStorage.setItem(MY_COMPLAINTS_KEY, JSON.stringify(next));
}

export async function clearMyComplaintIds() {
  await AsyncStorage.removeItem(MY_COMPLAINTS_KEY);
}

export async function getCitizenId() {
  try {
    return await AsyncStorage.getItem("citizenId");
  } catch {
    return null;
  }
}

export async function ensureCitizenId() {
  try {
    let id = await AsyncStorage.getItem("citizenId");
    if (!id) {
      const random = () => Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      id = `JA-CIT-${random()}-${random()}`;
      await AsyncStorage.setItem("citizenId", id);
    }
    return id;
  } catch {
    return "JA-CIT-GUEST";
  }
}

