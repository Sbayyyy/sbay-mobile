import { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Listing } from "@/types/listing";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

type ListingCardProps = {
  listing: Listing;
  onPress?: (listing: Listing) => void;
};

export function ListingCard({ listing, onPress }: ListingCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: "48%",
      backgroundColor: theme.surface,
      borderRadius: 18,
      overflow: "hidden",
      shadowColor: theme.shadow,
      shadowOpacity: 0.15,
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
      color: theme.text,
    },
    price: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.primary,
    },
  });
