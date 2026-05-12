import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getStoredToken } from "@/services/auth";
import { getUnreadNotificationCount } from "@/services/notifications";
import { usePushNotificationListener } from "@/hooks/use-push-notifications";

type NotificationContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const token = await getStoredToken();
      if (!token) {
        setUnreadCount(0);
        return;
      }

      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error refreshing notification count:", error);
      setUnreadCount(0);
    }
  }, []);

  // Load initial count on mount
  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Listen for push notifications and refresh badge
  usePushNotificationListener(() => {
    void refreshUnreadCount();
  });

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnreadCount,
    }),
    [unreadCount, refreshUnreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === null) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider",
    );
  }
  return context;
}
