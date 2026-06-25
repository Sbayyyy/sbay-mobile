import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { useAuth } from "@/providers/AuthProvider";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { isEmailVerified } from "@/services/email-verification";
import { getMyProfile, type UserProfile } from "@/services/user";

const settingsItems = [
  { id: "profile", labelKey: "settings.items.profile" },
  { id: "account", labelKey: "settings.items.account" },
  { id: "payments", labelKey: "settings.items.payments" },
  { id: "notifications", labelKey: "settings.items.notifications" },
  { id: "theme", labelKey: "settings.items.theme" },
  { id: "language", labelKey: "settings.items.language" },
  { id: "about", labelKey: "settings.items.about" },
  { id: "help", labelKey: "settings.items.help" },
] as const;

export default function SettingsHome() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { isRTL } = useLocalization();
  const backIcon = isRTL ? ">" : "<";
  const forwardIcon = isRTL ? "<" : ">";
  const { signOut, status } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const handleBack = () => {
    router.replace("/(tabs)/me");
  };

  useEffect(() => {
    let isMounted = true;
    if (status !== "authenticated") {
      setProfile(null);
      return () => {
        isMounted = false;
      };
    }
    getMyProfile()
      .then((data) => {
        if (!isMounted) return;
        setProfile(data);
      })
      .catch(() => {
        if (!isMounted) return;
        setProfile(null);
      });
    return () => {
      isMounted = false;
    };
  }, [status]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backIcon}>{backIcon}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("settings.title")}</Text>
          <View style={{ width: 32 }} />
        </View>

        {profile && !isEmailVerified(profile) ? <EmailVerificationBanner /> : null}

        <View style={styles.card}>
          {settingsItems.map((item, index) => {
            const isLast = index === settingsItems.length - 1;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.row, !isLast && styles.rowDivider]}
                onPress={() =>
                  item.id === "language"
                    ? router.replace("/settings/language")
                    : router.replace(`/settings/${item.id}`)
                }
              >
                <Text style={styles.label}>{t(item.labelKey)}</Text>
                <Text style={styles.chevron}>{forwardIcon}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await signOut();
          }}
        >
          <Text style={styles.logoutLabel}>{t("common.actions.logout")}</Text>
        </TouchableOpacity>
      </ScrollView>
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
      padding: 20,
      gap: 24,
      backgroundColor: theme.background,
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
    card: {
      borderRadius: 18,
      backgroundColor: theme.surface,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.hairline,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    chevron: {
      fontSize: 22,
      color: theme.textSubtle,
    },
    logoutButton: {
      borderRadius: 16,
      backgroundColor: theme.dangerBackground,
      paddingVertical: 16,
      alignItems: "center",
    },
    logoutLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.danger,
    },
  });
