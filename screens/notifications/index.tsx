import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/layout/AppScreen";
import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";
import {
  archiveNotification,
  getNotifications,
  markNotificationRead,
  markNotificationsRead,
  type AppNotification,
} from "@/services/notifications";
import { useNotificationContext } from "@/providers/NotificationProvider";
import { normalizeNotificationHref } from "@/services/notification-links";
import { getFriendlyErrorMessage } from "@/services/account-status-errors";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(null);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { refreshUnreadCount } = useNotificationContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasUnread = notifications.some((item) => !item.read);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const loadNotifications = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setLoadError(null);
      const data = await getNotifications();
      setNotifications(data);
      await refreshUnreadCount();
    } catch (error) {
      const message = getFriendlyErrorMessage(
        error,
        t("notifications.loadErrorBody", {
          defaultValue: "We could not load your notifications. Please try again.",
        }),
      );
      setLoadError(message);
      Alert.alert(
        t("notifications.loadErrorTitle", { defaultValue: "Could not load notifications" }),
        message,
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUnreadCount, t]);

  const handleMarkAllRead = useCallback(async () => {
    if (!hasUnread) return;
    const previous = notifications;
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    try {
      await markNotificationsRead();
      await refreshUnreadCount();
    } catch (error) {
      setNotifications(previous);
      Alert.alert(
        t("notifications.markReadErrorTitle", { defaultValue: "Could not mark read" }),
        error instanceof Error
          ? error.message
          : t("notifications.markReadErrorBody", { defaultValue: "Please try again." }),
      );
    }
  }, [hasUnread, notifications, refreshUnreadCount, t]);

  const handleMarkOneRead = useCallback(
    async (item: AppNotification) => {
      if (item.read || busyNotificationId) return;
      const previous = notifications;
      setBusyNotificationId(item.id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id ? { ...notification, read: true } : notification,
        ),
      );
      try {
        await markNotificationRead(item.id);
        await refreshUnreadCount();
      } catch (error) {
        setNotifications(previous);
        Alert.alert(
          t("notifications.markReadErrorTitle", { defaultValue: "Could not mark read" }),
          error instanceof Error
            ? error.message
            : t("notifications.markReadErrorBody", { defaultValue: "Please try again." }),
        );
      } finally {
        setBusyNotificationId(null);
      }
    },
    [busyNotificationId, notifications, refreshUnreadCount, t],
  );

  const handleArchive = useCallback(
    async (item: AppNotification) => {
      if (busyNotificationId) return;
      const previous = notifications;
      setBusyNotificationId(item.id);
      setNotifications((current) =>
        current.filter((notification) => notification.id !== item.id),
      );
      try {
        await archiveNotification(item.id);
        await refreshUnreadCount();
      } catch (error) {
        setNotifications(previous);
        Alert.alert(
          t("notifications.archiveErrorTitle", { defaultValue: "Could not remove notification" }),
          error instanceof Error
            ? error.message
            : t("notifications.archiveErrorBody", { defaultValue: "Please try again." }),
        );
      } finally {
        setBusyNotificationId(null);
      }
    },
    [busyNotificationId, notifications, refreshUnreadCount, t],
  );

  const openNotification = useCallback(
    (item: AppNotification) => {
      const href = normalizeNotificationHref(item.href);
      if (!href) {
        Alert.alert(
          t("notifications.linkUnavailableTitle", { defaultValue: "Link unavailable" }),
          t("notifications.linkUnavailableBody", {
            defaultValue: "This notification does not point to a mobile screen yet.",
          }),
        );
        return;
      }
      if (!item.read) {
        void handleMarkOneRead(item);
      }
      router.push(href);
    },
    [handleMarkOneRead, router, t],
  );

  useEffect(() => {
    void loadNotifications("initial");
  }, [loadNotifications]);

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("notifications.title")}</Text>
          {hasUnread ? (
            <TouchableOpacity style={styles.markReadButton} onPress={handleMarkAllRead}>
              <Text style={styles.markReadLabel}>
                {t("notifications.markAllRead", { defaultValue: "Mark read" })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadNotifications("refresh")}
                tintColor={theme.primary}
              />
            }
          >
            {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
            <Text style={styles.emptyTitle}>{t("notifications.emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>{t("notifications.emptySubtitle")}</Text>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadNotifications("refresh")}
                tintColor={theme.primary}
              />
            }
          >
            {notifications.map((item) => (
              <View
                key={item.id}
                style={[styles.card, !item.read && styles.unreadCard]}
              >
                {!item.read ? <View style={styles.unreadDot} /> : null}
                <TouchableOpacity
                  style={styles.cardBody}
                  onPress={() => openNotification(item)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMessage}>{item.body}</Text>
                </TouchableOpacity>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardTime}>{formatRelativeTime(item.createdAt)}</Text>
                  <View style={styles.cardActions}>
                    {!item.read ? (
                      <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={() => {
                          void handleMarkOneRead(item);
                        }}
                        disabled={busyNotificationId === item.id}
                      >
                        <Text style={styles.cardActionText}>
                          {t("notifications.markOneRead", { defaultValue: "Read" })}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.cardActionButton}
                      onPress={() => {
                        void handleArchive(item);
                      }}
                      disabled={busyNotificationId === item.id}
                    >
                      <Text style={styles.cardActionText}>
                        {t("notifications.archive", { defaultValue: "Remove" })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      gap: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.text,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    markReadButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.primaryMuted,
    },
    markReadLabel: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: "700",
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyState: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: "center",
      paddingHorizontal: 30,
    },
    errorText: {
      color: theme.danger,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
      paddingHorizontal: 30,
    },
    list: {
      gap: 12,
      paddingBottom: 24,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    unreadCard: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryMuted,
    },
    unreadDot: {
      position: "absolute",
      top: 14,
      right: 14,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: theme.primary,
    },
    cardBody: {
      gap: 6,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
    },
    cardMessage: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    cardTime: {
      fontSize: 12,
      color: theme.textMuted,
    },
    cardFooter: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    cardActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    cardActionButton: {
      borderRadius: 999,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    cardActionText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: "700",
    },
  });
