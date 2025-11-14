import { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

type FavoriteListing = {
  id: string;
  title: string;
  price: string;
  currency: string;
  location: string;
  condition: string;
  category: string;
  seller: string;
  updatedAt: string;
  priceDrop?: string;
  isNew?: boolean;
  image: string;
};

const segments = [
  { id: "all", label: "All items" },
  { id: "price", label: "Price drops" },
  { id: "new", label: "New this week" },
];

const categories = [
  { id: "all", label: "All categories" },
  { id: "electronics", label: "Electronics" },
  { id: "fashion", label: "Fashion" },
  { id: "home", label: "Home" },
  { id: "sports", label: "Sports" },
];

const savedListings: FavoriteListing[] = [
  {
    id: "1",
    title: "Noise Cancelling Headphones",
    price: "180",
    currency: "USD",
    location: "Damascus",
    condition: "Like new",
    category: "electronics",
    seller: "Sarah Julian",
    updatedAt: "2h ago",
    priceDrop: "-$20 this week",
    image:
      "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?auto=format&fit=crop&w=600&q=60",
  },
  {
    id: "2",
    title: "Scandinavian Lounge Chair",
    price: "620",
    currency: "USD",
    location: "Homs",
    condition: "Excellent",
    category: "home",
    seller: "Ibrahim N.",
    updatedAt: "1d ago",
    image:
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=600&q=60",
  },
  {
    id: "3",
    title: "Trail Running Set",
    price: "95",
    currency: "USD",
    location: "Latakia",
    condition: "Good",
    category: "sports",
    seller: "Omar Ali",
    updatedAt: "4h ago",
    isNew: true,
    image:
      "https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=600&q=60",
  },
  {
    id: "4",
    title: "Canvas Tote & Accessories",
    price: "48",
    currency: "USD",
    location: "Aleppo",
    condition: "Like new",
    category: "fashion",
    seller: "Salma Odeh",
    updatedAt: "3d ago",
    priceDrop: "-10% today",
    image:
      "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?auto=format&fit=crop&w=600&q=60",
  },
];

export default function FavoritesScreen() {
  const [activeSegment, setActiveSegment] = useState(segments[0].id);
  const [activeCategory, setActiveCategory] = useState(categories[0].id);

  const displayListings = useMemo(() => {
    return savedListings.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;

      const matchesSegment =
        activeSegment === "all"
          ? true
          : activeSegment === "price"
            ? Boolean(item.priceDrop)
            : Boolean(item.isNew);

      return matchesCategory && matchesSegment;
    });
  }, [activeCategory, activeSegment]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Favorites</Text>
            <Text style={styles.subtitle}>
              Track price drops and revisit items you love.
            </Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countLabel}>{savedListings.length}</Text>
          </View>
        </View>

        <View style={styles.segmentRow}>
          {segments.map((segment) => {
            const isActive = segment.id === activeSegment;
            return (
              <TouchableOpacity
                key={segment.id}
                style={[styles.segment, isActive && styles.segmentActive]}
                onPress={() => setActiveSegment(segment.id)}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    isActive && styles.segmentLabelActive,
                  ]}
                >
                  {segment.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((category) => {
            const isActive = category.id === activeCategory;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryChip, isActive && styles.categoryActive]}
                onPress={() => setActiveCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryLabel,
                    isActive && styles.categoryLabelActive,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.listingColumn}>
          {displayListings.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <FontAwesome name="heart-o" size={24} color="#1d4ed8" />
              </View>
              <Text style={styles.emptyTitle}>No matches right now</Text>
              <Text style={styles.emptySubtitle}>
                Adjust your filters or explore the marketplace to save listings
                you care about.
              </Text>
              <TouchableOpacity style={styles.exploreButton}>
                <Text style={styles.exploreLabel}>Explore listings</Text>
              </TouchableOpacity>
            </View>
          ) : (
            displayListings.map((item) => (
              <View key={item.id} style={styles.card}>
                <Image source={{ uri: item.image }} style={styles.cardImage} />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <TouchableOpacity style={styles.overflowButton}>
                      <FontAwesome
                        name="ellipsis-h"
                        size={16}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardMeta}>
                    {item.condition} • {item.location}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.cardPrice}>
                      {item.currency} {item.price}
                    </Text>
                    {item.priceDrop && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeLabel}>{item.priceDrop}</Text>
                      </View>
                    )}
                    {item.isNew && (
                      <View style={[styles.badge, styles.badgeNew]}>
                        <Text style={[styles.badgeLabel, styles.badgeLabelNew]}>
                          New
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.sellerRow}>
                    <View style={styles.sellerAvatar}>
                      <Text style={styles.avatarLabel}>
                        {item.seller
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sellerName}>{item.seller}</Text>
                      <Text style={styles.sellerMeta}>
                        Updated {item.updatedAt}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.messageButton}>
                      <FontAwesome name="comments-o" size={16} color="#1d4ed8" />
                      <Text style={styles.messageLabel}>Message</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
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
    elevation: 3,
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
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  segmentActive: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
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
    gap: 12,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 12,
  },
  categoryActive: {
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: 170,
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  overflowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  cardMeta: {
    fontSize: 13,
    color: "#6b7280",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ecfdf5",
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  badgeNew: {
    backgroundColor: "#eef2ff",
  },
  badgeLabelNew: {
    color: "#4f46e5",
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sellerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  sellerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  sellerMeta: {
    fontSize: 13,
    color: "#6b7280",
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#e0ecff",
  },
  messageLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1d4ed8",
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 18,
    alignItems: "center",
    padding: 28,
    gap: 12,
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  exploreButton: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#1d4ed8",
  },
  exploreLabel: {
    color: "#fff",
    fontWeight: "600",
  },
});
