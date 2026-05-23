import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter, useFocusEffect } from "expo-router";
import { AppScreen } from "@/components/layout/AppScreen";
import { SectionHeader } from "@/components/common/SectionHeader";
import { SponsoredAdCard } from "@/components/ads/SponsoredAdCard";
import {
  HorizontalFilterChips,
  FilterChipOption,
} from "@/components/common/HorizontalFilterChips";
import { ListingCard } from "@/components/listings/ListingCard";
import { SearchBar } from "@/components/common/SearchBar";
import { HOME_CATEGORIES } from "@/constants/mockData";
import { getRegionLabel } from "@/constants/regions";
import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";
import { searchListings, type Listing as ApiListing } from "@/services/listings";
import { getSponsoredAds, type SponsoredAd } from "@/services/ads";
import { useNotificationContext } from "@/providers/NotificationProvider";
import { getFriendlyErrorMessage } from "@/services/account-status-errors";
import { ListingCardSkeleton } from "@/components/listings/ListingCardSkeleton";
import { getCache, setCache } from "@/services/cache";

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [featuredListings, setFeaturedListings] = useState<ApiListing[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredAd[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { unreadCount, refreshUnreadCount } = useNotificationContext();

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadCount();
    }, [refreshUnreadCount]),
  );

  const categories = useMemo(() => {
    return HOME_CATEGORIES.map((category) => ({
      ...category,
      label: t(category.translationKey ?? `categories.${category.id}`, {
        defaultValue: category.label,
      }),
    }));
  }, [t]);

  const loadListings = useCallback(
    (mode: "initial" | "refresh" = "initial") => {
      let isMounted = true;
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const run = async () => {
        // Serve cached data immediately on initial load so users on slow/no
        // connections see content right away rather than a skeleton for 15s.
        if (mode === "initial") {
          const [cached, cachedFeatured] = await Promise.all([
            getCache<ApiListing[]>(`listings.${activeCategory}`).catch(() => null),
            getCache<ApiListing[]>("listings.featured").catch(() => null),
          ]);
          if (isMounted && cached) {
            setListings(cached);
            setFeaturedListings((cachedFeatured ?? []).filter((l) => l.isBoosted === true));
            setLoading(false);
          }
        }

        try {
          const [data, featured, ads] = await Promise.all([
            searchListings({
              category: activeCategory === "all" ? undefined : activeCategory,
            }),
            searchListings({
              featured: true,
              pageSize: 8,
            }),
            getSponsoredAds().catch(() => []),
          ]);
          if (!isMounted) return;
          setListings(data);
          setFeaturedListings(featured.filter((listing) => listing.isBoosted === true));
          setSponsoredAds(ads);
          setError(null);
          void setCache(`listings.${activeCategory}`, data, 5 * 60 * 1000).catch(() => {});
          void setCache("listings.featured", featured, 5 * 60 * 1000).catch(() => {});
        } catch (err) {
          if (!isMounted) return;
          setError(getFriendlyErrorMessage(err, t("listings.errorSubtitle")));
        } finally {
          if (!isMounted) return;
          setLoading(false);
          setRefreshing(false);
        }
      };

      const handle = mode === "refresh" ? null : setTimeout(run, 300);
      if (mode === "refresh") {
        void run();
      }

      return () => {
        isMounted = false;
        if (handle) clearTimeout(handle);
      };
    },
    [activeCategory, t],
  );

  useEffect(() => {
    const cleanup = loadListings("initial");
    return () => cleanup?.();
  }, [loadListings]);

  const displayListings = useMemo(() => {
    return listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      price: `${listing.priceCurrency} ${listing.priceAmount}`,
      category: listing.categoryPath ?? "other",
      location: getRegionLabel(listing.region ?? listing.seller?.city, t),
      image:
        listing.thumbnailUrl ??
        listing.imageUrls?.[0] ??
        "",
    }));
  }, [listings, t]);

  const displayFeaturedListings = useMemo(() => {
    return featuredListings.filter((listing) => listing.isBoosted === true).map((listing) => ({
      id: listing.id,
      title: listing.title,
      price: `${listing.priceCurrency} ${listing.priceAmount}`,
      category: listing.categoryPath ?? "other",
      location: getRegionLabel(listing.region ?? listing.seller?.city, t),
      image:
        listing.thumbnailUrl ??
        listing.imageUrls?.[0] ??
        "",
    }));
  }, [featuredListings, t]);

  return (
    <AppScreen>
      <View style={styles.screen}>
        <View style={styles.searchWrapper}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t("home.searchPlaceholder")}
            onSubmit={() => {
              const trimmed = search.trim();
              if (!trimmed) return;
              router.push(`/search?query=${encodeURIComponent(trimmed)}`);
            }}
            notificationCount={unreadCount}
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadListings("refresh")}
              tintColor={theme.primary}
            />
          }
        >
          <SectionHeader
            title={t("home.categoriesTitle")}
            actionLabel={t("common.actions.seeAll")}
            onActionPress={() => setCategoryDialogOpen(true)}
          />

          <HorizontalFilterChips
            options={categories as FilterChipOption[]}
            activeId={activeCategory}
            onSelect={(categoryId) => {
              setActiveCategory(categoryId);
              if (categoryId !== "all") {
                router.push(`/search?category=${encodeURIComponent(categoryId)}`);
              }
            }}
          />

          {displayFeaturedListings.length > 0 ? (
            <>
              <SectionHeader
                title={t("home.featuredTitle", { defaultValue: "Featured" })}
                actionLabel={t("common.actions.seeAll")}
                onActionPress={() => router.push("/search?featured=true")}
              />
              <View style={styles.featuredWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredRow}
                >
                  {displayFeaturedListings.map((listing) => (
                    <TouchableOpacity
                      key={listing.id}
                      style={styles.featuredCard}
                      onPress={() => router.push(`/listings/${listing.id}`)}
                      activeOpacity={0.9}
                    >
                      <Image source={{ uri: listing.image }} style={styles.featuredImage} />
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
          ) : null}

          {sponsoredAds[0] ? (
            <View style={styles.sponsoredWrapper}>
              <SponsoredAdCard ad={sponsoredAds[0]} />
            </View>
          ) : null}

          <SectionHeader
            title={t("home.recommendedTitle")}
            actionLabel={t("common.actions.exploreMore")}
            onActionPress={() => router.push("/search?reset=true")}
          />

          {loading && displayListings.length === 0 ? (
            <ListingCardSkeleton count={6} />
          ) : error && displayListings.length === 0 ? (
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
            <>
              {error ? (
                <View style={styles.offlineBanner}>
                  <Text style={styles.offlineBannerText}>{error}</Text>
                </View>
              ) : null}
              <View style={styles.grid}>
                {displayListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onPress={() => router.push(`/listings/${listing.id}`)}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>

      <Modal
        visible={categoryDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryDialogOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCategoryDialogOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>
              {t("home.categoriesTitle")}
            </Text>
            <ScrollView contentContainerStyle={styles.modalList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setActiveCategory(category.id);
                    setCategoryDialogOpen(false);
                    if (category.id !== "all") {
                      router.push(
                        `/search?category=${encodeURIComponent(category.id)}`,
                      );
                    }
                  }}
                >
                  <Text style={styles.modalItemLabel}>{category.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    searchWrapper: {
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: theme.background,
    },
  content: {
    paddingBottom: 40,
    paddingTop: 12,
    gap: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 18,
    maxHeight: "80%",
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
  },
  modalList: {
    gap: 8,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: theme.surfaceMuted,
  },
  modalItemLabel: {
    color: theme.text,
    fontWeight: "600",
  },
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
  sponsoredWrapper: {
    paddingHorizontal: 20,
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
