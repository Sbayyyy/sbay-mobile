import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

const STORAGE_KEY = "sbay.push.token";
const INSTALLATION_ID_KEY = "sbay.push.installation-id";

const getProjectId = () => {
  const expoConfig = Constants.expoConfig as {
    extra?: { easProjectId?: string };
  } | null;
  return Constants.easConfig?.projectId ?? expoConfig?.extra?.easProjectId;
};

async function getInstallationId(): Promise<string> {
  const stored = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (stored) return stored;

  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  const installationId = `sbay-${randomId}`;
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, installationId);
  return installationId;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    status = request.status;
  }
  if (status !== "granted") return null;

  const projectId = getProjectId();
  const response = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  return response.data;
}

export async function syncPushToken(): Promise<void> {
  const token = await registerForPushNotifications();
  if (!token) return;

  const authToken = await getStoredToken();
  if (!authToken) return;

  const deviceId = await getInstallationId();
  await apiRequest("/api/notifications/push-token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS,
      deviceId,
    }),
  });
  await AsyncStorage.setItem(STORAGE_KEY, token);
}

export async function unregisterPushToken(): Promise<void> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  // Clear local token first so sign-out always completes cleanly, even if the API call below fails.
  await AsyncStorage.removeItem(STORAGE_KEY);

  const authToken = await getStoredToken();
  if (!authToken) return;

  await apiRequest(`/api/notifications/push-token?token=${encodeURIComponent(stored)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
}
