import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/providers/AuthProvider";
import { requestEmailVerification } from "@/services/auth";
import { isEmailVerified } from "@/services/email-verification";
import { getMyProfile, type UserProfile } from "@/services/user";

export function GlobalEmailVerificationPrompt() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.top), [theme, insets.top]);
  const { status } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(() => {
    let isMounted = true;

    if (status !== "authenticated") {
      setProfile(null);
      setSent(false);
      setError(null);
      return () => {
        isMounted = false;
      };
    }

    getMyProfile()
      .then((data) => {
        if (!isMounted) return;
        setProfile(data);
      })
      .catch(() => {
        if (!isMounted) return;
        setProfile(null);
      });

    return () => {
      isMounted = false;
    };
  }, [status]);

  useEffect(() => {
    const cleanup = loadProfile();
    return () => cleanup?.();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      const cleanup = loadProfile();
      return () => cleanup?.();
    }, [loadProfile]),
  );

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    setSent(false);
    setError(null);
    try {
      await requestEmailVerification();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send verification email.");
    } finally {
      setSending(false);
    }
  };

  if (dismissed || !profile || isEmailVerified(profile)) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-unread-outline" size={17} color={theme.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={[styles.body, error && styles.error, sent && styles.success]} numberOfLines={2}>
            {error
              ? error
              : sent
                ? "Email sent. Check your inbox."
                : "Create listings and message sellers after verification."}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={theme.primaryForeground} />
          ) : (
            <Text style={styles.sendLabel}>Send</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => setDismissed(true)}
          accessibilityLabel="Dismiss verification prompt"
        >
          <Ionicons name="close" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeColors, topInset: number) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      top: topInset + 8,
      left: 12,
      right: 12,
      zIndex: 50,
      elevation: 50,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      shadowColor: theme.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryMuted,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },
    body: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 16,
    },
    success: {
      color: theme.success,
      fontWeight: "600",
    },
    error: {
      color: theme.danger,
      fontWeight: "600",
    },
    sendButton: {
      minWidth: 58,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
      paddingHorizontal: 10,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    sendLabel: {
      color: theme.primaryForeground,
      fontSize: 12,
      fontWeight: "800",
    },
    dismissButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceMuted,
    },
  });
