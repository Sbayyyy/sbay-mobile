import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useRouter } from "expo-router";

import { SponsoredAdCard } from "@/components/ads/SponsoredAdCard";
import { AppScreen } from "@/components/layout/AppScreen";
import { toListingCardListings } from "@/components/listings/listing-card-presenter";
import { SearchBar } from "@/components/common/SearchBar";
import { HOME_CATEGORIES } from "@/constants/mockData";
import { MarketplaceSpacing, type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useNotificationContext } from "@/providers/NotificationProvider";
import { trackInteraction } from "@/services/recommendations";
import { FeaturedListingsCarousel } from "./components/FeaturedListingsCarousel";
import { HomeCategoryPicker } from "./components/HomeCategoryPicker";
import { HomeListingsSection } from "./components/HomeListingsSection";
import { useHomeListings } from "./hooks/useHomeListings";

const STICKY_SEARCH_INDICES = [0];

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { unreadCount, refreshUnreadCount } = useNotificationContext();
  const {
    listings,
    recommendedListings,
    featuredListings,
    sponsoredAds,
    loading,
    refreshing,
    error,
    refreshListings,
  } = useHomeListings(activeCategory);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadCount();
      refreshListings();
    }, [refreshUnreadCount, refreshListings]),
  );

  const categories = useMemo(() => {
    return HOME_CATEGORIES.map((category) => ({
      ...category,
      label: t(category.translationKey ?? `categories.${category.id}`, {
        defaultValue: category.label,
      }),
    }));
  }, [t]);

  const displayListings = useMemo(() => {
    const source = activeCategory === "all" && recommendedListings.length > 0
      ? recommendedListings
      : listings;
    return toListingCardListings(source, t);
  }, [activeCategory, listings, recommendedListings, t]);

  const displayFeaturedListings = useMemo(() => {
    return toListingCardListings(
      featuredListings.filter((listing) => listing.isBoosted === true),
      t,
    );
  }, [featuredListings, t]);

  const openListing = useCallback(
    (listingId: string) => {
      router.push(`/listings/${listingId}`);
    },
    [router],
  );

  const openSearch = useCallback(() => {
    router.push("/search?reset=true");
  }, [router]);

  const openFeaturedSearch = useCallback(() => {
    router.push("/search?featured=true");
  }, [router]);

  const submitSearch = useCallback(() => {
    const trimmed = search.trim();
    if (!trimmed) return;
    router.push(`/search?query=${encodeURIComponent(trimmed)}`);
  }, [router, search]);

  const selectCategory = useCallback(
    (categoryId: string) => {
      setActiveCategory(categoryId);
      if (categoryId !== "all") {
        void trackInteraction(categoryId, "category_click");
        router.push(`/category/${encodeURIComponent(categoryId)}`);
      }
    },
    [router],
  );

  return (
    <AppScreen>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={STICKY_SEARCH_INDICES}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshListings}
              tintColor={theme.primary}
            />
          }
        >
          <View style={styles.stickySearch}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t("home.searchPlaceholder")}
              onSubmit={submitSearch}
              notificationCount={unreadCount}
            />
          </View>

          <HomeCategoryPicker
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={selectCategory}
          />

          <FeaturedListingsCarousel
            listings={displayFeaturedListings}
            onSeeAll={openFeaturedSearch}
            onListingPress={openListing}
          />

          {sponsoredAds[0] ? (
            <View style={styles.sponsoredWrapper}>
              <SponsoredAdCard ad={sponsoredAds[0]} />
            </View>
          ) : null}

          <HomeListingsSection
            listings={displayListings}
            loading={loading}
            error={error}
            onExploreMore={openSearch}
            onListingPress={openListing}
          />
        </ScrollView>
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      paddingBottom: 28,
      paddingTop: MarketplaceSpacing.sm,
      gap: MarketplaceSpacing.sm,
    },
    stickySearch: {
      backgroundColor: theme.background,
      paddingVertical: MarketplaceSpacing.sm,
      zIndex: 10,
      elevation: 4,
    },
    sponsoredWrapper: {
      paddingHorizontal: MarketplaceSpacing.lg,
    },
  });
