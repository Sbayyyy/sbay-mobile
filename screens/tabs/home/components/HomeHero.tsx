import { memo, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { SearchBar } from "@/components/common/SearchBar";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

type HomeHeroProps = {
  search: string;
  notificationCount: number;
  onSearchChange: (text: string) => void;
  onSubmitSearch: () => void;
  onPostListing: () => void;
  onBrowseListings: () => void;
};

export const HomeHero = memo(function HomeHero({
  search,
  notificationCount,
  onSearchChange,
  onSubmitSearch,
  onPostListing,
  onBrowseListings,
}: HomeHeroProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.hero}>
      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeText}>{t("home.heroEyebrow")}</Text>
      </View>
      <Text style={styles.heroTitle}>{t("home.heroTitle")}</Text>
      <Text style={styles.heroSubtitle}>{t("home.heroSubtitle")}</Text>

      <View style={styles.heroSearch}>
        <SearchBar
          value={search}
          onChange={onSearchChange}
          placeholder={t("home.heroSearchPlaceholder")}
          onSubmit={onSubmitSearch}
          notificationCount={notificationCount}
        />
      </View>

      <View style={styles.heroActions}>
        <TouchableOpacity style={styles.heroPrimaryAction} activeOpacity={0.9} onPress={onPostListing}>
          <Text style={styles.heroPrimaryActionText}>{t("home.heroPostListing")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.heroSecondaryAction} activeOpacity={0.9} onPress={onBrowseListings}>
          <Text style={styles.heroSecondaryActionText}>{t("home.heroBrowseListings")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.heroTrustRow}>
        <View style={styles.heroTrustItem}>
          <Text style={styles.heroTrustText}>{t("home.heroTrustSafe")}</Text>
        </View>
        <View style={styles.heroTrustItem}>
          <Text style={styles.heroTrustText}>{t("home.heroTrustFast")}</Text>
        </View>
      </View>
    </View>
  );
});

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    hero: {
      marginHorizontal: 16,
      borderRadius: 22,
      paddingTop: 18,
      paddingBottom: 18,
      backgroundColor: theme.warningBackgroundSoft,
      borderWidth: 1,
      borderColor: theme.hairline,
      overflow: "hidden",
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    heroBadge: {
      alignSelf: "flex-start",
      marginHorizontal: 18,
      marginBottom: 10,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    heroBadgeText: {
      color: theme.warningSoftText,
      fontSize: 12,
      fontWeight: "800",
    },
    heroTitle: {
      marginHorizontal: 18,
      color: theme.text,
      fontSize: 29,
      lineHeight: 36,
      fontWeight: "900",
    },
    heroSubtitle: {
      marginHorizontal: 18,
      marginTop: 8,
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 23,
      fontWeight: "500",
    },
    heroSearch: {
      marginTop: 16,
    },
    heroActions: {
      flexDirection: "row",
      gap: 10,
      marginHorizontal: 18,
      marginTop: 14,
    },
    heroPrimaryAction: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
    },
    heroPrimaryActionText: {
      color: theme.primaryForeground,
      fontSize: 14,
      fontWeight: "800",
    },
    heroSecondaryAction: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    heroSecondaryActionText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: "800",
    },
    heroTrustRow: {
      flexDirection: "row",
      gap: 10,
      marginHorizontal: 18,
      marginTop: 14,
    },
    heroTrustItem: {
      flex: 1,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    heroTrustText: {
      color: theme.text,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "800",
    },
  });
