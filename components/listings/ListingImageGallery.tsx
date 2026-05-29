import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { type ThemeColors } from "@/constants/theme";
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
              style={[styles.navButton, styles.navLeft]}
              onPress={() =>
                setSelectedImageIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1))
              }
            >
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, styles.navRight]}
              onPress={() =>
                setSelectedImageIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1))
              }
            >
              <Ionicons name="chevron-forward" size={22} color={theme.text} />
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
      gap: 12,
    },
    heroImageWrap: {
      position: "relative",
    },
    heroImage: {
      width: "100%",
      height: 260,
      borderRadius: 18,
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
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    navLeft: {
      left: 12,
    },
    navRight: {
      right: 12,
    },
    counterBadge: {
      position: "absolute",
      bottom: 12,
      alignSelf: "center",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    counterLabel: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
    thumbRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 4,
    },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: 12,
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
