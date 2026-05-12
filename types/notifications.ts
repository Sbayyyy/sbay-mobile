export const NotificationTypes = {
  Notification: "notification",
  Chat: "chat",
  Alert: "alert",
} as const;

export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

export type PushNotificationData = {
  type?: NotificationType;
  chatId?: string;
  listingId?: string;
  notificationId?: string;
  href?: string;
  title?: string;
  body?: string;
};

export function isChatNotification(data?: PushNotificationData | null) {
  return data?.type === NotificationTypes.Chat || Boolean(data?.chatId);
}
