import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "@/hooks/use-app-theme";
import { getMyProfile, updateMyProfile } from "@/services/user";
import { uploadImageAsync } from "@/services/uploads";
import { sanitizeInput, validateSafeText } from "@/validation";
import { createSettingsStyles } from "./settingsStyles";

export function ProfileSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createSettingsStyles(theme), [theme]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [formData, setFormData] = useState({ displayName: "", phone: "", email: "", avatar: "" });
  const [formErrors, setFormErrors] = useState<{ displayName?: string; phone?: string }>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getMyProfile();
      setFormData({
        displayName: profile.displayName ?? profile.email,
        phone: profile.phone ?? "",
        email: profile.email ?? "",
        avatar: profile.avatar ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleAvatarChange = useCallback(async () => {
    if (avatarUploading) return;
    setAvatarUploading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error(t("profile.errors.photoPermission"));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const fileName = asset.fileName ?? `avatar-${Date.now()}.jpg`;
      const url = await uploadImageAsync(asset.uri, fileName, asset.mimeType ?? "image/jpeg", { endpoint: "avatar" });
      const updated = await updateMyProfile({ avatar: url });
      setFormData((prev) => ({ ...prev, avatar: updated.avatar ?? url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  }, [avatarUploading, t]);

  const handleSave = async () => {
    const nextErrors: typeof formErrors = {};
    const nameValue = formData.displayName.trim();
    const phoneValue = formData.phone.trim();
    if (!nameValue) {
      nextErrors.displayName = t("settings.profile.displayNameRequired", { defaultValue: "Display name is required." });
    } else if (!validateSafeText(nameValue).valid) {
      nextErrors.displayName = t("settings.profile.displayNameInvalid", { defaultValue: "Display name contains disallowed content." });
    }
    if (phoneValue && !validateSafeText(phoneValue).valid) {
      nextErrors.phone = t("settings.profile.phoneInvalid", { defaultValue: "Phone contains disallowed content." });
    }
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile({ displayName: sanitizeInput(nameValue), phone: phoneValue ? sanitizeInput(phoneValue) : null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={80}>
      <View style={styles.card}>
        <Text style={styles.heading}>{t("settings.profile.title", { defaultValue: "Profile settings" })}</Text>
        {loading ? (
          <View style={styles.loadingRow}><ActivityIndicator size="small" color={theme.primary} /></View>
        ) : (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.avatarRow}>
              <View style={styles.avatarCircle}>
                {formData.avatar ? (
                  <Image source={{ uri: formData.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarLabel}>{(formData.displayName || "U").slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.secondaryButton, avatarUploading && styles.buttonDisabled]}
                onPress={handleAvatarChange}
                disabled={avatarUploading}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonLabel}>
                  {avatarUploading
                    ? t("settings.profile.uploading", { defaultValue: "Uploading..." })
                    : t("settings.profile.changePhoto", { defaultValue: "Change photo" })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("settings.profile.email", { defaultValue: "Email" })}</Text>
              <TextInput style={[styles.input, styles.inputDisabled]} value={formData.email} editable={false} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("settings.profile.username", { defaultValue: "Username" })}</Text>
              <TextInput
                style={styles.input}
                value={formData.displayName}
                onChangeText={(value) => {
                  setFormData((prev) => ({ ...prev, displayName: value }));
                  setFormErrors((prev) => ({ ...prev, displayName: undefined }));
                  setError(null);
                }}
                placeholder={t("settings.profile.displayNamePlaceholder", { defaultValue: "Enter display name" })}
                placeholderTextColor={theme.inputPlaceholder}
                accessibilityLabel={t("settings.profile.username", { defaultValue: "Username" })}
              />
              {formErrors.displayName ? <Text style={styles.errorText}>{formErrors.displayName}</Text> : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("settings.profile.phone", { defaultValue: "Phone number" })}</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(value) => {
                  setFormData((prev) => ({ ...prev, phone: value }));
                  setFormErrors((prev) => ({ ...prev, phone: undefined }));
                  setError(null);
                }}
                placeholder={t("settings.profile.phonePlaceholder", { defaultValue: "Add a phone number" })}
                placeholderTextColor={theme.inputPlaceholder}
                keyboardType="phone-pad"
                accessibilityLabel={t("settings.profile.phone", { defaultValue: "Phone number" })}
              />
              {formErrors.phone ? <Text style={styles.errorText}>{formErrors.phone}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonLabel}>
                {saving
                  ? t("settings.common.saving", { defaultValue: "Saving..." })
                  : t("settings.common.saveChanges", { defaultValue: "Save changes" })}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
