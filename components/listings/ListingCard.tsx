import { memo, useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Listing } from "@/types/listing";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { resolveMediaUrl } from "@/services/media";

type ListingCardProps = {
  listing: Listing;
  onPress?: (listing: Listing) => void;
  style?: StyleProp<ViewStyle>;
};

function ListingCardComponent({ listing, onPress, style }: ListingCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const resolvedImage = resolveMediaUrl(listing.image) ?? (listing.image || null);
  const sellerReviewCount = listing.sellerReviewCount ?? 0;
  const sellerRating = listing.sellerRating ?? 0;
  const showSellerRating = sellerReviewCount >= 3 && sellerRating > 0;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      activeOpacity={0.9}
      onPress={() => onPress?.(listing)}
      accessibilityRole="button"
      accessibilityLabel={listing.title}
    >
      {resolvedImage ? (
        <Image
          source={{ uri: resolvedImage }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityLabel={listing.title}
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <FontAwesome name="image" size={28} color={theme.textSubtle} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.price}>{listing.price}</Text>
        {listing.location ? (
          <Text style={styles.location} numberOfLines={1}>
            {listing.location}
          </Text>
        ) : null}
        {showSellerRating || listing.sellerMemberSince ? (
          <View style={styles.sellerMetaRow}>
            {showSellerRating ? (
              <View style={styles.ratingPill}>
                <FontAwesome name="star" size={11} color="#FBBF24" />
                <Text style={styles.ratingText}>{sellerRating.toFixed(1)}/5</Text>
              </View>
            ) : null}
            {listing.sellerMemberSince ? (
              <Text style={styles.memberText} numberOfLines={1}>
                {listing.sellerMemberSince}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export const ListingCard = memo(ListingCardComponent);

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: "48%",
      backgroundColor: theme.surface,
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    image: {
      width: "100%",
      height: 110,
    },
    imagePlaceholder: {
      backgroundColor: theme.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      padding: 12,
      gap: 6,
    },
    title: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    price: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.success,
    },
    location: {
      fontSize: 12,
      color: theme.textMuted,
    },
    sellerMetaRow: {
      minHeight: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    ratingPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    ratingText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textSecondary,
    },
    memberText: {
      flex: 1,
      fontSize: 11,
      color: theme.textMuted,
    },
  });
