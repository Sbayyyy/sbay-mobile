import { DarkTheme as NavigationDarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { type Href, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, BackHandler, LogBox, Platform, ToastAndroid, View } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { LocalizationProvider } from "../providers/LocalizationProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ThemeProvider as AppThemeProvider, useThemeContext } from "@/providers/ThemeProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { AppPopupProvider } from "@/providers/AppPopupProvider";
import { type PushNotificationData } from "@/types/notifications";

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

function getNotificationHref(data?: PushNotificationData | null): Href | null {
  if (data?.chatId) {
    return `/chats/thread/${data.chatId}` as Href;
  }
  if (data?.href) {
    return data.href as Href;
  }
  return null;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
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
          <NotificationProvider>
            <AppPopupProvider>
              <RootLayoutContent />
            </AppPopupProvider>
          </NotificationProvider>
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

  const openNotificationTarget = useCallback(
    (data?: PushNotificationData | null) => {
      const href = getNotificationHref(data);
      if (href) {
        router.replace(href);
      }
    },
    [router],
  );

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotificationTarget(
        response.notification.request.content.data as PushNotificationData | undefined,
      );
    });
    return () => {
      sub.remove();
    };
  }, [openNotificationTarget]);

  useEffect(() => {
    let active = true;
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!active || !response) return;
        openNotificationTarget(
          response.notification.request.content.data as PushNotificationData | undefined,
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [openNotificationTarget]);

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

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;
    let lastBackPress = 0;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (status !== "authenticated") return false;

      const route = segments[0];
      const isTabsRoot = route === "(tabs)" || route == null;
      if (!isTabsRoot) {
        router.replace("/(tabs)");
        return true;
      }

      const now = Date.now();
      if (now - lastBackPress < 1800) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPress = now;
      ToastAndroid.show(t("navigation.backToExit", { defaultValue: "Press back again to exit" }), ToastAndroid.SHORT);
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [router, segments, status, t]);

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
