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

export type ChatSummary = {
  chatId: string;
  buyerId: string;
  sellerId: string;
  listingId?: string | null;
  createdAt: string;
  lastMessageAt: string;
  unreadCount: number;
  lastMessage?: Message | null;
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  listingId?: string | null;
  content: string;
  type?: "text" | "offer" | "system" | string | null;
  dataJson?: string | null;
  createdAt: string;
  isRead: boolean;
};

export type OfferStatus = "pending" | "accepted" | "rejected" | "countered";

export type OfferMessageData = {
  offerId: string;
  listingId: string;
  amount: number;
  currency: string;
  status: OfferStatus;
  parentOfferId?: string | null;
  expiresAt?: string | null;
};

export type SendOfferPayload = {
  amount: number;
  currency?: string;
};

export type OpenChatPayload = {
  otherUserId: string;
  listingId?: string;
};

export type OpenChatResponse = {
  chatId: string;
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function getChats(take = 20, skip = 0): Promise<Chat[]> {
  return apiRequest<Chat[]>(`/api/chats?take=${take}&skip=${skip}`, {
    headers: await authHeader(),
  });
}

export async function getChatSummaries(take = 20, skip = 0): Promise<ChatSummary[]> {
  return apiRequest<ChatSummary[]>(`/api/chats/summary?take=${take}&skip=${skip}`, {
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

export async function sendOffer(
  chatId: string,
  payload: SendOfferPayload,
): Promise<Message> {
  return apiRequest<Message>(`/api/chats/${chatId}/offers`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(payload),
  });
}

export async function acceptOffer(
  chatId: string,
  messageId: string,
): Promise<Message> {
  return apiRequest<Message>(`/api/chats/${chatId}/offers/${messageId}/accept`, {
    method: "POST",
    headers: await authHeader(),
  });
}

export async function rejectOffer(
  chatId: string,
  messageId: string,
): Promise<Message> {
  return apiRequest<Message>(`/api/chats/${chatId}/offers/${messageId}/reject`, {
    method: "POST",
    headers: await authHeader(),
  });
}

export async function counterOffer(
  chatId: string,
  messageId: string,
  payload: SendOfferPayload,
): Promise<Message> {
  return apiRequest<Message>(`/api/chats/${chatId}/offers/${messageId}/counter`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(payload),
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

export async function updateMessage(messageId: string, content: string): Promise<Message> {
  return apiRequest<Message>(`/api/messages/${messageId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ content }),
  });
}

export async function deleteMessage(messageId: string): Promise<void> {
  await apiRequest<void>(`/api/messages/${messageId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}

export async function archiveChat(chatId: string): Promise<void> {
  await apiRequest<void>(`/api/chats/${chatId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}

export async function openChat(payload: OpenChatPayload): Promise<OpenChatResponse> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(await authHeader()),
  };

  if (!headers.Authorization) {
    throw new Error("Missing auth token (Authorization header not set).");
  }

  return apiRequest<OpenChatResponse>("/api/chats/open", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function getUnreadCount(): Promise<number> {
  const response = await apiRequest<{ total: number }>("/api/messages/unread-count", {
    headers: await authHeader(),
  });
  return response.total ?? 0;
}
