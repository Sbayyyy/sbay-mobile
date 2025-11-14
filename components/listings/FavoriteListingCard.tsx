import { View, StyleSheet } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Text as PaperText,
} from "react-native-paper";
import { FavoriteListing } from "@/types/listing";

type FavoriteListingCardProps = {
  listing: FavoriteListing;
  onMessage?: (listing: FavoriteListing) => void;
  onMore?: (listing: FavoriteListing) => void;
};

export function FavoriteListingCard({
  listing,
  onMessage,
  onMore,
}: FavoriteListingCardProps) {
  const initials = listing.seller
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Cover source={{ uri: listing.image }} style={styles.cardImage} />
      <Card.Content style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <PaperText style={styles.cardTitle}>{listing.title}</PaperText>
          <Button
            compact
            mode="text"
            icon="dots-horizontal"
            textColor="#6b7280"
            onPress={() => onMore?.(listing)}
            style={styles.overflowButton}
          > </Button>
        </View>

        <PaperText style={styles.cardMeta}>
          {listing.condition} {"\u2022"} {listing.location}
        </PaperText>

        <View style={styles.priceRow}>
          <PaperText style={styles.cardPrice}>
            {listing.currency} {listing.price}
          </PaperText>
          {listing.priceDrop ? (
            <Chip compact style={styles.badge} textStyle={styles.badgeLabel}>
              {listing.priceDrop}
            </Chip>
          ) : null}
          {listing.isNew ? (
            <Chip
              compact
              style={[styles.badge, styles.badgeNew]}
              textStyle={[styles.badgeLabel, styles.badgeLabelNew]}
            >
              New
            </Chip>
          ) : null}
        </View>

        <View style={styles.sellerRow}>
          <Avatar.Text
            size={42}
            label={initials}
            style={styles.sellerAvatar}
            labelStyle={styles.avatarLabel}
          />
          <View style={{ flex: 1 }}>
            <PaperText style={styles.sellerName}>{listing.seller}</PaperText>
            <PaperText style={styles.sellerMeta}>
              Updated {listing.updatedAt}
            </PaperText>
          </View>
          <Button
            mode="contained-tonal"
            icon="message-outline"
            compact
            style={styles.messageButton}
            textColor="#1d4ed8"
            buttonColor="#e0ecff"
            onPress={() => onMessage?.(listing)}
          >
            Message
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
  },
  cardImage: {
    height: 170,
  },
  cardBody: {
    gap: 12,
    paddingTop: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  overflowButton: {
    marginTop: -8,
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
    backgroundColor: "#ecfdf5",
    height: 32,
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
    backgroundColor: "#dbeafe",
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
    borderRadius: 14,
  },
});
