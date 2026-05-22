import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useLocalization } from "@/hooks/use-localization";

export default function LanguageSettingsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { t } = useTranslation();
  const { availableLanguages, language, setLanguage, isRTL } = useLocalization();
  const languages = useMemo(() => Object.values(availableLanguages), [availableLanguages]);
  const backIcon = isRTL ? ">" : "<";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/settings")}>
            <Text style={styles.backIcon}>{backIcon}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("settings.language.title")}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.subtitle}>{t("settings.language.subtitle")}</Text>
          <View style={styles.card}>
            {languages.map((entry) => {
              const isActive = entry.code === language;
              return (
                <TouchableOpacity
                  key={entry.code}
                  style={[styles.languageRow, isActive && styles.languageRowActive]}
                  onPress={() => setLanguage(entry.code)}
                >
                  <View>
                    <Text style={styles.languageLabel}>{entry.label}</Text>
                    <Text style={styles.languageNative}>{entry.nativeName}</Text>
                  </View>
                  {isActive ? (
                    <FontAwesome name="check" size={16} color={theme.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.note}>{t("settings.language.rtlNote")}</Text>
        </ScrollView>
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
      gap: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
    scroll: {
      gap: 16,
      paddingBottom: 40,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textMuted,
      lineHeight: 20,
    },
    card: {
      borderRadius: 18,
      backgroundColor: theme.surface,
      padding: 4,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    languageRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 14,
    },
    languageRowActive: {
      backgroundColor: theme.surfaceMuted,
    },
    languageLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    languageNative: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
    },
    note: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
    },
  });
