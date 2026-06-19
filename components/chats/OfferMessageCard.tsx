import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { type Message, type OfferMessageData } from "@/services/messages";

type OfferMessageCardProps = {
  offer: OfferMessageData;
  message: Message;
  canAcceptReject: boolean;
  canCounter: boolean;
  busy: boolean;
  onAccept: (message: Message) => void;
  onReject: (message: Message) => void;
  onCounter: (message: Message) => void;
};

export function OfferMessageCard({
  offer,
  message,
  canAcceptReject,
  canCounter,
  busy,
  onAccept,
  onReject,
  onCounter,
}: OfferMessageCardProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const statusKey = `chats.offer.status.${offer.status}` as const;
  const statusLabel = t(statusKey, { defaultValue: offer.status.charAt(0).toUpperCase() + offer.status.slice(1) });
  const acceptLabel = t("chats.offer.accept", { defaultValue: "Accept" });
  const rejectLabel = t("chats.offer.reject", { defaultValue: "Reject" });

  return (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <Text style={styles.offerTitle}>
          {offer.parentOfferId
            ? t("chats.offer.counterTitle", { defaultValue: "Counter offer" })
            : t("chats.offer.title", { defaultValue: "Offer" })}
        </Text>
        <Text
          style={[
            styles.offerStatus,
            offer.status === "accepted" && styles.offerStatusAccepted,
            offer.status === "rejected" && styles.offerStatusRejected,
            offer.status === "countered" && styles.offerStatusCountered,
          ]}
        >
          {statusLabel}
        </Text>
      </View>
      <Text style={styles.offerAmount}>
        {offer.amount.toLocaleString()} {offer.currency}
      </Text>
      {canAcceptReject || canCounter ? (
        <View style={styles.offerActions}>
          {canAcceptReject ? (
            <>
              <TouchableOpacity
                accessibilityLabel={t("chats.offer.acceptAccessibilityLabel", {
                  defaultValue: "Accept offer",
                })}
                style={[styles.offerActionButton, styles.offerAcceptButton]}
                disabled={busy}
                onPress={() => onAccept(message)}
              >
                <Text style={styles.offerPrimaryActionLabel}>
                  {busy ? "..." : acceptLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t("chats.offer.rejectAccessibilityLabel", {
                  defaultValue: "Reject offer",
                })}
                style={styles.offerActionButton}
                disabled={busy}
                onPress={() => onReject(message)}
              >
                <Text style={styles.offerSecondaryActionLabel}>{rejectLabel}</Text>
              </TouchableOpacity>
            </>
          ) : null}
          {canCounter ? (
            <TouchableOpacity
              accessibilityLabel={t("chats.offer.counterTitle", { defaultValue: "Counter offer" })}
              style={[styles.offerActionButton, styles.offerCounterButton]}
              disabled={busy}
              onPress={() => onCounter(message)}
            >
              <Text style={styles.offerPrimaryActionLabel}>{t("chats.offer.counter", { defaultValue: "Counter" })}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    offerCard: {
      gap: 8,
      minWidth: 220,
    },
    offerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    offerTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },
    offerStatus: {
      overflow: "hidden",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: theme.warningBackground,
      color: theme.warning,
      fontSize: 11,
      fontWeight: "800",
    },
    offerStatusAccepted: {
      backgroundColor: theme.successBackground,
      color: theme.success,
    },
    offerStatusRejected: {
      backgroundColor: theme.dangerBackground,
      color: theme.danger,
    },
    offerStatusCountered: {
      backgroundColor: theme.infoBackground,
      color: theme.info,
    },
    offerAmount: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "800",
    },
    offerActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingTop: 2,
    },
    offerActionButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: theme.surface,
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
      color: theme.primaryForeground,
      fontSize: 12,
      fontWeight: "800",
    },
    offerSecondaryActionLabel: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "800",
    },
  });
