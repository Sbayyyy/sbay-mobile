import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { getNotifications, type AppNotification } from "@/services/notifications";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
      const data = await getNotifications();
      setNotifications(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications("initial");
  }, [loadNotifications]);

  return (
    <AppScreen>
      <View style={styles.container}>
        <Text style={styles.title}>{t("notifications.title")}</Text>

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
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => {
                  if (item.href) {
                    router.push(item.href);
                  }
                }}
                activeOpacity={0.85}
              >
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMessage}>{item.body}</Text>
                </View>
                <Text style={styles.cardTime}>{formatRelativeTime(item.createdAt)}</Text>
              </TouchableOpacity>
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
    list: {
      gap: 12,
      paddingBottom: 24,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 14,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
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
      marginTop: 10,
      fontSize: 12,
      color: theme.textMuted,
    },
  });
