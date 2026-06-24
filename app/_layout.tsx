import { DarkTheme as NavigationDarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { BackHandler, LogBox, Platform } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { LocalizationProvider } from "../providers/LocalizationProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { OnboardingProvider, useOnboarding } from "@/providers/OnboardingProvider";
import { ThemeProvider as AppThemeProvider, useThemeContext } from "@/providers/ThemeProvider";
import { NotificationProvider, useNotificationContext } from "@/providers/NotificationProvider";
import { AppPopupProvider } from "@/providers/AppPopupProvider";
import { type PushNotificationData } from "@/types/notifications";
import { getNotificationTarget } from "@/services/notification-links";
import { markNotificationRead } from "@/services/notifications";
import { BugReportFab } from "@/components/support/BugReportFab";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { StartupLoadingScreen } from "@/components/common/StartupLoadingScreen";
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
            <OnboardingProvider>
              <NotificationProvider>
                <AppPopupProvider>
                  <ErrorBoundary>
                    <RootLayoutContent />
                  </ErrorBoundary>
                </AppPopupProvider>
              </NotificationProvider>
            </OnboardingProvider>
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
  const { status: onboardingStatus } = useOnboarding();
  const router = useRouter();
  const segments = useSegments();
  const segmentList = useMemo(() => [...segments] as string[], [segments]);
  const pathname = usePathname();
  const { refreshUnreadCount } = useNotificationContext();
  const pendingRouteRef = useRef<string | null>(null);

  const isHomeRoute = useCallback(() => {
    return segmentList[0] === "(tabs)" && (segmentList[1] == null || segmentList[1] === "index");
  }, [segmentList]);

  const goHome = useCallback(() => {
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

  const openNotificationTarget = useCallback(
    (data?: PushNotificationData | null) => {
      if (data?.notificationId) {
        void markNotificationRead(data.notificationId)
          .then(refreshUnreadCount)
          .catch((error) => {
            ErrorReporter.captureException(error, { context: "mark push notification read" });
          });
      }

      const href = getNotificationTarget(data);
      if (href) {
        router.replace(href);
      }
    },
    [refreshUnreadCount, router],
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
    const isOnboardingRoute = route === "onboarding";
    const isPasswordResetRoute = route === "forgot-password" || route === "reset-password";
    const isGoogleAuthRoute = route === "auth" && segmentList[1] === "google";
    const isLegacyPasswordResetRoute =
      route === "auth" && (segmentList[1] === "resetPassword" || segmentList[1] === "forgetPassword");
    const isVerificationRoute =
      route === "verify-email" ||
      (route === "auth" && segmentList[1] === "verify-email") ||
      (route === "api" && segmentList[1] === "auth" && segmentList[2] === "verify-email");
    const canBypassOnboarding =
      isOnboardingRoute ||
      isGoogleAuthRoute ||
      isVerificationRoute ||
      isPasswordResetRoute ||
      isLegacyPasswordResetRoute;
    if (
      status === "authenticated" &&
      onboardingStatus === "pending" &&
      !canBypassOnboarding
    ) {
      router.replace("/onboarding");
      return;
    }
    if (
      status === "authenticated" &&
      onboardingStatus === "completed" &&
      isOnboardingRoute
    ) {
      const pending = pendingRouteRef.current;
      pendingRouteRef.current = null;
      if (pending) {
        router.replace(pending as Parameters<typeof router.replace>[0]);
      } else {
        router.replace("/(tabs)");
      }
      return;
    }
    if (status === "authenticated" && isPublicAuthRoute) {
      const pending = pendingRouteRef.current;
      pendingRouteRef.current = null;
      if (pending) {
        router.replace(pending as Parameters<typeof router.replace>[0]);
      } else {
        router.replace("/(tabs)");
      }
      return;
    }
    if (
      status === "unauthenticated" &&
      !isPublicAuthRoute &&
      !isGoogleAuthRoute &&
      !isPasswordResetRoute &&
      !isLegacyPasswordResetRoute &&
      !isVerificationRoute
    ) {
      // Preserve the deep-link target so we can return to it after login.
      if (pathname && pathname !== "/sign-in" && pathname !== "/sign-up") {
        pendingRouteRef.current = pathname;
      }
      router.replace("/sign-in");
    }
  }, [onboardingStatus, router, segmentList, status, pathname]);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (status !== "authenticated") return false;

      if (isHomeRoute()) {
        BackHandler.exitApp();
        return true;
      }

      goBackOneLayer();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [goBackOneLayer, isHomeRoute, status]);

  if (status === "loading" || (status === "authenticated" && onboardingStatus === "loading")) {
    return (
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navigationTheme}>
          <StartupLoadingScreen colors={colors} />
          <StatusBar style="light" />
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
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="auth/google" />
              <Stack.Screen name="auth/verify-email" />
              <Stack.Screen name="verify-email" />
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="reset-password" />
              <Stack.Screen name="auth/forgetPassword" />
              <Stack.Screen name="auth/resetPassword" />
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
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="reset-password" />
              <Stack.Screen name="auth/google" />
              <Stack.Screen name="auth/forgetPassword" />
              <Stack.Screen name="auth/resetPassword" />
              <Stack.Screen name="auth/verify-email" />
              <Stack.Screen name="verify-email" />
              <Stack.Screen name="api/auth/verify-email" />
            </>
          )}
        </Stack>
        <BugReportFab />
        <StatusBar style={statusStyle} />
      </ThemeProvider>
    </PaperProvider>
  );
}
