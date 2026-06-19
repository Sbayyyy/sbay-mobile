import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "@/hooks/use-app-theme";
import {
  getNotificationPreferences,
  setNotificationPreferences,
  type NotificationPreferences,
} from "@/services/notification-preferences";
import { syncPushToken } from "@/services/push-notifications";
import { ErrorReporter } from "@/services/error-reporter";
import { createSettingsStyles } from "./settingsStyles";
import { StyleSheet } from "react-native";
import { type ThemeColors } from "@/constants/theme";

const pushPreferenceKeys: ReadonlySet<keyof NotificationPreferences> = new Set([
  "pushMessages",
  "pushNewBids",
  "pushOutbidAlerts",
  "pushWonAuctions",
]);

export function NotificationsSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => ({ ...createSettingsStyles(theme), ...createLocalStyles(theme) }), [theme]);

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState<keyof NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getNotificationPreferences();
      setPrefs(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("settings.notifications.loadError", {
              defaultValue: "Unable to load notification settings.",
            }),
      );
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setError(null);
    setSaving(key);
    try {
      const saved = await setNotificationPreferences(next);
      setPrefs(saved);
      if (pushPreferenceKeys.has(key) && saved[key]) {
        void syncPushToken().catch((syncError) => {
          ErrorReporter.captureException(syncError, { context: "syncPushToken from notification settings" });
        });
      }
    } catch (err) {
      setPrefs(previous);
      const message =
        err instanceof Error
          ? err.message
          : t("settings.notifications.saveError", {
              defaultValue: "Unable to save notification settings.",
            });
      setError(message);
      Alert.alert(t("settings.notifications.saveErrorTitle", { defaultValue: "Could not save" }), message);
    } finally {
      setSaving(null);
    }
  };

  const emailItems: Array<{ key: keyof NotificationPreferences; label: string }> = [
    { key: "emailMessages", label: t("settings.notifications.emailMessages", { defaultValue: "Email messages" }) },
    { key: "emailNewBids", label: t("settings.notifications.emailNewBids", { defaultValue: "Email new bids" }) },
    { key: "emailOutbidAlerts", label: t("settings.notifications.emailOutbid", { defaultValue: "Email outbid alerts" }) },
    { key: "emailWonAuctions", label: t("settings.notifications.emailWonAuction", { defaultValue: "Email won auctions" }) },
    { key: "emailPriceDrops", label: t("settings.notifications.emailPriceDrops", { defaultValue: "Email price drops" }) },
    { key: "emailPromotions", label: t("settings.notifications.emailPromotions", { defaultValue: "Email promotions" }) },
  ];

  const pushItems: Array<{ key: keyof NotificationPreferences; label: string }> = [
    { key: "pushMessages", label: t("settings.notifications.pushMessages", { defaultValue: "Push messages" }) },
    { key: "pushNewBids", label: t("settings.notifications.pushNewBids", { defaultValue: "Push new bids" }) },
    { key: "pushOutbidAlerts", label: t("settings.notifications.pushOutbid", { defaultValue: "Push outbid alerts" }) },
    { key: "pushWonAuctions", label: t("settings.notifications.pushWonAuction", { defaultValue: "Push won auctions" }) },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t("settings.notifications.title", { defaultValue: "Notification settings" })}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!prefs ? (
        <View style={styles.loadingRow}><ActivityIndicator size="small" color={theme.primary} /></View>
      ) : (
        <View style={styles.list}>
          <Text style={styles.sectionLabel}>{t("settings.notifications.emailSection", { defaultValue: "Email" })}</Text>
          {emailItems.map((item) => (
            <View key={item.key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <Switch
                value={prefs[item.key] as boolean}
                onValueChange={(v) => void toggle(item.key, v)}
                disabled={saving === item.key}
                thumbColor={theme.surface}
                trackColor={{ false: theme.border, true: theme.primary }}
                accessibilityLabel={item.label}
              />
            </View>
          ))}
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>{t("settings.notifications.pushSection", { defaultValue: "Push" })}</Text>
          {pushItems.map((item) => (
            <View key={item.key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <Switch
                value={prefs[item.key] as boolean}
                onValueChange={(v) => void toggle(item.key, v)}
                disabled={saving === item.key}
                thumbColor={theme.surface}
                trackColor={{ false: theme.border, true: theme.primary }}
                accessibilityLabel={item.label}
              />
            </View>
          ))}
          <Text style={styles.helperText}>
            {saving
              ? t("settings.common.saving", { defaultValue: "Saving..." })
              : t("settings.notifications.synced", { defaultValue: "Preferences sync with your account." })}
          </Text>
        </View>
      )}
    </View>
  );
}

const createLocalStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    list: { gap: 16 },
    sectionLabel: { fontSize: 13, fontWeight: "800", color: theme.textMuted, textTransform: "uppercase" },
    sectionLabelSpaced: { marginTop: 10 },
    toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    toggleLabel: { fontSize: 15, color: theme.text, flex: 1 },
  });
