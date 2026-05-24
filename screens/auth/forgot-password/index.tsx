import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/layout/AppScreen";
import { ValidatedInput } from "@/components/ValidatedInput";
import { useAppTheme } from "@/hooks/use-app-theme";
import { forgotPassword } from "@/services/auth";
import { type TextValidator, type ValidationContext, type ValidationResult } from "@/validation";

const requiredValidator: TextValidator = {
  validate: (value, context) => {
    if (!value.trim()) {
      return { valid: false, issues: [{ message: `${context?.label ?? "This field"} is required` }] };
    }
    return { valid: true, issues: [] };
  },
};

const emailValidator: TextValidator = {
  validate: (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ? { valid: true, issues: [] }
      : { valid: false, issues: [{ message: "Enter a valid email address" }] },
};

async function runValidators(
  value: string,
  validators: TextValidator[],
  context: ValidationContext,
): Promise<ValidationResult> {
  const issues = [];
  for (const validator of validators) {
    const result = await validator.validate(value, context);
    if (!result.valid) issues.push(...result.issues);
  }
  return { valid: issues.length === 0, issues };
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validators = useMemo(() => [requiredValidator, emailValidator], []);
  const context = useMemo<ValidationContext>(() => ({ field: "email", label: "Email" }), []);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setShowErrors(true);
    setError(null);
    setMessage(null);

    const result = await runValidators(email, validators, context);
    if (!result.valid) return;

    setSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      setMessage(
        t("forgotPassword.successMessage", {
          defaultValue: "If an account exists for this email, a reset link has been sent.",
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("forgotPassword.error", { defaultValue: "Unable to request a reset email." }),
      );
    } finally {
      setSubmitting(false);
    }
  }, [context, email, submitting, t, validators]);

  return (
    <AppScreen edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Math.max(insets.top, 8)}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {t("forgotPassword.title", { defaultValue: "Reset your password" })}
            </Text>
            <Text style={styles.subtitle}>
              {t("forgotPassword.description", {
                defaultValue: "Enter your email and we will send you a password reset link.",
              })}
            </Text>
          </View>

          <ValidatedInput
            label={t("forgotPassword.emailLabel", { defaultValue: "Email *" })}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
              setMessage(null);
            }}
            validators={validators}
            validationContext={context}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="name@example.com"
            showErrors={showErrors}
            validateOnChange
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text style={styles.submitLabel}>
                {t("forgotPassword.submit", { defaultValue: "Send reset link" })}
              </Text>
            )}
          </TouchableOpacity>

          {message ? <Text style={styles.successText}>{message}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/sign-in")}>
            <Text style={styles.secondaryLabel}>
              {t("forgotPassword.backToLogin", { defaultValue: "Back to sign in" })}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { flexGrow: 1, padding: 20, gap: 20, backgroundColor: theme.background, justifyContent: "center" },
    header: { gap: 8 },
    title: { fontSize: 26, fontWeight: "700", color: theme.text },
    subtitle: { fontSize: 15, color: theme.textMuted, lineHeight: 21 },
    submitButton: { borderRadius: 16, backgroundColor: theme.primary, paddingVertical: 16, alignItems: "center" },
    disabledButton: { opacity: 0.7 },
    submitLabel: { fontSize: 16, fontWeight: "700", color: theme.primaryForeground },
    successText: { fontSize: 14, color: theme.success, textAlign: "center", fontWeight: "600" },
    errorText: { fontSize: 14, color: theme.danger, textAlign: "center", fontWeight: "600" },
    secondaryButton: { alignItems: "center", paddingVertical: 10 },
    secondaryLabel: { color: theme.primary, fontWeight: "700" },
  });
