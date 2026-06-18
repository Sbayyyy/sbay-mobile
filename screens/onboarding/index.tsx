import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/layout/AppScreen";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useOnboarding } from "@/providers/OnboardingProvider";

type WalkthroughStep = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
};

export default function OnboardingScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { completeOnboarding } = useOnboarding();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  const steps = useMemo<WalkthroughStep[]>(
    () => [
      {
        icon: "search-outline",
        title: t("onboarding.steps.discover.title", { defaultValue: "Discover local listings" }),
        body: t("onboarding.steps.discover.body", {
          defaultValue: "Search by category, price, and location to find what is nearby.",
        }),
      },
      {
        icon: "heart-outline",
        title: t("onboarding.steps.save.title", { defaultValue: "Save what matters" }),
        body: t("onboarding.steps.save.body", {
          defaultValue: "Favorite listings so you can compare options and come back later.",
        }),
      },
      {
        icon: "add-circle-outline",
        title: t("onboarding.steps.sell.title", { defaultValue: "Post in minutes" }),
        body: t("onboarding.steps.sell.body", {
          defaultValue: "Add photos, pricing, and details when you are ready to sell.",
        }),
      },
      {
        icon: "chatbubbles-outline",
        title: t("onboarding.steps.chat.title", { defaultValue: "Chat with confidence" }),
        body: t("onboarding.steps.chat.body", {
          defaultValue: "Message sellers, track replies, and keep marketplace conversations in one place.",
        }),
      },
    ],
    [t],
  );

  const activeStep = steps[activeIndex];
  const isLastStep = activeIndex === steps.length - 1;

  const finishOnboarding = useCallback(async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    await completeOnboarding();
  }, [completeOnboarding, isFinishing]);

  const handlePrimaryAction = useCallback(() => {
    if (isLastStep) {
      void finishOnboarding();
      return;
    }
    setActiveIndex((current) => Math.min(current + 1, steps.length - 1));
  }, [finishOnboarding, isLastStep, steps.length]);

  const handleBack = useCallback(() => {
    setActiveIndex((current) => Math.max(current - 1, 0));
  }, []);

  return (
    <AppScreen edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            {t("onboarding.brand", { defaultValue: "SBay" })}
          </Text>
          <TouchableOpacity
            onPress={finishOnboarding}
            disabled={isFinishing}
            accessibilityRole="button"
          >
            <Text style={styles.skip}>
              {t("onboarding.skip", { defaultValue: "Skip" })}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.iconShell}>
            <Ionicons name={activeStep.icon} size={68} color={theme.primary} />
          </View>
          <View style={styles.progressRow}>
            {steps.map((step, index) => (
              <View
                key={step.icon}
                style={[
                  styles.progressDot,
                  index === activeIndex && styles.progressDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>
            {t("onboarding.stepCount", {
              defaultValue: "Step {{current}} of {{total}}",
              current: activeIndex + 1,
              total: steps.length,
            })}
          </Text>
          <Text style={styles.title}>{activeStep.title}</Text>
          <Text style={styles.body}>{activeStep.body}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              activeIndex === 0 && styles.hiddenButton,
            ]}
            onPress={handleBack}
            disabled={activeIndex === 0 || isFinishing}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={18} color={theme.primary} />
            <Text style={styles.secondaryLabel}>
              {t("onboarding.back", { defaultValue: "Back" })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isFinishing && styles.disabledButton]}
            onPress={handlePrimaryAction}
            disabled={isFinishing}
            accessibilityRole="button"
          >
            {isFinishing ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <>
                <Text style={styles.primaryLabel}>
                  {isLastStep
                    ? t("onboarding.finish", { defaultValue: "Start browsing" })
                    : t("onboarding.next", { defaultValue: "Next" })}
                </Text>
                <Ionicons
                  name={isLastStep ? "checkmark" : "chevron-forward"}
                  size={18}
                  color={theme.primaryForeground}
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flexGrow: 1,
      padding: 24,
      gap: 28,
      backgroundColor: theme.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    brand: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.text,
    },
    skip: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.primary,
    },
    hero: {
      flex: 1,
      minHeight: 280,
      alignItems: "center",
      justifyContent: "center",
      gap: 28,
    },
    iconShell: {
      width: 176,
      height: 176,
      borderRadius: 88,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryMuted,
      borderWidth: 1,
      borderColor: theme.border,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.surfaceMuted,
    },
    progressDotActive: {
      width: 28,
      backgroundColor: theme.primary,
    },
    copy: {
      gap: 10,
    },
    eyebrow: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.primary,
      textTransform: "uppercase",
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.text,
      lineHeight: 34,
    },
    body: {
      fontSize: 16,
      color: theme.textMuted,
      lineHeight: 24,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    secondaryButton: {
      minWidth: 104,
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 16,
      backgroundColor: theme.surface,
    },
    hiddenButton: {
      opacity: 0,
    },
    secondaryLabel: {
      color: theme.primary,
      fontWeight: "700",
      fontSize: 15,
    },
    primaryButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 18,
      backgroundColor: theme.primary,
    },
    disabledButton: {
      opacity: 0.7,
    },
    primaryLabel: {
      color: theme.primaryForeground,
      fontWeight: "800",
      fontSize: 16,
    },
  });
