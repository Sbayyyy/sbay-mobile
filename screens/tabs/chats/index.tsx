import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  I18nManager,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useRouter } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  MarketplaceRadius,
  MarketplaceShadow,
  MarketplaceSpacing,
  MarketplaceTypography,
  type ThemeColors,
} from "@/constants/theme";
import { archiveChat, getChatSummaries } from "@/services/messages";
import { getMyProfile, getSellerProfile } from "@/services/user";
import { getListing } from "@/services/listings";
import { getFriendlyErrorMessage } from "@/services/account-status-errors";
import { ConversationRowSkeleton } from "@/components/chats/ConversationRowSkeleton";

type Conversation = {
  id: string;
  title: string;
  participantName: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  imageUrl?: string | null;
};

export default function ChatsScreen() {
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

    if (diffMins < 1) return t("common.time.now", { defaultValue: "now" });
    if (diffMins < 60) {
      return t("common.time.minutesAgo", { defaultValue: "{{count}}m ago", count: diffMins });
    }
    if (diffHours < 24) {
      return t("common.time.hoursAgo", { defaultValue: "{{count}}h ago", count: diffHours });
    }
    if (diffDays < 7) {
      return t("common.time.daysAgo", { defaultValue: "{{count}}d ago", count: diffDays });
    }
    return date.toLocaleDateString();
  };

  const loadChats = useCallback((mode: "initial" | "refresh" = "initial") => {
    let isMounted = true;

    const run = async () => {
      try {
        if (mode === "refresh") {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const profile = await getMyProfile();
        const chats = await getChatSummaries(50, 0);

        const otherUserIds = Array.from(
          new Set(chats.map((chat) => (chat.buyerId === profile.id ? chat.sellerId : chat.buyerId))),
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
              profileMap.set(userId, { name: t("chats.unknownUser") });
            }
          }),
        );

        const listingMap = new Map<string, { title: string; imageUrl?: string | null }>();
        await Promise.all(
          listingIds.map(async (listingId) => {
            try {
              const listing = await getListing(listingId);
              listingMap.set(listingId, {
                title: listing.title,
                imageUrl: listing.thumbnailUrl ?? listing.imageUrls?.[0] ?? null,
              });
            } catch {
              listingMap.set(listingId, { title: t("chats.listingFallback") });
            }
          }),
        );

        const rows: Conversation[] = chats.map((chat) => {
          const otherUserId =
            chat.buyerId === profile.id ? chat.sellerId : chat.buyerId;

          const listing = chat.listingId ? listingMap.get(chat.listingId) : null;
          const timestamp = chat.lastMessage?.createdAt ?? chat.lastMessageAt ?? chat.createdAt ?? "";

          return {
            id: chat.chatId,
            title: chat.listingId
              ? listing?.title ?? t("chats.listingFallback")
              : t("chats.generalChat", { defaultValue: "General chat" }),
            participantName: profileMap.get(otherUserId)?.name ?? t("chats.unknownUser"),
            lastMessage:
              chat.lastMessage?.content ??
              t("chats.noMessages", { defaultValue: "No messages yet." }),
            timestamp: formatRelativeTime(timestamp),
            unread: chat.unreadCount,
            imageUrl: listing?.imageUrl ?? null,
          };
        });

        if (!isMounted) return;
        setConversations(rows);
      } catch (err) {
        if (!isMounted) return;
        setError(
          getFriendlyErrorMessage(
            err,
            t("chats.errorSubtitle", { defaultValue: "Please try again." }),
          ),
        );
      } finally {
        if (!isMounted) return;
        setLoading(false);
        setRefreshing(false);
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, [t]);

  const handleArchiveChat = useCallback((chatId: string) => {
    Alert.alert(
      t("chats.deleteTitle", { defaultValue: "Delete chat?" }),
      t("chats.deleteBody", { defaultValue: "This removes the chat from your inbox." }),
      [
        { text: t("common.actions.cancel", { defaultValue: "Cancel" }), style: "cancel" },
        {
          text: t("common.actions.delete", { defaultValue: "Delete" }),
          style: "destructive",
          onPress: () => {
            setConversations((current) => current.filter((item) => item.id !== chatId));
            archiveChat(chatId).catch(() => {
              loadChats("refresh");
              Alert.alert(
                t("common.errors.title", { defaultValue: "Something went wrong" }),
                t("chats.deleteError", { defaultValue: "Unable to delete this chat." }),
              );
            });
          },
        },
      ],
    );
  }, [loadChats, t]);

  useEffect(() => {
    const cleanup = loadChats("initial");
    return () => {
      cleanup?.();
    };
  }, [loadChats]);

  useFocusEffect(
    useCallback(() => {
      const cleanup = loadChats("refresh");
      return () => {
        cleanup?.();
      };
    }, [loadChats]),
  );

  const list = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      return (
        query.length === 0 ||
        conversation.title.toLowerCase().includes(query) ||
        conversation.participantName.toLowerCase().includes(query)
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
          <ConversationRowSkeleton count={8} />
        ) : error ? (
          <ScrollView
            contentContainerStyle={styles.emptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadChats("refresh")}
                tintColor={theme.primary}
              />
            }
          >
            <Text style={styles.emptyTitle}>
              {t("chats.errorTitle", { defaultValue: "Unable to load chats" })}
            </Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
          </ScrollView>
        ) : list.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadChats("refresh")}
                tintColor={theme.primary}
              />
            }
          >
            <Text style={styles.emptyTitle}>{t("chats.emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>{t("chats.emptySubtitle")}</Text>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadChats("refresh")}
                tintColor={theme.primary}
              />
            }
          >
            {list.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.threadCard}
                onPress={() => router.push(`/chats/thread/${item.id}`)}
              >
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatar}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarLabel}>
                        {item.title
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </Text>
                    )}
                  </View>
                  {item.unread > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadLabel}>
                        {item.unread > 99 ? "99+" : String(item.unread)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.threadBody}>
                  <View style={styles.threadHeader}>
                    <Text style={styles.threadName} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.threadTime}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.listingTitle} numberOfLines={1}>{item.participantName}</Text>
                  <Text style={styles.threadMessage} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleArchiveChat(item.id)}
                  accessibilityLabel={t("chats.deleteTitle", { defaultValue: "Delete chat" })}
                >
                  <FontAwesome name="trash-o" size={18} color={theme.textSubtle} />
                </TouchableOpacity>
                <FontAwesome
                  name={I18nManager.isRTL ? "chevron-left" : "chevron-right"}
                  size={14}
                  color={theme.textSubtle}
                />
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
      padding: MarketplaceSpacing.lg,
      paddingBottom: 28,
      gap: MarketplaceSpacing.md,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      fontSize: MarketplaceTypography.screenTitle,
      fontWeight: "800",
      color: theme.text,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: MarketplaceSpacing.sm,
      borderRadius: MarketplaceRadius.xl,
      backgroundColor: theme.surface,
      paddingHorizontal: MarketplaceSpacing.md,
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      ...MarketplaceShadow.subtle,
    },
    searchInput: {
      flex: 1,
      fontSize: MarketplaceTypography.input,
      color: theme.text,
      textAlign: I18nManager.isRTL ? "right" : "left",
    },
    listContent: {
      gap: MarketplaceSpacing.sm,
      paddingBottom: 32,
    },
    threadCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: MarketplaceSpacing.md,
      backgroundColor: theme.surface,
      borderRadius: MarketplaceRadius.card,
      padding: MarketplaceSpacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      ...MarketplaceShadow.subtle,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    avatarWrapper: {
      width: 48,
      height: 48,
      position: "relative",
    },
    avatarLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.chipActiveText,
    },
    threadBody: {
      flex: 1,
      gap: MarketplaceSpacing.xs,
    },
    threadHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    threadName: {
      fontSize: MarketplaceTypography.input,
      fontWeight: "800",
      color: theme.text,
    },
    threadTime: {
      fontSize: MarketplaceTypography.meta,
      color: theme.textMuted,
    },
    listingTitle: {
      fontSize: MarketplaceTypography.body,
      color: theme.primary,
      fontWeight: "700",
    },
    threadMessage: {
      fontSize: MarketplaceTypography.body,
      color: theme.textSecondary,
    },
    deleteButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    unreadBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      borderRadius: 10,
      backgroundColor: "#E53935",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.surface,
    },
    unreadLabel: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 10,
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
