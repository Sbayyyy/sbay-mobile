import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";
import { type BoostOption } from "@/services/monetization";

type Props = {
  visible: boolean;
  boostOptions: BoostOption[];
  onSelect: (option: BoostOption) => void;
  onClose: () => void;
};

export function BoostPlanModal({ visible, boostOptions, onSelect, onClose }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {t("monetization.chooseBoost", { defaultValue: "Choose boost length" })}
          </Text>
          <Text style={styles.subtitle}>
            {t("monetization.chooseBoostSubtitle", {
              defaultValue:
                "Payment is required first. The listing is promoted only after confirmation.",
            })}
          </Text>
          <View style={styles.grid}>
            {boostOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.choice}
                activeOpacity={0.88}
                onPress={() => onSelect(option)}
                accessibilityRole="button"
                accessibilityLabel={`${option.durationDays} days for ${option.currency} ${option.price}`}
              >
                <Text style={styles.choiceDays}>
                  {t("monetization.days", {
                    defaultValue: `${option.durationDays} days`,
                    days: option.durationDays,
                  })}
                </Text>
                <Text style={styles.choicePrice}>
                  {option.currency} {option.price}
                </Text>
                <Text style={styles.choiceMeta}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelLabel}>
              {t("profile.actions.cancel", { defaultValue: "Cancel" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    card: {
      width: "100%",
      maxWidth: 380,
      borderRadius: 18,
      backgroundColor: theme.surface,
      padding: 20,
      gap: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textMuted,
    },
    grid: {
      flexDirection: "row",
      gap: 10,
    },
    choice: {
      flex: 1,
      minHeight: 104,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceMuted,
      padding: 12,
      gap: 5,
    },
    choiceDays: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "800",
    },
    choicePrice: {
      color: theme.success,
      fontSize: 12,
      fontWeight: "700",
    },
    choiceMeta: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },
    cancelButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignSelf: "center",
    },
    cancelLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.textSecondary,
    },
  });
