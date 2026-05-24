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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useURL } from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/layout/AppScreen";
import { ValidatedInput } from "@/components/ValidatedInput";
import { useAppTheme } from "@/hooks/use-app-theme";
import { resetPassword } from "@/services/auth";
import { type TextValidator, type ValidationContext, type ValidationResult } from "@/validation";

const requiredValidator: TextValidator = {
  validate: (value, context) => (
    value.trim()
      ? { valid: true, issues: [] }
      : { valid: false, issues: [{ message: `${context?.label ?? "This field"} is required` }] }
  ),
};

const passwordValidator: TextValidator = {
  validate: (value) => {
    if (value.length < 8) {
      return { valid: false, issues: [{ message: "Password must be at least 8 characters" }] };
    }
    if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
      return {
        valid: false,
        issues: [{ message: "Password must include uppercase, lowercase, and a number" }],
      };
    }
    return { valid: true, issues: [] };
  },
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token: queryToken } = useLocalSearchParams<{ token?: string | string[] }>();
  const currentUrl = useURL();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const token = useMemo(() => {
    if (currentUrl) {
      const hashIndex = currentUrl.indexOf("#");
      if (hashIndex >= 0) {
        const hashToken = new URLSearchParams(currentUrl.slice(hashIndex + 1)).get("token");
        if (hashToken) return hashToken;
      }
    }
    return Array.isArray(queryToken) ? queryToken[0] : queryToken;
  }, [currentUrl, queryToken]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validators = useMemo(() => [requiredValidator, passwordValidator], []);
  const passwordContext = useMemo<ValidationContext>(() => ({ field: "password", label: "Password" }), []);
  const confirmContext = useMemo<ValidationContext>(() => ({ field: "confirmPassword", label: "Confirm password" }), []);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setShowErrors(true);
    setError(null);

    if (!token) {
      setError(t("resetPassword.invalidToken", { defaultValue: "This reset link is missing or invalid." }));
      return;
    }

    const [nextPassword, nextConfirm] = await Promise.all([
      runValidators(password, validators, passwordContext),
      runValidators(confirmPassword, validators, confirmContext),
    ]);

    if (password !== confirmPassword) {
      nextConfirm.valid = false;
      nextConfirm.issues = [{ message: t("resetPassword.passwordMismatch", { defaultValue: "Passwords do not match." }) }];
    }

    if (!nextPassword.valid || !nextConfirm.valid) return;

    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword: password });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("resetPassword.error", { defaultValue: "Unable to reset your password." }),
      );
    } finally {
      setSubmitting(false);
    }
  }, [confirmContext, confirmPassword, password, passwordContext, submitting, t, token, validators]);

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
              {success
                ? t("resetPassword.success", { defaultValue: "Password updated" })
                : t("resetPassword.title", { defaultValue: "Create a new password" })}
            </Text>
            <Text style={styles.subtitle}>
              {success
                ? t("resetPassword.successDescription", { defaultValue: "You can now sign in with your new password." })
                : t("resetPassword.description", { defaultValue: "Choose a password with uppercase, lowercase, and a number." })}
            </Text>
          </View>

          {!success ? (
            <>
              <ValidatedInput
                label={t("resetPassword.passwordLabel", { defaultValue: "New password *" })}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError(null);
                }}
                validators={validators}
                validationContext={passwordContext}
                secureTextEntry
                showErrors={showErrors}
                validateOnChange
              />
              <ValidatedInput
                label={t("resetPassword.confirmLabel", { defaultValue: "Confirm password *" })}
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setError(null);
                }}
                validators={validators}
                validationContext={confirmContext}
                secureTextEntry
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
                    {t("resetPassword.submit", { defaultValue: "Reset password" })}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace("/sign-in")}>
            <Text style={styles.secondaryLabel}>
              {t("resetPassword.backToLogin", { defaultValue: "Back to sign in" })}
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
    container: { flexGrow: 1, padding: 20, gap: 18, backgroundColor: theme.background, justifyContent: "center" },
    header: { gap: 8 },
    title: { fontSize: 26, fontWeight: "700", color: theme.text },
    subtitle: { fontSize: 15, color: theme.textMuted, lineHeight: 21 },
    submitButton: { borderRadius: 16, backgroundColor: theme.primary, paddingVertical: 16, alignItems: "center" },
    disabledButton: { opacity: 0.7 },
    submitLabel: { fontSize: 16, fontWeight: "700", color: theme.primaryForeground },
    errorText: { fontSize: 14, color: theme.danger, textAlign: "center", fontWeight: "600" },
    secondaryButton: { alignItems: "center", paddingVertical: 10 },
    secondaryLabel: { color: theme.primary, fontWeight: "700" },
  });
