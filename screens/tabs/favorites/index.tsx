import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Chip, Surface, Text as PaperText } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useRouter } from "expo-router";

import { EmptyPlaceholder } from "@/components/common/EmptyPlaceholder";
import { AppScreen } from "@/components/layout/AppScreen";
import { FavoriteListingCard } from "@/components/listings/FavoriteListingCard";
import { FAVORITE_CATEGORIES } from "@/constants/mockData";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { FavoriteListing, ListingCategory } from "@/types/listing";
import { getFavorites } from "@/services/favorites";
import { type Listing as ApiListing } from "@/services/listings";
import { getStoredToken } from "@/services/auth";

export default function FavoritesScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [favorites, setFavorites] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const router = useRouter();
  const handlePlaceholder = () => {};

  const loadFavorites = useCallback((mode: "initial" | "refresh" = "initial") => {
    let isMounted = true;
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    getStoredToken()
      .then((token) => {
        if (!token) {
          if (!isMounted) return;
          setFavorites([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        return getFavorites()
          .then((data) => {
            if (!isMounted) return;
            setFavorites(data);
          })
          .catch((err) => {
            if (!isMounted) return;
            setError(
              err instanceof Error ? err.message : "Unable to load favorites.",
            );
          })
          .finally(() => {
            if (!isMounted) return;
            setLoading(false);
            setRefreshing(false);
          });
      })
      .catch(() => {
        if (!isMounted) return;
        setFavorites([]);
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => loadFavorites(), [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      const cleanup = loadFavorites();
      return () => {
        cleanup?.();
      };
    }, [loadFavorites]),
  );

  const categories = useMemo(() => {
    return FAVORITE_CATEGORIES.map((category) => ({
      ...category,
      label: t(category.translationKey ?? `categories.${category.id}`, {
        defaultValue: category.label,
      }),
    }));
  }, [t]);

  const displayListings = useMemo(() => {
    const mapped = favorites.map<FavoriteListing>((listing) => ({
      id: listing.id,
      title: listing.title,
      price: String(listing.priceAmount),
      currency: listing.priceCurrency,
      category: listing.categoryPath ?? "other",
      image: listing.thumbnailUrl ?? listing.imageUrls?.[0] ?? "",
      location: listing.region ?? "Unknown location",
      condition: listing.condition ?? "Unknown",
      seller: listing.seller?.name ?? "Seller",
      updatedAt: listing.createdAt
        ? new Date(listing.createdAt).toLocaleDateString()
        : "Recently",
    }));

    return mapped.filter(
      (listing) => activeCategory === "all" || listing.category === activeCategory,
    );
  }, [activeCategory, favorites, t]);

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFavorites("refresh")}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <PaperText style={styles.title}>{t("favorites.title")}</PaperText>
            <PaperText style={styles.subtitle}>{t("favorites.subtitle")}</PaperText>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((category: ListingCategory) => {
            const isActive = category.id === activeCategory;
            return (
              <Chip
                key={category.id}
                compact
                mode={isActive ? "flat" : "outlined"}
                selected={isActive}
                onPress={() => setActiveCategory(category.id)}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                ]}
                textStyle={[
                  styles.categoryLabel,
                  isActive && styles.categoryLabelActive,
                ]}
              >
                {category.label}
              </Chip>
            );
          })}
        </ScrollView>

        <View style={styles.listingColumn}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : error ? (
            <EmptyPlaceholder
              icon={<PaperText style={styles.emptyIconText}>*</PaperText>}
              title={t("favorites.emptyTitle")}
              subtitle={error}
              actionLabel={t("favorites.emptyAction")}
              onActionPress={handlePlaceholder}
            />
          ) : displayListings.length === 0 ? (
            <EmptyPlaceholder
              icon={<PaperText style={styles.emptyIconText}>*</PaperText>}
              title={t("favorites.emptyTitle")}
              subtitle={t("favorites.emptySubtitle")}
              actionLabel={t("favorites.emptyAction")}
              onActionPress={handlePlaceholder}
            />
          ) : (
            displayListings.map((item: FavoriteListing) => (
              <FavoriteListingCard
                key={item.id}
                listing={item}
                onPress={() => router.push(`/listings/${item.id}`)}
                onMessage={handlePlaceholder}
                onMore={handlePlaceholder}
              />
            ))
          )}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: 20,
      paddingBottom: 40,
      gap: 20,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 15,
      color: theme.textMuted,
    },
    countPill: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.pillBackground,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.primary,
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    countLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.pillForeground,
    },
    segmentRow: {
      flexDirection: "row",
      gap: 10,
    },
    segmentChip: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    segmentLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    segmentLabelActive: {
      color: theme.primaryForeground,
    },
    categoryRow: {
      paddingHorizontal: 2,
      paddingVertical: 4,
    },
    categoryChip: {
      marginRight: 12,
      borderWidth: 1,
      borderColor: theme.chipBorder,
      backgroundColor: theme.chipBackground,
    },
    categoryChipActive: {
      backgroundColor: theme.chipActiveBackground,
      borderColor: theme.primary,
    },
    categoryLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    categoryLabelActive: {
      color: theme.chipActiveText,
    },
    listingColumn: {
      gap: 16,
    },
    loading: {
      paddingVertical: 24,
      alignItems: "center",
    },
    emptyIconText: {
      fontSize: 26,
      color: theme.primary,
    },
  });



