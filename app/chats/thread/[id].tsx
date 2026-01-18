import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/layout/AppScreen";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { getListing } from "@/services/listings";
import { getChats, getMessages, markAsRead, sendMessage } from "@/services/messages";
import { getMyProfile, getSellerProfile } from "@/services/user";

type ChatHeader = { name: string; listingTitle?: string };

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvt, (e) => {
      setHeight(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(hideEvt, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  const listRef = useRef<FlatList<any>>(null);

  const [header, setHeader] = useState<ChatHeader | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<Awaited<ReturnType<typeof getMessages>>[number]>>(
    [],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  const scrollToBottom = (animated: boolean, delayMs = 0) => {
    const run = () => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated });
      });
    };

    if (delayMs > 0) {
      setTimeout(run, delayMs);
    } else {
      run();
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    const loadChat = async () => {
      try {
        setLoading(true);
        setError(null);

        const profile = await getMyProfile();
        if (!isMounted) return;
        setMyUserId(profile.id);

        const chats = await getChats(200, 0);
        const chat = chats.find((c) => c.id === id);
        if (!chat) throw new Error("Chat not found.");

        setChatId(chat.id);

        const otherUserId = chat.buyerId === profile.id ? chat.sellerId : chat.buyerId;

        const [otherProfile, listing, history] = await Promise.all([
          getSellerProfile(otherUserId).catch(() => ({ name: "User" })),
          chat.listingId ? getListing(chat.listingId).catch(() => null) : Promise.resolve(null),
          getMessages(chat.id, 50),
        ]);

        if (!isMounted) return;

        setHeader({
          name: otherProfile.name ?? "User",
          listingTitle: listing?.title,
        });

        const ordered = [...history].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

        setMessages(ordered);
        const lastIncoming = [...ordered].reverse().find((m) => m.senderId !== profile.id);
        if (lastIncoming) {
          await markAsRead(chat.id, lastIncoming.id);
        }

        scrollToBottom(false, 0);
        scrollToBottom(false, 50);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load chat.");
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    void loadChat();
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const sub = Keyboard.addListener(showEvt, () => {
      scrollToBottom(true, 0);
      scrollToBottom(true, 80);
      scrollToBottom(true, 160);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    scrollToBottom(true, 0);
    scrollToBottom(true, 50);
  }, [messages.length]);

  const handleSend = async () => {
    if (!chatId || !input.trim() || sending) return;

    const text = input.trim();
    setInput("");

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      chatId,
      senderId: myUserId ?? "",
      receiverId: "",
      listingId: null,
      content: text,
      createdAt: new Date().toISOString(),
      isRead: true,
    };

    setMessages((prev) => [...prev, optimistic as any]);
    scrollToBottom(true, 0);
    scrollToBottom(true, 50);

    try {
      setSending(true);
      const created = await sendMessage(chatId, text);
      setMessages((prev) => prev.map((m: any) => (m.id === optimisticId ? created : m)));
      scrollToBottom(true, 0);
      scrollToBottom(true, 50);
    } catch {
      setMessages((prev) => prev.filter((m: any) => m.id !== optimisticId));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleInputFocus = (_e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    scrollToBottom(true, 0);
    scrollToBottom(true, 80);
    scrollToBottom(true, 160);
  };

  if (loading) {
    return (
      <AppScreen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </AppScreen>
    );
  }

  if (error || !header) {
    return (
      <AppScreen>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Chat unavailable</Text>
          <Text style={styles.emptySubtitle}>{error ?? "Please try again."}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonLabel}>Go back</Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  const androidKeyboardSpacer = Platform.OS === "android" ? keyboardHeight : 0;

  return (
    <AppScreen>
      <View style={styles.flex}>
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{header.name}</Text>
              {header.listingTitle ? (
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {header.listingTitle}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

  <FlatList
  ref={listRef}
  style={styles.flex}
  data={messages}
  keyExtractor={(m) => m.id}
  renderItem={({ item: message }) => {
    const isMine = myUserId != null && message.senderId === myUserId;
    return (
      <View style={[styles.messageRow, isMine ? styles.messageRight : styles.messageLeft]}>
        <View style={isMine ? styles.bubbleMine : styles.bubbleOther}>
          <Text style={isMine ? styles.messageTextMine : styles.messageTextOther}>
            {message.content}
          </Text>
          <Text style={isMine ? styles.messageTimeMine : styles.messageTimeOther}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  }}
  ListFooterComponent={<View style={{ height: 12 }} />}
  contentContainerStyle={styles.messages}
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
  overScrollMode="never"
  bounces={false}
  alwaysBounceVertical={false}
/>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.inputRow, { paddingBottom: 12 + insets.bottom }]}>
            <TextInput
              style={styles.input}
              placeholder="Write a message..."
              value={input}
              onChangeText={setInput}
              placeholderTextColor={theme.textMuted}
              multiline
              onFocus={handleInputFocus}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (sending || !input.trim()) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={sending || !input.trim()}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {androidKeyboardSpacer > 0 ? <View style={{ height: androidKeyboardSpacer }} /> : null}
        </KeyboardAvoidingView>
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },

    headerBar: {
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backIcon: { padding: 6, borderRadius: 12, backgroundColor: theme.surfaceMuted },
    headerText: { flex: 1, gap: 2 },
    headerTitle: { fontSize: 16, fontWeight: "700", color: theme.text },
    headerSubtitle: { fontSize: 12, color: theme.textMuted },

    messages: { padding: 16, gap: 12 },
    messageRow: { flexDirection: "row" },
    messageLeft: { justifyContent: "flex-start" },
    messageRight: { justifyContent: "flex-end" },

    bubbleOther: {
      maxWidth: "80%",
      backgroundColor: theme.surface,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    bubbleMine: {
      maxWidth: "80%",
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },

    messageTextOther: { fontSize: 14, color: theme.text },
    messageTextMine: { fontSize: 14, color: "#fff" },

    messageTimeOther: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 4,
      alignSelf: "flex-end",
    },
    messageTimeMine: {
      fontSize: 11,
      color: "rgba(255,255,255,0.85)",
      marginTop: 4,
      alignSelf: "flex-end",
    },

    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.text,
      maxHeight: 120,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 2,
    },
    sendButtonDisabled: { opacity: 0.6 },

    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 10,
    },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.text },
    emptySubtitle: { fontSize: 14, color: theme.textMuted, textAlign: "center" },
    backButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.surfaceMuted,
      marginTop: 8,
    },
    backButtonLabel: { fontSize: 13, fontWeight: "600", color: theme.primary },
  });
