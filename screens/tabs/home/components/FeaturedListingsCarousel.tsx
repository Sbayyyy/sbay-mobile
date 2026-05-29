import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { memo, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { SectionHeader } from "@/components/common/SectionHeader";
import { type ThemeColors } from "@/constants/theme";
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
      marginHorizontal: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.primaryMuted,
      paddingVertical: 12,
    },
    featuredRow: {
      paddingHorizontal: 12,
      gap: 12,
    },
    featuredCard: {
      width: 160,
      borderRadius: 14,
      backgroundColor: theme.surface,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
    },
    featuredImage: {
      width: "100%",
      height: 110,
    },
    featuredImagePlaceholder: {
      backgroundColor: theme.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    featuredBody: {
      padding: 10,
      gap: 4,
    },
    featuredTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.text,
    },
    featuredPrice: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.success,
    },
  });
