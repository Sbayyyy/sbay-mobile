import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/layout/AppScreen";
import { ValidatedInput } from "@/components/ValidatedInput";
import { useAppTheme } from "@/hooks/use-app-theme";
import { register } from "@/services/auth";
import { useAuth } from "@/providers/AuthProvider";
import {
  type TextValidator,
  type ValidationContext,
  type ValidationResult,
} from "@/validation";

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

const makeUserNameValidator = (minMessage: string, maxMessage: string): TextValidator => ({
  validate: (value) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      return {
        valid: false,
        issues: [{ message: minMessage }],
      };
    }
    if (trimmed.length > 50) {
      return {
        valid: false,
        issues: [{ message: maxMessage }],
      };
    }
    return { valid: true, issues: [] };
  },
});

const makePasswordValidator = (minMessage: string, ruleMessage: string): TextValidator => ({
  validate: (value) => {
    if (value.length < 8) {
      return {
        valid: false,
        issues: [{ message: minMessage }],
      };
    }
    if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
      return {
        valid: false,
        issues: [{ message: ruleMessage }],
      };
    }
    return { valid: true, issues: [] };
  },
});

const makePhoneValidator = (message: string): TextValidator => ({
  validate: (value) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return { valid: true, issues: [] };
    }
    const digits = trimmed.replace(/[^0-9]/g, "");
    const isValid = digits.length >= 7 && digits.length <= 15;
    return isValid
      ? { valid: true, issues: [] }
      : { valid: false, issues: [{ message }] };
  },
});

const SYRIA_DISTRICTS = [
  "Damascus",
  "Rif Dimashq",
  "Aleppo",
  "Homs",
  "Hama",
  "Latakia",
  "Tartus",
  "Idlib",
  "Deir ez-Zor",
  "Raqqa",
  "Hasakah",
  "Daraa",
  "As-Suwayda",
  "Quneitra",
  "Other",
] as const;

type DistrictId = (typeof SYRIA_DISTRICTS)[number] | "";

const districtOptions = SYRIA_DISTRICTS.map((district) => ({
  id: district,
  label: district,
}));

const makeConfirmPasswordValidator = (password: string, message: string): TextValidator => ({
  validate: (value) => {
    return value === password
      ? { valid: true, issues: [] }
      : { valid: false, issues: [{ message }] };
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

export default function SignUpScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState<DistrictId>("");
  const [districtMenuVisible, setDistrictMenuVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [nameResult, setNameResult] = useState<ValidationResult>({
    valid: false,
    issues: [],
  });
  const [emailResult, setEmailResult] = useState<ValidationResult>({
    valid: false,
    issues: [],
  });
  const [phoneResult, setPhoneResult] = useState<ValidationResult>({
    valid: false,
    issues: [],
  });
  const [districtResult, setDistrictResult] = useState<ValidationResult>({
    valid: true,
    issues: [],
  });
  const [passwordResult, setPasswordResult] = useState<ValidationResult>({
    valid: false,
    issues: [],
  });
  const [confirmResult, setConfirmResult] = useState<ValidationResult>({
    valid: false,
    issues: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameValidators = useMemo(
    () => [
      makeRequiredValidator(t("auth.signUp.validation.nameRequired", { defaultValue: "User name is required" })),
      makeUserNameValidator(
        t("auth.signUp.validation.nameMin", { defaultValue: "User name must be at least 2 characters" }),
        t("auth.signUp.validation.nameMax", { defaultValue: "User name must be 50 characters or less" }),
      ),
    ],
    [t],
  );
  const emailValidators = useMemo(
    () => [
      makeRequiredValidator(t("auth.signUp.validation.emailRequired", { defaultValue: "Email is required" })),
      makeEmailValidator(t("auth.signUp.validation.emailInvalid", { defaultValue: "Enter a valid email address" })),
    ],
    [t],
  );
  const phoneValidators = useMemo(
    () => [makePhoneValidator(t("auth.signUp.validation.phoneInvalid", { defaultValue: "Enter a valid phone number" }))],
    [t],
  );
  const districtValidators = useMemo(() => [], []);
  const passwordValidators = useMemo(
    () => [
      makeRequiredValidator(t("auth.signUp.validation.passwordRequired", { defaultValue: "Password is required" })),
      makePasswordValidator(
        t("auth.signUp.validation.passwordMin", { defaultValue: "Password must be at least 8 characters" }),
        t("auth.signUp.validation.passwordRule", {
          defaultValue: "Password must include uppercase, lowercase, and a number",
        }),
      ),
    ],
    [t],
  );
  const confirmValidators = useMemo(
    () => [
      makeRequiredValidator(t("auth.signUp.validation.confirmRequired", { defaultValue: "Confirm password is required" })),
      makeConfirmPasswordValidator(
        password,
        t("auth.signUp.validation.confirmMismatch", { defaultValue: "Passwords do not match" }),
      ),
    ],
    [password, t],
  );

  const nameContext = useMemo<ValidationContext>(
    () => ({ field: "name", label: t("auth.signUp.nameLabel", { defaultValue: "User name" }) }),
    [t],
  );
  const emailContext = useMemo<ValidationContext>(
    () => ({ field: "email", label: t("auth.signUp.emailLabel", { defaultValue: "Email" }) }),
    [t],
  );
  const phoneContext = useMemo<ValidationContext>(
    () => ({ field: "phone", label: t("auth.signUp.phoneLabel", { defaultValue: "Phone number" }) }),
    [t],
  );
  const districtContext = useMemo<ValidationContext>(
    () => ({ field: "district", label: t("auth.signUp.cityLabel", { defaultValue: "City" }) }),
    [t],
  );
  const passwordContext = useMemo<ValidationContext>(
    () => ({ field: "password", label: t("auth.signUp.passwordLabel", { defaultValue: "Password" }) }),
    [t],
  );
  const confirmContext = useMemo<ValidationContext>(
    () => ({ field: "confirmPassword", label: t("auth.signUp.confirmLabel", { defaultValue: "Confirm password" }) }),
    [t],
  );

  const handleDistrictChange = useCallback(
    (nextDistrict: DistrictId) => {
      setDistrict(nextDistrict);
      setDistrictMenuVisible(false);
      runValidators(nextDistrict, districtValidators, districtContext)
        .then(setDistrictResult)
        .catch(() => {});
    },
    [districtContext, districtValidators],
  );

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setShowErrors(true);
    setApiError(null);

    const [
      nextNameResult,
      nextEmailResult,
      nextPhoneResult,
      nextDistrictResult,
      nextPasswordResult,
      nextConfirmResult,
    ] = await Promise.all([
      runValidators(name, nameValidators, nameContext),
      runValidators(email, emailValidators, emailContext),
      runValidators(phone, phoneValidators, phoneContext),
      runValidators(district, districtValidators, districtContext),
      runValidators(password, passwordValidators, passwordContext),
      runValidators(confirmPassword, confirmValidators, confirmContext),
    ]);

    setNameResult(nextNameResult);
    setEmailResult(nextEmailResult);
    setPhoneResult(nextPhoneResult);
    setDistrictResult(nextDistrictResult);
    setPasswordResult(nextPasswordResult);
    setConfirmResult(nextConfirmResult);

    if (
      !nextNameResult.valid ||
      !nextEmailResult.valid ||
      !nextPhoneResult.valid ||
      !nextPasswordResult.valid ||
      !nextConfirmResult.valid
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await register({
        email,
        password,
        name,
        phone,
        city: district || undefined,
      });
      if (response.token) {
        await signIn(response.token);
        return;
      }
      router.replace({
        pathname: "/sign-in",
        params: { registered: "1" },
      });
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : t("auth.signUp.errors.unable", { defaultValue: "Unable to sign up. Try again." }),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    confirmContext,
    confirmPassword,
    confirmValidators,
    email,
    emailContext,
    emailValidators,
    phone,
    phoneContext,
    phoneValidators,
    district,
    districtContext,
    districtValidators,
    isSubmitting,
    name,
    nameContext,
    nameValidators,
    password,
    passwordContext,
    passwordValidators,
    router,
    signIn,
    t,
  ]);

  const canSubmit =
    nameResult.valid &&
    emailResult.valid &&
    phoneResult.valid &&
    passwordResult.valid &&
    confirmResult.valid &&
    !isSubmitting;

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
          nestedScrollEnabled
        >
        <View style={styles.header}>
          <Text style={styles.title}>{t("auth.signUp.title", { defaultValue: "Create account" })}</Text>
          <Text style={styles.subtitle}>
            {t("auth.signUp.subtitle", { defaultValue: "Add your details to get started with SBay." })}
          </Text>
        </View>

        <View style={styles.form}>
          <ValidatedInput
            label={t("auth.signUp.nameRequiredLabel", { defaultValue: "User name *" })}
            helperText={t("auth.signUp.nameHint", {
              defaultValue: "Use 2 to 50 characters. This is the name other users will see.",
            })}
            value={name}
            onChangeText={setName}
            validators={nameValidators}
            validationContext={nameContext}
            placeholder={t("auth.signUp.namePlaceholder", { defaultValue: "Enter your user name" })}
            showErrors={showErrors}
            onValidationChange={setNameResult}
            validateOnChange
            onFocus={() => setDistrictMenuVisible(false)}
          />

          <ValidatedInput
            label={t("auth.signUp.emailRequiredLabel", { defaultValue: "Email *" })}
            helperText={t("auth.signUp.emailHint", { defaultValue: "Use a valid email like name@example.com." })}
            value={email}
            onChangeText={setEmail}
            validators={emailValidators}
            validationContext={emailContext}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t("auth.signUp.emailPlaceholder", { defaultValue: "name@example.com" })}
            showErrors={showErrors}
            onValidationChange={setEmailResult}
            validateOnChange
            onFocus={() => setDistrictMenuVisible(false)}
          />

          <ValidatedInput
            label={t("auth.signUp.phoneLabel", { defaultValue: "Phone number" })}
            helperText={t("auth.signUp.phoneHint", {
              defaultValue: "Optional. Use 7 to 15 digits, with country code if needed.",
            })}
            value={phone}
            onChangeText={setPhone}
            validators={phoneValidators}
            validationContext={phoneContext}
            keyboardType="phone-pad"
            placeholder={t("auth.signUp.phonePlaceholder", { defaultValue: "Enter your phone number" })}
            showErrors={showErrors}
            onValidationChange={setPhoneResult}
            validateOnChange
            onFocus={() => setDistrictMenuVisible(false)}
          />

          <View style={styles.menuField}>
            <Text style={styles.label}>{t("auth.signUp.cityLabel", { defaultValue: "City" })}</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setDistrictMenuVisible((prev) => !prev)}
              style={styles.menuButton}
            >
              <Text style={styles.menuButtonLabel}>
                {district || t("auth.signUp.cityPlaceholder", { defaultValue: "Select a city" })}
              </Text>
              <Text style={styles.menuChevron}>
                {districtMenuVisible ? "^" : "v"}
              </Text>
            </TouchableOpacity>
            <Modal
              visible={districtMenuVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setDistrictMenuVisible(false)}
            >
              <Pressable
                style={styles.modalBackdrop}
                onPress={() => setDistrictMenuVisible(false)}
              >
                <Pressable style={styles.modalCard} onPress={() => {}}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t("auth.signUp.cityPickerTitle", { defaultValue: "Select a city" })}</Text>
                  </View>
                  <FlatList
                    data={districtOptions}
                    keyExtractor={(item) => item.id}
                    style={styles.modalList}
                    contentContainerStyle={styles.menuListContent}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => {
                      const isActive = item.id === district;
                      return (
                        <TouchableOpacity
                          onPress={() => handleDistrictChange(item.id as DistrictId)}
                          style={[
                            styles.menuItem,
                            isActive && styles.menuItemActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.menuItemLabel,
                              isActive && styles.menuItemLabelActive,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </Pressable>
              </Pressable>
            </Modal>
          </View>
          {showErrors && !districtResult.valid ? (
            <Text style={styles.errorText}>
              {districtResult.issues[0]?.message ?? t("auth.signUp.validation.cityInvalid", { defaultValue: "City is invalid" })}
            </Text>
          ) : null}

          <ValidatedInput
            label={t("auth.signUp.passwordRequiredLabel", { defaultValue: "Password *" })}
            helperText={t("auth.signUp.passwordHint", {
              defaultValue: "Use at least 8 characters with uppercase, lowercase, and a number.",
            })}
            value={password}
            onChangeText={setPassword}
            validators={passwordValidators}
            validationContext={passwordContext}
            secureTextEntry
            placeholder={t("auth.signUp.passwordPlaceholder", { defaultValue: "Create a password" })}
            showErrors={showErrors}
            onValidationChange={setPasswordResult}
            validateOnChange
            onFocus={() => setDistrictMenuVisible(false)}
          />

          <ValidatedInput
            label={t("auth.signUp.confirmRequiredLabel", { defaultValue: "Confirm password *" })}
            helperText={t("auth.signUp.confirmHint", { defaultValue: "Re-enter the same password exactly." })}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            validators={confirmValidators}
            validationContext={confirmContext}
            secureTextEntry
            placeholder={t("auth.signUp.confirmPlaceholder", { defaultValue: "Re-enter your password" })}
            showErrors={showErrors}
            onValidationChange={setConfirmResult}
            validateOnChange
            onFocus={() => setDistrictMenuVisible(false)}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityHint={
            canSubmit
              ? undefined
              : t("auth.signUp.submitHint", { defaultValue: "Fill out the required fields to create your account." })
          }
        >
          <Text style={styles.submitLabel}>
            {isSubmitting
              ? t("auth.signUp.submitting", { defaultValue: "Creating account..." })
              : t("auth.signUp.submit", { defaultValue: "Sign up" })}
          </Text>
        </TouchableOpacity>
        {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace("/sign-in")}
        >
          <Text style={styles.secondaryLabel}>
            {t("auth.signUp.existingAccount", { defaultValue: "Already have an account? Sign in" })}
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
    secondaryLabel: {
      color: theme.primary,
      fontWeight: "600",
    },
    menuField: {
      gap: 6,
      position: "relative",
      zIndex: 10,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    menuButton: {
      borderRadius: 12,
      borderColor: theme.border,
      borderWidth: 1,
      backgroundColor: theme.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    menuButtonLabel: {
      color: theme.text,
      fontSize: 15,
      textAlign: "left",
      flex: 1,
    },
    menuChevron: {
      color: theme.textMuted,
      fontSize: 18,
      marginLeft: 12,
    },
    menuDropdown: {
      display: "none",
    },
    menuList: {
      maxHeight: 220,
    },
    menuListContent: {
      paddingVertical: 6,
    },
    menuItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      marginHorizontal: 8,
      marginVertical: 4,
    },
    menuItemActive: {
      backgroundColor: theme.chipActiveBackground,
    },
    menuItemLabel: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "600",
    },
    menuItemLabelActive: {
      color: theme.chipActiveText,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.35)",
      padding: 20,
      justifyContent: "center",
    },
    modalCard: {
      borderRadius: 18,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      maxHeight: "70%",
      overflow: "hidden",
      shadowColor: theme.shadow,
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    modalHeader: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surfaceMuted,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    modalList: {
      maxHeight: 360,
    },
  });

