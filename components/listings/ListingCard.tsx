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

import {
  MarketplaceRadius,
  MarketplaceShadow,
  MarketplaceSpacing,
  MarketplaceTypography,
  type ThemeColors,
} from "@/constants/theme";
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
          <FontAwesome name="image" size={24} color={theme.textSubtle} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.price}>{listing.price}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        {listing.location ? (
          <View style={styles.metadataRow}>
            <FontAwesome name="map-marker" size={11} color={theme.textSubtle} />
            <Text style={styles.metadataText} numberOfLines={1}>
              {listing.location}
            </Text>
          </View>
        ) : listing.category ? (
          <Text style={styles.categoryText} numberOfLines={1}>
            {listing.category}
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
      borderRadius: MarketplaceRadius.card,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      ...MarketplaceShadow.card,
    },
    image: {
      width: "100%",
      aspectRatio: 1.18,
    },
    imagePlaceholder: {
      backgroundColor: theme.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      padding: MarketplaceSpacing.md,
      gap: MarketplaceSpacing.xs,
    },
    title: {
      minHeight: 34,
      fontSize: MarketplaceTypography.body,
      fontWeight: "700",
      color: theme.text,
      lineHeight: 17,
    },
    price: {
      fontSize: MarketplaceTypography.input,
      fontWeight: "800",
      color: theme.success,
    },
    metadataRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      minHeight: 18,
    },
    metadataText: {
      flex: 1,
      fontSize: MarketplaceTypography.meta,
      color: theme.textMuted,
    },
    categoryText: {
      minHeight: 18,
      fontSize: MarketplaceTypography.meta,
      color: theme.textMuted,
    },
    sellerMetaRow: {
      minHeight: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: MarketplaceSpacing.xs,
    },
    ratingPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    ratingText: {
      fontSize: MarketplaceTypography.caption,
      fontWeight: "700",
      color: theme.textSecondary,
    },
    memberText: {
      flex: 1,
      fontSize: MarketplaceTypography.caption,
      color: theme.textMuted,
    },
  });
