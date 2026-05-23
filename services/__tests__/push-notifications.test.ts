import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import { syncPushToken, unregisterPushToken } from "../push-notifications";
import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

jest.mock("expo-device", () => ({
  isDevice: true,
}));

jest.mock("expo-notifications", () => ({
  AndroidImportance: { MAX: "max" },
  getPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  easConfig: { projectId: "project-1" },
  expoConfig: { extra: { easProjectId: "project-1" } },
}));

jest.mock("@/services/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("@/services/auth", () => ({
  getStoredToken: jest.fn(),
}));

describe("push notifications service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getStoredToken as jest.Mock).mockResolvedValue("auth-token");
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: "expo-token" });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("registers the Expo push token with a stable installation id", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      key === "sbay.push.installation-id" ? "install-1" : null,
    );

    await syncPushToken();

    expect(apiRequest).toHaveBeenCalledWith("/api/notifications/push-token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer auth-token",
      },
      body: expect.any(String),
    });
    const [, options] = (apiRequest as jest.Mock).mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      token: "expo-token",
      platform: expect.any(String),
      deviceId: "install-1",
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("sbay.push.token", "expo-token");
  });

  it("removes the stored push token locally after unregistering", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("expo-token");

    await unregisterPushToken();

    expect(apiRequest).toHaveBeenCalledWith("/api/notifications/push-token?token=expo-token", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer auth-token",
      },
    });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("sbay.push.token");
  });
});
