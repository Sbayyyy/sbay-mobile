import {
  onNotificationNew,
  onNotificationRead,
  onMessageNew,
  onMessageRead,
} from "../chat-realtime";
import { HubConnection } from "@microsoft/signalr";

describe("Chat Realtime Handlers", () => {
  let mockConnection: Partial<HubConnection>;
  let handlers: Record<string, Function[]> = {};

  beforeEach(() => {
    handlers = {};
    mockConnection = {
      on: jest.fn((event: string, handler: Function) => {
        if (!handlers[event]) {
          handlers[event] = [];
        }
        handlers[event].push(handler);
      }),
    };
  });

  describe("onNotificationNew", () => {
    it("should register notification:new event handler", () => {
      const mockHandler = jest.fn();
      onNotificationNew(mockConnection as HubConnection, mockHandler);

      expect(mockConnection.on).toHaveBeenCalledWith("notification:new", expect.any(Function));
    });

    it("should call handler when notification:new event is triggered", () => {
      const mockHandler = jest.fn();
      onNotificationNew(mockConnection as HubConnection, mockHandler);

      // Trigger the handler
      handlers["notification:new"][0]();

      expect(mockHandler).toHaveBeenCalled();
    });

    it("should call handler multiple times when event is triggered multiple times", () => {
      const mockHandler = jest.fn();
      onNotificationNew(mockConnection as HubConnection, mockHandler);

      handlers["notification:new"][0]();
      handlers["notification:new"][0]();
      handlers["notification:new"][0]();

      expect(mockHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe("onNotificationRead", () => {
    it("should register notification:read event handler", () => {
      const mockHandler = jest.fn();
      onNotificationRead(mockConnection as HubConnection, mockHandler);

      expect(mockConnection.on).toHaveBeenCalledWith("notification:read", expect.any(Function));
    });

    it("should call handler when notification:read event is triggered", () => {
      const mockHandler = jest.fn();
      onNotificationRead(mockConnection as HubConnection, mockHandler);

      handlers["notification:read"][0]();

      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe("Integration with message handlers", () => {
    it("should have both message and notification handlers registered", () => {
      const messageNewHandler = jest.fn();
      const notificationNewHandler = jest.fn();

      onMessageNew(mockConnection as HubConnection, messageNewHandler);
      onNotificationNew(mockConnection as HubConnection, notificationNewHandler);

      expect(handlers["message:new"]).toBeDefined();
      expect(handlers["notification:new"]).toBeDefined();
    });

    it("should call different handlers independently", () => {
      const messageNewHandler = jest.fn();
      const notificationNewHandler = jest.fn();

      onMessageNew(
        mockConnection as HubConnection,
        messageNewHandler as any,
      );
      onNotificationNew(mockConnection as HubConnection, notificationNewHandler);

      // Trigger message:new
      handlers["message:new"][0]({ id: "1", chatId: "1", senderId: "1", receiverId: "1", content: "test", createdAt: "2024-05-12T10:00:00Z" });

      // Trigger notification:new
      handlers["notification:new"][0]();

      expect(messageNewHandler).toHaveBeenCalled();
      expect(notificationNewHandler).toHaveBeenCalled();
    });
  });

  describe("Handler robustness", () => {
    it("should handle handler exceptions gracefully", () => {
      const mockHandler = jest.fn(() => {
        throw new Error("Handler error");
      });

      onNotificationNew(mockConnection as HubConnection, mockHandler);

      expect(() => {
        handlers["notification:new"][0]();
      }).toThrow("Handler error");
    });

    it("should support multiple handlers for same event", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      onNotificationNew(mockConnection as HubConnection, handler1);
      onNotificationNew(mockConnection as HubConnection, handler2);

      handlers["notification:new"][0]();
      handlers["notification:new"][1]();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });
});
