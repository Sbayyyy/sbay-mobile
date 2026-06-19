import { useCallback, useMemo } from "react";
import { I18nManager, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { WEB_BASE_URL } from "@/services/config";
import { createSettingsStyles } from "./settingsStyles";

type InfoRowProps = {
  label: string;
  value: string;
  styles: ReturnType<typeof createLocalStyles>;
};

function InfoRow({ label, value, styles }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const appConfig = Constants.expoConfig;

export function AboutSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(
    () => ({ ...createSettingsStyles(theme), ...createLocalStyles(theme) }),
    [theme],
  );

  const openUrl = useCallback((path: string) => {
    void Linking.openURL(`${WEB_BASE_URL}${path}`);
  }, []);

  const version = appConfig?.version ?? "1.0.0";
  const appName = appConfig?.name ?? "SBay";
  const packageName =
    Platform.OS === "android"
      ? appConfig?.android?.package
      : appConfig?.ios?.bundleIdentifier;
  const buildNumber =
    Platform.OS === "android"
      ? String(appConfig?.android?.versionCode ?? "")
      : appConfig?.ios?.buildNumber ?? "";
  const infoLinks = [
    { label: t("settings.about.openWebsite", { defaultValue: "Open website" }), path: "" },
    { label: t("settings.about.howItWorks", { defaultValue: "How it works" }), path: "/how-it-works" },
    { label: t("settings.about.buyerProtection", { defaultValue: "Buyer protection" }), path: "/buyer-protection" },
    { label: t("settings.about.sellerGuide", { defaultValue: "Seller guide" }), path: "/seller-guide" },
    { label: t("settings.about.sellerProtection", { defaultValue: "Seller protection" }), path: "/seller-protection" },
    { label: t("settings.about.fees", { defaultValue: "Fees and commissions" }), path: "/fees" },
    { label: t("settings.about.privacy", { defaultValue: "Privacy policy" }), path: "/privacy-policy" },
    { label: t("settings.about.terms", { defaultValue: "Terms of service" }), path: "/terms" },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.brand}>{appName}</Text>
      <Text style={styles.body}>
        {t("settings.about.subtitle", {
          defaultValue: "A marketplace for discovering listings, chatting with sellers, and managing your own sales.",
        })}
      </Text>

      <View style={styles.infoBox}>
        <InfoRow label={t("settings.about.version", { defaultValue: "Version" })} value={version} styles={styles} />
        {buildNumber ? (
          <InfoRow label={t("settings.about.build", { defaultValue: "Build" })} value={buildNumber} styles={styles} />
        ) : null}
        {packageName ? (
          <InfoRow label={t("settings.about.appId", { defaultValue: "App ID" })} value={packageName} styles={styles} />
        ) : null}
        <InfoRow
          label={t("settings.about.website", { defaultValue: "Website" })}
          value={WEB_BASE_URL.replace(/^https?:\/\//, "")}
          styles={styles}
        />
      </View>

      <Text style={styles.sectionTitle}>
        {t("settings.about.resources", { defaultValue: "Resources" })}
      </Text>
      <View style={styles.linkGroup}>
        {infoLinks.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.linkRow}
            onPress={() => openUrl(item.path)}
            accessibilityRole="button"
          >
            <Text style={styles.linkLabel}>{item.label}</Text>
            <Text style={styles.linkChevron}>{I18nManager.isRTL ? "<" : ">"}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createLocalStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    brand: { color: theme.text, fontSize: 26, fontWeight: "800" },
    sectionTitle: { color: theme.text, fontSize: 15, fontWeight: "800", marginTop: 4 },
    infoBox: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      overflow: "hidden",
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.hairline,
    },
    infoLabel: { flex: 1, color: theme.textMuted, fontSize: 13, fontWeight: "600" },
    infoValue: {
      flex: 1.3,
      color: theme.text,
      fontSize: 13,
      fontWeight: "700",
      textAlign: I18nManager.isRTL ? "left" : "right",
    },
    linkGroup: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.hairline,
      backgroundColor: theme.background,
    },
    linkLabel: { color: theme.text, fontSize: 15, fontWeight: "700" },
    linkChevron: { color: theme.textSubtle, fontSize: 24, lineHeight: 24 },
  });
