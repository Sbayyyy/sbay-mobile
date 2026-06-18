import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { memo, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { SectionHeader } from "@/components/common/SectionHeader";
import {
  MarketplaceRadius,
  MarketplaceShadow,
  MarketplaceSpacing,
  MarketplaceTypography,
  type ThemeColors,
} from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { type Listing } from "@/types/listing";

type FeaturedListingsCarouselProps = {
  listings: Listing[];
  onSeeAll: () => void;
  onListingPress: (listingId: string) => void;
};

export const FeaturedListingsCarousel = memo(function FeaturedListingsCarousel({
  listings,
  onSeeAll,
  onListingPress,
}: FeaturedListingsCarouselProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (listings.length === 0) return null;

  return (
    <>
      <SectionHeader
        title={t("home.featuredTitle", { defaultValue: "Featured" })}
        actionLabel={t("common.actions.seeAll")}
        onActionPress={onSeeAll}
      />
      <View style={styles.featuredWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredRow}
        >
          {listings.map((listing) => (
            <TouchableOpacity
              key={listing.id}
              style={styles.featuredCard}
              onPress={() => onListingPress(listing.id)}
              activeOpacity={0.9}
            >
              {listing.image ? (
                <Image
                  source={{ uri: listing.image }}
                  style={styles.featuredImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityLabel={listing.title}
                />
              ) : (
                <View style={[styles.featuredImage, styles.featuredImagePlaceholder]}>
                  <FontAwesome name="image" size={26} color={theme.textSubtle} />
                </View>
              )}
              <View style={styles.featuredBody}>
                <Text style={styles.featuredTitle} numberOfLines={2}>
                  {listing.title}
                </Text>
                <Text style={styles.featuredPrice}>{listing.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </>
  );
});

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    featuredWrapper: {
      marginHorizontal: MarketplaceSpacing.lg,
      borderRadius: MarketplaceRadius.xl,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.primaryMuted,
      paddingVertical: MarketplaceSpacing.sm,
    },
    featuredRow: {
      paddingHorizontal: MarketplaceSpacing.sm,
      gap: MarketplaceSpacing.sm,
    },
    featuredCard: {
      width: 148,
      borderRadius: MarketplaceRadius.lg,
      backgroundColor: theme.surface,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      ...MarketplaceShadow.subtle,
    },
    featuredImage: {
      width: "100%",
      aspectRatio: 1.2,
    },
    featuredImagePlaceholder: {
      backgroundColor: theme.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    featuredBody: {
      padding: MarketplaceSpacing.sm,
      gap: MarketplaceSpacing.xs,
    },
    featuredTitle: {
      fontSize: MarketplaceTypography.bodySmall,
      fontWeight: "700",
      color: theme.text,
    },
    featuredPrice: {
      fontSize: MarketplaceTypography.bodySmall,
      fontWeight: "800",
      color: theme.success,
    },
  });
