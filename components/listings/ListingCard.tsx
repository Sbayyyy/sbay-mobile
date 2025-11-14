import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Listing } from "@/types/listing";

type ListingCardProps = {
  listing: Listing;
  onPress?: (listing: Listing) => void;
};

export function ListingCard({ listing, onPress }: ListingCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => onPress?.(listing)}
    >
      <Image source={{ uri: listing.image }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.price}>{listing.price}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 110,
  },
  body: {
    padding: 12,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1d4ed8",
  },
});
