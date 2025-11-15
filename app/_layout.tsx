import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect, useMemo } from "react";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { LocalizationProvider } from "../providers/LocalizationProvider";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <LocalizationProvider>
      <RootLayoutContent />
    </LocalizationProvider>
  );
}

function RootLayoutContent() {
  const colors: ThemeColors = useAppTheme();
  const statusStyle: "light" | "dark" = "dark";
  const { t } = useTranslation();

  const paperTheme = useMemo(() => {
    return {
      ...MD3LightTheme,
      colors: {
        ...MD3LightTheme.colors,
        primary: colors.primary,
        background: colors.background,
        surface: colors.surface,
        onSurface: colors.text,
        outline: colors.border,
      },
    };
  }, [colors]);

  const navigationTheme = useMemo(() => {
    return {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.navigationBackground,
        border: colors.navigationBorder,
        text: colors.text,
      },
    };
  }, [colors]);

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(colors.navigationBackground).catch(() => {});
    NavigationBar.setButtonStyleAsync("dark").catch(() => {});
  }, [colors.navigationBackground]);

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
              title: t("navigation.modalTitle"),
            }}
          />
        </Stack>
        <StatusBar style={statusStyle} translucent backgroundColor="transparent" />
      </ThemeProvider>
    </PaperProvider>
  );
}
