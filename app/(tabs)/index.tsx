import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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

const heroCards: Listing[] = [
  {
    id: "hero-1",
    title: "Furniture refresh",
    price: "Shop now",
    category: "home",
    image:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "hero-2",
    title: "Outdoor must-haves",
    price: "See deals",
    category: "sports",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  },
];

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

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
    <AppScreen backgroundColor="#f9fafb">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search products, brands, or categories"
        />

        <SectionHeader title="Categories" actionLabel="See all" />

        <HorizontalFilterChips
          options={HOME_CATEGORIES as FilterChipOption[]}
          activeId={activeCategory}
          onSelect={setActiveCategory}
        />

        <View style={styles.heroRow}>
          {heroCards.map((card) => (
            <View key={card.id} style={styles.heroCard}>
              <Text style={styles.heroLabel}>{card.title}</Text>
              <Text style={styles.heroAction}>{card.price}</Text>
            </View>
          ))}
        </View>

        <SectionHeader title="Recommended for you" actionLabel="Explore more" />

        {displayListings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptySubtitle}>
              Try another category or adjust your search.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {displayListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#1d4ed8",
    padding: 18,
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  heroLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  heroAction: {
    color: "#bfdbfe",
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
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
});
