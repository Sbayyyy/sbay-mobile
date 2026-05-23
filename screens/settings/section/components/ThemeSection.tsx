import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useThemeContext } from "@/providers/ThemeProvider";
import { type ThemeColors } from "@/constants/theme";
import { createSettingsStyles } from "./settingsStyles";

export function ThemeSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { mode, setMode } = useThemeContext();
  const styles = useMemo(
    () => ({ ...createSettingsStyles(theme), ...createLocalStyles(theme) }),
    [theme],
  );

  const options = [
    { value: "light" as const, label: t("settings.theme.light", { defaultValue: "Light" }) },
    { value: "dark" as const, label: t("settings.theme.dark", { defaultValue: "Dark" }) },
    { value: "coffee" as const, label: t("settings.theme.coffee", { defaultValue: "Coffee" }) },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t("settings.theme.title", { defaultValue: "Theme" })}</Text>
      <Text style={styles.body}>{t("settings.theme.subtitle", { defaultValue: "Choose your app appearance." })}</Text>
      <View style={styles.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.option, mode === opt.value && styles.optionActive]}
            onPress={() => setMode(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === opt.value }}
          >
            <Text style={[styles.optionLabel, mode === opt.value && styles.optionLabelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createLocalStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: "row", gap: 12, marginTop: 8, flexWrap: "wrap" },
    option: {
      minWidth: 110,
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      backgroundColor: theme.surfaceMuted,
    },
    optionActive: { borderColor: theme.primary, backgroundColor: theme.primaryMuted },
    optionLabel: { fontSize: 14, fontWeight: "600", color: theme.text },
    optionLabelActive: { color: theme.primary },
  });
