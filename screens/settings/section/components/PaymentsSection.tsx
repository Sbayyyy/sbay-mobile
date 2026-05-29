import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { WEB_BASE_URL } from "@/services/config";
import { getBoostOptions, type BoostOption } from "@/services/monetization";
import { useAppTheme } from "@/hooks/use-app-theme";
import { createSettingsStyles } from "./settingsStyles";

function formatPrice(option: BoostOption) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: option.currency,
      maximumFractionDigits: option.price % 1 === 0 ? 0 : 2,
    }).format(option.price);
  } catch {
    return `${option.price} ${option.currency}`;
  }
}

export function PaymentsSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(
    () => ({ ...createSettingsStyles(theme), ...createLocalStyles(theme) }),
    [theme],
  );

  const [loading, setLoading] = useState(false);
  const [boostOptions, setBoostOptions] = useState<BoostOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadBoostOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBoostOptions(await getBoostOptions());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.payments.loadError", { defaultValue: "Unable to load payment options." }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadBoostOptions();
  }, [loadBoostOptions]);

  const openBillingHelp = useCallback(() => {
    void Linking.openURL(`${WEB_BASE_URL}/help`);
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t("settings.payments.title", { defaultValue: "Payments" })}</Text>
      <Text style={styles.body}>
        {t("settings.payments.subtitle", {
          defaultValue: "Paid boosts are created at checkout and activated after the provider confirms payment.",
        })}
      </Text>

      <View style={styles.infoGrid}>
        <View style={styles.infoTile}>
          <Text style={styles.infoValue}>{t("settings.payments.providerValue", { defaultValue: "Checkout" })}</Text>
          <Text style={styles.infoLabel}>{t("settings.payments.providerLabel", { defaultValue: "Secure provider" })}</Text>
        </View>
        <View style={styles.infoTile}>
          <Text style={styles.infoValue}>{t("settings.payments.savedCardsValue", { defaultValue: "None" })}</Text>
          <Text style={styles.infoLabel}>{t("settings.payments.savedCardsLabel", { defaultValue: "Cards stored in app" })}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{t("settings.payments.boostPackages", { defaultValue: "Boost packages" })}</Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : error ? (
        <View style={styles.inlineState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={loadBoostOptions} accessibilityRole="button">
            <Text style={styles.secondaryButtonLabel}>{t("settings.payments.retry", { defaultValue: "Retry" })}</Text>
          </TouchableOpacity>
        </View>
      ) : boostOptions.length > 0 ? (
        <View style={styles.packageList}>
          {boostOptions.map((option) => (
            <View key={option.id} style={styles.packageRow}>
              <View style={styles.packageText}>
                <Text style={styles.packageName}>{option.name}</Text>
                <Text style={styles.packageMeta}>
                  {t("settings.payments.durationDays", {
                    defaultValue: "{{count}} days",
                    count: option.durationDays,
                  })}
                </Text>
              </View>
              <Text style={styles.packagePrice}>{formatPrice(option)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.helperText}>
          {t("settings.payments.noPackages", { defaultValue: "No paid packages are available right now." })}
        </Text>
      )}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>{t("settings.payments.howTitle", { defaultValue: "How payments work" })}</Text>
        <Text style={styles.noticeBody}>
          {t("settings.payments.howBody", {
            defaultValue: "Choose a boost while publishing or from My listings. The app opens checkout, then your listing updates automatically after confirmation.",
          })}
        </Text>
      </View>

      <TouchableOpacity style={styles.secondaryButton} onPress={openBillingHelp} accessibilityRole="button">
        <Text style={styles.secondaryButtonLabel}>
          {t("settings.payments.billingHelp", { defaultValue: "Open billing help" })}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createLocalStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    sectionLabel: { marginTop: 4, fontSize: 14, fontWeight: "700", color: theme.text },
    infoGrid: { flexDirection: "row", gap: 10 },
    infoTile: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      padding: 12,
      gap: 4,
    },
    infoValue: { color: theme.text, fontSize: 16, fontWeight: "700" },
    infoLabel: { color: theme.textMuted, fontSize: 12, lineHeight: 16 },
    inlineState: { gap: 10 },
    packageList: { borderWidth: 1, borderColor: theme.border, borderRadius: 14, overflow: "hidden" },
    packageRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.hairline,
      backgroundColor: theme.background,
    },
    packageText: { flex: 1, gap: 2 },
    packageName: { color: theme.text, fontSize: 15, fontWeight: "700" },
    packageMeta: { color: theme.textMuted, fontSize: 12 },
    packagePrice: { color: theme.primary, fontSize: 15, fontWeight: "800" },
    notice: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceMuted,
      padding: 14,
      gap: 6,
    },
    noticeTitle: { color: theme.text, fontSize: 14, fontWeight: "700" },
    noticeBody: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
  });
