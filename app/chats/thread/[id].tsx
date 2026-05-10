import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Pressable,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/layout/AppScreen";
import { ReportModal } from "@/components/reports/ReportModal";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { getListing } from "@/services/listings";
import {
  createChatConnection,
  onMessageNew,
  onMessageRead,
  onMessageUpdated,
  onMessageDeleted,
  type RealtimeMessage,
  type RealtimeRead,
} from "@/services/chat-realtime";
import { getChats, getMessages, markAsRead, sendMessage, updateMessage, deleteMessage } from "@/services/messages";
import { getMyProfile, getSellerProfile } from "@/services/user";
import { sanitizeInput, validateSafeText } from "@/validation";
import * as Clipboard from "expo-clipboard";

type ChatHeader = { name: string; listingTitle?: string; avatar?: string | null };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const withAlpha = (color: string, alpha: number) => {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  return color;
};

const parseReplyContent = (content: string) => {
  const match = content.match(/^\[\[reply:([^\]]+)\]\]\n?/);
  if (!match) return { replyId: null, body: content };
  return { replyId: match[1], body: content.slice(match[0].length) };
};

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
  const [inputError, setInputError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Awaited<ReturnType<typeof getMessages>>[number] | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<
    Awaited<ReturnType<typeof getMessages>>[number] | null
  >(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const connectionRef = useRef<Awaited<ReturnType<typeof createChatConnection>> | null>(null);

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
        setOtherUserId(otherUserId);

        const [otherProfile, listing, history] = await Promise.all([
          getSellerProfile(otherUserId).catch(() => ({ name: "User" })),
          chat.listingId ? getListing(chat.listingId).catch(() => null) : Promise.resolve(null),
          getMessages(chat.id, 50),
        ]);

        if (!isMounted) return;

        setHeader({
          name: otherProfile.name ?? "User",
          listingTitle: listing?.title,
          avatar: "avatar" in otherProfile ? otherProfile.avatar ?? null : null,
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

  useEffect(() => {
    if (!chatId) return;
    let isMounted = true;
    let joined = false;

    const attachMessage = (incoming: RealtimeMessage) => {
      if (incoming.chatId !== chatId) return;

      setMessages((prev) => {
        if (prev.some((m: any) => m.id === incoming.id)) return prev;

        if (incoming.senderId === myUserId) {
          const index = prev.findIndex(
            (m: any) =>
              typeof m.id === "string" &&
              m.id.startsWith("optimistic-") &&
              m.content === incoming.content,
          );

          if (index !== -1) {
            const next = [...prev];
            next[index] = incoming as any;
            return next;
          }
        }

        const next = [...prev, incoming as any];
        next.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        return next;
      });

      if (incoming.senderId !== myUserId) {
        void markAsRead(chatId, incoming.id);
      }
    };

    const handleRead = (payload: RealtimeRead) => {
      if (payload.chatId !== chatId) return;
      if (payload.readerId === myUserId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId === myUserId ? { ...msg, isRead: true } : msg,
        ),
      );
    };

    const handleUpdate = (incoming: RealtimeMessage) => {
      if (incoming.chatId !== chatId) return;
      setMessages((prev) => prev.map((msg) => (msg.id === incoming.id ? incoming : msg)));
    };

    const handleDelete = (payload: { id: string; chatId: string }) => {
      if (payload.chatId !== chatId) return;
      setMessages((prev) => prev.filter((msg) => msg.id !== payload.id));
      if (editingMessageId === payload.id) {
        setEditingMessageId(null);
        setEditingReplyId(null);
        setInput("");
      }
      if (replyTo?.id === payload.id) {
        setReplyTo(null);
      }
    };

    const connect = async () => {
      try {
        const connection = await createChatConnection();
        if (!isMounted) return;

        connectionRef.current = connection;
        onMessageNew(connection, attachMessage);
        onMessageRead(connection, handleRead);
        onMessageUpdated(connection, handleUpdate);
        onMessageDeleted(connection, handleDelete);
        await connection.start();
        await connection.invoke("Join", chatId);
        joined = true;
      } catch {
        // Intentionally silent: chat still works via REST fallback.
      }
    };

    void connect();

    return () => {
      isMounted = false;
      const connection = connectionRef.current;
      connectionRef.current = null;
      if (!connection) return;
      const leave = joined ? connection.invoke("Leave", chatId) : Promise.resolve();
      void leave.finally(() => {
        void connection.stop();
      });
    };
  }, [chatId, myUserId]);

  const handleSend = async () => {
    if (!chatId || !input.trim() || sending) return;

    const trimmed = input.trim();
    const validation = validateSafeText(trimmed);
    if (!validation.valid) {
      setInputError("Profanity isn't allowed.");
      return;
    }

    if (editingMessageId) {
      try {
        setSending(true);
        const replyPrefix = editingReplyId ? `[[reply:${editingReplyId}]]\n` : "";
        const updated = await updateMessage(editingMessageId, `${replyPrefix}${sanitizeInput(trimmed)}`);
        setMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)));
        setInput("");
        setInputError(null);
        setEditingMessageId(null);
        setEditingReplyId(null);
      } catch {
        setInput(trimmed);
      } finally {
        setSending(false);
      }
      return;
    }

    const replyPrefix = replyTo ? `[[reply:${replyTo.id}]]\n` : "";
    const text = `${replyPrefix}${sanitizeInput(trimmed)}`;
    setInput("");
    setInputError(null);
    setReplyTo(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      chatId,
      senderId: myUserId ?? "",
      receiverId: "",
      listingId: null,
      content: text,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setMessages((prev) => [...prev, optimistic as any]);
    scrollToBottom(true, 0);
    scrollToBottom(true, 50);

    try {
      setSending(true);
      const created = await sendMessage(chatId, text);
      setMessages((prev) => {
        if (prev.some((m: any) => m.id === created.id)) {
          return prev.filter((m: any) => m.id !== optimisticId);
        }
        return prev.map((m: any) => (m.id === optimisticId ? created : m));
      });
      scrollToBottom(true, 0);
      scrollToBottom(true, 50);
    } catch {
      setMessages((prev) => prev.filter((m: any) => m.id !== optimisticId));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleInputFocus = () => {
    scrollToBottom(true, 0);
    scrollToBottom(true, 80);
    scrollToBottom(true, 160);
  };

  const canModify = (message: Awaited<ReturnType<typeof getMessages>>[number]) => {
    if (!myUserId || message.senderId !== myUserId) return false;
    return Date.now() - new Date(message.createdAt).getTime() <= 15 * 60 * 1000;
  };

  const handleCopySelected = async () => {
    if (!selectedMessage) return;
    const parsed = parseReplyContent(selectedMessage.content);
    await Clipboard.setStringAsync(parsed.body);
    setSelectedMessage(null);
  };

  const handleEditSelected = () => {
    if (!selectedMessage || !canModify(selectedMessage)) return;
    const parsed = parseReplyContent(selectedMessage.content);
    setEditingMessageId(selectedMessage.id);
    setEditingReplyId(parsed.replyId);
    setReplyTo(null);
    setInput(parsed.body);
    setSelectedMessage(null);
  };

  const handleDeleteSelected = async () => {
    if (!selectedMessage || !canModify(selectedMessage)) return;
    Alert.alert("Delete message?", "This action can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMessage(selectedMessage.id);
            setMessages((prev) => prev.filter((msg) => msg.id !== selectedMessage.id));
          } catch {
            // ignore delete failures
          } finally {
            setSelectedMessage(null);
          }
        },
      },
    ]);
  };

  const handleReportSelected = () => {
    if (!selectedMessage || !myUserId || selectedMessage.senderId === myUserId) return;
    setReportTargetId(selectedMessage.id);
    setReportOpen(true);
    setSelectedMessage(null);
  };

  const handleReportMessage = (
    message: Awaited<ReturnType<typeof getMessages>>[number],
  ) => {
    if (!myUserId || message.senderId === myUserId) return;
    setReportTargetId(message.id);
    setReportOpen(true);
  };

  const touchStartRef = useRef(new Map<string, { x: number; y: number }>());
  const touchMoveRef = useRef(new Map<string, { x: number; y: number }>());
  const swipeAnimRef = useRef(new Map<string, Animated.Value>());
  const swipeFrameRef = useRef(new Map<string, number>());
  const swipeLatestRef = useRef(new Map<string, number>());

  const getSwipeAnim = (id: string) => {
    let anim = swipeAnimRef.current.get(id);
    if (!anim) {
      anim = new Animated.Value(0);
      swipeAnimRef.current.set(id, anim);
    }
    return anim;
  };

  const scheduleSwipeValue = (id: string, value: number) => {
    swipeLatestRef.current.set(id, value);
    if (swipeFrameRef.current.has(id)) return;
    const frame = requestAnimationFrame(() => {
      swipeFrameRef.current.delete(id);
      const latest = swipeLatestRef.current.get(id) ?? 0;
      getSwipeAnim(id).setValue(latest);
    });
    swipeFrameRef.current.set(id, frame);
  };

  const resetSwipe = (id: string) => {
    const frame = swipeFrameRef.current.get(id);
    if (frame) {
      cancelAnimationFrame(frame);
      swipeFrameRef.current.delete(id);
    }
    swipeLatestRef.current.delete(id);
    Animated.timing(getSwipeAnim(id), {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start();
    setIsSwiping(false);
    touchStartRef.current.delete(id);
    touchMoveRef.current.delete(id);
  };

  const scrollToMessage = (targetId: string) => {
    const index = messages.findIndex((msg) => msg.id === targetId);
    if (index === -1) return;
    try {
      listRef.current?.scrollToIndex({ index, viewPosition: 0.4, animated: true });
    } catch {
      // ignore scroll failures
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setInputError(null);
      return;
    }
    const validation = validateSafeText(trimmed);
    setInputError(validation.valid ? null : "Profanity isn't allowed.");
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
            <TouchableOpacity
              style={styles.headerInfo}
              disabled={!otherUserId}
              onPress={() => {
                if (otherUserId) router.push(`/seller/${otherUserId}`);
              }}
            >
              <View style={styles.avatar}>
                {header.avatar ? (
                  <Image source={{ uri: header.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarLabel}>
                    {header.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>{header.name}</Text>
                {header.listingTitle ? (
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {header.listingTitle}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
            {selectedMessage ? (
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleCopySelected} style={styles.headerActionButton}>
                  <Ionicons name="copy-outline" size={18} color={theme.text} />
                </TouchableOpacity>
                {myUserId && selectedMessage.senderId !== myUserId ? (
                  <TouchableOpacity onPress={handleReportSelected} style={styles.headerActionButton}>
                    <Ionicons name="flag-outline" size={18} color={theme.danger} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={handleEditSelected}
                  disabled={!canModify(selectedMessage)}
                  style={[
                    styles.headerActionButton,
                    !canModify(selectedMessage) && styles.headerActionButtonDisabled,
                  ]}
                >
                  <Ionicons name="create-outline" size={18} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteSelected}
                  disabled={!canModify(selectedMessage)}
                  style={[
                    styles.headerActionButton,
                    !canModify(selectedMessage) && styles.headerActionButtonDisabled,
                  ]}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        <FlatList
          ref={listRef}
          style={styles.flex}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item: message }) => {
            const isMine = myUserId != null && message.senderId === myUserId;
            const readStatus = isMine ? (message.isRead ? "read" : "sent") : null;

            return (
              <View style={[styles.messageRow, isMine ? styles.messageRight : styles.messageLeft]}>
                <AnimatedPressable
                  onLongPress={() =>
                    setSelectedMessage((current) =>
                      current?.id === message.id ? null : message,
                    )
                  }
                  onMoveShouldSetResponderCapture={(e) => {
                    const start = touchStartRef.current.get(message.id);
                    if (!start) return false;
                    const dx = Math.abs(e.nativeEvent.pageX - start.x);
                    const dy = Math.abs(e.nativeEvent.pageY - start.y);
                    if (dx > 2 && dy < 10) {
                      if (!isSwiping) setIsSwiping(true);
                      return true;
                    }
                    return false;
                  }}
                  onTouchStart={(e) => {
                    touchStartRef.current.set(message.id, {
                      x: e.nativeEvent.pageX,
                      y: e.nativeEvent.pageY,
                    });
                    touchMoveRef.current.delete(message.id);
                    scheduleSwipeValue(message.id, 0);
                  }}
                  onTouchMove={(e) => {
                    touchMoveRef.current.set(message.id, {
                      x: e.nativeEvent.pageX,
                      y: e.nativeEvent.pageY,
                    });
                    const start = touchStartRef.current.get(message.id);
                    if (!start) return;
                    const dx = Math.max(0, Math.min(48, e.nativeEvent.pageX - start.x));
                    const dy = Math.abs(e.nativeEvent.pageY - start.y);
                    if (!isSwiping && dx > 4 && dy < 16) {
                      setIsSwiping(true);
                    }
                    scheduleSwipeValue(message.id, dx);
                  }}
                  onTouchEnd={(e) => {
                    const start = touchStartRef.current.get(message.id);
                    if (!start) return;
                    const last = touchMoveRef.current.get(message.id);
                    const end = last ?? {
                      x: e.nativeEvent.pageX,
                      y: e.nativeEvent.pageY,
                    };
                    const dx = end.x - start.x;
                    const dy = Math.abs(end.y - start.y);
                    if (dx > 24 && dy < 20) {
                      setReplyTo(message);
                      setEditingMessageId(null);
                      setEditingReplyId(null);
                      setInput("");
                    }
                    setIsSwiping(false);
                    resetSwipe(message.id);
                  }}
                  onTouchCancel={() => resetSwipe(message.id)}
                  onResponderTerminate={() => resetSwipe(message.id)}
                  onStartShouldSetResponder={() => true}
                  style={[
                    isMine ? styles.bubbleMine : styles.bubbleOther,
                    selectedMessage?.id === message.id &&
                      (isMine ? styles.bubbleSelectedMine : styles.bubbleSelectedOther),
                    { transform: [{ translateX: getSwipeAnim(message.id) }] },
                  ]}
                >
                  {(() => {
                    const parsed = parseReplyContent(message.content);
                    const replyTarget = parsed.replyId
                      ? messages.find((m) => m.id === parsed.replyId) ?? null
                      : null;
                    const replyBody = replyTarget
                      ? parseReplyContent(replyTarget.content).body
                      : null;
                    return (
                      <>
                        {parsed.replyId ? (
                          <Pressable
                            onPress={() => scrollToMessage(parsed.replyId as string)}
                            style={[
                              styles.replyBubble,
                              isMine ? styles.replyBubbleMine : styles.replyBubbleOther,
                            ]}
                          >
                            <Text
                              style={[
                                styles.replyHeader,
                                isMine ? styles.replyHeaderMine : styles.replyHeaderOther,
                              ]}
                            >
                              Reply
                            </Text>
                            <Text
                              style={[
                                styles.replyText,
                                isMine ? styles.replyTextMine : styles.replyTextOther,
                              ]}
                              numberOfLines={2}
                            >
                              {replyBody ?? "Original message unavailable"}
                            </Text>
                          </Pressable>
                        ) : null}
                        <Text style={isMine ? styles.messageTextMine : styles.messageTextOther}>
                          {parsed.body}
                        </Text>
                      </>
                    );
                  })()}
                  <View style={styles.metaRow}>
                    <Text style={isMine ? styles.messageTimeMine : styles.messageTimeOther}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    {!isMine ? (
                      <TouchableOpacity
                        style={styles.reportInlineButton}
                        onPress={() => handleReportMessage(message)}
                      >
                        <Ionicons name="flag-outline" size={14} color={theme.danger} />
                      </TouchableOpacity>
                    ) : null}
                    {readStatus ? (
                      <Ionicons
                        name={readStatus === "read" ? "checkmark-done" : "checkmark"}
                        size={14}
                        color={isMine ? "rgba(255,255,255,0.85)" : theme.textMuted}
                        style={styles.readIcon}
                      />
                    ) : null}
                  </View>
                </AnimatedPressable>
              </View>
            );
          }}
          ListFooterComponent={<View style={{ height: 12 }} />}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!isSwiping && !selectedMessage}
          overScrollMode="never"
          bounces={false}
          alwaysBounceVertical={false}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.inputRow, { paddingBottom: 12 + insets.bottom }]}>
            {(editingMessageId || replyTo) ? (
              <View style={styles.actionBanner}>
                <Text style={styles.actionBannerText}>
                  {editingMessageId
                    ? "Editing message"
                    : `Replying to: ${replyTo?.content.slice(0, 60)}`}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingMessageId(null);
                    setEditingReplyId(null);
                    setReplyTo(null);
                    setInput("");
                    setSelectedMessage(null);
                  }}
                >
                  <Text style={styles.actionBannerDismiss}>x</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <TextInput
              style={[styles.input, inputError && styles.inputError]}
              placeholder="Write a message..."
              value={input}
              onChangeText={handleInputChange}
              placeholderTextColor={theme.textMuted}
              multiline
              onFocus={handleInputFocus}
            />
            {inputError ? (
              <Text style={styles.inputErrorText}>{inputError}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.sendButton,
                (sending || !input.trim() || !!inputError) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={sending || !input.trim() || !!inputError}
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
        {reportTargetId ? (
          <ReportModal
            visible={reportOpen}
            targetType="Message"
            targetId={reportTargetId}
            onClose={() => {
              setReportOpen(false);
              setReportTargetId(null);
            }}
          />
        ) : null}
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
    headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    headerText: { flex: 1, gap: 2 },
    headerTitle: { fontSize: 16, fontWeight: "700", color: theme.text },
    headerSubtitle: { fontSize: 12, color: theme.textMuted },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    headerActionButton: { padding: 6, borderRadius: 10, backgroundColor: theme.surfaceMuted },
    headerActionButtonDisabled: { opacity: 0.4 },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
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
    avatarLabel: {
      color: theme.chipActiveText,
      fontSize: 14,
      fontWeight: "700",
    },

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
    bubbleSelectedMine: {
      backgroundColor: withAlpha(theme.primary, 0.8),
    },
    bubbleSelectedOther: {
      backgroundColor: withAlpha(theme.primary, 0.12),
    },

    messageTextOther: { fontSize: 14, color: theme.text },
    messageTextMine: { fontSize: 14, color: "#fff" },
    replyBubble: {
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 6,
      marginBottom: 6,
    },
    replyBubbleMine: {
      backgroundColor: "rgba(255, 255, 255, 0.18)",
    },
    replyBubbleOther: {
      backgroundColor: withAlpha(theme.primary, 0.08),
    },
    replyHeader: {
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 2,
    },
    replyHeaderMine: {
      color: "rgba(255,255,255,0.9)",
    },
    replyHeaderOther: {
      color: theme.primary,
    },
    replyText: {
      fontSize: 12,
    },
    replyTextMine: {
      color: "rgba(255,255,255,0.9)",
    },
    replyTextOther: {
      color: theme.textMuted,
    },

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
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 6,
      marginTop: 4,
    },
    reportInlineButton: {
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: theme.surfaceMuted,
    },
    readIcon: {
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
      flexWrap: "wrap",
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
    inputError: {
      borderColor: theme.danger,
    },
    inputErrorText: {
      color: theme.danger,
      fontSize: 12,
      marginTop: 6,
      marginLeft: 6,
      flexBasis: "100%",
    },
    actionBanner: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.surfaceMuted,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    actionBannerText: {
      fontSize: 12,
      color: theme.textMuted,
      flex: 1,
      marginRight: 8,
    },
    actionBannerDismiss: {
      fontSize: 16,
      color: theme.textMuted,
      paddingHorizontal: 6,
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
