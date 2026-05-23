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
  Modal,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/layout/AppScreen";
import { OfferMessageCard } from "@/components/chats/OfferMessageCard";
import { ReportModal } from "@/components/reports/ReportModal";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { getListing, type Listing } from "@/services/listings";
import {
  createChatConnection,
  onMessageNew,
  onMessageRead,
  onMessageUpdated,
  onMessageDeleted,
  type RealtimeMessage,
  type RealtimeRead,
} from "@/services/chat-realtime";
import {
  acceptOffer,
  counterOffer,
  getChats,
  getMessages,
  markAsRead,
  rejectOffer,
  sendMessage,
  sendOffer,
  updateMessage,
  deleteMessage,
  type Chat,
  type Message,
  type OfferMessageData,
  type OfferStatus,
} from "@/services/messages";
import { getMyProfile, getSellerProfile } from "@/services/user";
import {
  isEmailVerified,
  isUnverifiedEmailError,
  showEmailVerificationRequiredAlert,
  type EmailVerificationStatus,
} from "@/services/email-verification";
import { getActionErrorMessage, getFriendlyErrorMessage } from "@/services/account-status-errors";
import { sanitizeInput, validateSafeText } from "@/validation";
import * as Clipboard from "expo-clipboard";

type ChatHeader = {
  title: string;
  participantName?: string;
  avatar?: string | null;
  listingId?: string | null;
};

type OfferModalState = {
  mode: "new" | "counter";
  messageId?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const CHAT_BUBBLE_BLUE = "#2563eb";

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

const parseOfferData = (message: Message, fallbackCurrency?: string): OfferMessageData | null => {
  if (message.type !== "offer" || !message.dataJson) return null;

  try {
    const raw = JSON.parse(message.dataJson) as Record<string, unknown>;
    return {
      offerId: String(raw.offerId ?? raw.OfferId ?? ""),
      listingId: String(raw.listingId ?? raw.ListingId ?? message.listingId ?? ""),
      amount: Number(raw.amount ?? raw.Amount ?? 0),
      currency: String(raw.currency ?? raw.Currency ?? fallbackCurrency ?? "SYP"),
      status: String(raw.status ?? raw.Status ?? "pending") as OfferStatus,
      parentOfferId: (raw.parentOfferId ?? raw.ParentOfferId ?? null) as string | null,
      expiresAt: (raw.expiresAt ?? raw.ExpiresAt ?? null) as string | null,
    };
  } catch {
    return null;
  }
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
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  const listRef = useRef<FlatList<any>>(null);

  const [header, setHeader] = useState<ChatHeader | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<EmailVerificationStatus | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [offerModal, setOfferModal] = useState<OfferModalState | null>(null);
  const [offerBusyId, setOfferBusyId] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const connectionRef = useRef<Awaited<ReturnType<typeof createChatConnection>> | null>(null);
  const editingMessageIdRef = useRef<string | null>(null);
  const replyToIdRef = useRef<string | null>(null);

  useEffect(() => {
    editingMessageIdRef.current = editingMessageId;
  }, [editingMessageId]);

  useEffect(() => {
    replyToIdRef.current = replyTo?.id ?? null;
  }, [replyTo?.id]);

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
        setMyProfile(profile);
        setMyUserId(profile.id);

        const chats = await getChats(200, 0);
        const chat = chats.find((c) => c.id === id);
        if (!chat) throw new Error(t("chats.thread.chatNotFound"));

        setChat(chat);
        setChatId(chat.id);

        const otherUserId = chat.buyerId === profile.id ? chat.sellerId : chat.buyerId;
        setOtherUserId(otherUserId);

        const [otherProfile, listing, history] = await Promise.all([
          getSellerProfile(otherUserId).catch(() => ({ name: t("chats.unknownUser") })),
          chat.listingId ? getListing(chat.listingId).catch(() => null) : Promise.resolve(null),
          getMessages(chat.id, 50),
        ]);

        if (!isMounted) return;

        setHeader({
          title: listing?.title ?? t("chats.generalChat"),
          participantName: otherProfile.name ?? t("chats.unknownUser"),
          avatar: listing?.thumbnailUrl ?? listing?.imageUrls?.[0] ?? null,
          listingId: chat.listingId ?? null,
        });
        setListing(listing);

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
        setError(getFriendlyErrorMessage(err, "Unable to load chat."));
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    void loadChat();
    return () => {
      isMounted = false;
    };
  }, [id, t]);

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
      if (editingMessageIdRef.current === payload.id) {
        setEditingMessageId(null);
        setEditingReplyId(null);
        setInput("");
      }
      if (replyToIdRef.current === payload.id) {
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

  const upsertMessage = (updated: Message) => {
    setMessages((prev) => {
      const exists = prev.some((msg) => msg.id === updated.id);
      const next = exists
        ? prev.map((msg) => (msg.id === updated.id ? updated : msg))
        : [...prev, updated];
      next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return next;
    });
  };

  const refreshListing = async () => {
    if (!chat?.listingId) return;
    try {
      const nextListing = await getListing(chat.listingId);
      setListing(nextListing);
      setHeader((current) =>
        current
          ? {
              ...current,
              title: nextListing.title ?? current.title,
              avatar: nextListing.thumbnailUrl ?? nextListing.imageUrls?.[0] ?? current.avatar,
            }
          : current,
      );
    } catch {
      // Keep the current listing snapshot if refresh fails.
    }
  };

  const refreshMessages = async () => {
    if (!chatId) return;
    try {
      const latest = await getMessages(chatId, 50);
      const ordered = [...latest].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages(ordered);
    } catch {
      // Realtime/optimistic state remains usable if this refresh fails.
    }
  };

  const listingStatus = (listing?.status ?? "active").toLowerCase();
  const isListingAvailable =
    !listing || (listingStatus === "active" && (listing.stock == null || listing.stock > 0));
  const canMakeOffer = Boolean(
    chat?.listingId &&
      listing &&
      myUserId &&
      myProfile &&
      chat.buyerId === myUserId &&
      isEmailVerified(myProfile) &&
      isListingAvailable,
  );

  const openOfferModal = (state: OfferModalState) => {
    if (!myProfile || !isEmailVerified(myProfile)) {
      showEmailVerificationRequiredAlert();
      return;
    }
    setOfferAmount("");
    setInputError(null);
    setOfferModal(state);
  };

  const closeOfferModal = () => {
    setOfferModal(null);
    setOfferAmount("");
    setInputError(null);
  };

  const submitOfferModal = async () => {
    if (!chatId || !offerModal || offerBusyId) return;
    const amount = Number(offerAmount.replace(/,/g, "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setInputError("Enter a valid offer amount.");
      return;
    }

    setInputError(null);
    const currency = listing?.priceCurrency ?? "SYP";
    const busyId = offerModal.mode === "new" ? "new" : offerModal.messageId ?? "counter";

    try {
      setOfferBusyId(busyId);
      const updated =
        offerModal.mode === "new"
          ? await sendOffer(chatId, { amount, currency })
          : await counterOffer(chatId, offerModal.messageId as string, { amount, currency });
      upsertMessage(updated);
      if (offerModal.mode === "counter") {
        void refreshMessages();
      }
      closeOfferModal();
      scrollToBottom(true, 50);
    } catch (error) {
      if (isUnverifiedEmailError(error)) {
        closeOfferModal();
        showEmailVerificationRequiredAlert();
        return;
      }
      Alert.alert("Offer unavailable", getActionErrorMessage(error, "Unable to send offer."));
    } finally {
      setOfferBusyId(null);
    }
  };

  const handleOfferAction = async (
    message: Message,
    action: "accept" | "reject" | "counter",
  ) => {
    if (!chatId || offerBusyId) return;
    if (!myProfile || !isEmailVerified(myProfile)) {
      showEmailVerificationRequiredAlert();
      return;
    }

    if (action === "counter") {
      openOfferModal({ mode: "counter", messageId: message.id });
      return;
    }

    try {
      setOfferBusyId(message.id);
      const updated =
        action === "accept"
          ? await acceptOffer(chatId, message.id)
          : await rejectOffer(chatId, message.id);
      upsertMessage(updated);
      if (action === "accept") {
        setListing((current) =>
          current ? { ...current, status: "sold", stock: 0 } : current,
        );
        void refreshListing();
        void refreshMessages();
      }
    } catch (error) {
      if (isUnverifiedEmailError(error)) {
        showEmailVerificationRequiredAlert();
        return;
      }
      Alert.alert(
        "Offer unavailable",
        getActionErrorMessage(error, "Unable to update this offer."),
      );
    } finally {
      setOfferBusyId(null);
    }
  };

  const handleSend = async () => {
    if (!chatId || !input.trim() || sending) return;

    if (myProfile && !isEmailVerified(myProfile)) {
      showEmailVerificationRequiredAlert();
      return;
    }

    if (chat?.listingId && !isListingAvailable) {
      Alert.alert(
        "Listing unavailable",
        "This listing is no longer active, so offers and messages are disabled.",
      );
      return;
    }

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
      type: "text",
      dataJson: null,
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
    } catch (error) {
      setMessages((prev) => prev.filter((m: any) => m.id !== optimisticId));
      if (isUnverifiedEmailError(error)) {
        showEmailVerificationRequiredAlert();
        return;
      }
      const message = getActionErrorMessage(error, "");
      if (message) {
        Alert.alert("Message unavailable", message);
      }
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

  const canModify = (message: Message) => {
    if (message.type && message.type !== "text") return false;
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
    Alert.alert(t("chats.thread.deleteTitle"), t("chats.thread.deleteBody"), [
      { text: t("chats.thread.deleteCancel"), style: "cancel" },
      {
        text: t("chats.thread.deleteConfirm"),
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
    message: Message,
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
          <Text style={styles.emptyTitle}>{t("chats.thread.unavailableTitle")}</Text>
          <Text style={styles.emptySubtitle}>{error ?? t("listings.tryAgain")}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonLabel}>{t("sellerProfile.actions.goBack")}</Text>
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
              disabled={!header.listingId && !otherUserId}
              onPress={() => {
                if (header.listingId) {
                  router.push(`/listings/${header.listingId}`);
                } else if (otherUserId) {
                  router.push(`/seller/${otherUserId}`);
                }
              }}
            >
              <View style={styles.avatar}>
                {header.avatar ? (
                  <Image source={{ uri: header.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarLabel}>
                    {header.title.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle} numberOfLines={1}>{header.title}</Text>
                {header.participantName ? (
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {header.participantName}
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
          initialNumToRender={18}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={50}
          windowSize={9}
          removeClippedSubviews={Platform.OS === "android"}
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
                    const offer = parseOfferData(message, listing?.priceCurrency);
                    if (offer) {
                      const canRespond =
                        offer.status === "pending" && message.receiverId === myUserId;
                      const canAcceptReject = canRespond && myUserId === chat?.sellerId;
                      const canCounter = canRespond;
                      return (
                        <OfferMessageCard
                          offer={offer}
                          message={message}
                          canAcceptReject={canAcceptReject}
                          canCounter={canCounter}
                          busy={offerBusyId === message.id}
                          onAccept={(target) => handleOfferAction(target, "accept")}
                          onReject={(target) => handleOfferAction(target, "reject")}
                          onCounter={(target) => handleOfferAction(target, "counter")}
                        />
                      );
                    }

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
            {chat?.listingId && !isListingAvailable ? (
              <View style={styles.actionBanner}>
                <Text style={styles.actionBannerText}>
                  This listing is no longer active.
                </Text>
              </View>
            ) : null}
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
            {canMakeOffer ? (
              <TouchableOpacity
                style={styles.offerComposerButton}
                onPress={() => openOfferModal({ mode: "new" })}
                disabled={offerBusyId === "new"}
              >
                <Ionicons name="pricetag-outline" size={16} color={theme.primary} />
                <Text style={styles.offerComposerLabel}>
                  {offerBusyId === "new" ? "Sending..." : "Offer"}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TextInput
              style={[styles.input, inputError && styles.inputError]}
              placeholder="Write a message..."
              value={input}
              onChangeText={handleInputChange}
              placeholderTextColor={theme.textMuted}
              multiline
              onFocus={handleInputFocus}
              editable={isListingAvailable && !offerModal}
            />
            {inputError ? (
              <Text style={styles.inputErrorText}>{inputError}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.sendButton,
                (sending || !input.trim() || !!inputError || !isListingAvailable) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={sending || !input.trim() || !!inputError || !isListingAvailable}
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
        <Modal
          visible={offerModal !== null}
          transparent
          animationType="fade"
          onRequestClose={closeOfferModal}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.offerModalCard}>
              <Text style={styles.offerModalTitle}>
                {offerModal?.mode === "counter" ? "Counter offer" : "Make an offer"}
              </Text>
              <Text style={styles.offerModalSubtitle}>
                {listing?.priceCurrency ?? "SYP"} {listing?.priceAmount ?? ""}
              </Text>
              <TextInput
                style={styles.offerAmountInput}
                value={offerAmount}
                onChangeText={setOfferAmount}
                placeholder="Offer amount"
                keyboardType="decimal-pad"
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
              {inputError ? <Text style={styles.inputErrorText}>{inputError}</Text> : null}
              <View style={styles.offerModalActions}>
                <TouchableOpacity style={styles.offerModalCancel} onPress={closeOfferModal}>
                  <Text style={styles.offerSecondaryActionLabel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.offerModalSubmit, !!offerBusyId && styles.sendButtonDisabled]}
                  onPress={submitOfferModal}
                  disabled={!!offerBusyId}
                >
                  {offerBusyId ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.offerPrimaryActionLabel}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
      backgroundColor: CHAT_BUBBLE_BLUE,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    bubbleSelectedMine: {
      backgroundColor: withAlpha(CHAT_BUBBLE_BLUE, 0.82),
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
    offerCard: {
      minWidth: 210,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      padding: 12,
      gap: 8,
    },
    offerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    offerTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.primary,
      textTransform: "uppercase",
    },
    offerStatus: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textMuted,
      backgroundColor: theme.surfaceMuted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    offerStatusAccepted: {
      color: theme.success,
    },
    offerStatusRejected: {
      color: theme.danger,
    },
    offerStatusCountered: {
      color: theme.primary,
    },
    offerAmount: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.text,
    },
    offerActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 2,
    },
    offerActionButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceMuted,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    offerAcceptButton: {
      backgroundColor: theme.success,
      borderColor: theme.success,
    },
    offerCounterButton: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    offerPrimaryActionLabel: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "800",
    },
    offerSecondaryActionLabel: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "700",
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
    offerComposerButton: {
      height: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceMuted,
      paddingHorizontal: 12,
      marginBottom: 2,
    },
    offerComposerLabel: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: "800",
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    offerModalCard: {
      width: "100%",
      maxWidth: 360,
      borderRadius: 18,
      backgroundColor: theme.surface,
      padding: 18,
      gap: 12,
    },
    offerModalTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.text,
    },
    offerModalSubtitle: {
      fontSize: 13,
      color: theme.textMuted,
    },
    offerAmountInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: theme.text,
      fontSize: 18,
      fontWeight: "700",
      backgroundColor: theme.surfaceMuted,
    },
    offerModalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
    },
    offerModalCancel: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceMuted,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    offerModalSubmit: {
      minWidth: 92,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },

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
