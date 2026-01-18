import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

export type Chat = {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId?: string | null;
  createdAt: string;
  lastMessageAt?: string | null;
  buyerArchived: boolean;
  sellerArchived: boolean;
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  listingId?: string | null;
  content: string;
  createdAt: string;
  isRead: boolean;
};

export type OpenChatPayload = {
  otherUserId: string;
  listingId?: string;
};

export type OpenChatResponse = {
  chatId: string;
};

async function authHeader() {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function getChats(take = 20, skip = 0): Promise<Chat[]> {
  return apiRequest<Chat[]>(`/api/chats?take=${take}&skip=${skip}`, {
    headers: await authHeader(),
  });
}

export async function getMessages(
  chatId: string,
  take = 50,
  before?: Date,
): Promise<Message[]> {
  const params = new URLSearchParams({ take: String(take) });
  if (before) params.append("before", before.toISOString());
  return apiRequest<Message[]>(`/api/chats/${chatId}/messages?${params.toString()}`, {
    headers: await authHeader(),
  });
}

export async function sendMessage(
  chatId: string,
  content: string,
): Promise<Message> {
  return apiRequest<Message>(`/api/chats/${chatId}/messages`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ content }),
  });
}

export async function markAsRead(
  chatId: string,
  upToMessageId?: string,
): Promise<number> {
  const params = new URLSearchParams();
  if (upToMessageId) params.append("upToMessageId", upToMessageId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<number>(`/api/chats/${chatId}/read${suffix}`, {
    method: "POST",
    headers: await authHeader(),
  });
}

export async function openChat(payload: OpenChatPayload): Promise<OpenChatResponse> {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(await authHeader()),
  };

  if (!("Authorization" in headers)) {
    throw new Error("Missing auth token (Authorization header not set).");
  }

  return apiRequest<OpenChatResponse>("/api/chats/open", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}
