import { memo, useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { SectionHeader } from "@/components/common/SectionHeader";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingCardSkeleton } from "@/components/listings/ListingCardSkeleton";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { type Listing } from "@/types/listing";

type HomeListingsSectionProps = {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  onExploreMore: () => void;
  onListingPress: (listingId: string) => void;
};

export const HomeListingsSection = memo(function HomeListingsSection({
  listings,
  loading,
  error,
  onExploreMore,
  onListingPress,
}: HomeListingsSectionProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const handleListingPress = useCallback(
    (listing: Listing) => {
      onListingPress(listing.id);
    },
    [onListingPress],
  );

  return (
    <>
      <SectionHeader
        title={t("home.recommendedTitle")}
        actionLabel={t("common.actions.exploreMore")}
        onActionPress={onExploreMore}
      />

      {loading && listings.length === 0 ? (
        <ListingCardSkeleton count={6} />
      ) : error && listings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t("listings.errorTitle")}</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t("listings.emptyTitle")}</Text>
          <Text style={styles.emptySubtitle}>{t("listings.emptySubtitle")}</Text>
        </View>
      ) : (
        <>
          {error ? (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>{error}</Text>
            </View>
          ) : null}
          <View style={styles.grid}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPress={handleListingPress}
              />
            ))}
          </View>
        </>
      )}
    </>
  );
});

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      rowGap: 16,
    },
    emptyState: {
      paddingHorizontal: 20,
      paddingVertical: 40,
      alignItems: "center",
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textMuted,
    },
    offlineBanner: {
      marginHorizontal: 20,
      marginBottom: 4,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: theme.surfaceMuted,
    },
    offlineBannerText: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: "center",
    },
  });
