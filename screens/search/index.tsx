import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppScreen } from "@/components/layout/AppScreen";
import { SearchBar } from "@/components/common/SearchBar";
import { SectionHeader } from "@/components/common/SectionHeader";
import { SponsoredAdCard } from "@/components/ads/SponsoredAdCard";
import { ChipPicker } from "@/components/form/ChipPicker";
import { ListingCard } from "@/components/listings/ListingCard";
import { toListingCardListings } from "@/components/listings/listing-card-presenter";
import { ADD_LISTING_CATEGORIES } from "@/constants/mockData";
import {
  SYRIA_REGION_OPTIONS,
  type SyriaRegionId,
} from "@/constants/regions";
import {
  MarketplaceRadius,
  MarketplaceShadow,
  MarketplaceSpacing,
  MarketplaceTypography,
  type ThemeColors,
} from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { searchListings, type Listing as ApiListing } from "@/services/listings";
import { getSponsoredAds, type SponsoredAd } from "@/services/ads";
import { getFriendlyErrorMessage } from "@/services/account-status-errors";

type SortId = "newest" | "price_low" | "price_high";
type StatusId = "all" | "new" | "used" | "renewed" | "defective";
type FeaturedFilterId = "all" | "featured";
type CategoryId = "all" | string;
type LocationId = "all" | SyriaRegionId;

const statusToCondition: Record<Exclude<StatusId, "all">, string> = {
  new: "New",
  used: "Used",
  renewed: "Refurbished",
  defective: "Poor",
};

const FALLBACK_LISTING_IMAGE =
  "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=600&q=60";

const categorySearchAliases: Record<string, string[]> = {
  electronics: ["electronics", "electronic", "إلكترونيات", "الكترونيات"],
  fashion: ["fashion", "clothes", "clothing", "ازياء", "ملابس"],
  home: ["home", "furniture", "house", "منزل", "اثاث", "أثاث", "بيت"],
  sports: ["sports", "sport", "رياضة", "رياضيه"],
  toys: ["toys", "toy", "العاب", "ألعاب", "لعب"],
};

function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveSearchCategory(searchText: string): { category?: string; text?: string } {
  const normalizedSearch = normalizeSearchValue(searchText);
  if (!normalizedSearch) return {};

  for (const categoryId of ADD_LISTING_CATEGORIES.map((item) => item.id)) {
    const aliases = [categoryId, ...(categorySearchAliases[categoryId] ?? [])]
      .map(normalizeSearchValue)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const exactAlias = aliases.find((alias) => normalizedSearch === alias);
    if (exactAlias) return { category: categoryId };

    const containedAlias = aliases.find((alias) => ` ${normalizedSearch} `.includes(` ${alias} `));
    if (containedAlias) {
      const remainingText = normalizedSearch
        .replace(new RegExp(`(^|\\s)${containedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`), " ")
        .replace(/\s+/g, " ")
        .trim();
      return { category: categoryId, text: remainingText || undefined };
    }
  }

  return { text: searchText.trim() || undefined };
}

export default function SearchScreen() {
  const { query, category: categoryParam, featured: featuredParam, reset } = useLocalSearchParams<{
    query?: string;
    category?: string;
    featured?: string;
    reset?: string;
  }>();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [search, setSearch] = useState(query ?? "");
  const [sortBy, setSortBy] = useState<SortId>("newest");
  const [status, setStatus] = useState<StatusId>("all");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilterId>(
    featuredParam === "true" ? "featured" : "all",
  );
  const [category, setCategory] = useState<CategoryId>(categoryParam ?? "all");
  const [location, setLocation] = useState<LocationId>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearch(query !== undefined ? String(query) : "");
  }, [query]);

  useEffect(() => {
    setCategory(categoryParam !== undefined ? String(categoryParam) : "all");
  }, [categoryParam]);

  useEffect(() => {
    setFeaturedFilter(featuredParam === "true" ? "featured" : "all");
  }, [featuredParam]);

  useEffect(() => {
    if (reset !== "true") return;
    setSortBy("newest");
    setStatus("all");
    setLocation("all");
    setMinPrice("");
    setMaxPrice("");
  }, [reset]);

  const categoryOptions = useMemo(
    () => [
      { id: "all", label: t("common.actions.all", { defaultValue: "All" }) },
      ...ADD_LISTING_CATEGORIES.map((item) => ({
        id: item.id,
        label: t(item.translationKey ?? `categories.${item.id}`, {
          defaultValue: item.label,
        }),
      })),
    ],
    [t],
  );

  const locationOptions = useMemo(
    () => [
      { id: "all", label: t("common.actions.all", { defaultValue: "All" }) },
      ...SYRIA_REGION_OPTIONS.map((district) => ({
        id: district.id,
        label: t(district.labelKey, { defaultValue: district.id }),
      })),
    ],
    [t],
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const handle = setTimeout(async () => {
      try {
        const parsedMin = Number(minPrice);
        const parsedMax = Number(maxPrice);
        const resolvedSearch = resolveSearchCategory(search);
        const selectedCategory = category === "all" ? resolvedSearch.category : category;
        const searchText = category === "all" ? resolvedSearch.text : search.trim() || undefined;
        const [data, ads] = await Promise.all([
          searchListings({
            text: searchText,
            category: selectedCategory === "all" ? undefined : selectedCategory,
            region: location === "all" ? undefined : location,
            condition: status === "all" ? undefined : statusToCondition[status],
            featured: featuredFilter === "featured" ? true : undefined,
            minPrice: Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : undefined,
            maxPrice: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : undefined,
          }),
          getSponsoredAds().catch(() => []),
        ]);
        if (!isMounted) return;
        setListings(
          featuredFilter === "featured"
            ? data.filter((listing) => listing.isBoosted === true)
            : data,
        );
        setSponsoredAds(ads);
      } catch (err) {
        if (!isMounted) return;
        setError(getFriendlyErrorMessage(err, t("listings.errorSubtitle")));
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(handle);
    };
  }, [category, featuredFilter, location, maxPrice, minPrice, search, status, t]);

  const sortedListings = useMemo(() => {
    const next = [...listings];
    if (sortBy === "price_low") {
      next.sort((a, b) => (a.priceAmount ?? 0) - (b.priceAmount ?? 0));
    } else if (sortBy === "price_high") {
      next.sort((a, b) => (b.priceAmount ?? 0) - (a.priceAmount ?? 0));
    } else {
      next.sort((a, b) => {
        const aTime = new Date(a.createdAt ?? 0).getTime();
        const bTime = new Date(b.createdAt ?? 0).getTime();
        return bTime - aTime;
      });
    }
    return next;
  }, [listings, sortBy]);

  const displayListings = useMemo(
    () =>
      toListingCardListings(sortedListings, t).map((listing) => ({
        ...listing,
        image: listing.image || FALLBACK_LISTING_IMAGE,
      })),
    [sortedListings, t],
  );
  const sortLabel = useMemo(() => {
    if (sortBy === "price_low") {
      return t("listings.sortPriceLow", { defaultValue: "Price: Low to High" });
    }
    if (sortBy === "price_high") {
      return t("listings.sortPriceHigh", { defaultValue: "Price: High to Low" });
    }
    return t("listings.sortNewest", { defaultValue: "Newest" });
  }, [sortBy, t]);
  const activeFilterCount = [
    status !== "all",
    featuredFilter !== "all",
    category !== "all",
    location !== "all",
    minPrice.trim().length > 0,
    maxPrice.trim().length > 0,
  ].filter(Boolean).length;
  const filterLabel = activeFilterCount
    ? `${t("common.actions.filters", { defaultValue: "Filters" })} (${activeFilterCount})`
    : t("common.actions.filters", { defaultValue: "Filters" });
  const resetFilters = () => {
    setSortBy("newest");
    setStatus("all");
    setFeaturedFilter("all");
    setCategory("all");
    setLocation("all");
    setMinPrice("");
    setMaxPrice("");
  };
  const activeFilters = [
    featuredFilter === "featured"
      ? {
          key: "featured",
          label: t("home.featuredTitle", { defaultValue: "Featured" }),
          onRemove: () => setFeaturedFilter("all"),
        }
      : null,
    status !== "all"
      ? {
          key: "status",
          label:
            status === "new"
              ? t("addListing.conditions.new", { defaultValue: "New" })
              : status === "used"
                ? t("addListing.conditions.used", { defaultValue: "Used" })
                : status === "renewed"
                  ? t("addListing.conditions.refurbished", { defaultValue: "Renewed" })
                  : t("addListing.conditions.poor", { defaultValue: "Defective" }),
          onRemove: () => setStatus("all"),
        }
      : null,
    category !== "all"
      ? {
          key: "category",
          label: categoryOptions.find((item) => item.id === category)?.label ?? category,
          onRemove: () => setCategory("all"),
        }
      : null,
    location !== "all"
      ? {
          key: "location",
          label: locationOptions.find((item) => item.id === location)?.label ?? location,
          onRemove: () => setLocation("all"),
        }
      : null,
    minPrice.trim()
      ? {
          key: "minPrice",
          label: `${t("listings.minPrice", { defaultValue: "Min price" })}: ${minPrice.trim()}`,
          onRemove: () => setMinPrice(""),
        }
      : null,
    maxPrice.trim()
      ? {
          key: "maxPrice",
          label: `${t("listings.maxPrice", { defaultValue: "Max price" })}: ${maxPrice.trim()}`,
          onRemove: () => setMaxPrice(""),
        }
      : null,
  ].filter((item): item is { key: string; label: string; onRemove: () => void } => item !== null);

  return (
    <AppScreen>
      <View style={styles.screen}>
        <View style={styles.searchWrapper}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t("home.searchPlaceholder")}
            onSubmit={() => undefined}
          />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFiltersOpen(true)}
            >
              <FontAwesome name="sliders" size={14} color={theme.primary} />
              <Text style={styles.filterButtonLabel}>{filterLabel}</Text>
            </TouchableOpacity>
            <View style={styles.resultSummary}>
              <Text style={styles.resultCount}>
                {t("listings.resultsCount", {
                  defaultValue: "{{count}} results",
                  count: displayListings.length,
                })}
              </Text>
              <Text style={styles.sortSummary}>
                {t("listings.sortBySummary", {
                  defaultValue: "Sorted by {{sort}}",
                  sort: sortLabel,
                })}
              </Text>
            </View>
          </View>

          {activeFilters.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activeFiltersRow}
            >
              {activeFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={styles.activeFilterChip}
                  onPress={filter.onRemove}
                  accessibilityRole="button"
                >
                  <Text style={styles.activeFilterLabel} numberOfLines={1}>
                    {filter.label}
                  </Text>
                  <FontAwesome name="times" size={12} color={theme.primary} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.clearFilterChip} onPress={resetFilters}>
                <Text style={styles.clearFilterLabel}>
                  {t("common.actions.reset", { defaultValue: "Reset" })}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}

          <SectionHeader
            title={t("listings.resultsTitle", { defaultValue: "Results" })}
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
              {displayListings.map((listing, index) => (
                <Fragment key={listing.id}>
                  {index === 4 && sponsoredAds[0] ? (
                    <SponsoredAdCard
                      ad={sponsoredAds[0]}
                      style={styles.sponsoredGridItem}
                    />
                  ) : null}
                  <ListingCard
                    listing={listing}
                    onPress={() => router.push(`/listings/${listing.id}`)}
                  />
                </Fragment>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <Modal
        visible={filtersOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFiltersOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFiltersOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {t("common.actions.filters", { defaultValue: "Filters" })}
              </Text>
              <ChipPicker
                label={t("listings.sortBy", { defaultValue: "Sort by" })}
                value={sortBy}
                onChange={setSortBy}
                options={[
                  {
                    id: "newest",
                    label: t("listings.sortNewest", { defaultValue: "Newest" }),
                  },
                  {
                    id: "price_low",
                    label: t("listings.sortPriceLow", {
                      defaultValue: "Price: Low to High",
                    }),
                  },
                  {
                    id: "price_high",
                    label: t("listings.sortPriceHigh", {
                      defaultValue: "Price: High to Low",
                    }),
                  },
                ]}
              />
              <ChipPicker
                label={t("listings.type", { defaultValue: "Type" })}
                value={featuredFilter}
                onChange={setFeaturedFilter}
                options={[
                  { id: "all", label: t("common.actions.all", { defaultValue: "All" }) },
                  {
                    id: "featured",
                    label: t("home.featuredTitle", { defaultValue: "Featured" }),
                  },
                ]}
              />
              <ChipPicker
                label={t("listings.statusLabel", { defaultValue: "Status" })}
                value={status}
                onChange={setStatus}
                options={[
                  { id: "all", label: t("common.actions.all", { defaultValue: "All" }) },
                  { id: "new", label: t("addListing.conditions.new", { defaultValue: "New" }) },
                  { id: "used", label: t("addListing.conditions.used", { defaultValue: "Used" }) },
                  {
                    id: "renewed",
                    label: t("addListing.conditions.refurbished", {
                      defaultValue: "Renewed",
                    }),
                  },
                  {
                    id: "defective",
                    label: t("addListing.conditions.poor", {
                      defaultValue: "Defective",
                    }),
                  },
                ]}
              />
              <ChipPicker
                label={t("listings.category", { defaultValue: "Category" })}
                value={category}
                onChange={setCategory}
                options={categoryOptions}
              />
              <ChipPicker
                label={t("listings.location", { defaultValue: "Location" })}
                value={location}
                onChange={(id) => setLocation(id as LocationId)}
                options={locationOptions}
              />
              <View style={styles.priceRow}>
                <View style={styles.priceField}>
                  <Text style={styles.priceLabel}>
                    {t("listings.minPrice", { defaultValue: "Min price" })}
                  </Text>
                  <TextInput
                    style={styles.priceInput}
                    value={minPrice}
                    onChangeText={setMinPrice}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                </View>
                <View style={styles.priceField}>
                  <Text style={styles.priceLabel}>
                    {t("listings.maxPrice", { defaultValue: "Max price" })}
                  </Text>
                  <TextInput
                    style={styles.priceInput}
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                </View>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={resetFilters}
                >
                  <Text style={styles.modalButtonText}>
                    {t("common.actions.reset", { defaultValue: "Reset" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => setFiltersOpen(false)}
                >
                  <Text style={styles.modalButtonTextPrimary}>
                    {t("common.actions.apply", { defaultValue: "Apply" })}
                  </Text>
                </TouchableOpacity>
              </View>
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
      paddingTop: MarketplaceSpacing.sm,
      paddingBottom: MarketplaceSpacing.xs,
      backgroundColor: theme.background,
    },
    content: {
      paddingBottom: 28,
      paddingTop: MarketplaceSpacing.sm,
      gap: MarketplaceSpacing.sm,
    },
    filterRow: {
      paddingHorizontal: MarketplaceSpacing.lg,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: MarketplaceSpacing.xs,
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.sm,
      borderRadius: MarketplaceRadius.pill,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      ...MarketplaceShadow.subtle,
    },
    filterButtonLabel: {
      color: theme.primary,
      fontWeight: "800",
    },
    resultSummary: {
      flex: 1,
      alignItems: "flex-end",
      gap: 2,
    },
    resultCount: {
      color: theme.textMuted,
      fontSize: MarketplaceTypography.bodySmall,
      fontWeight: "700",
    },
    sortSummary: {
      color: theme.textSubtle,
      fontSize: MarketplaceTypography.caption,
      fontWeight: "600",
    },
    activeFiltersRow: {
      paddingHorizontal: MarketplaceSpacing.lg,
      gap: MarketplaceSpacing.sm,
    },
    activeFilterChip: {
      maxWidth: 190,
      minHeight: 34,
      flexDirection: "row",
      alignItems: "center",
      gap: MarketplaceSpacing.xs,
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.xs,
      borderRadius: MarketplaceRadius.pill,
      backgroundColor: theme.primaryMuted,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    activeFilterLabel: {
      color: theme.primary,
      fontSize: MarketplaceTypography.bodySmall,
      fontWeight: "800",
    },
    clearFilterChip: {
      minHeight: 34,
      justifyContent: "center",
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.xs,
      borderRadius: MarketplaceRadius.pill,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    clearFilterLabel: {
      color: theme.textMuted,
      fontSize: MarketplaceTypography.bodySmall,
      fontWeight: "800",
    },
    loading: {
      paddingVertical: MarketplaceSpacing.xxl,
      alignItems: "center",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingHorizontal: MarketplaceSpacing.lg,
      rowGap: MarketplaceSpacing.md,
    },
    sponsoredGridItem: {
      width: "48%",
    },
    emptyState: {
      paddingHorizontal: MarketplaceSpacing.lg,
      paddingVertical: MarketplaceSpacing.xxl,
      alignItems: "center",
      gap: MarketplaceSpacing.sm,
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      justifyContent: "center",
      padding: MarketplaceSpacing.lg,
    },
    modalCard: {
      backgroundColor: theme.surface,
      borderRadius: MarketplaceRadius.sheet,
      padding: MarketplaceSpacing.lg,
      maxHeight: "85%",
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      ...MarketplaceShadow.raised,
    },
    modalContent: {
      gap: MarketplaceSpacing.lg,
      paddingBottom: MarketplaceSpacing.md,
    },
    modalTitle: {
      fontSize: MarketplaceTypography.title,
      fontWeight: "800",
      color: theme.text,
    },
    priceRow: {
      flexDirection: "row",
      gap: 12,
    },
    priceField: {
      flex: 1,
      gap: 6,
    },
    priceLabel: {
      color: theme.text,
      fontWeight: "600",
    },
    priceInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: MarketplaceRadius.md,
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.sm,
      color: theme.text,
      backgroundColor: theme.surface,
      textAlign: I18nManager.isRTL ? "right" : "left",
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: MarketplaceSpacing.md,
      paddingTop: MarketplaceSpacing.xs,
    },
    modalButton: {
      paddingHorizontal: MarketplaceSpacing.lg,
      paddingVertical: MarketplaceSpacing.sm,
      borderRadius: MarketplaceRadius.md,
      backgroundColor: theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalButtonPrimary: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    modalButtonText: {
      fontWeight: "600",
      color: theme.text,
    },
    modalButtonTextPrimary: {
      fontWeight: "600",
      color: theme.primaryForeground,
    },
  });
