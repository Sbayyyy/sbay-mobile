import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { I18nManager, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  MarketplaceRadius,
  MarketplaceShadow,
  MarketplaceSpacing,
  MarketplaceTypography,
  type ThemeColors,
} from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

type ListingImageGalleryProps = {
  imageUrls: string[];
  title: string;
};

export function ListingImageGallery({ imageUrls, title }: ListingImageGalleryProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedImageUrl = imageUrls[selectedImageIndex] ?? imageUrls[0];
  const imageKey = imageUrls.join("|");
  const hasMultipleImages = imageUrls.length > 1;
  const previousIcon = I18nManager.isRTL ? "chevron-forward" : "chevron-back";
  const nextIcon = I18nManager.isRTL ? "chevron-back" : "chevron-forward";

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [imageKey]);

  return (
    <View style={styles.gallery}>
      <View style={styles.heroImageWrap}>
        <Image
          source={{ uri: selectedImageUrl }}
          style={styles.heroImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityLabel={title}
        />
        {hasMultipleImages ? (
          <>
            <TouchableOpacity
              style={[styles.navButton, I18nManager.isRTL ? styles.navRight : styles.navLeft]}
              onPress={() =>
                setSelectedImageIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1))
              }
            >
              <Ionicons name={previousIcon} size={22} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, I18nManager.isRTL ? styles.navLeft : styles.navRight]}
              onPress={() =>
                setSelectedImageIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1))
              }
            >
              <Ionicons name={nextIcon} size={22} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.counterBadge}>
              <Text style={styles.counterLabel}>
                {selectedImageIndex + 1} / {imageUrls.length}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {hasMultipleImages ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.thumbRow}>
            {imageUrls.map((url, index) => {
              const active = index === selectedImageIndex;
              return (
                <TouchableOpacity
                  key={`${url}-${index}`}
                  onPress={() => setSelectedImageIndex(index)}
                  style={[styles.thumb, active && styles.thumbActive]}
                >
                  <Image
                    source={{ uri: url }}
                    style={styles.thumbImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    accessibilityLabel={title}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    gallery: {
      gap: MarketplaceSpacing.md,
    },
    heroImageWrap: {
      position: "relative",
    },
    heroImage: {
      width: "100%",
      height: 260,
      borderRadius: MarketplaceRadius.sheet,
      backgroundColor: theme.surfaceMuted,
    },
    navButton: {
      position: "absolute",
      top: "45%",
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.shadow,
      ...MarketplaceShadow.subtle,
    },
    navLeft: {
      left: MarketplaceSpacing.md,
    },
    navRight: {
      right: MarketplaceSpacing.md,
    },
    counterBadge: {
      position: "absolute",
      bottom: MarketplaceSpacing.md,
      alignSelf: "center",
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.xs,
      borderRadius: MarketplaceRadius.pill,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    counterLabel: {
      color: "#fff",
      fontSize: MarketplaceTypography.meta,
      fontWeight: "600",
    },
    thumbRow: {
      flexDirection: "row",
      gap: MarketplaceSpacing.sm,
      paddingHorizontal: MarketplaceSpacing.xs,
    },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: MarketplaceRadius.md,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: "transparent",
    },
    thumbActive: {
      borderColor: theme.primary,
    },
    thumbImage: {
      width: "100%",
      height: "100%",
    },
  });
