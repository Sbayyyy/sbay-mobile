import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";

import { type ThemeColors } from "@/constants/theme";
import { useLocalization } from "@/hooks/use-localization";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useThemeContext } from "@/providers/ThemeProvider";
import { getMyProfile, updateMyProfile } from "@/services/user";
import { changePassword } from "@/services/auth";
import { uploadImageAsync } from "@/services/uploads";
import {
  getNotificationPreferences,
  setNotificationPreferences,
  type NotificationPreferences,
} from "@/services/notification-preferences";
import { sanitizeInput, validateSafeText } from "@/validation";

export default function SettingsDetail() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL } = useLocalization();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { mode, setMode } = useThemeContext();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    phone: "",
    email: "",
    avatar: "",
  });
  const [formErrors, setFormErrors] = useState<{ displayName?: string; phone?: string }>({});
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});

  const title = useMemo(() => {
    if (!section) return t("settings.title");
    const key = `settings.items.${section}`;
    return t(key, { defaultValue: t("settings.title") });
  }, [section, t]);

  const backIcon = isRTL ? ">" : "<";
  const isProfile = section === "profile";
  const isAccount = section === "account";
  const isNotifications = section === "notifications";
  const isTheme = section === "theme";

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const profile = await getMyProfile();
      setFormData({
        displayName: profile.displayName ?? profile.email,
        phone: profile.phone ?? "",
        email: profile.email ?? "",
        avatar: profile.avatar ?? "",
      });
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to load profile");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    const prefs = await getNotificationPreferences();
    setNotificationPrefs(prefs);
  }, []);

  useEffect(() => {
    if (isProfile) {
      void loadProfile();
    }
  }, [isProfile, loadProfile]);

  useEffect(() => {
    if (isNotifications) {
      void loadNotifications();
    }
  }, [isNotifications, loadNotifications]);

  const handleAvatarChange = useCallback(async () => {
    if (avatarUploading) return;
    setAvatarUploading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Photo library access is required.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName ?? `avatar-${Date.now()}.jpg`;
      const url = await uploadImageAsync(asset.uri, fileName, asset.mimeType ?? "image/jpeg");
      setFormData((prev) => ({ ...prev, avatar: url }));
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  }, [avatarUploading]);

  const handleProfileFieldChange = (field: "displayName" | "phone", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    setProfileError(null);
  };

  const handleProfileSave = async () => {
    const nextErrors: typeof formErrors = {};
    const nameValue = formData.displayName.trim();
    const phoneValue = formData.phone.trim();

    if (!nameValue) {
      nextErrors.displayName = t("settings.profile.displayNameRequired", {
        defaultValue: "Display name is required.",
      });
    } else if (!validateSafeText(nameValue).valid) {
      nextErrors.displayName = t("settings.profile.displayNameInvalid", {
        defaultValue: "Display name contains disallowed content.",
      });
    }

    if (phoneValue && !validateSafeText(phoneValue).valid) {
      nextErrors.phone = t("settings.profile.phoneInvalid", {
        defaultValue: "Phone contains disallowed content.",
      });
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setProfileSaving(true);
    setProfileError(null);
    try {
      await updateMyProfile({
        displayName: sanitizeInput(nameValue),
        phone: phoneValue ? sanitizeInput(phoneValue) : null,
        avatar: formData.avatar || null,
      });
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    const nextErrors: typeof passwordErrors = {};
    const passwordRule = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/;

    if (!passwordForm.current.trim()) {
      nextErrors.current = t("settings.security.currentRequired", {
        defaultValue: "Current password is required.",
      });
    }

    if (!passwordForm.next.trim()) {
      nextErrors.next = t("settings.security.newRequired", {
        defaultValue: "New password is required.",
      });
    } else if (!passwordRule.test(passwordForm.next)) {
      nextErrors.next = t("settings.security.passwordRule", {
        defaultValue: "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      });
    }

    if (passwordForm.next !== passwordForm.confirm) {
      nextErrors.confirm = t("settings.security.confirmMismatch", {
        defaultValue: "Passwords do not match.",
      });
    }

    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPasswordSaving(true);
    setPasswordError(null);
    try {
      await changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const toggleNotification = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    if (!notificationPrefs) return;
    const next = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    setNotifSaving(true);
    try {
      await setNotificationPreferences(next);
    } finally {
      setNotifSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>{backIcon}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 32 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isProfile && (
            <View style={styles.card}>
              <Text style={styles.heading}>{t("settings.profile.title", { defaultValue: "Profile settings" })}</Text>
              {profileLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : (
                <>
                  {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
                  <View style={styles.avatarRow}>
                    <View style={styles.avatarCircle}>
                      {formData.avatar ? (
                        <Image source={{ uri: formData.avatar }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarLabel}>
                          {(formData.displayName || "U").slice(0, 1).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.secondaryButton, avatarUploading && styles.buttonDisabled]}
                      onPress={handleAvatarChange}
                      disabled={avatarUploading}
                    >
                      <Text style={styles.secondaryButtonLabel}>
                        {avatarUploading
                          ? t("settings.profile.uploading", { defaultValue: "Uploading..." })
                          : t("settings.profile.changePhoto", { defaultValue: "Change photo" })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("settings.profile.firstName", { defaultValue: "First name" })}</Text>
                    <TextInput
                      style={[styles.input, styles.inputDisabled]}
                      value=""
                      editable={false}
                      placeholder={t("settings.profile.comingSoon", { defaultValue: "Coming soon" })}
                      placeholderTextColor={theme.textMuted}
                    />
                    <Text style={styles.comingSoon}>{t("settings.common.comingSoon", { defaultValue: "Coming soon" })}</Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("settings.profile.lastName", { defaultValue: "Last name" })}</Text>
                    <TextInput
                      style={[styles.input, styles.inputDisabled]}
                      value=""
                      editable={false}
                      placeholder={t("settings.profile.comingSoon", { defaultValue: "Coming soon" })}
                      placeholderTextColor={theme.textMuted}
                    />
                    <Text style={styles.comingSoon}>{t("settings.common.comingSoon", { defaultValue: "Coming soon" })}</Text>
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
                      onChangeText={(value) => handleProfileFieldChange("displayName", value)}
                      placeholder={t("settings.profile.displayNamePlaceholder", { defaultValue: "Enter display name" })}
                      placeholderTextColor={theme.inputPlaceholder}
                    />
                    {formErrors.displayName ? (
                      <Text style={styles.errorText}>{formErrors.displayName}</Text>
                    ) : null}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("settings.profile.phone", { defaultValue: "Phone number" })}</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.phone}
                      onChangeText={(value) => handleProfileFieldChange("phone", value)}
                      placeholder={t("settings.profile.phonePlaceholder", { defaultValue: "Add a phone number" })}
                      placeholderTextColor={theme.inputPlaceholder}
                      keyboardType="phone-pad"
                    />
                    {formErrors.phone ? <Text style={styles.errorText}>{formErrors.phone}</Text> : null}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("settings.profile.bio", { defaultValue: "Bio" })}</Text>
                    <TextInput
                      style={[styles.input, styles.inputDisabled, styles.textarea]}
                      value=""
                      editable={false}
                      multiline
                      placeholder={t("settings.profile.comingSoon", { defaultValue: "Coming soon" })}
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("settings.profile.language", { defaultValue: "Language" })}</Text>
                    <TextInput
                      style={[styles.input, styles.inputDisabled]}
                      value=""
                      editable={false}
                      placeholder={t("settings.profile.comingSoon", { defaultValue: "Coming soon" })}
                      placeholderTextColor={theme.textMuted}
                    />
                    <Text style={styles.comingSoon}>{t("settings.common.comingSoon", { defaultValue: "Coming soon" })}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, profileSaving && styles.buttonDisabled]}
                    onPress={handleProfileSave}
                    disabled={profileSaving}
                  >
                    <Text style={styles.primaryButtonLabel}>
                      {profileSaving
                        ? t("settings.common.saving", { defaultValue: "Saving..." })
                        : t("settings.common.saveChanges", { defaultValue: "Save changes" })}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {isAccount && (
            <View style={styles.card}>
              <Text style={styles.heading}>{t("settings.security.title", { defaultValue: "Security" })}</Text>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t("settings.security.current", { defaultValue: "Current password" })}</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.current}
                  onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, current: value }))}
                  placeholder={t("settings.security.currentPlaceholder", { defaultValue: "Enter current password" })}
                  placeholderTextColor={theme.inputPlaceholder}
                  secureTextEntry
                />
                {passwordErrors.current ? <Text style={styles.errorText}>{passwordErrors.current}</Text> : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t("settings.security.new", { defaultValue: "New password" })}</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.next}
                  onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, next: value }))}
                  placeholder={t("settings.security.newPlaceholder", { defaultValue: "Enter new password" })}
                  placeholderTextColor={theme.inputPlaceholder}
                  secureTextEntry
                />
                {passwordErrors.next ? (
                  <Text style={styles.errorText}>{passwordErrors.next}</Text>
                ) : (
                  <Text style={styles.helperText}>
                    {t("settings.security.rule", {
                      defaultValue: "Must include uppercase, lowercase, and a number.",
                    })}
                  </Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t("settings.security.confirm", { defaultValue: "Confirm new password" })}</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.confirm}
                  onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, confirm: value }))}
                  placeholder={t("settings.security.confirmPlaceholder", { defaultValue: "Confirm new password" })}
                  placeholderTextColor={theme.inputPlaceholder}
                  secureTextEntry
                />
                {passwordErrors.confirm ? <Text style={styles.errorText}>{passwordErrors.confirm}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, passwordSaving && styles.buttonDisabled]}
                onPress={handlePasswordSave}
                disabled={passwordSaving}
              >
                <Text style={styles.primaryButtonLabel}>
                  {passwordSaving
                    ? t("settings.common.saving", { defaultValue: "Saving..." })
                    : t("settings.security.update", { defaultValue: "Update password" })}
                </Text>
              </TouchableOpacity>

              <View style={styles.comingSoonCard}>
                <Text style={styles.comingSoonTitle}>
                  {t("settings.security.twoFactor", { defaultValue: "Two-factor authentication" })}
                </Text>
                <Text style={styles.comingSoonBody}>
                  {t("settings.common.comingSoon", { defaultValue: "Coming soon" })}
                </Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>
                    {t("settings.common.comingSoon", { defaultValue: "Coming soon" })}
                  </Text>
                </View>
              </View>
              <View style={styles.comingSoonCard}>
                <Text style={styles.comingSoonTitle}>
                  {t("settings.security.sessions", { defaultValue: "Active sessions" })}
                </Text>
                <Text style={styles.comingSoonBody}>
                  {t("settings.common.comingSoon", { defaultValue: "Coming soon" })}
                </Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>
                    {t("settings.common.comingSoon", { defaultValue: "Coming soon" })}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {isNotifications && (
            <View style={styles.card}>
              <Text style={styles.heading}>{t("settings.notifications.title", { defaultValue: "Notification settings" })}</Text>
              {!notificationPrefs ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : (
                <View style={styles.list}>
                  {[
                    { key: "messages", label: t("settings.notifications.messages", { defaultValue: "Messages" }) },
                    { key: "newBids", label: t("settings.notifications.newBids", { defaultValue: "New bids" }) },
                    { key: "outbid", label: t("settings.notifications.outbid", { defaultValue: "Outbid alerts" }) },
                    { key: "wonAuction", label: t("settings.notifications.wonAuction", { defaultValue: "Won auctions" }) },
                    { key: "priceDrops", label: t("settings.notifications.priceDrops", { defaultValue: "Price drops" }) },
                    { key: "promotions", label: t("settings.notifications.promotions", { defaultValue: "Promotions" }) },
                  ].map((item) => (
                    <View key={item.key} style={styles.toggleRow}>
                      <Text style={styles.toggleLabel}>{item.label}</Text>
                      <Switch
                        value={notificationPrefs[item.key as keyof NotificationPreferences]}
                        onValueChange={(value) =>
                          toggleNotification(item.key as keyof NotificationPreferences, value)
                        }
                        thumbColor={theme.surface}
                        trackColor={{ false: theme.border, true: theme.primary }}
                      />
                    </View>
                  ))}
                  {notifSaving ? (
                    <Text style={styles.helperText}>
                      {t("settings.common.saving", { defaultValue: "Saving..." })}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          )}

          {isTheme && (
            <View style={styles.card}>
              <Text style={styles.heading}>
                {t("settings.theme.title", { defaultValue: "Theme" })}
              </Text>
              <Text style={styles.body}>
                {t("settings.theme.subtitle", {
                  defaultValue: "Choose between light and dark appearance.",
                })}
              </Text>
              <View style={styles.themeRow}>
                <TouchableOpacity
                  style={[styles.themeOption, mode === "light" && styles.themeOptionActive]}
                  onPress={() => setMode("light")}
                >
                  <Text style={[styles.themeLabel, mode === "light" && styles.themeLabelActive]}>
                    {t("settings.theme.light", { defaultValue: "Light" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeOption, mode === "dark" && styles.themeOptionActive]}
                  onPress={() => setMode("dark")}
                >
                  <Text style={[styles.themeLabel, mode === "dark" && styles.themeLabelActive]}>
                    {t("settings.theme.dark", { defaultValue: "Dark" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeOption, mode === "neon" && styles.themeOptionActive]}
                  onPress={() => setMode("neon")}
                >
                  <Text style={[styles.themeLabel, mode === "neon" && styles.themeLabelActive]}>
                    {t("settings.theme.neon", { defaultValue: "Neon" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeOption, mode === "coffee" && styles.themeOptionActive]}
                  onPress={() => setMode("coffee")}
                >
                  <Text style={[styles.themeLabel, mode === "coffee" && styles.themeLabelActive]}>
                    {t("settings.theme.coffee", { defaultValue: "Coffee" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeOption, mode === "test" && styles.themeOptionActive]}
                  onPress={() => setMode("test")}
                >
                  <Text style={[styles.themeLabel, mode === "test" && styles.themeLabelActive]}>
                    {t("settings.theme.test", { defaultValue: "Test" })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isProfile && !isAccount && !isNotifications && !isTheme && (
            <View style={styles.card}>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonBadgeText}>
                  {t("settings.common.comingSoon", { defaultValue: "Coming soon" })}
                </Text>
              </View>
              <Text style={styles.heading}>{title}</Text>
              <Text style={styles.body}>
                {t("settings.placeholderBody", { section: title })}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingBottom: 40,
      gap: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    backIcon: {
      fontSize: 22,
      color: theme.text,
      lineHeight: 22,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
    },
    card: {
      borderRadius: 18,
      backgroundColor: theme.surface,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    loadingRow: {
      paddingVertical: 20,
      alignItems: "center",
    },
    heading: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
    },
    body: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    avatarRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    avatarCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLabel: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
    },
    avatarImage: {
      width: 64,
      height: 64,
      borderRadius: 32,
    },
    formGroup: {
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
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.text,
      backgroundColor: theme.background,
    },
    inputDisabled: {
      backgroundColor: theme.surfaceMuted,
      color: theme.textMuted,
    },
    textarea: {
      minHeight: 90,
      textAlignVertical: "top",
    },
    errorText: {
      color: theme.danger,
      fontSize: 12,
    },
    helperText: {
      fontSize: 12,
      color: theme.textMuted,
    },
    primaryButton: {
      marginTop: 8,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.primary,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
    },
    primaryButtonLabel: {
      color: theme.primaryForeground,
      fontSize: 15,
      fontWeight: "700",
    },
    secondaryButton: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryButtonLabel: {
      color: theme.text,
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    comingSoon: {
      fontSize: 12,
      color: theme.textMuted,
    },
    list: {
      gap: 16,
    },
    themeRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
      flexWrap: "wrap",
    },
    themeOption: {
      minWidth: 110,
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      backgroundColor: theme.surfaceMuted,
    },
    themeOptionActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryMuted,
    },
    themeLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    themeLabelActive: {
      color: theme.primary,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    toggleLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
    },
    comingSoonCard: {
      marginTop: 12,
      padding: 16,
      borderRadius: 14,
      backgroundColor: theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 8,
    },
    comingSoonTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
    },
    comingSoonBody: {
      fontSize: 13,
      color: theme.textMuted,
    },
    comingSoonBadge: {
      alignSelf: "flex-start",
      backgroundColor: theme.warningBackground ?? theme.surfaceMuted,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 6,
    },
    comingSoonBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.warning ?? theme.text,
    },
  });
