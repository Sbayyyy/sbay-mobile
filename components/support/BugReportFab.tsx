import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/providers/AuthProvider";
import {
  createBugReport,
  type BugReportSeverity,
} from "@/services/bug-reports";
import { getFriendlyErrorMessage } from "@/services/account-status-errors";

const initialForm = {
  title: "",
  description: "",
  steps: "",
  expected: "",
  actual: "",
  severity: "medium" as BugReportSeverity,
};

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 49 : 56;

export function BugReportFab() {
  const { status } = useAuth();
  const pathname = usePathname();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fabBottom = insets.bottom + TAB_BAR_HEIGHT + 12;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);

  if (status !== "authenticated") return null;

  const close = () => {
    if (!saving) {
      setOpen(false);
      setError(null);
    }
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError(null);
  };

  const submit = async () => {
    if (saving) return;

    const title = form.title.trim();
    const description = form.description.trim();
    if (!title || !description) {
      setError(
        t("settings.help.bugRequired", {
          defaultValue: "Add a bug title and description.",
        }),
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await createBugReport({
        title,
        description,
        steps: form.steps.trim() || undefined,
        expected: form.expected.trim() || undefined,
        actual: form.actual.trim() || undefined,
        severity: form.severity,
        pageUrl: `sbay://${pathname.replace(/^\/+/, "") || "home"}`,
      });
      setForm(initialForm);
      setOpen(false);
      Alert.alert(
        t("settings.help.bugSuccessTitle", { defaultValue: "Bug report sent" }),
        t("settings.help.bugSuccessWithReference", {
          defaultValue: "Thank you. Reference: {{reference}}",
          reference: result.id.slice(0, 8),
        }),
      );
    } catch (err) {
      setError(
        getFriendlyErrorMessage(
          err,
          t("settings.help.bugError", {
            defaultValue: "Unable to submit bug report. Please try again.",
          }),
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        accessibilityLabel={t("settings.help.bugTitle", { defaultValue: "Report a bug" })}
        activeOpacity={0.85}
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={() => setOpen(true)}
        testID="bug-report-fab"
      >
        <Ionicons name="bug-outline" size={22} color={theme.primaryForeground} />
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={close}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.backdrop} onPress={close} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.title}>
                  {t("settings.help.bugTitle", { defaultValue: "Report a bug" })}
                </Text>
                <Text style={styles.subtitle}>
                  {t("settings.help.bugBody", {
                    defaultValue: "Send a technical report with mobile device details.",
                  })}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel={t("common.actions.cancel", { defaultValue: "Cancel" })}
                style={styles.closeButton}
                onPress={close}
                disabled={saving}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  {t("settings.help.bugSummary", { defaultValue: "Title" })}
                </Text>
                <TextInput
                  style={styles.input}
                  value={form.title}
                  onChangeText={(value) => updateField("title", value)}
                  maxLength={120}
                  placeholder={t("settings.help.bugSummaryPlaceholder", {
                    defaultValue: "Short bug summary",
                  })}
                  placeholderTextColor={theme.inputPlaceholder}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  {t("settings.help.bugDescription", { defaultValue: "Description" })}
                </Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={form.description}
                  onChangeText={(value) => updateField("description", value)}
                  maxLength={5000}
                  multiline
                  placeholder={t("settings.help.bugDescriptionPlaceholder", {
                    defaultValue: "What happened?",
                  })}
                  placeholderTextColor={theme.inputPlaceholder}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  {t("settings.help.bugSeverity", { defaultValue: "Severity" })}
                </Text>
                <View style={styles.segmentRow}>
                  {(["low", "medium", "high", "critical"] as BugReportSeverity[]).map((severity) => {
                    const active = form.severity === severity;
                    return (
                      <TouchableOpacity
                        key={severity}
                        style={[styles.segmentButton, active && styles.segmentButtonActive]}
                        onPress={() => updateField("severity", severity)}
                      >
                        <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                          {t(`settings.help.severity.${severity}`, { defaultValue: severity })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  {t("settings.help.bugSteps", { defaultValue: "Steps to reproduce" })}
                </Text>
                <TextInput
                  style={[styles.input, styles.textareaSmall]}
                  value={form.steps}
                  onChangeText={(value) => updateField("steps", value)}
                  maxLength={3000}
                  multiline
                  placeholder={t("settings.help.bugStepsPlaceholder", {
                    defaultValue: "1. Open... 2. Tap...",
                  })}
                  placeholderTextColor={theme.inputPlaceholder}
                />
              </View>

              <View style={styles.splitRow}>
                <View style={[styles.formGroup, styles.splitItem]}>
                  <Text style={styles.label}>
                    {t("settings.help.bugExpected", { defaultValue: "Expected" })}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textareaSmall]}
                    value={form.expected}
                    onChangeText={(value) => updateField("expected", value)}
                    maxLength={2000}
                    multiline
                    placeholder={t("settings.help.bugExpectedPlaceholder", {
                      defaultValue: "What should happen?",
                    })}
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                </View>

                <View style={[styles.formGroup, styles.splitItem]}>
                  <Text style={styles.label}>
                    {t("settings.help.bugActual", { defaultValue: "Actual" })}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textareaSmall]}
                    value={form.actual}
                    onChangeText={(value) => updateField("actual", value)}
                    maxLength={2000}
                    multiline
                    placeholder={t("settings.help.bugActualPlaceholder", {
                      defaultValue: "What happened instead?",
                    })}
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.submitButton, saving && styles.disabledButton]}
                onPress={submit}
                disabled={saving}
              >
                <Text style={styles.submitLabel}>
                  {saving
                    ? t("settings.help.bugSubmitting", { defaultValue: "Submitting..." })
                    : t("settings.help.bugSubmit", { defaultValue: "Submit bug report" })}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    fab: {
      position: "absolute",
      left: 16,
      bottom: 0, // overridden inline with dynamic safe-area + tab-bar offset
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.shadow,
      shadowOpacity: 0.24,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
      zIndex: 20,
    },
    modalRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.overlay,
    },
    sheet: {
      maxHeight: "88%",
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: theme.hairline,
    },
    title: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "800",
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    form: {
      padding: 18,
      gap: 14,
    },
    formGroup: {
      gap: 7,
    },
    label: {
      color: theme.text,
      fontSize: 13,
      fontWeight: "700",
    },
    input: {
      minHeight: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
      color: theme.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    textarea: {
      minHeight: 96,
      textAlignVertical: "top",
    },
    textareaSmall: {
      minHeight: 74,
      textAlignVertical: "top",
    },
    segmentRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    segmentButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    segmentButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    segmentLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    segmentLabelActive: {
      color: theme.primaryForeground,
    },
    splitRow: {
      flexDirection: "row",
      gap: 10,
    },
    splitItem: {
      flex: 1,
    },
    errorText: {
      color: theme.danger,
      fontSize: 13,
      fontWeight: "600",
    },
    submitButton: {
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    disabledButton: {
      opacity: 0.65,
    },
    submitLabel: {
      color: theme.primaryForeground,
      fontSize: 14,
      fontWeight: "800",
    },
  });
