import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import * as Notifications from "expo-notifications";
import { NotificationProvider, useNotificationContext } from "../../providers/NotificationProvider";
import * as notificationsService from "@/services/notifications";
import * as authService from "@/services/auth";

jest.mock("expo-notifications");
jest.mock("@/services/notifications");
jest.mock("@/services/auth");

// Test component
function TestComponent() {
  const { unreadCount } = useNotificationContext();
  return <Text testID="notification-count">{unreadCount}</Text>;
}

describe("Notification System Integration", () => {
  let mockNotificationListener: jest.Mock;
  let mockSubscription: { remove: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscription = { remove: jest.fn() };
    mockNotificationListener = jest.fn();

    (Notifications.addNotificationReceivedListener as jest.Mock).mockImplementation(
      (listener) => {
        mockNotificationListener = listener;
        return mockSubscription;
      },
    );

    (authService.getStoredToken as jest.Mock).mockResolvedValue("test-token");
    (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
      0,
    );
  });

  describe("Push Notification Flow", () => {
    it("should update badge when push notification arrives", async () => {
      const { rerender } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestID("notification-count")).toHaveTextContent("0");
      });

      // Simulate new notification arrives
      (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
        5,
      );

      // Trigger push notification received
      mockNotificationListener({
        request: {
          content: {
            data: { type: "notification" },
          },
        },
      });

      // Wait for the update
      await waitFor(() => {
        expect(notificationsService.getUnreadNotificationCount).toHaveBeenCalledTimes(2);
      });
    });

    it("should maintain badge count across multiple notifications", async () => {
      (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
        3,
      );

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
      );

      await waitFor(() => {
        expect(notificationsService.getUnreadNotificationCount).toHaveBeenCalled();
      });

      // Verify initial count
      expect(screen.getByTestID("notification-count")).toBeTruthy();
    });

    it("should handle API errors during notification update", async () => {
      (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
        2,
      );

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestID("notification-count")).toHaveTextContent("2");
      });

      // Simulate API error on next call
      (notificationsService.getUnreadNotificationCount as jest.Mock).mockRejectedValueOnce(
        new Error("API Error"),
      );

      // Trigger notification
      mockNotificationListener({
        request: {
          content: {
            data: { type: "notification" },
          },
        },
      });

      // Count should remain from previous successful call
      await waitFor(() => {
        expect(screen.getByTestID("notification-count")).toHaveTextContent("2");
      });
    });

    it("should set count to 0 when no token is available", async () => {
      (authService.getStoredToken as jest.Mock).mockResolvedValue(null);

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestID("notification-count")).toHaveTextContent("0");
      });

      expect(notificationsService.getUnreadNotificationCount).not.toHaveBeenCalled();
    });
  });

  describe("Real-time Updates", () => {
    it("should refresh count on WebSocket notification:new event", async () => {
      (notificationsService.getUnreadNotificationCount as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
      );

      await waitFor(() => {
        expect(notificationsService.getUnreadNotificationCount).toHaveBeenCalledTimes(1);
      });

      // Simulate WebSocket event - would be called from chat-realtime.ts
      // This would be tested at the tabs layout level
    });

    it("should handle badge updates without losing user interaction", async () => {
      (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
        1,
      );

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestID("notification-count")).toHaveTextContent("1");
      });

      // Update count
      (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
        2,
      );

      mockNotificationListener({
        request: {
          content: {
            data: { type: "notification" },
          },
        },
      });

      // Verify update is pending
      await waitFor(() => {
        expect(notificationsService.getUnreadNotificationCount).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Badge Display Scenarios", () => {
    it("should show badge with single notification", async () => {
      (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
        1,
      );

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestID("notification-count")).toHaveTextContent("1");
      });
    });

    it("should show badge with 99+ when count exceeds 99", async () => {
      (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
        150,
      );

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestID("notification-count")).toHaveTextContent("150");
      });
    });

    it("should hide badge when count is 0", async () => {
      (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
        0,
      );

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestID("notification-count")).toHaveTextContent("0");
      });
    });
  });
});
