import { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useLocalization } from "@/hooks/use-localization";
import { type ThemeColors } from "@/constants/theme";
import { ProfileSection } from "./components/ProfileSection";
import { AccountSection } from "./components/AccountSection";
import { NotificationsSection } from "./components/NotificationsSection";
import { ThemeSection } from "./components/ThemeSection";
import { HelpSection } from "./components/HelpSection";
import { PaymentsSection } from "./components/PaymentsSection";
import { AboutSection } from "./components/AboutSection";

const implementedSections = ["profile", "account", "payments", "notifications", "theme", "about", "help"];

export default function SettingsDetail() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL } = useLocalization();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const title = useMemo(() => {
    if (!section) return t("settings.title");
    return t(`settings.items.${section}`, { defaultValue: t("settings.title") });
  }, [section, t]);

  const backIcon = isRTL ? ">" : "<";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/settings")}
            accessibilityRole="button"
            accessibilityLabel={t("navigation.back", { defaultValue: "Back" })}
          >
            <Text style={styles.backIcon}>{backIcon}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {section === "profile" && <ProfileSection />}
          {section === "account" && <AccountSection />}
          {section === "payments" && <PaymentsSection />}
          {section === "notifications" && <NotificationsSection />}
          {section === "theme" && <ThemeSection />}
          {section === "about" && <AboutSection />}
          {section === "help" && <HelpSection />}
          {!implementedSections.includes(section ?? "") && (
            <View style={styles.comingSoonCard}>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonBadgeText}>
                  {t("settings.common.comingSoon", { defaultValue: "Coming soon" })}
                </Text>
              </View>
              <Text style={styles.heading}>{title}</Text>
              <Text style={styles.body}>
                {t("settings.placeholderBody", { section: title })}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, padding: 20, backgroundColor: theme.background },
    scrollContent: { paddingBottom: 40, gap: 16 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
    backButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surfaceMuted, alignItems: "center", justifyContent: "center" },
    backIcon: { fontSize: 22, color: theme.text, lineHeight: 22 },
    headerTitle: { fontSize: 20, fontWeight: "700", color: theme.text },
    comingSoonCard: { borderRadius: 18, backgroundColor: theme.surface, padding: 20, gap: 12, borderWidth: 1, borderColor: theme.border },
    comingSoonBadge: { alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceMuted, paddingHorizontal: 10, paddingVertical: 4 },
    comingSoonBadgeText: { fontSize: 11, fontWeight: "700", color: theme.textMuted },
    heading: { fontSize: 20, fontWeight: "700", color: theme.text },
    body: { fontSize: 15, color: theme.textSecondary, lineHeight: 22 },
  });
