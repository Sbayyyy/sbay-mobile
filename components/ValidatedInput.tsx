import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { PasswordVisibilityToggle } from "@/components/form/PasswordVisibilityToggle";
import {
  MarketplaceRadius,
  MarketplaceSpacing,
  MarketplaceTypography,
} from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  type TextValidator,
  type ValidationContext,
  type ValidationIssue,
  type ValidationResult,
} from "@/validation";

type ValidatedInputProps = Omit<TextInputProps, "onChangeText"> & {
  label?: string;
  helperText?: string;
  value: string;
  onChangeText: (text: string) => void;
  validators?: TextValidator[];
  validationContext?: ValidationContext;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  showErrors?: boolean;
  showSecureTextToggle?: boolean;
  onValidationChange?: (result: ValidationResult) => void;
};

const emptyResult: ValidationResult = { valid: true, issues: [] };

export function ValidatedInput({
  label,
  helperText,
  value,
  onChangeText,
  validators = [],
  validationContext,
  validateOnBlur = true,
  validateOnChange = false,
  showErrors,
  showSecureTextToggle = true,
  onValidationChange,
  onBlur,
  secureTextEntry,
  ...rest
}: ValidatedInputProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<ValidationResult>(emptyResult);
  const [isValidating, setIsValidating] = useState(false);
  const [isSecureTextVisible, setIsSecureTextVisible] = useState(false);
  const validationRunId = useRef(0);
  const didForceValidation = useRef(false);

  const runValidation = useCallback(
    async (nextValue: string) => {
      if (!validators.length) {
        setResult(emptyResult);
        onValidationChange?.(emptyResult);
        return;
      }

      const runId = ++validationRunId.current;
      setIsValidating(true);

      let normalizedValue = nextValue;
      validators.forEach((validator) => {
        if (validator.normalize) {
          normalizedValue = validator.normalize(normalizedValue);
        }
      });

      const issues: ValidationIssue[] = [];
      for (const validator of validators) {
        const outcome = await validator.validate(normalizedValue, validationContext);
        if (!outcome.valid) {
          issues.push(...outcome.issues);
        }
      }

      if (runId !== validationRunId.current) return;

      const nextResult = { valid: issues.length === 0, issues };
      setResult(nextResult);
      onValidationChange?.(nextResult);
      setIsValidating(false);
    },
    [onValidationChange, validationContext, validators],
  );

  const handleChange = useCallback(
    (text: string) => {
      onChangeText(text);
      if (validateOnChange) {
        runValidation(text);
      }
    },
    [onChangeText, runValidation, validateOnChange],
  );

  const handleBlur = useCallback(
    (event: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
      setTouched(true);
      onBlur?.(event);
      if (validateOnBlur) {
        runValidation(value);
      }
    },
    [onBlur, runValidation, validateOnBlur, value],
  );

  const shouldShowErrors = showErrors ?? touched;
  const firstIssue = result.issues[0];
  const hasError = shouldShowErrors && !result.valid;
  const shouldRenderSecureToggle = Boolean(secureTextEntry && showSecureTextToggle);

  useEffect(() => {
    if (!showErrors) {
      didForceValidation.current = false;
      return;
    }
    if (!validators.length || didForceValidation.current) return;
    didForceValidation.current = true;
    void runValidation(value);
  }, [runValidation, showErrors, validators.length, value]);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {shouldRenderSecureToggle ? (
        <View
          style={[
            styles.input,
            styles.inputWithToggle,
            hasError && styles.inputError,
          ]}
        >
          <TextInput
            {...rest}
            value={value}
            onChangeText={handleChange}
            onBlur={handleBlur}
            placeholderTextColor={theme.inputPlaceholder}
            secureTextEntry={!isSecureTextVisible}
            style={[styles.inputField, rest.style]}
          />
          <PasswordVisibilityToggle
            isVisible={isSecureTextVisible}
            onPress={() => setIsSecureTextVisible((current) => !current)}
            color={theme.textMuted}
            style={styles.visibilityButton}
          />
        </View>
      ) : (
        <TextInput
          {...rest}
          value={value}
          onChangeText={handleChange}
          onBlur={handleBlur}
          placeholderTextColor={theme.inputPlaceholder}
          secureTextEntry={secureTextEntry}
          style={[
            styles.input,
            rest.style,
            hasError && styles.inputError,
          ]}
        />
      )}
      {hasError ? (
        <Text style={styles.errorText}>{firstIssue?.message}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : isValidating ? (
        <Text style={styles.helperText}>{t("common.validating", { defaultValue: "Validating..." })}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      gap: MarketplaceSpacing.xs,
    },
    label: {
      fontSize: MarketplaceTypography.body,
      fontWeight: "700",
      color: theme.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: MarketplaceRadius.md,
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.sm,
      fontSize: MarketplaceTypography.input,
      color: theme.text,
      backgroundColor: theme.surface,
    },
    inputWithToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: MarketplaceSpacing.sm,
      paddingVertical: 0,
      paddingRight: MarketplaceSpacing.sm,
    },
    inputField: {
      flex: 1,
      minHeight: 44,
      paddingVertical: 12,
      fontSize: MarketplaceTypography.input,
      color: theme.text,
    },
    inputError: {
      borderColor: theme.danger,
    },
    visibilityButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    helperText: {
      fontSize: 12,
      color: theme.textMuted,
    },
    errorText: {
      fontSize: 12,
      color: theme.danger,
    },
  });
