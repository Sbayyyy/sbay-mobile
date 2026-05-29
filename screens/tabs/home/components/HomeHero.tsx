import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

export const HomeHero = memo(function HomeHero() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.hero}>
      <View style={styles.heroCopy}>
        <Text style={styles.heroEyebrow}>{t("home.heroEyebrow")}</Text>
        <Text style={styles.heroTitle}>{t("home.heroTitle")}</Text>
        <Text style={styles.heroSubtitle}>{t("home.heroSubtitle")}</Text>
      </View>
    </View>
  );
});

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    hero: {
      marginHorizontal: 20,
      borderRadius: 18,
      padding: 16,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    heroCopy: {
      gap: 6,
    },
    heroEyebrow: {
      color: theme.textMuted,
      fontSize: 13,
      fontWeight: "700",
    },
    heroTitle: {
      color: theme.text,
      fontSize: 22,
      lineHeight: 29,
      fontWeight: "800",
    },
    heroSubtitle: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500",
    },
  });
