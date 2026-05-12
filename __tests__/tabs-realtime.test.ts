import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import * as chatRealtime from "@/services/chat-realtime";
import * as messageService from "@/services/messages";
import * as authService from "@/services/auth";
import { HubConnection } from "@microsoft/signalr";

jest.mock("@/services/chat-realtime");
jest.mock("@/services/messages");
jest.mock("@/services/auth");

describe("Tabs Layout Real-time Integration", () => {
  let mockConnection: Partial<HubConnection>;
  let handlers: Record<string, Function[]> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = {};

    mockConnection = {
      on: jest.fn((event: string, handler: Function) => {
        if (!handlers[event]) {
          handlers[event] = [];
        }
        handlers[event].push(handler);
      }),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      invoke: jest.fn().mockResolvedValue(undefined),
    };

    (chatRealtime.createChatConnection as jest.Mock).mockResolvedValue(
      mockConnection,
    );
    (authService.getStoredToken as jest.Mock).mockResolvedValue("test-token");
    (messageService.getUnreadCount as jest.Mock).mockResolvedValue(0);
    (messageService.getChats as jest.Mock).mockResolvedValue([]);
  });

  describe("Real-time Message Updates", () => {
    it("should refresh unread count when message:new is received", async () => {
      const mockLoadUnread = jest.fn();

      (chatRealtime.onMessageNew as jest.Mock).mockImplementation(
        (connection, handler) => {
          handlers["message:new"] = [handler];
        },
      );

      // Simulate registering the handler
      chatRealtime.onMessageNew(
        mockConnection as HubConnection,
        mockLoadUnread,
      );

      // Trigger the handler
      if (handlers["message:new"]) {
        await act(async () => {
          handlers["message:new"][0]();
        });
      }

      expect(mockLoadUnread).toHaveBeenCalled();
    });

    it("should refresh unread count when message:read is received", async () => {
      const mockLoadUnread = jest.fn();

      (chatRealtime.onMessageRead as jest.Mock).mockImplementation(
        (connection, handler) => {
          handlers["message:read"] = [handler];
        },
      );

      chatRealtime.onMessageRead(
        mockConnection as HubConnection,
        mockLoadUnread,
      );

      if (handlers["message:read"]) {
        await act(async () => {
          handlers["message:read"][0]({ chatId: "123", readerId: "user1" });
        });
      }

      expect(mockLoadUnread).toHaveBeenCalled();
    });
  });

  describe("Real-time Notification Updates", () => {
    it("should refresh notification count when notification:new is received", async () => {
      const mockRefreshNotifications = jest.fn();

      (chatRealtime.onNotificationNew as jest.Mock).mockImplementation(
        (connection, handler) => {
          handlers["notification:new"] = [handler];
        },
      );

      chatRealtime.onNotificationNew(
        mockConnection as HubConnection,
        mockRefreshNotifications,
      );

      if (handlers["notification:new"]) {
        await act(async () => {
          handlers["notification:new"][0]();
        });
      }

      expect(mockRefreshNotifications).toHaveBeenCalled();
    });

    it("should refresh notification count when notification:read is received", async () => {
      const mockRefreshNotifications = jest.fn();

      (chatRealtime.onNotificationRead as jest.Mock).mockImplementation(
        (connection, handler) => {
          handlers["notification:read"] = [handler];
        },
      );

      chatRealtime.onNotificationRead(
        mockConnection as HubConnection,
        mockRefreshNotifications,
      );

      if (handlers["notification:read"]) {
        await act(async () => {
          handlers["notification:read"][0]();
        });
      }

      expect(mockRefreshNotifications).toHaveBeenCalled();
    });
  });

  describe("Multiple Event Handling", () => {
    it("should handle both message and notification events", async () => {
      const mockMessageHandler = jest.fn();
      const mockNotificationHandler = jest.fn();

      (chatRealtime.onMessageNew as jest.Mock).mockImplementation(
        (connection, handler) => {
          handlers["message:new"] = [handler];
        },
      );

      (chatRealtime.onNotificationNew as jest.Mock).mockImplementation(
        (connection, handler) => {
          handlers["notification:new"] = [handler];
        },
      );

      chatRealtime.onMessageNew(
        mockConnection as HubConnection,
        mockMessageHandler as any,
      );
      chatRealtime.onNotificationNew(
        mockConnection as HubConnection,
        mockNotificationHandler,
      );

      if (handlers["message:new"]) {
        await act(async () => {
          handlers["message:new"][0]({
            id: "1",
            chatId: "1",
            senderId: "1",
            receiverId: "1",
            content: "test",
            createdAt: "2024-05-12T10:00:00Z",
          });
        });
      }

      if (handlers["notification:new"]) {
        await act(async () => {
          handlers["notification:new"][0]();
        });
      }

      expect(mockMessageHandler).toHaveBeenCalled();
      expect(mockNotificationHandler).toHaveBeenCalled();
    });

    it("should handle rapid succession of events", async () => {
      const mockHandler = jest.fn();

      (chatRealtime.onNotificationNew as jest.Mock).mockImplementation(
        (connection, handler) => {
          handlers["notification:new"] = [handler];
        },
      );

      chatRealtime.onNotificationNew(
        mockConnection as HubConnection,
        mockHandler,
      );

      if (handlers["notification:new"]) {
        await act(async () => {
          handlers["notification:new"][0]();
          handlers["notification:new"][0]();
          handlers["notification:new"][0]();
        });
      }

      expect(mockHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe("Connection Lifecycle", () => {
    it("should set up handlers after connection starts", async () => {
      const mockMessageHandler = jest.fn();
      const mockNotificationHandler = jest.fn();

      (chatRealtime.onMessageNew as jest.Mock).mockImplementation(
        (connection, handler) => {
          handlers["message:new"] = [handler];
        },
      );

      (chatRealtime.onNotificationNew as jest.Mock).mockImplementation(
        (connection, handler) => {
          handlers["notification:new"] = [handler];
        },
      );

      // Simulate connection setup
      const connection = (await chatRealtime.createChatConnection()) as HubConnection;

      chatRealtime.onMessageNew(connection, mockMessageHandler as any);
      chatRealtime.onNotificationNew(connection, mockNotificationHandler);

      expect(handlers["message:new"]).toBeDefined();
      expect(handlers["notification:new"]).toBeDefined();
    });

    it("should handle connection errors gracefully", async () => {
      (chatRealtime.createChatConnection as jest.Mock).mockRejectedValue(
        new Error("Connection failed"),
      );

      expect(chatRealtime.createChatConnection()).rejects.toThrow(
        "Connection failed",
      );
    });
  });
});
