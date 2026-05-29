import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/layout/AppScreen";
import { ValidatedInput } from "@/components/ValidatedInput";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  type TextValidator,
  type ValidationContext,
  type ValidationResult,
} from "@/validation";
import { login } from "@/services/auth";
import { useAuth } from "@/providers/AuthProvider";

const makeRequiredValidator = (message: string): TextValidator => ({
  validate: (value, context) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return {
        valid: false,
        issues: [{ message: message || `${context?.label ?? "This field"} is required` }],
      };
    }
    return { valid: true, issues: [] };
  },
});

const makeEmailValidator = (message: string): TextValidator => ({
  validate: (value) => {
    const trimmed = value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return isValid
      ? { valid: true, issues: [] }
      : { valid: false, issues: [{ message }] };
  },
});

const makePasswordValidator = (message: string): TextValidator => ({
  validate: (value) => {
    const trimmed = value.trim();
    return trimmed.length >= 8
      ? { valid: true, issues: [] }
      : {
          valid: false,
          issues: [{ message }],
        };
  },
});

async function runValidators(
  value: string,
  validators: TextValidator[],
  context?: ValidationContext,
): Promise<ValidationResult> {
  let normalized = value;
  validators.forEach((validator) => {
    if (validator.normalize) {
      normalized = validator.normalize(normalized);
    }
  });

  const issues = [];
  for (const validator of validators) {
    const result = await validator.validate(normalized, context);
    if (!result.valid) {
      issues.push(...result.issues);
    }
  }

  return { valid: issues.length === 0, issues };
}

export default function SignInScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { t } = useTranslation();
  const { registered, verified } = useLocalSearchParams<{
    registered?: string;
    verified?: string;
  }>();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<ValidationResult>({
    valid: false,
    issues: [],
  });
  const [passwordResult, setPasswordResult] = useState<ValidationResult>({
    valid: false,
    issues: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailValidators = useMemo(
    () => [
      makeRequiredValidator(t("auth.signIn.validation.emailRequired", { defaultValue: "Email is required" })),
      makeEmailValidator(t("auth.signIn.validation.emailInvalid", { defaultValue: "Enter a valid email address" })),
    ],
    [t],
  );
  const passwordValidators = useMemo(
    () => [
      makeRequiredValidator(t("auth.signIn.validation.passwordRequired", { defaultValue: "Password is required" })),
      makePasswordValidator(t("auth.signIn.validation.passwordMin", { defaultValue: "Password must be at least 8 characters" })),
    ],
    [t],
  );

  const emailContext = useMemo<ValidationContext>(
    () => ({ field: "email", label: t("auth.signIn.emailLabel", { defaultValue: "Email" }) }),
    [t],
  );
  const passwordContext = useMemo<ValidationContext>(
    () => ({ field: "password", label: t("auth.signIn.passwordLabel", { defaultValue: "Password" }) }),
    [t],
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setShowErrors(true);
    setApiError(null);

    const [nextEmailResult, nextPasswordResult] = await Promise.all([
      runValidators(email, emailValidators, emailContext),
      runValidators(password, passwordValidators, passwordContext),
    ]);

    setEmailResult(nextEmailResult);
    setPasswordResult(nextPasswordResult);

    if (!nextEmailResult.valid || !nextPasswordResult.valid) return;

    setIsSubmitting(true);
    try {
      const response = await login({ email, password });
      await signIn(response.token);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : t("auth.signIn.errors.unable", { defaultValue: "Unable to sign in. Try again." }),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    email,
    emailContext,
    emailValidators,
    isSubmitting,
    password,
    passwordContext,
    passwordValidators,
    signIn,
  ]);

  const canSubmit = !isSubmitting;

  return (
    <AppScreen edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Math.max(insets.top, 8)}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <Text style={styles.title}>{t("auth.signIn.title", { defaultValue: "Sign in" })}</Text>
          <Text style={styles.subtitle}>
            {t("auth.signIn.subtitle", { defaultValue: "Use your email and password to access your account." })}
          </Text>
        </View>

      {verified === "1" ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>
            {t("auth.signIn.verifiedSuccess", { defaultValue: "Email verified. Sign in to continue." })}
          </Text>
        </View>
      ) : registered === "1" ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>
            {t("auth.signIn.registeredSuccess", {
              defaultValue: "Account created. Check your inbox for the verification email, then sign in.",
            })}
          </Text>
        </View>
      ) : verified === "0" ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            {t("auth.signIn.verifyFailed", { defaultValue: "We could not verify that link. Please request a new email." })}
          </Text>
        </View>
      ) : null}

      <View style={styles.form}>
          <ValidatedInput
            label={t("auth.signIn.emailRequiredLabel", { defaultValue: "Email *" })}
            helperText={t("auth.signIn.emailHint", { defaultValue: "Use the email address you registered with." })}
            value={email}
            onChangeText={setEmail}
            validators={emailValidators}
            validationContext={emailContext}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t("auth.signIn.emailPlaceholder", { defaultValue: "name@example.com" })}
            showErrors={showErrors}
            onValidationChange={setEmailResult}
            validateOnChange
          />

          <ValidatedInput
            label={t("auth.signIn.passwordRequiredLabel", { defaultValue: "Password *" })}
            helperText={t("auth.signIn.passwordHint", { defaultValue: "Enter your account password." })}
            value={password}
            onChangeText={setPassword}
            validators={passwordValidators}
            validationContext={passwordContext}
            secureTextEntry
            placeholder={t("auth.signIn.passwordPlaceholder", { defaultValue: "Enter your password" })}
            showErrors={showErrors}
            onValidationChange={setPasswordResult}
            validateOnChange
          />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        <Text style={styles.submitLabel}>
          {isSubmitting
            ? t("auth.signIn.submitting", { defaultValue: "Signing in..." })
            : t("auth.signIn.submit", { defaultValue: "Sign in" })}
        </Text>
      </TouchableOpacity>
      {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}

      <TouchableOpacity
        style={styles.forgotButton}
        onPress={() => router.push("/forgot-password")}
      >
        <Text style={styles.forgotLabel}>
          {t("auth.signIn.forgotPassword", { defaultValue: "Forgot password?" })}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/sign-up")}
      >
        <Text style={styles.secondaryLabel}>
          {t("auth.signIn.createAccount", { defaultValue: "Create an account" })}
        </Text>
      </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    container: {
      flexGrow: 1,
      padding: 20,
      gap: 24,
      backgroundColor: theme.background,
    },
    header: {
      gap: 8,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: theme.text,
    },
    subtitle: {
      fontSize: 15,
      color: theme.textMuted,
      lineHeight: 20,
    },
    form: {
      gap: 16,
    },
    submitButton: {
      borderRadius: 16,
      backgroundColor: theme.primary,
      paddingVertical: 16,
      alignItems: "center",
      shadowColor: theme.primary,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    submitDisabled: {
      backgroundColor: theme.textSubtle,
      shadowOpacity: 0,
    },
    submitLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.primaryForeground,
    },
    errorText: {
      marginTop: 10,
      fontSize: 13,
      color: theme.danger,
      textAlign: "center",
    },
    secondaryButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    forgotButton: {
      paddingVertical: 4,
      alignItems: "center",
    },
    forgotLabel: {
      color: theme.primary,
      fontWeight: "700",
    },
    secondaryLabel: {
      color: theme.primary,
      fontWeight: "600",
    },
    successBanner: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      padding: 12,
    },
    successBannerText: {
      color: theme.success,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },
    errorBanner: {
      borderRadius: 14,
      backgroundColor: theme.dangerBackground,
      padding: 12,
    },
    errorBannerText: {
      color: theme.danger,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },
  });
