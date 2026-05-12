import { useEffect, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { isChatNotification, type PushNotificationData } from "@/types/notifications";

export function usePushNotificationListener(
  onNotificationReceived: () => void,
) {
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as
          | PushNotificationData
          | undefined;

        if (!isChatNotification(data)) {
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
