import { DarkTheme as NavigationDarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
import { getNotificationTarget } from "@/services/notification-links";
import { BugReportFab } from "@/components/support/BugReportFab";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ErrorReporter } from "@/services/error-reporter";

const ignoredPromiseErrors = [
  "Unable to activate keep awake",
  "Unable to activate on awake",
  "VirtualizedLists should never be nested",
];

ErrorReporter.init();

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rejectionTracking = require("promise/setimmediate/rejection-tracking");
rejectionTracking.disable();
rejectionTracking.enable({
  allRejections: true,
  onUnhandled: (id: number, error: unknown) => {
    const message = String((error as { message?: string })?.message ?? error);
    if (ignoredPromiseErrors.some((text) => message.includes(text))) {
      return;
    }
    ErrorReporter.captureException(error, { rejectionId: id });
  },
  onHandled: () => {},
});

LogBox.ignoreLogs(ignoredPromiseErrors);

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
    <ErrorBoundary>
      <LocalizationProvider>
        <AppThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppPopupProvider>
                <ErrorBoundary>
                  <RootLayoutContent />
                </ErrorBoundary>
              </AppPopupProvider>
            </NotificationProvider>
          </AuthProvider>
        </AppThemeProvider>
      </LocalizationProvider>
    </ErrorBoundary>
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
  const segmentList = useMemo(() => [...segments] as string[], [segments]);
  const lastBackPressRef = useRef(0);
  const lastHomeBackPressRef = useRef(0);

  const isHomeRoute = useCallback(() => {
    return segmentList[0] === "(tabs)" && (segmentList[1] == null || segmentList[1] === "index");
  }, [segmentList]);

  const goHome = useCallback(() => {
    lastHomeBackPressRef.current = 0;
    router.replace("/(tabs)");
  }, [router]);

  const goBackOneLayer = useCallback(() => {
    const route = segmentList[0];
    const child = segmentList[1];

    if (route === "settings") {
      if (child && child !== "index") {
        router.replace("/settings");
        return;
      }
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace("/(tabs)/me");
      return;
    }

    if (route === "(tabs)") {
      if (child && child !== "index") {
        goHome();
      }
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    goHome();
  }, [goHome, router, segmentList]);

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
      const href = getNotificationTarget(data);
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
    const route = segmentList[0];
    const isPublicAuthRoute = route === "sign-in" || route === "sign-up";
    const isVerificationRoute =
      route === "verify-email" ||
      (route === "auth" && segmentList[1] === "verify-email") ||
      (route === "api" && segmentList[1] === "auth" && segmentList[2] === "verify-email");
    if (status === "authenticated" && isPublicAuthRoute) {
      router.replace("/(tabs)");
      return;
    }
    if (status === "unauthenticated" && !isPublicAuthRoute && !isVerificationRoute) {
      router.replace("/sign-in");
    }
  }, [router, segmentList, status]);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (status !== "authenticated") return false;

      const now = Date.now();

      if (isHomeRoute()) {
        const homeElapsed = now - lastHomeBackPressRef.current;
        if (homeElapsed < 1800) {
          BackHandler.exitApp();
          return true;
        }
        lastHomeBackPressRef.current = now;
        ToastAndroid.show(t("navigation.backToExit", { defaultValue: "Press back again to exit" }), ToastAndroid.SHORT);
        return true;
      }

      const elapsed = now - lastBackPressRef.current;
      if (elapsed < 700) {
        lastBackPressRef.current = 0;
        goHome();
        return true;
      }

      lastBackPressRef.current = now;
      goBackOneLayer();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [goBackOneLayer, goHome, isHomeRoute, status, t]);

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
              <Stack.Screen name="auth/verify-email" />
              <Stack.Screen name="verify-email" />
              <Stack.Screen name="api/auth/verify-email" />
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
              <Stack.Screen name="auth/verify-email" />
              <Stack.Screen name="verify-email" />
              <Stack.Screen name="api/auth/verify-email" />
            </>
          )}
        </Stack>
        <BugReportFab />
        <StatusBar style={statusStyle} translucent backgroundColor="transparent" />
      </ThemeProvider>
    </PaperProvider>
  );
}
