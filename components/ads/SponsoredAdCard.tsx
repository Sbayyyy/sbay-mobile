import { useEffect, useMemo } from "react";
import {
  Linking,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  trackSponsoredAdClick,
  trackSponsoredAdImpression,
  type SponsoredAd,
} from "@/services/ads";

type SponsoredAdCardProps = {
  ad: SponsoredAd;
  style?: StyleProp<ViewStyle>;
};

const isExternalUrl = (value: string) => /^https?:\/\//i.test(value);

function normalizeInternalTarget(targetUrl: string): string {
  const path = targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`;
  if (path.startsWith("/listing/")) {
    return path.replace(/^\/listing\//, "/listings/");
  }
  return path;
}

export function SponsoredAdCard({ ad, style }: SponsoredAdCardProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isExternal = isExternalUrl(ad.targetUrl);

  useEffect(() => {
    void trackSponsoredAdImpression(ad.id).catch(() => undefined);
  }, [ad.id]);

  const handlePress = async () => {
    await trackSponsoredAdClick(ad.id).catch(() => undefined);
    if (isExternal) {
      await Linking.openURL(ad.targetUrl).catch(() => undefined);
      return;
    }
    router.push(normalizeInternalTarget(ad.targetUrl) as any);
  };

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      <View style={styles.imageWrap}>
        {ad.imageUrl ? (
          <Image
            source={{ uri: ad.imageUrl }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel={ad.title}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {t("ads.sponsored", { defaultValue: "Sponsored" })}
            </Text>
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {t("ads.sponsored", { defaultValue: "Sponsored" })}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {ad.title}
        </Text>
        <Text style={styles.description} numberOfLines={3}>
          {ad.description}
        </Text>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText} numberOfLines={1}>
            {ad.ctaText}
          </Text>
          <Ionicons
            name={isExternal ? "open-outline" : "arrow-forward"}
            size={14}
            color={theme.warning}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.warning,
    },
    imageWrap: {
      position: "relative",
      height: 118,
      backgroundColor: theme.warningBackground,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    placeholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
    },
    placeholderText: {
      color: theme.warning,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
    },
    badge: {
      position: "absolute",
      left: 8,
      top: 8,
      borderRadius: 999,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.warning,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: {
      color: theme.warning,
      fontSize: 10,
      fontWeight: "800",
    },
    body: {
      padding: 10,
      gap: 6,
    },
    title: {
      color: theme.text,
      fontSize: 13,
      fontWeight: "800",
    },
    description: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    ctaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingTop: 2,
    },
    ctaText: {
      flex: 1,
      color: theme.warning,
      fontSize: 12,
      fontWeight: "800",
    },
  });
