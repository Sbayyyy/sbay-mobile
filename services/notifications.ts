import { authHeader, apiRequest } from "@/services/auth-session";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  href?: string;
  read?: boolean;
};

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
