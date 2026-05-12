import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

export type AppNotification = {
  id: string;
  type?: string;
  title: string;
  body: string;
  createdAt: string;
  href?: string;
  read?: boolean;
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function getNotifications(): Promise<AppNotification[]> {
  const response = await apiRequest<{ notifications: AppNotification[] }>(
    "/api/notifications",
    {
      headers: await authHeader(),
    },
  );
  return response.notifications ?? [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiRequest<{ total: number }>(
    "/api/notifications/unread-count",
    {
      headers: await authHeader(),
    },
  );
  return response.total ?? 0;
}

export async function markNotificationsRead(): Promise<number> {
  const response = await apiRequest<{ count: number }>("/api/notifications/mark-read", {
    method: "POST",
    headers: await authHeader(),
  });
  return response.count ?? 0;
}
