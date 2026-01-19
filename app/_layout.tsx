import { DarkTheme as NavigationDarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, LogBox, View } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { LocalizationProvider } from "../providers/LocalizationProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ThemeProvider as AppThemeProvider, useThemeContext } from "@/providers/ThemeProvider";

const ignoredPromiseErrors = [
  "Unable to activate keep awake",
  "Unable to activate on awake",
  "VirtualizedLists should never be nested",
];

const rejectionTracking = require("promise/setimmediate/rejection-tracking");
rejectionTracking.disable();
rejectionTracking.enable({
  allRejections: true,
  onUnhandled: (id: number, error: unknown) => {
    const message = String((error as { message?: string })?.message ?? error);
    if (ignoredPromiseErrors.some((text) => message.includes(text))) {
      return;
    }
    console.warn(`Unhandled promise rejection (${id})`, error);
  },
  onHandled: () => {},
});

LogBox.ignoreLogs(ignoredPromiseErrors);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const unstable_settings = {
  anchor: "sign-in",
};

export default function RootLayout() {
  return (
    <LocalizationProvider>
      <AppThemeProvider>
        <AuthProvider>
          <RootLayoutContent />
        </AuthProvider>
      </AppThemeProvider>
    </LocalizationProvider>
  );
}

function RootLayoutContent() {
  const colors: ThemeColors = useAppTheme();
  const { isDark } = useThemeContext();
  const statusStyle: "light" | "dark" = isDark ? "light" : "dark";
  const { t } = useTranslation();
  const { status } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const paperTheme = useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        surface: colors.surface,
        onSurface: colors.text,
        outline: colors.border,
      },
    };
  }, [colors, isDark]);

  const navigationTheme = useMemo(() => {
    const base = isDark ? NavigationDarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.navigationBackground,
        border: colors.navigationBorder,
        text: colors.text,
      },
      dark: isDark,
    };
  }, [colors, isDark]);

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(colors.navigationBackground).catch(() => {});
    NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark").catch(() => {});
  }, [colors.navigationBackground, isDark]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        chatId?: string;
      };
      if (data?.chatId) {
        router.push(`/chats/thread/${data.chatId}`);
      }
    });
    return () => {
      sub.remove();
    };
  }, [router]);

  useEffect(() => {
    if (status === "loading") return;
    const route = segments[0];
    const inAuth = route === "sign-in" || route === "sign-up";
    if (status === "authenticated" && inAuth) {
      router.replace("/(tabs)");
      return;
    }
    if (status === "unauthenticated" && !inAuth) {
      router.replace("/sign-in");
    }
  }, [router, segments, status]);

  if (status === "loading") {
    return (
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navigationTheme}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
          <StatusBar style={statusStyle} translucent backgroundColor="transparent" />
        </ThemeProvider>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navigationTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {status === "authenticated" ? (
            <>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="modal"
                options={{
                  presentation: "modal",
                  title: t("navigation.modalTitle"),
                }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="sign-up" />
            </>
          )}
        </Stack>
        <StatusBar style={statusStyle} translucent backgroundColor="transparent" />
      </ThemeProvider>
    </PaperProvider>
  );
}
