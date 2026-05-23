import { StyleSheet, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";
import { type Listing } from "@/services/listings";

type Props = {
  listings: Listing[];
};

export function MeOverviewTab({ listings }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>
          {t("profile.activity.title", { defaultValue: "Recent activity" })}
        </Text>
        <Text style={styles.sectionMeta}>
          {t("profile.activity.last7Days", { defaultValue: "Last 7 days" })}
        </Text>
      </View>
      {listings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {t("profile.activity.emptyTitle", { defaultValue: "No activity yet" })}
          </Text>
          <Text style={styles.emptySubtitle}>
            {t("profile.activity.emptySubtitle", {
              defaultValue: "Create your first listing to get started.",
            })}
          </Text>
        </View>
      ) : (
        <View style={styles.activityRow}>
          <View style={styles.activityIcon}>
            <FontAwesome name="tag" size={16} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.activityTitle}>
              {t("profile.activity.listingPublished", { defaultValue: "Listing published" })}
            </Text>
            <Text style={styles.activitySubtitle}>{listings[0].title}</Text>
          </View>
          <Text style={styles.activityMeta}>
            {t("profile.activity.justNow", { defaultValue: "Just now" })}
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      gap: 12,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    sectionMeta: {
      fontSize: 12,
      color: theme.textMuted,
    },
    activityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    activityIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    activityTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    activitySubtitle: {
      fontSize: 12,
      color: theme.textMuted,
    },
    activityMeta: {
      fontSize: 12,
      color: theme.textSubtle,
    },
    emptyState: {
      paddingVertical: 24,
      alignItems: "center",
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: "center",
      paddingHorizontal: 20,
    },
  });
