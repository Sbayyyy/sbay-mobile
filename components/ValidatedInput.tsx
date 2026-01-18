import { useCallback, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

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
  onValidationChange,
  onBlur,
  ...rest
}: ValidatedInputProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<ValidationResult>(emptyResult);
  const [isValidating, setIsValidating] = useState(false);
  const validationRunId = useRef(0);

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

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...rest}
        value={value}
        onChangeText={handleChange}
        onBlur={handleBlur}
        placeholderTextColor={theme.inputPlaceholder}
        style={[
          styles.input,
          rest.style,
          shouldShowErrors && !result.valid && styles.inputError,
        ]}
      />
      {shouldShowErrors && !result.valid ? (
        <Text style={styles.errorText}>{firstIssue?.message}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : isValidating ? (
        <Text style={styles.helperText}>Validating...</Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      gap: 6,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
      backgroundColor: theme.surface,
    },
    inputError: {
      borderColor: theme.danger,
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
