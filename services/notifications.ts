export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  href?: string;
  read?: boolean;
};

export async function getNotifications(): Promise<AppNotification[]> {
  return [];
}
