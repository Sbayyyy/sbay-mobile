import { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useLocalization } from "../../hooks/use-localization";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function SettingsDetail() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL } = useLocalization();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const title = useMemo(() => {
    if (!section) return t("settings.title");
    const key = `settings.items.${section}`;
    return t(key, { defaultValue: t("settings.title") });
  }, [section, t]);

  const backIcon = isRTL ? ">" : "<";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>{backIcon}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>{title}</Text>
          <Text style={styles.body}>
            {t("settings.placeholderBody", { section: title })}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    backIcon: {
      fontSize: 22,
      color: theme.text,
      lineHeight: 22,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
    },
    card: {
      borderRadius: 18,
      backgroundColor: theme.surface,
      padding: 20,
      gap: 12,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    heading: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
    },
    body: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
    },
  });
