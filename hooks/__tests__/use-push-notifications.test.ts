import { renderHook, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import {
  usePushNotificationListener,
  usePushNotificationResponse,
} from "../use-push-notifications";

jest.mock("expo-notifications");

describe("Push Notification Hooks", () => {
  let mockSubscription: { remove: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscription = { remove: jest.fn() };
    (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
      mockSubscription,
    );
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
      mockSubscription,
    );
  });

  describe("usePushNotificationListener", () => {
    it("should register notification received listener on mount", () => {
      const mockHandler = jest.fn();

      renderHook(() => usePushNotificationListener(mockHandler));

      expect(
        Notifications.addNotificationReceivedListener,
      ).toHaveBeenCalled();
    });

    it("should call handler when notification is received with notification type", async () => {
      const mockHandler = jest.fn();

      renderHook(() => usePushNotificationListener(mockHandler));

      const listener = (
        Notifications.addNotificationReceivedListener as jest.Mock
      ).mock.calls[0][0];

      listener({
        request: {
          content: {
            data: { type: "notification" },
          },
        },
      });

      await waitFor(() => {
        expect(mockHandler).toHaveBeenCalled();
      });
    });

    it("should call handler for chat notifications", async () => {
      const mockHandler = jest.fn();

      renderHook(() => usePushNotificationListener(mockHandler));

      const listener = (
        Notifications.addNotificationReceivedListener as jest.Mock
      ).mock.calls[0][0];

      listener({
        request: {
          content: {
            data: { type: "chat", chatId: "123" },
          },
        },
      });

      await waitFor(() => {
        expect(mockHandler).toHaveBeenCalled();
      });
    });

    it("should call handler when no type is specified", async () => {
      const mockHandler = jest.fn();

      renderHook(() => usePushNotificationListener(mockHandler));

      const listener = (
        Notifications.addNotificationReceivedListener as jest.Mock
      ).mock.calls[0][0];

      listener({
        request: {
          content: {
            data: {},
          },
        },
      });

      await waitFor(() => {
        expect(mockHandler).toHaveBeenCalled();
      });
    });

    it("should remove listener on unmount", () => {
      const mockHandler = jest.fn();

      const { unmount } = renderHook(() =>
        usePushNotificationListener(mockHandler),
      );

      unmount();

      expect(mockSubscription.remove).toHaveBeenCalled();
    });

    it("should handle multiple notifications", async () => {
      const mockHandler = jest.fn();

      renderHook(() => usePushNotificationListener(mockHandler));

      const listener = (
        Notifications.addNotificationReceivedListener as jest.Mock
      ).mock.calls[0][0];

      listener({
        request: {
          content: {
            data: { type: "notification" },
          },
        },
      });

      listener({
        request: {
          content: {
            data: { type: "notification" },
          },
        },
      });

      await waitFor(() => {
        expect(mockHandler).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("usePushNotificationResponse", () => {
    it("should register notification response listener on mount", () => {
      const mockHandler = jest.fn();

      renderHook(() => usePushNotificationResponse(mockHandler));

      expect(
        Notifications.addNotificationResponseReceivedListener,
      ).toHaveBeenCalled();
    });

    it("should call handler when user responds to notification", async () => {
      const mockHandler = jest.fn();

      renderHook(() => usePushNotificationResponse(mockHandler));

      const listener = (
        Notifications.addNotificationResponseReceivedListener as jest.Mock
      ).mock.calls[0][0];

      const mockData = { type: "chat", chatId: "123" };
      listener({
        notification: {
          request: {
            content: {
              data: mockData,
            },
          },
        },
      });

      await waitFor(() => {
        expect(mockHandler).toHaveBeenCalledWith(mockData);
      });
    });

    it("should remove listener on unmount", () => {
      const mockHandler = jest.fn();

      const { unmount } = renderHook(() =>
        usePushNotificationResponse(mockHandler),
      );

      unmount();

      expect(mockSubscription.remove).toHaveBeenCalled();
    });

    it("should not call handler if data is missing", async () => {
      const mockHandler = jest.fn();

      renderHook(() => usePushNotificationResponse(mockHandler));

      const listener = (
        Notifications.addNotificationResponseReceivedListener as jest.Mock
      ).mock.calls[0][0];

      listener({
        notification: {
          request: {
            content: {
              data: undefined,
            },
          },
        },
      });

      await waitFor(() => {
        expect(mockHandler).not.toHaveBeenCalled();
      });
    });
  });
});
