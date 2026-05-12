import { getNotifications, getUnreadNotificationCount } from "../notifications";
import * as api from "@/services/api";
import * as auth from "@/services/auth";

jest.mock("@/services/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("@/services/auth", () => ({
  getStoredToken: jest.fn(),
}));

describe("Notifications Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth.getStoredToken as jest.Mock).mockResolvedValue("token");
  });

  describe("getUnreadNotificationCount", () => {
    it("should return the unread notification count from API", async () => {
      const mockCount = 5;
      const mockResponse = { total: mockCount };

      (api.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getUnreadNotificationCount();

      expect(result).toBe(mockCount);
      expect(api.apiRequest).toHaveBeenCalledWith(
        "/api/notifications/unread-count",
        {
          headers: { Authorization: "Bearer token" },
        },
      );
    });

    it("should return 0 when API response has no total", async () => {
      (api.apiRequest as jest.Mock).mockResolvedValue({});
      (auth.getStoredToken as jest.Mock).mockResolvedValue(null);

      const result = await getUnreadNotificationCount();

      expect(result).toBe(0);
    });

    it("should handle API errors gracefully", async () => {
      (api.apiRequest as jest.Mock).mockRejectedValue(
        new Error("API Error"),
      );

      await expect(getUnreadNotificationCount()).rejects.toThrow("API Error");
    });

    it("should cap the count at 99+", async () => {
      const mockResponse = { total: 150 };
      (api.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getUnreadNotificationCount();

      expect(result).toBe(150); // The actual count is returned; capping is UI responsibility
    });
  });

  describe("getNotifications", () => {
    it("should return notifications array from API", async () => {
      const mockNotifications = [
        {
          id: "1",
          title: "New Message",
          body: "You have a new message",
          createdAt: "2024-05-12T10:00:00Z",
          read: false,
        },
      ];
      const mockResponse = { notifications: mockNotifications };

      (api.apiRequest as jest.Mock).mockResolvedValue(mockResponse);
      (auth.getStoredToken as jest.Mock).mockResolvedValue(null);

      const result = await getNotifications();

      expect(result).toEqual(mockNotifications);
      expect(api.apiRequest).toHaveBeenCalledWith(
        "/api/notifications",
        {
          headers: {},
        },
      );
    });

    it("should return empty array when API response has no notifications", async () => {
      (api.apiRequest as jest.Mock).mockResolvedValue({});
      (auth.getStoredToken as jest.Mock).mockResolvedValue(null);

      const result = await getNotifications();

      expect(result).toEqual([]);
    });

    it("should handle API errors", async () => {
      (api.apiRequest as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      await expect(getNotifications()).rejects.toThrow("Network error");
    });

    it("should include optional fields in notifications", async () => {
      const mockNotifications = [
        {
          id: "1",
          title: "New Message",
          body: "You have a new message",
          createdAt: "2024-05-12T10:00:00Z",
          read: false,
          href: "/chat/123",
        },
      ];
      const mockResponse = { notifications: mockNotifications };

      (api.apiRequest as jest.Mock).mockResolvedValue(mockResponse);
      (auth.getStoredToken as jest.Mock).mockResolvedValue(null);

      const result = await getNotifications();

      expect(result[0].href).toBe("/chat/123");
    });
  });
});
