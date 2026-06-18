import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { PasswordVisibilityToggle } from "@/components/form/PasswordVisibilityToggle";
import { useAppTheme } from "@/hooks/use-app-theme";
import { changePassword } from "@/services/auth";
import { requestAccountDeletion } from "@/services/user";
import { createSettingsStyles } from "./settingsStyles";

type PasswordInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  theme: ReturnType<typeof useAppTheme>;
  styles: ReturnType<typeof createSettingsStyles>;
};

function PasswordInput({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  theme,
  styles,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.passwordInputRow}>
      <TextInput
        style={styles.passwordInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.inputPlaceholder}
        secureTextEntry={!isVisible}
        accessibilityLabel={accessibilityLabel}
      />
      <PasswordVisibilityToggle
        isVisible={isVisible}
        onPress={() => setIsVisible((current) => !current)}
        color={theme.textMuted}
        style={styles.passwordVisibilityButton}
      />
    </View>
  );
}

export function AccountSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createSettingsStyles(theme), [theme]);

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});

  const [deletionReason, setDeletionReason] = useState("");
  const [deletionConfirm, setDeletionConfirm] = useState("");
  const [deletionSaving, setDeletionSaving] = useState(false);
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState<string | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  const handlePasswordSave = async () => {
    const nextErrors: typeof passwordErrors = {};
    const rule = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/;
    if (!passwordForm.current.trim()) {
      nextErrors.current = t("settings.security.currentRequired", { defaultValue: "Current password is required." });
    }
    if (!passwordForm.next.trim()) {
      nextErrors.next = t("settings.security.newRequired", { defaultValue: "New password is required." });
    } else if (!rule.test(passwordForm.next)) {
      nextErrors.next = t("settings.security.passwordRule", {
        defaultValue: "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      });
    }
    if (passwordForm.next !== passwordForm.confirm) {
      nextErrors.confirm = t("settings.security.confirmMismatch", { defaultValue: "Passwords do not match." });
    }
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setPasswordSaving(true);
    setPasswordError(null);
    try {
      await changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : t("settings.security.updateFailed", { defaultValue: "Unable to update password." }),
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeletionRequest = () => {
    if (deletionSaving || deletionConfirm.trim().toUpperCase() !== "DELETE") return;
    Alert.alert(
      t("settings.accountDeletion.confirmTitle", { defaultValue: "Request account deletion?" }),
      t("settings.accountDeletion.confirmBody", {
        defaultValue: "Your account will be deactivated now and permanently deleted after the scheduled grace period.",
      }),
      [
        { text: t("common.actions.cancel", { defaultValue: "Cancel" }), style: "cancel" },
        {
          text: t("settings.accountDeletion.confirmAction", { defaultValue: "Request deletion" }),
          style: "destructive",
          onPress: async () => {
            setDeletionSaving(true);
            setDeletionError(null);
            try {
              const result = await requestAccountDeletion(deletionReason);
              setScheduledDeletionAt(result.scheduledDeletionAt);
            } catch (err) {
              setDeletionError(
                err instanceof Error
                  ? err.message
                  : t("settings.accountDeletion.requestFailed", {
                      defaultValue: "Unable to request account deletion.",
                    }),
              );
            } finally {
              setDeletionSaving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={80}>
      <View style={styles.card}>
        <Text style={styles.heading}>{t("settings.security.title", { defaultValue: "Security" })}</Text>
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t("settings.security.current", { defaultValue: "Current password" })}</Text>
          <PasswordInput
            value={passwordForm.current}
            onChangeText={(v) => setPasswordForm((p) => ({ ...p, current: v }))}
            placeholder={t("settings.security.currentPlaceholder", { defaultValue: "Enter current password" })}
            accessibilityLabel={t("settings.security.current", { defaultValue: "Current password" })}
            theme={theme}
            styles={styles}
          />
          {passwordErrors.current ? <Text style={styles.errorText}>{passwordErrors.current}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t("settings.security.new", { defaultValue: "New password" })}</Text>
          <PasswordInput
            value={passwordForm.next}
            onChangeText={(v) => setPasswordForm((p) => ({ ...p, next: v }))}
            placeholder={t("settings.security.newPlaceholder", { defaultValue: "Enter new password" })}
            accessibilityLabel={t("settings.security.new", { defaultValue: "New password" })}
            theme={theme}
            styles={styles}
          />
          {passwordErrors.next ? (
            <Text style={styles.errorText}>{passwordErrors.next}</Text>
          ) : (
            <Text style={styles.helperText}>
              {t("settings.security.rule", { defaultValue: "Must include uppercase, lowercase, and a number." })}
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t("settings.security.confirm", { defaultValue: "Confirm new password" })}</Text>
          <PasswordInput
            value={passwordForm.confirm}
            onChangeText={(v) => setPasswordForm((p) => ({ ...p, confirm: v }))}
            placeholder={t("settings.security.confirmPlaceholder", { defaultValue: "Confirm new password" })}
            accessibilityLabel={t("settings.security.confirm", { defaultValue: "Confirm new password" })}
            theme={theme}
            styles={styles}
          />
          {passwordErrors.confirm ? <Text style={styles.errorText}>{passwordErrors.confirm}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, passwordSaving && styles.buttonDisabled]}
          onPress={handlePasswordSave}
          disabled={passwordSaving}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonLabel}>
            {passwordSaving
              ? t("settings.common.saving", { defaultValue: "Saving..." })
              : t("settings.security.update", { defaultValue: "Update password" })}
          </Text>
        </TouchableOpacity>

        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonTitle}>
            {t("settings.security.passwordSignIn", { defaultValue: "Password sign-in" })}
          </Text>
          <Text style={styles.comingSoonBody}>
            {t("settings.security.passwordSignInBody", {
              defaultValue: "Your account currently uses email and password authentication. Update your password here any time you need to rotate credentials.",
            })}
          </Text>
        </View>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>{t("settings.accountDeletion.title", { defaultValue: "Delete account" })}</Text>
          <Text style={styles.body}>
            {t("settings.accountDeletion.body", {
              defaultValue: "Request account deletion to deactivate your account now and schedule permanent deletion.",
            })}
          </Text>
          {scheduledDeletionAt ? (
            <Text style={styles.successText}>
              {t("settings.accountDeletion.scheduled", {
                defaultValue: "Scheduled deletion: {{date}}",
                date: new Date(scheduledDeletionAt).toLocaleDateString(),
              })}
            </Text>
          ) : (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t("settings.accountDeletion.reason", { defaultValue: "Reason" })}</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={deletionReason}
                  onChangeText={setDeletionReason}
                  placeholder={t("settings.accountDeletion.reasonPlaceholder", { defaultValue: "Optional" })}
                  placeholderTextColor={theme.inputPlaceholder}
                  multiline
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t("settings.accountDeletion.confirmLabel", { defaultValue: 'Type "DELETE" to confirm' })}</Text>
                <TextInput
                  style={styles.input}
                  value={deletionConfirm}
                  onChangeText={setDeletionConfirm}
                  autoCapitalize="characters"
                  placeholder="DELETE"
                  placeholderTextColor={theme.inputPlaceholder}
                  accessibilityLabel={t("settings.accountDeletion.confirmLabel", { defaultValue: 'Type DELETE to confirm' })}
                />
              </View>
              {deletionError ? <Text style={styles.errorText}>{deletionError}</Text> : null}
              <TouchableOpacity
                style={[styles.primaryButton, styles.deleteButton, (deletionSaving || deletionConfirm.trim().toUpperCase() !== "DELETE") && styles.buttonDisabled]}
                onPress={handleDeletionRequest}
                disabled={deletionSaving || deletionConfirm.trim().toUpperCase() !== "DELETE"}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonLabel}>
                  {deletionSaving
                    ? t("settings.accountDeletion.requesting", { defaultValue: "Requesting..." })
                    : t("settings.accountDeletion.request", { defaultValue: "Request account deletion" })}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
