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

import { AppScreen } from "@/components/layout/AppScreen";
import { ValidatedInput } from "@/components/ValidatedInput";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  type TextValidator,
  type ValidationContext,
  type ValidationResult,
} from "@/validation";
import { login } from "@/services/auth";
import { getMyProfile } from "@/services/user";

const requiredValidator: TextValidator = {
  validate: (value, context) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      const label = context?.label ?? "This field";
      return {
        valid: false,
        issues: [{ message: `${label} is required` }],
      };
    }
    return { valid: true, issues: [] };
  },
};

const emailValidator: TextValidator = {
  validate: (value) => {
    const trimmed = value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return isValid
      ? { valid: true, issues: [] }
      : { valid: false, issues: [{ message: "Enter a valid email address" }] };
  },
};

const passwordValidator: TextValidator = {
  validate: (value) => {
    const trimmed = value.trim();
    return trimmed.length >= 8
      ? { valid: true, issues: [] }
      : {
          valid: false,
          issues: [{ message: "Password must be at least 8 characters" }],
        };
  },
};

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
    () => [requiredValidator, emailValidator],
    [],
  );
  const passwordValidators = useMemo(
    () => [requiredValidator, passwordValidator],
    [],
  );

  const emailContext = useMemo<ValidationContext>(
    () => ({ field: "email", label: "Email" }),
    [],
  );
  const passwordContext = useMemo<ValidationContext>(
    () => ({ field: "password", label: "Password" }),
    [],
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
      await login({ email, password });
      await getMyProfile();
      router.replace("/(tabs)");
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Unable to sign in. Try again.",
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
    router,
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
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Use your email and password to access your account.
          </Text>
        </View>

      <View style={styles.form}>
          <ValidatedInput
            label="Email *"
            value={email}
            onChangeText={setEmail}
            validators={emailValidators}
            validationContext={emailContext}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="name@example.com"
            showErrors={showErrors}
            onValidationChange={setEmailResult}
            validateOnChange
          />

          <ValidatedInput
            label="Password *"
            value={password}
            onChangeText={setPassword}
            validators={passwordValidators}
            validationContext={passwordContext}
            secureTextEntry
            placeholder="Enter your password"
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
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Text>
      </TouchableOpacity>
      {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/sign-up")}
      >
        <Text style={styles.secondaryLabel}>Create an account</Text>
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
    secondaryLabel: {
      color: theme.primary,
      fontWeight: "600",
    },
  });
