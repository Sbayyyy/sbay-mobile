import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getNotificationPreferences,
  setNotificationPreferences,
  type NotificationPreferences,
} from "../notification-preferences";
import { ApiError, apiRequest } from "@/services/api";
import * as auth from "@/services/auth";

jest.mock("@/services/api", () => {
  class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }

  return {
    ApiError,
    apiRequest: jest.fn(),
  };
});

jest.mock("@/services/auth", () => ({
  getStoredToken: jest.fn(),
}));

const preferences: NotificationPreferences = {
  emailNewBids: true,
  emailOutbidAlerts: true,
  emailWonAuctions: true,
  emailMessages: true,
  emailPriceDrops: true,
  emailPromotions: false,
  pushNewBids: true,
  pushOutbidAlerts: true,
  pushWonAuctions: true,
  pushMessages: false,
};

describe("notification preferences service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth.getStoredToken as jest.Mock).mockResolvedValue("token");
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("loads preferences from the backend and caches them", async () => {
    (apiRequest as jest.Mock).mockResolvedValue(preferences);

    await expect(getNotificationPreferences()).resolves.toEqual(preferences);

    expect(apiRequest).toHaveBeenCalledWith("/api/notifications/preferences", {
      headers: { Authorization: "Bearer token" },
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "sbay.notifications.preferences",
      JSON.stringify(preferences),
    );
  });

  it("uses cached preferences for non-API failures", async () => {
    const cached = { ...preferences, pushMessages: true };
    (apiRequest as jest.Mock).mockRejectedValue(new Error("Network request failed"));
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cached));

    await expect(getNotificationPreferences()).resolves.toEqual(cached);
  });

  it("does not hide backend or auth errors behind the cache", async () => {
    const error = new ApiError("Unauthorized", 401);
    (apiRequest as jest.Mock).mockRejectedValue(error);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(preferences));

    await expect(getNotificationPreferences()).rejects.toBe(error);
  });

  it("saves normalized preferences to the backend and cache", async () => {
    const next = { ...preferences, emailNewBids: false };
    (apiRequest as jest.Mock).mockResolvedValue(next);

    await expect(setNotificationPreferences(next)).resolves.toEqual(next);

    expect(apiRequest).toHaveBeenCalledWith("/api/notifications/preferences", {
      method: "PUT",
      headers: { Authorization: "Bearer token" },
      body: JSON.stringify(next),
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "sbay.notifications.preferences",
      JSON.stringify(next),
    );
  });
});
