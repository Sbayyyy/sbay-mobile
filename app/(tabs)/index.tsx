import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppScreen } from "@/components/layout/AppScreen";
import { SectionHeader } from "@/components/common/SectionHeader";
import {
  HorizontalFilterChips,
  FilterChipOption,
} from "@/components/common/HorizontalFilterChips";
import { ListingCard } from "@/components/listings/ListingCard";
import { SearchBar } from "@/components/common/SearchBar";
import { HOME_CATEGORIES, HOME_LISTINGS } from "@/constants/mockData";
import { Listing } from "@/types/listing";
import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";

const heroCards: Pick<Listing, "id" | "image">[] = [
  {
    id: "hero-1",
    image:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "hero-2",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  },
];

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const categories = useMemo(() => {
    return HOME_CATEGORIES.map((category) => ({
      ...category,
      label: t(category.translationKey ?? `categories.${category.id}`, {
        defaultValue: category.label,
      }),
    }));
  }, [t]);

  const displayListings = useMemo(() => {
    return HOME_LISTINGS.filter((listing) => {
      const matchesCategory =
        activeCategory === "all" || listing.category === activeCategory;
      const matchesSearch = listing.title
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  return (
    <AppScreen>
      <View style={styles.screen}>
        <View style={styles.searchWrapper}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t("home.searchPlaceholder")}
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader
            title={t("home.categoriesTitle")}
            actionLabel={t("common.actions.seeAll")}
          />

          <HorizontalFilterChips
            options={categories as FilterChipOption[]}
            activeId={activeCategory}
            onSelect={setActiveCategory}
          />

          <View style={styles.heroRow}>
            {heroCards.map((card) => (
              <View key={card.id} style={styles.heroCard}>
                <Text style={styles.heroLabel}>
                  {t(`home.heroCards.${card.id}.title`)}
                </Text>
                <Text style={styles.heroAction}>
                  {t(`home.heroCards.${card.id}.action`)}
                </Text>
              </View>
            ))}
          </View>

          <SectionHeader
            title={t("home.recommendedTitle")}
            actionLabel={t("common.actions.exploreMore")}
          />

          {displayListings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{t("common.empty.noMatches")}</Text>
              <Text style={styles.emptySubtitle}>{t("home.emptySubtitle")}</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {displayListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </View>
          )}
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
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 12,
  },
  heroCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: theme.primary,
    padding: 18,
    shadowColor: theme.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  heroLabel: {
    color: theme.primaryForeground,
    fontSize: 16,
    fontWeight: "700",
  },
  heroAction: {
    color: theme.primarySoftText,
    marginTop: 6,
    fontWeight: "600",
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
