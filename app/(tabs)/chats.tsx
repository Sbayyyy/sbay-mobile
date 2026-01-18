import { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/layout/AppScreen";
import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";

type Conversation = {
  id: string;
  name: string;
  listingTitle: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
};

const conversations: Conversation[] = [
  {
    id: "1",
    name: "Rami Issa",
    listingTitle: "Vintage record player",
    lastMessage: "Could you share more photos of the back panel?",
    timestamp: "2m ago",
    unread: 2,
  },
  {
    id: "2",
    name: "Noura Khaled",
    listingTitle: "Trail backpack 35L",
    lastMessage: "Thanks! I'll confirm pickup tomorrow.",
    timestamp: "1h ago",
    unread: 0,
  },
  {
    id: "3",
    name: "Jad H.",
    listingTitle: "Handmade ceramic set",
    lastMessage: "Is the price negotiable if I buy today?",
    timestamp: "4h ago",
    unread: 0,
  },
  {
    id: "4",
    name: "Sahar T.",
    listingTitle: "Comfy lounge chair",
    lastMessage: "Delivery to Aleppo would be perfect.",
    timestamp: "Yesterday",
    unread: 1,
  },
];

export default function ChatsScreen() {
  const [search, setSearch] = useState("");
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const list = useMemo(() => {
    return conversations.filter((conversation) => {
      const query = search.trim().toLowerCase();
      return (
        query.length === 0 ||
        conversation.name.toLowerCase().includes(query) ||
        conversation.listingTitle.toLowerCase().includes(query)
      );
    });
  }, [search]);

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

        {list.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t("chats.emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>{t("chats.emptySubtitle")}</Text>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              return (
                <TouchableOpacity style={styles.threadCard}>
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
              );
            }}
          />
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
