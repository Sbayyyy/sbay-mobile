import { Tabs, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAppTheme } from "@/hooks/use-app-theme";
import { getStoredToken } from "@/services/auth";
import {
  createChatConnection,
  onMessageNew,
  onMessageRead,
  onNotificationNew,
  onNotificationRead,
} from "@/services/chat-realtime";
import { getChats, getUnreadCount } from "@/services/messages";
import { useNotificationContext } from "@/providers/NotificationProvider";
import { type HubConnection } from "@microsoft/signalr";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + insets.bottom;
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const requestIdRef = useRef(0);
  const connectionRef = useRef<HubConnection | null>(null);
  const joinedChatsRef = useRef<string[]>([]);
  const { refreshUnreadCount } = useNotificationContext();

  const loadUnread = useCallback(() => {
    let isMounted = true;
    const requestId = ++requestIdRef.current;

    const run = async () => {
      try {
        const token = await getStoredToken();
        if (!token) {
          if (isMounted && requestId === requestIdRef.current) setUnreadTotal(0);
          return;
        }

        const total = await getUnreadCount();
        if (isMounted && requestId === requestIdRef.current) setUnreadTotal(total);
      } catch {
        if (isMounted && requestId === requestIdRef.current) setUnreadTotal(0);
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = loadUnread();
    return () => {
      cleanup?.();
    };
  }, [loadUnread]);

  useEffect(() => {
    let isMounted = true;
    let joined = false;

    const connect = async () => {
      const token = await getStoredToken();
      if (!token || !isMounted) return;

      try {
        const connection = await createChatConnection();
        if (!isMounted) return;

        connectionRef.current = connection;
        onMessageNew(connection, () => {
          loadUnread();
        });
        onMessageRead(connection, () => {
          loadUnread();
        });
        onNotificationNew(connection, () => {
          void refreshUnreadCount();
        });
        onNotificationRead(connection, () => {
          void refreshUnreadCount();
        });

        await connection.start();
        const chats = await getChats(200, 0);
        const chatIds = chats.map((chat) => chat.id);
        joinedChatsRef.current = chatIds;
        await Promise.all(chatIds.map((chatId) => connection.invoke("Join", chatId)));
        joined = true;
      } catch {
        connectionRef.current = null;
        joinedChatsRef.current = [];
      }
    };

    void connect();

    return () => {
      isMounted = false;
      const connection = connectionRef.current;
      const chatIds = joinedChatsRef.current;
      connectionRef.current = null;
      joinedChatsRef.current = [];
      if (!connection) return;
      const leave = joined
        ? Promise.all(chatIds.map((chatId) => connection.invoke("Leave", chatId)))
        : Promise.resolve();
      void leave.finally(() => {
        void connection.stop();
      });
    };
  }, [loadUnread]);

  useFocusEffect(
    useCallback(() => {
      const cleanup = loadUnread();
      return () => {
        cleanup?.();
      };
    }, [loadUnread]),
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          borderTopWidth: 1,
          elevation: 5,
          backgroundColor: theme.navigationBackground,
          borderTopColor: theme.navigationBorder,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 0),
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
        tabBarItemStyle: {
          paddingBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("navigation.tabs.home"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="favorites"
        options={{
          title: t("navigation.tabs.favorites"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="add_listing"
        options={{
          title: t("navigation.tabs.addListing"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chats"
        options={{
          title: t("navigation.tabs.chats"),
          tabBarBadge: unreadTotal > 0 ? (unreadTotal > 99 ? "99+" : unreadTotal) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#E53935",
            color: "#fff",
            fontSize: 10,
            fontWeight: "700",
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="me"
        options={{
          title: t("navigation.tabs.me"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
