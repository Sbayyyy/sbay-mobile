import { useEffect, useCallback } from "react";
import * as Notifications from "expo-notifications";

export type PushNotificationData = {
  type?: "notification" | "chat" | "alert";
  chatId?: string;
  title?: string;
  body?: string;
  [key: string]: any;
};

export function usePushNotificationListener(
  onNotificationReceived: () => void,
) {
  useEffect(() => {
    // Listen for notifications received while app is in foreground
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as
          | PushNotificationData
          | undefined;

        // If it's a general notification or notification type, refresh badge
        if (!data?.chatId || data?.type === "notification") {
          onNotificationReceived();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [onNotificationReceived]);
}

export function usePushNotificationResponse(
  onNotificationResponse: (data: PushNotificationData) => void,
) {
  useEffect(() => {
    // Listen for when user taps on a notification
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | PushNotificationData
          | undefined;

        if (data) {
          onNotificationResponse(data);
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [onNotificationResponse]);
}
