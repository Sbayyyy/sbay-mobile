import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Chip,
  Surface,
  Text as PaperText,
  useTheme,
} from "react-native-paper";
import { AppScreen } from "@/components/layout/AppScreen";
import { FavoriteListingCard } from "@/components/listings/FavoriteListingCard";
import { EmptyPlaceholder } from "@/components/common/EmptyPlaceholder";
import {
  FAVORITE_CATEGORIES,
  FAVORITE_LISTINGS,
} from "@/constants/mockData";
import { FavoriteListing, ListingCategory } from "@/types/listing";

const segments = [
  { id: "all", label: "All items" },
  { id: "price", label: "Price drops" },
  { id: "new", label: "New this week" },
] as const;

type SegmentId = (typeof segments)[number]["id"];

export default function FavoritesScreen() {
  const theme = useTheme();
  const [activeSegment, setActiveSegment] = useState<SegmentId>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const handlePlaceholder = () => {};

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
    <AppScreen backgroundColor={theme.colors.background}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <PaperText style={styles.title}>Favorites</PaperText>
            <PaperText style={styles.subtitle}>
              Track price drops and revisit items you love.
            </PaperText>
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
                  isActive && { backgroundColor: theme.colors.primary },
                ]}
                textStyle={[
                  styles.segmentLabel,
                  isActive && styles.segmentLabelActive,
                ]}
              >
                {segment.label}
              </Chip>
            );
          })}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {FAVORITE_CATEGORIES.map((category: ListingCategory) => {
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
              icon={<PaperText style={styles.emptyIconText}>♡</PaperText>}
              title="No matches right now"
              subtitle="Adjust your filters or explore the marketplace to save listings you care about."
              actionLabel="Explore listings"
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

const styles = StyleSheet.create({
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
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
  },
  countPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1d4ed8",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  countLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
  },
  segmentChip: {
    flex: 1,
    borderRadius: 16,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  segmentLabelActive: {
    color: "#fff",
  },
  categoryRow: {
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  categoryChip: {
    marginRight: 12,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  categoryChipActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  categoryLabelActive: {
    color: "#1d4ed8",
  },
  listingColumn: {
    gap: 16,
  },
  emptyIconText: {
    fontSize: 26,
    color: "#1d4ed8",
  },
});
