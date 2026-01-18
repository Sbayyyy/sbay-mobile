import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Chip, Surface, Text as PaperText } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { EmptyPlaceholder } from "@/components/common/EmptyPlaceholder";
import { AppScreen } from "@/components/layout/AppScreen";
import { FavoriteListingCard } from "@/components/listings/FavoriteListingCard";
import {
  FAVORITE_CATEGORIES,
  FAVORITE_LISTINGS,
} from "@/constants/mockData";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { FavoriteListing, ListingCategory } from "@/types/listing";

const segments = [
  { id: "all", labelKey: "favorites.segments.all" },
  { id: "price", labelKey: "favorites.segments.price" },
  { id: "new", labelKey: "favorites.segments.new" },
] as const;

type SegmentId = (typeof segments)[number]["id"];

export default function FavoritesScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeSegment, setActiveSegment] = useState<SegmentId>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { t } = useTranslation();
  const handlePlaceholder = () => {};

  const categories = useMemo(() => {
    return FAVORITE_CATEGORIES.map((category) => ({
      ...category,
      label: t(category.translationKey ?? `categories.${category.id}`, {
        defaultValue: category.label,
      }),
    }));
  }, [t]);

  const displayListings = useMemo(() => {
    return FAVORITE_LISTINGS.filter((listing) => {
      const matchesCategory =
        activeCategory === "all" || listing.category === activeCategory;

      const matchesSegment =
        activeSegment === "all"
          ? true
          : activeSegment === "price"
            ? Boolean(listing.priceDrop)
            : Boolean(listing.isNew);

      return matchesCategory && matchesSegment;
    });
  }, [activeCategory, activeSegment]);

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <PaperText style={styles.title}>{t("favorites.title")}</PaperText>
            <PaperText style={styles.subtitle}>{t("favorites.subtitle")}</PaperText>
          </View>
          <Surface style={styles.countPill} elevation={3}>
            <PaperText style={styles.countLabel}>
              {FAVORITE_LISTINGS.length}
            </PaperText>
          </Surface>
        </View>

        <View style={styles.segmentRow}>
          {segments.map((segment) => {
            const isActive = segment.id === activeSegment;
            return (
              <Chip
                key={segment.id}
                selected={isActive}
                mode={isActive ? "flat" : "outlined"}
                onPress={() => setActiveSegment(segment.id)}
                style={[
                  styles.segmentChip,
                  isActive && { backgroundColor: theme.primary },
                ]}
                textStyle={[
                  styles.segmentLabel,
                  isActive && styles.segmentLabelActive,
                ]}
              >
                {t(segment.labelKey)}
              </Chip>
            );
          })}
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
          {displayListings.length === 0 ? (
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
    emptyIconText: {
      fontSize: 26,
      color: theme.primary,
    },
  });



