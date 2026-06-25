import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";
import { getMyProfile } from "@/services/user";
import {
  createBugReport,
  getBugReportDeviceInfo,
  type BugReportSeverity,
} from "@/services/bug-reports";
import { sendContactMessage } from "@/services/contact";
import { getFriendlyErrorMessage } from "@/services/account-status-errors";
import { createSettingsStyles } from "./settingsStyles";

export function HelpSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(
    () => ({ ...createSettingsStyles(theme), ...createLocalStyles(theme) }),
    [theme],
  );

  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const [bugForm, setBugForm] = useState({
    title: "", description: "", screen: "", steps: "", expected: "", actual: "",
    severity: "medium" as BugReportSeverity,
  });
  const [bugSaving, setBugSaving] = useState(false);
  const [bugSuccess, setBugSuccess] = useState<string | null>(null);
  const [bugError, setBugError] = useState<string | null>(null);
  const severityLabels: Record<BugReportSeverity, string> = {
    low: t("settings.help.severityLow", { defaultValue: "Low" }),
    medium: t("settings.help.severityMedium", { defaultValue: "Medium" }),
    high: t("settings.help.severityHigh", { defaultValue: "High" }),
    critical: t("settings.help.severityCritical", { defaultValue: "Critical" }),
  };

  const prefillProfile = useCallback(async () => {
    try {
      const profile = await getMyProfile();
      setContactForm((prev) => ({
        ...prev,
        name: prev.name || profile.displayName || profile.email || "",
        email: prev.email || profile.email || "",
      }));
    } catch {
      // best-effort prefill
    }
  }, []);

  useEffect(() => { void prefillProfile(); }, [prefillProfile]);

  const handleContactSubmit = async () => {
    if (contactSaving) return;
    const next = {
      name: contactForm.name.trim(),
      email: contactForm.email.trim(),
      subject: contactForm.subject.trim(),
      message: contactForm.message.trim(),
    };
    if (!next.name || !next.email || !next.subject || !next.message) {
      setContactError(t("settings.help.contactRequired", { defaultValue: "Fill out all contact fields." }));
      return;
    }
    setContactSaving(true);
    setContactError(null);
    setContactSuccess(null);
    try {
      const deviceInfo = getBugReportDeviceInfo();
      await sendContactMessage({ ...next, pageUrl: "sbay://settings/help", userAgent: deviceInfo.userAgent });
      setContactSuccess(t("settings.help.contactSuccess", { defaultValue: "Message sent. Support will follow up soon." }));
      setContactForm((prev) => ({ ...prev, subject: "", message: "" }));
    } catch (err) {
      setContactError(getFriendlyErrorMessage(err, t("settings.help.contactError", { defaultValue: "Unable to send message. Please try again." })));
    } finally {
      setContactSaving(false);
    }
  };

  const handleBugSubmit = async () => {
    if (bugSaving) return;
    if (!bugForm.title.trim() || !bugForm.description.trim()) {
      setBugError(t("settings.help.bugRequired", { defaultValue: "Add a bug title and description." }));
      return;
    }
    setBugSaving(true);
    setBugError(null);
    setBugSuccess(null);
    try {
      await createBugReport({
        title: bugForm.title.trim(),
        description: bugForm.description.trim(),
        steps: bugForm.steps.trim() || undefined,
        expected: bugForm.expected.trim() || undefined,
        actual: bugForm.actual.trim() || undefined,
        pageUrl: `sbay://${(bugForm.screen.trim() || "settings/help").replace(/^\/+/, "")}`,
        severity: bugForm.severity,
      });
      setBugSuccess(t("settings.help.bugSuccess", { defaultValue: "Bug report sent. Thank you." }));
      setBugForm((prev) => ({ ...prev, title: "", description: "", steps: "", expected: "", actual: "" }));
    } catch (err) {
      setBugError(getFriendlyErrorMessage(err, t("settings.help.bugError", { defaultValue: "Unable to submit bug report. Please try again." })));
    } finally {
      setBugSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={80}>
      {/* Contact support */}
      <View style={[styles.card, styles.cardSpacing]}>
        <Text style={styles.heading}>{t("settings.help.contactTitle", { defaultValue: "Contact support" })}</Text>
        <Text style={styles.body}>{t("settings.help.contactBody", { defaultValue: "Send a message to the support team." })}</Text>

        {[
          { field: "name", label: "contact.form.name", placeholder: "contact.form.namePlaceholder", defaultLabel: "Name", defaultPlaceholder: "Your name", keyboardType: undefined, autoCapitalize: undefined },
          { field: "email", label: "contact.form.email", placeholder: "contact.form.emailPlaceholder", defaultLabel: "Email", defaultPlaceholder: "you@example.com", keyboardType: "email-address" as const, autoCapitalize: "none" as const },
          { field: "subject", label: "contact.form.subject", placeholder: "contact.form.subjectPlaceholder", defaultLabel: "Subject", defaultPlaceholder: "How can we help?", keyboardType: undefined, autoCapitalize: undefined },
        ].map(({ field, label, placeholder, defaultLabel, defaultPlaceholder, keyboardType, autoCapitalize }) => (
          <View key={field} style={styles.formGroup}>
            <Text style={styles.label}>{t(label, { defaultValue: defaultLabel })}</Text>
            <TextInput
              style={styles.input}
              value={contactForm[field as keyof typeof contactForm]}
              onChangeText={(v) => setContactForm((prev) => ({ ...prev, [field]: v }))}
              placeholder={t(placeholder, { defaultValue: defaultPlaceholder })}
              placeholderTextColor={theme.inputPlaceholder}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
            />
          </View>
        ))}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t("contact.form.message", { defaultValue: "Message" })}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={contactForm.message}
            onChangeText={(v) => setContactForm((prev) => ({ ...prev, message: v }))}
            placeholder={t("contact.form.messagePlaceholder", { defaultValue: "Tell us what happened." })}
            placeholderTextColor={theme.inputPlaceholder}
            multiline
          />
        </View>
        {contactError ? <Text style={styles.errorText}>{contactError}</Text> : null}
        {contactSuccess ? <Text style={styles.successText}>{contactSuccess}</Text> : null}
        <TouchableOpacity
          style={[styles.primaryButton, contactSaving && styles.buttonDisabled]}
          onPress={handleContactSubmit}
          disabled={contactSaving}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonLabel}>
            {contactSaving
              ? t("contact.form.submitting", { defaultValue: "Sending..." })
              : t("contact.form.submit", { defaultValue: "Send message" })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bug report */}
      <View style={styles.card}>
        <Text style={styles.heading}>{t("settings.help.bugTitle", { defaultValue: "Report a bug" })}</Text>
        <Text style={styles.body}>{t("settings.help.bugBody", { defaultValue: "Send a technical report with mobile device details." })}</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t("settings.help.bugSummary", { defaultValue: "Title" })}</Text>
          <TextInput
            style={styles.input}
            value={bugForm.title}
            onChangeText={(v) => setBugForm((p) => ({ ...p, title: v }))}
            placeholder={t("settings.help.bugSummaryPlaceholder", { defaultValue: "Short bug summary" })}
            placeholderTextColor={theme.inputPlaceholder}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t("settings.help.bugScreen", { defaultValue: "Screen" })}</Text>
          <TextInput
            style={styles.input}
            value={bugForm.screen}
            onChangeText={(v) => setBugForm((p) => ({ ...p, screen: v }))}
            placeholder={t("settings.help.bugScreenPlaceholder", { defaultValue: "settings/help" })}
            placeholderTextColor={theme.inputPlaceholder}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t("settings.help.bugSeverity", { defaultValue: "Severity" })}</Text>
          <View style={styles.segmentRow}>
            {(["low", "medium", "high", "critical"] as BugReportSeverity[]).map((severity) => {
              const active = bugForm.severity === severity;
              return (
                <TouchableOpacity
                  key={severity}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  onPress={() => setBugForm((p) => ({ ...p, severity }))}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                    {severityLabels[severity]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        {(["description", "steps", "expected", "actual"] as const).map((field) => {
          const labelKeys = {
            description: { key: "settings.help.bugDescription", def: "Description", placeholderKey: "settings.help.bugDescriptionPlaceholder", placeholderDef: "What did you expect, and what happened instead?" },
            steps: { key: "settings.help.bugSteps", def: "Steps to reproduce", placeholderKey: "settings.help.bugStepsPlaceholder", placeholderDef: "1. Open... 2. Tap..." },
            expected: { key: "settings.help.bugExpected", def: "Expected", placeholderKey: "settings.help.bugExpectedPlaceholder", placeholderDef: "What should happen?" },
            actual: { key: "settings.help.bugActual", def: "Actual", placeholderKey: "settings.help.bugActualPlaceholder", placeholderDef: "What happened instead?" },
          }[field];
          return (
            <View key={field} style={styles.formGroup}>
              <Text style={styles.label}>{t(labelKeys.key, { defaultValue: labelKeys.def })}</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={bugForm[field]}
                onChangeText={(v) => setBugForm((p) => ({ ...p, [field]: v }))}
                placeholder={t(labelKeys.placeholderKey, { defaultValue: labelKeys.placeholderDef })}
                placeholderTextColor={theme.inputPlaceholder}
                multiline
              />
            </View>
          );
        })}
        {bugError ? <Text style={styles.errorText}>{bugError}</Text> : null}
        {bugSuccess ? <Text style={styles.successText}>{bugSuccess}</Text> : null}
        <TouchableOpacity
          style={[styles.primaryButton, bugSaving && styles.buttonDisabled]}
          onPress={handleBugSubmit}
          disabled={bugSaving}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonLabel}>
            {bugSaving
              ? t("settings.help.bugSubmitting", { defaultValue: "Submitting..." })
              : t("settings.help.bugSubmit", { defaultValue: "Submit bug report" })}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createLocalStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    cardSpacing: { marginBottom: 16 },
    segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    segmentButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceMuted },
    segmentButtonActive: { borderColor: theme.primary, backgroundColor: theme.primaryMuted },
    segmentLabel: { fontSize: 13, fontWeight: "700", color: theme.textMuted },
    segmentLabelActive: { color: theme.primary },
  });
