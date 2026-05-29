import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { SponsoredAdCard } from "@/components/ads/SponsoredAdCard";
import { ListingCard } from "@/components/listings/ListingCard";
import { toListingCardListings } from "@/components/listings/listing-card-presenter";
import { AppScreen } from "@/components/layout/AppScreen";
import { HOME_CATEGORIES } from "@/constants/mockData";
import { useAppTheme } from "@/hooks/use-app-theme";
import { getSponsoredAds, type SponsoredAd } from "@/services/ads";
import { searchListings, type Listing } from "@/services/listings";
import { trackInteraction } from "@/services/recommendations";
import { getFriendlyErrorMessage } from "@/services/account-status-errors";
import { type Listing as ListingCardModel } from "@/types/listing";

export default function CategoryBrowseScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const category = (slug ?? "").trim();

  const [listings, setListings] = useState<Listing[]>([]);
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = useMemo(() => {
    const found = HOME_CATEGORIES.find((item) => item.id === category);
    return t(found?.translationKey ?? `categories.${category}`, {
      defaultValue: found?.label ?? category,
    });
  }, [category, t]);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!category) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [nextListings, nextAds] = await Promise.all([
          searchListings({ category }),
          getSponsoredAds().catch(() => []),
        ]);
        setListings(nextListings);
        setAds(nextAds);
      } catch (err) {
        setError(getFriendlyErrorMessage(err, "Unable to load this category."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category],
  );

  useEffect(() => {
    void trackInteraction(category, "category_click");
    void load("initial");
  }, [category, load]);

  const displayListings = useMemo(
    () => toListingCardListings(listings, t, category),
    [category, listings, t],
  );
  const openListing = useCallback(
    (listing: ListingCardModel) => {
      router.push(`/listings/${listing.id}`);
    },
    [router],
  );

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backLabel}>{t("listings.back", { defaultValue: "Back" })}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.subtitle}>
            {t("category.subtitle", {
              defaultValue: "Browse the latest listings in this category.",
            })}
          </Text>
        </View>

        {ads[0] ? <SponsoredAdCard ad={ads[0]} /> : null}

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>{t("listings.errorTitle")}</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
          </View>
        ) : displayListings.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>{t("listings.emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>{t("listings.emptySubtitle")}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {displayListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPress={openListing}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, gap: 16, backgroundColor: theme.background },
    header: { gap: 8 },
    backButton: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: theme.surfaceMuted, paddingHorizontal: 12, paddingVertical: 6 },
    backLabel: { color: theme.primary, fontWeight: "700", fontSize: 13 },
    title: { color: theme.text, fontWeight: "800", fontSize: 26 },
    subtitle: { color: theme.textMuted, fontSize: 14, lineHeight: 20 },
    centerState: { paddingVertical: 48, alignItems: "center", gap: 8 },
    emptyTitle: { color: theme.text, fontSize: 16, fontWeight: "700" },
    emptySubtitle: { color: theme.textMuted, textAlign: "center" },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 16 },
  });
