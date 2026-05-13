import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Text as PaperText,
} from "react-native-paper";
import { useTranslation } from "react-i18next";

import { FavoriteListing } from "@/types/listing";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

type FavoriteListingCardProps = {
  listing: FavoriteListing;
  onPress?: (listing: FavoriteListing) => void;
  onMessage?: (listing: FavoriteListing) => void;
  onMore?: (listing: FavoriteListing) => void;
  showMessage?: boolean;
};

export function FavoriteListingCard({
  listing,
  onPress,
  onMessage,
  onMore,
  showMessage = true,
}: FavoriteListingCardProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const initials = listing.seller
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card style={styles.card} mode="elevated" onPress={() => onPress?.(listing)}>
      <Card.Cover source={{ uri: listing.image }} style={styles.cardImage} />
      <Card.Content style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <PaperText style={styles.cardTitle}>{listing.title}</PaperText>
          <Button
            compact
            mode="text"
            icon="dots-horizontal"
            textColor={theme.textMuted}
            onPress={() => onMore?.(listing)}
            style={styles.overflowButton}
          > </Button>
        </View>

        <PaperText style={styles.cardMeta}>
          {listing.condition} {"\u2022"} {listing.location}
        </PaperText>

        <View style={styles.priceRow}>
          <PaperText style={styles.cardPrice}>
            {listing.currency} {listing.price}
          </PaperText>
          {listing.priceDrop ? (
            <Chip
              compact
              style={[styles.badge, { backgroundColor: theme.successBackground }]}
              textStyle={[styles.badgeLabel, { color: theme.success }]}
            >
              {listing.priceDrop}
            </Chip>
          ) : null}
          {listing.isNew ? (
            <Chip
              compact
              style={[styles.badge, { backgroundColor: theme.infoBackground }]}
              textStyle={[styles.badgeLabel, { color: theme.info }]}
            >
              {t("favoritesCard.newBadge")}
            </Chip>
          ) : null}
        </View>

        <View style={styles.sellerRow}>
          <Avatar.Text
            size={42}
            label={initials}
            style={styles.sellerAvatar}
            labelStyle={styles.avatarLabel}
          />
          <View style={{ flex: 1 }}>
            <PaperText style={styles.sellerName}>{listing.seller}</PaperText>
            <PaperText style={styles.sellerMeta}>
              {t("favoritesCard.updated", { time: listing.updatedAt })}
            </PaperText>
          </View>
          {showMessage && onMessage ? (
            <Button
              mode="contained-tonal"
              icon="message-outline"
              compact
              style={styles.messageButton}
              textColor={theme.chipActiveText}
              buttonColor={theme.chipActiveBackground}
              onPress={() => onMessage(listing)}
            >
              {t("common.actions.message")}
            </Button>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.border,
    },
    cardImage: {
      height: 170,
    },
    cardBody: {
      gap: 12,
      paddingTop: 16,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    overflowButton: {
      marginTop: -8,
    },
    cardTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    cardMeta: {
      fontSize: 13,
      color: theme.textMuted,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    cardPrice: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.success,
    },
    badge: {
      borderRadius: 999,
      height: 32,
    },
    badgeLabel: {
      fontSize: 12,
      fontWeight: "600",
    },
    sellerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    sellerAvatar: {
      backgroundColor: theme.primaryMuted,
    },
    avatarLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.chipActiveText,
    },
    sellerName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
    },
    sellerMeta: {
      fontSize: 13,
      color: theme.textMuted,
    },
    messageButton: {
      borderRadius: 14,
    },
  });
