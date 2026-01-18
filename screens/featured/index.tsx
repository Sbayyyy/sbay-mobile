import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/layout/AppScreen";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ListingCard } from "@/components/listings/ListingCard";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { searchListings, type Listing as ApiListing } from "@/services/listings";

export default function FeaturedScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [listings, setListings] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    searchListings()
      .then((data) => {
        if (!isMounted) return;
        setListings(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : t("listings.errorSubtitle"));
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [t]);

  const displayListings = useMemo(() => {
    return listings.slice(0, 24).map((listing) => ({
      id: listing.id,
      title: listing.title,
      price: `${listing.priceCurrency} ${listing.priceAmount}`,
      category: listing.categoryPath ?? "other",
      image:
        listing.thumbnailUrl ??
        listing.imageUrls?.[0] ??
        "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=600&q=60",
    }));
  }, [listings]);

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          title={t("home.featuredTitle", { defaultValue: "Featured" })}
        />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t("listings.errorTitle")}</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
          </View>
        ) : displayListings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t("listings.emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("listings.emptySubtitle")}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {displayListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPress={() => router.push(`/listings/${listing.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    content: {
      paddingBottom: 40,
      paddingTop: 12,
      gap: 12,
    },
    loading: {
      paddingVertical: 24,
      alignItems: "center",
    },
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
  });
