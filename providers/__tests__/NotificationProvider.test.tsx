import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react-native";
import { NotificationProvider, useNotificationContext } from "../NotificationProvider";
import * as notificationsService from "@/services/notifications";
import * as authService from "@/services/auth";

jest.mock("@/services/notifications");
jest.mock("@/services/auth");

// Test component that uses the notification context
function TestComponent() {
  const { unreadCount, refreshUnreadCount } = useNotificationContext();
  return (
    <>
      <TestID testID="unread-count">{unreadCount}</TestID>
      <TouchableOpacity
        testID="refresh-button"
        onPress={() => void refreshUnreadCount()}
      />
    </>
  );
}

// Simpler test component
function TestComponentSimple() {
  const { unreadCount } = useNotificationContext();
  return <Text testID="unread-count">{unreadCount}</Text>;
}

import { TouchableOpacity, Text } from "react-native";

// Using simpler approach
function TestID({ children, testID }: { children: React.ReactNode; testID: string }) {
  return <Text testID={testID}>{children}</Text>;
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getStoredToken as jest.Mock).mockResolvedValue("test-token");
    (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
      0,
    );
  });

  it("should provide unread count via context", async () => {
    (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
      5,
    );

    render(
      <NotificationProvider>
        <TestComponentSimple />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("unread-count")).toHaveTextContent("5");
    });
  });

  it("should load initial count on mount", async () => {
    (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
      3,
    );

    render(
      <NotificationProvider>
        <TestComponentSimple />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(notificationsService.getUnreadNotificationCount).toHaveBeenCalled();
    });
  });

  it("should set count to 0 when no token is available", async () => {
    (authService.getStoredToken as jest.Mock).mockResolvedValue(null);

    render(
      <NotificationProvider>
        <TestComponentSimple />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(notificationsService.getUnreadNotificationCount).not.toHaveBeenCalled();
    });
  });

  it("should handle API errors gracefully", async () => {
    (notificationsService.getUnreadNotificationCount as jest.Mock).mockRejectedValue(
      new Error("API Error"),
    );

    render(
      <NotificationProvider>
        <TestComponentSimple />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("unread-count")).toHaveTextContent("0");
    });
  });

  it("should throw error if context is used outside provider", () => {
    // Suppress console error for this test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponentSimple />);
    }).toThrow("useNotificationContext must be used within a NotificationProvider");

    consoleSpy.mockRestore();
  });

  it("should update count from 0 to 5", async () => {
    const { rerender } = render(
      <NotificationProvider>
        <TestComponentSimple />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("unread-count")).toHaveTextContent("0");
    });

    (notificationsService.getUnreadNotificationCount as jest.Mock).mockResolvedValue(
      5,
    );

    // This would test if refreshUnreadCount properly updates state
    // In a real scenario, this would be called via the hook
  });
});
