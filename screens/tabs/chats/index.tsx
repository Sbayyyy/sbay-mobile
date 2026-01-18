import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";
import { getChats, getMessages } from "@/services/messages";
import { getMyProfile, getSellerProfile } from "@/services/user";
import { getListing } from "@/services/listings";

type Conversation = {
  id: string;
  name: string;
  listingTitle: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
};

export default function ChatsScreen() {
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    let isMounted = true;

    const loadChats = async () => {
      try {
        setLoading(true);
        setError(null);

        const profile = await getMyProfile();
        const chats = await getChats(50, 0);

        const otherUserIds = Array.from(
          new Set(
            chats.map((chat) =>
              chat.buyerId === profile.id ? chat.sellerId : chat.buyerId,
            ),
          ),
        );

        const listingIds = Array.from(
          new Set(chats.map((chat) => chat.listingId).filter(Boolean) as string[]),
        );

        const profileMap = new Map<string, { name: string }>();
        await Promise.all(
          otherUserIds.map(async (userId) => {
            try {
              const data = await getSellerProfile(userId);
              profileMap.set(userId, { name: data.name });
            } catch {
              profileMap.set(userId, { name: `User ${userId.slice(0, 8)}` });
            }
          }),
        );

        const listingMap = new Map<string, string>();
        await Promise.all(
          listingIds.map(async (listingId) => {
            try {
              const listing = await getListing(listingId);
              listingMap.set(listingId, listing.title);
            } catch {
              listingMap.set(listingId, "Listing");
            }
          }),
        );

        const lastMessages = await Promise.all(
          chats.map(async (chat) => {
            try {
              const messages = await getMessages(chat.id, 1);
              return messages[0] ?? null;
            } catch {
              return null;
            }
          }),
        );

        const rows: Conversation[] = chats.map((chat, index) => {
          const otherUserId =
            chat.buyerId === profile.id ? chat.sellerId : chat.buyerId;

          const lastMessage = lastMessages[index];

          const timestamp =
            lastMessage?.createdAt ??
            chat.lastMessageAt ??
            chat.createdAt ??
            "";

          return {
            id: chat.id,
            name: profileMap.get(otherUserId)?.name ?? "User",
            listingTitle: chat.listingId
              ? listingMap.get(chat.listingId) ?? "Listing"
              : t("chats.generalChat", { defaultValue: "General chat" }),
            lastMessage:
              lastMessage?.content ??
              t("chats.noMessages", { defaultValue: "No messages yet." }),
            timestamp: formatRelativeTime(timestamp),
            unread: 0,
          };
        });

        if (!isMounted) return;
        setConversations(rows);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load chats.");
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    void loadChats();
    return () => {
      isMounted = false;
    };
  }, [t]);

  const list = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      return (
        query.length === 0 ||
        conversation.name.toLowerCase().includes(query) ||
        conversation.listingTitle.toLowerCase().includes(query)
      );
    });
  }, [search, conversations]);

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("chats.title")}</Text>
        </View>

        <View style={styles.searchBar}>
          <FontAwesome name="search" size={16} color={theme.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("chats.searchPlaceholder")}
            placeholderTextColor={theme.inputPlaceholder}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Unable to load chats</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
          </View>
        ) : list.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t("chats.emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>{t("chats.emptySubtitle")}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {list.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.threadCard}
                onPress={() => router.push(`/chats/thread/${item.id}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarLabel}>
                    {item.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.threadBody}>
                  <View style={styles.threadHeader}>
                    <Text style={styles.threadName}>{item.name}</Text>
                    <Text style={styles.threadTime}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.listingTitle}>{item.listingTitle}</Text>
                  <Text style={styles.threadMessage} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>

                {item.unread > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>{item.unread}</Text>
                  </View>
                ) : (
                  <FontAwesome
                    name="chevron-right"
                    size={14}
                    color={theme.textSubtle}
                  />
                )}
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
      paddingBottom: 30,
      gap: 16,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 14,
      backgroundColor: theme.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
    },
    listContent: {
      gap: 14,
      paddingBottom: 40,
    },
    threadCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 14,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.chipActiveText,
    },
    threadBody: {
      flex: 1,
      gap: 6,
    },
    threadHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    threadName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
    },
    threadTime: {
      fontSize: 12,
      color: theme.textMuted,
    },
    listingTitle: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: "600",
    },
    threadMessage: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    badge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    badgeLabel: {
      color: theme.primaryForeground,
      fontWeight: "600",
      fontSize: 13,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
    },
    loadingState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
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
      paddingHorizontal: 40,
    },
  });
