import {
  HubConnection,
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";

import { API_BASE_URL } from "@/services/api";
import { getStoredToken } from "@/services/auth";

export type RealtimeMessage = {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  listingId?: string | null;
  content: string;
  type?: string | null;
  dataJson?: string | null;
  createdAt: string;
  isRead: boolean;
};

export type RealtimeRead = {
  chatId: string;
  readerId: string;
};

export type RealtimeDelete = {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  isRead: boolean;
};

type RawMessage = {
  id?: string;
  chatId?: string;
  senderId?: string;
  receiverId?: string;
  listingId?: string | null;
  content?: string;
  type?: string | null;
  dataJson?: string | null;
  createdAt?: string;
  isRead?: boolean;
  Id?: string;
  ChatId?: string;
  SenderId?: string;
  ReceiverId?: string;
  ListingId?: string | null;
  Content?: string;
  Type?: string | null;
  DataJson?: string | null;
  CreatedAt?: string;
  IsRead?: boolean;
};

type RawDelete = {
  id?: string;
  chatId?: string;
  senderId?: string;
  receiverId?: string;
  isRead?: boolean;
  Id?: string;
  ChatId?: string;
  SenderId?: string;
  ReceiverId?: string;
  IsRead?: boolean;
};

function normalizeMessage(payload: RawMessage): RealtimeMessage | null {
  const id = payload.id ?? payload.Id;
  const chatId = payload.chatId ?? payload.ChatId;
  const senderId = payload.senderId ?? payload.SenderId;
  const receiverId = payload.receiverId ?? payload.ReceiverId;
  const listingId = payload.listingId ?? payload.ListingId ?? null;
  const content = payload.content ?? payload.Content;
  const type = payload.type ?? payload.Type ?? "text";
  const dataJson = payload.dataJson ?? payload.DataJson ?? null;
  const createdAt = payload.createdAt ?? payload.CreatedAt;
  const isRead = payload.isRead ?? payload.IsRead ?? false;

  if (!id || !chatId || !senderId || !receiverId || !content || !createdAt) return null;
  return { id, chatId, senderId, receiverId, listingId, content, type, dataJson, createdAt, isRead };
}

function normalizeDelete(payload: RawDelete): RealtimeDelete | null {
  const id = payload.id ?? payload.Id;
  const chatId = payload.chatId ?? payload.ChatId;
  const senderId = payload.senderId ?? payload.SenderId;
  const receiverId = payload.receiverId ?? payload.ReceiverId;
  const isRead = payload.isRead ?? payload.IsRead ?? false;
  if (!id || !chatId || !senderId || !receiverId) return null;
  return { id, chatId, senderId, receiverId, isRead };
}

export async function createChatConnection(): Promise<HubConnection> {
  const url = `${API_BASE_URL}/hubs/chat`;
  const connection = new HubConnectionBuilder()
    .withUrl(url, {
      transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      accessTokenFactory: async () => (await getStoredToken()) ?? "",
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  connection.keepAliveIntervalInMilliseconds = 15000;
  connection.serverTimeoutInMilliseconds = 60000;
  return connection;
}

export function onMessageNew(
  connection: HubConnection,
  handler: (message: RealtimeMessage) => void,
) {
  connection.on("message:new", (payload: RawMessage) => {
    const msg = normalizeMessage(payload);
    if (msg) handler(msg);
  });
}

export function onMessageRead(
  connection: HubConnection,
  handler: (payload: RealtimeRead) => void,
) {
  connection.on("message:read", (payload: RealtimeRead) => {
    if (payload?.chatId && payload?.readerId) handler(payload);
  });
}

export function onMessageUpdated(
  connection: HubConnection,
  handler: (message: RealtimeMessage) => void,
) {
  connection.on("message:updated", (payload: RawMessage) => {
    const msg = normalizeMessage(payload);
    if (msg) handler(msg);
  });
}

export function onMessageDeleted(
  connection: HubConnection,
  handler: (payload: RealtimeDelete) => void,
) {
  connection.on("message:deleted", (payload: RawDelete) => {
    const data = normalizeDelete(payload);
    if (data) handler(data);
  });
}

export function onNotificationNew(
  connection: HubConnection,
  handler: () => void,
) {
  connection.on("notification:new", () => {
    handler();
  });
}

export function onNotificationRead(
  connection: HubConnection,
  handler: () => void,
) {
  connection.on("notification:read", () => {
    handler();
  });
}
