import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

const STORAGE_KEY = "sbay.push.token";

const getProjectId = () => {
  const expoConfig = Constants.expoConfig as {
    extra?: { easProjectId?: string };
  } | null;
  return Constants.easConfig?.projectId ?? expoConfig?.extra?.easProjectId;
};

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

  const deviceId = Device.osBuildId ?? Device.modelId ?? null;
  await apiRequest("/api/notifications/push-token", {
    method: "POST",
    headers: {
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
  try {
    const authToken = await getStoredToken();
    if (authToken) {
      await apiRequest(`/api/notifications/push-token?token=${encodeURIComponent(stored)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    }
  } finally {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
