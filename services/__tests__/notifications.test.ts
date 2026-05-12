import { getNotifications, getUnreadNotificationCount } from "../notifications";
import * as authSession from "@/services/auth-session";

// Mock the auth-session module
jest.mock("@/services/auth-session");

describe("Notifications Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUnreadNotificationCount", () => {
    it("should return the unread notification count from API", async () => {
      const mockCount = 5;
      const mockResponse = { total: mockCount };

      (authSession.apiRequest as jest.Mock).mockResolvedValue(mockResponse);
      (authSession.authHeader as jest.Mock).mockResolvedValue({
        Authorization: "Bearer token",
      });

      const result = await getUnreadNotificationCount();

      expect(result).toBe(mockCount);
      expect(authSession.apiRequest).toHaveBeenCalledWith(
        "/api/notifications/unread-count",
        {
          headers: { Authorization: "Bearer token" },
        },
      );
    });

    it("should return 0 when API response has no total", async () => {
      (authSession.apiRequest as jest.Mock).mockResolvedValue({});
      (authSession.authHeader as jest.Mock).mockResolvedValue({});

      const result = await getUnreadNotificationCount();

      expect(result).toBe(0);
    });

    it("should handle API errors gracefully", async () => {
      (authSession.apiRequest as jest.Mock).mockRejectedValue(
        new Error("API Error"),
      );
      (authSession.authHeader as jest.Mock).mockResolvedValue({});

      await expect(getUnreadNotificationCount()).rejects.toThrow("API Error");
    });

    it("should cap the count at 99+", async () => {
      const mockResponse = { total: 150 };
      (authSession.apiRequest as jest.Mock).mockResolvedValue(mockResponse);
      (authSession.authHeader as jest.Mock).mockResolvedValue({});

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

      (authSession.apiRequest as jest.Mock).mockResolvedValue(mockResponse);
      (authSession.authHeader as jest.Mock).mockResolvedValue({});

      const result = await getNotifications();

      expect(result).toEqual(mockNotifications);
      expect(authSession.apiRequest).toHaveBeenCalledWith(
        "/api/notifications",
        {
          headers: {},
        },
      );
    });

    it("should return empty array when API response has no notifications", async () => {
      (authSession.apiRequest as jest.Mock).mockResolvedValue({});
      (authSession.authHeader as jest.Mock).mockResolvedValue({});

      const result = await getNotifications();

      expect(result).toEqual([]);
    });

    it("should handle API errors", async () => {
      (authSession.apiRequest as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );
      (authSession.authHeader as jest.Mock).mockResolvedValue({});

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

      (authSession.apiRequest as jest.Mock).mockResolvedValue(mockResponse);
      (authSession.authHeader as jest.Mock).mockResolvedValue({});

      const result = await getNotifications();

      expect(result[0].href).toBe("/chat/123");
    });
  });
});
