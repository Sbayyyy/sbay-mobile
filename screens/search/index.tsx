import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppScreen } from "@/components/layout/AppScreen";
import { SearchBar } from "@/components/common/SearchBar";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ChipPicker } from "@/components/form/ChipPicker";
import { ListingCard } from "@/components/listings/ListingCard";
import { HOME_CATEGORIES } from "@/constants/mockData";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { searchListings, type Listing as ApiListing } from "@/services/listings";

const SYRIA_DISTRICTS = [
  "Damascus",
  "Rif Dimashq",
  "Aleppo",
  "Homs",
  "Hama",
  "Latakia",
  "Tartus",
  "Idlib",
  "Deir ez-Zor",
  "Raqqa",
  "Hasakah",
  "Daraa",
  "As-Suwayda",
  "Quneitra",
  "Other",
] as const;

type SortId = "newest" | "price_low" | "price_high";
type StatusId = "all" | "new" | "used" | "renewed" | "defective";
type CategoryId = "all" | string;
type LocationId = "all" | (typeof SYRIA_DISTRICTS)[number];

const statusToCondition: Record<Exclude<StatusId, "all">, string> = {
  new: "New",
  used: "Used",
  renewed: "Refurbished",
  defective: "Poor",
};

export default function SearchScreen() {
  const { query, category: categoryParam } = useLocalSearchParams<{
    query?: string;
    category?: string;
  }>();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [search, setSearch] = useState(query ?? "");
  const [sortBy, setSortBy] = useState<SortId>("newest");
  const [status, setStatus] = useState<StatusId>("all");
  const [category, setCategory] = useState<CategoryId>(categoryParam ?? "all");
  const [location, setLocation] = useState<LocationId>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query !== undefined) {
      setSearch(String(query));
    }
  }, [query]);

  useEffect(() => {
    if (categoryParam !== undefined) {
      setCategory(String(categoryParam));
    }
  }, [categoryParam]);

  const categoryOptions = useMemo(
    () => [
      { id: "all", label: t("common.actions.all", { defaultValue: "All" }) },
      ...HOME_CATEGORIES.filter((item) => item.id !== "all").map((item) => ({
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
      ...SYRIA_DISTRICTS.map((district) => ({
        id: district,
        label: district,
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
        const data = await searchListings({
          text: search.trim() || undefined,
          category: category === "all" ? undefined : category,
          region: location === "all" ? undefined : location,
          condition: status === "all" ? undefined : statusToCondition[status],
          minPrice: Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : undefined,
          maxPrice: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : undefined,
        });
        if (!isMounted) return;
        setListings(data);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : t("listings.errorSubtitle"));
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(handle);
    };
  }, [category, location, maxPrice, minPrice, search, status, t]);

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
      sortedListings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        price: `${listing.priceCurrency} ${listing.priceAmount}`,
        category: listing.categoryPath ?? "other",
        location: listing.region ?? listing.seller?.city ?? undefined,
        image:
          listing.thumbnailUrl ??
          listing.imageUrls?.[0] ??
          "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=600&q=60",
      })),
    [sortedListings],
  );

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
              <Text style={styles.filterButtonLabel}>
                {t("common.actions.filters", { defaultValue: "Filters" })}
              </Text>
            </TouchableOpacity>
            <Text style={styles.resultCount}>
              {t("listings.resultsCount", {
                defaultValue: `${displayListings.length} results`,
              })}
            </Text>
          </View>

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
                label={t("listings.status", { defaultValue: "Status" })}
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
                  onPress={() => {
                    setSortBy("newest");
                    setStatus("all");
                    setCategory("all");
                    setLocation("all");
                    setMinPrice("");
                    setMaxPrice("");
                  }}
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
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: theme.background,
    },
    content: {
      paddingBottom: 40,
      paddingTop: 12,
      gap: 12,
    },
    filterRow: {
      paddingHorizontal: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    filterButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterButtonLabel: {
      color: theme.primary,
      fontWeight: "600",
    },
    resultCount: {
      color: theme.textMuted,
      fontSize: 13,
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
      maxHeight: "85%",
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalContent: {
      gap: 16,
      paddingBottom: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
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
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.text,
      backgroundColor: theme.surface,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      paddingTop: 4,
    },
    modalButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
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
