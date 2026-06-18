import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/providers/AuthProvider";
import { ScreenMessage } from "@/components/common/ScreenMessage";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { AppScreen } from "@/components/layout/AppScreen";
import {
  MarketplaceRadius,
  MarketplaceShadow,
  MarketplaceSpacing,
  MarketplaceTypography,
  type ThemeColors,
} from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  getMyListings,
  hideListing,
  markListingSold,
  relistListing,
  type Listing as ApiListing,
  type ListingStatus,
} from "@/services/listings";
import { createBoostPayment, getBoostOptions, type BoostOption } from "@/services/monetization";
import { WEB_BASE_URL } from "@/services/config";
import { getMyProfile, updateMyProfile, type UserProfile } from "@/services/user";
import { uploadImageAsync } from "@/services/uploads";
import { resolveMediaUrl } from "@/services/media";
import { isEmailVerified } from "@/services/email-verification";
import { getActionErrorMessage } from "@/services/account-status-errors";
import { getUserStats, type UserStats } from "@/services/user-analytics";

import { AvatarCropModal } from "./components/AvatarCropModal";
import { BoostPlanModal } from "./components/BoostPlanModal";
import { MeListingsTab } from "./components/MeListingsTab";
import { MeOverviewTab } from "./components/MeOverviewTab";

const tabs = ["overview", "listings", "analytics"] as const;
type TabId = (typeof tabs)[number];

const cityOptions = [
  { value: "Damascus", labelKey: "profile.cities.damascus" },
  { value: "Rif Dimashq", labelKey: "profile.cities.rifDimashq" },
  { value: "Aleppo", labelKey: "profile.cities.aleppo" },
  { value: "Homs", labelKey: "profile.cities.homs" },
  { value: "Hama", labelKey: "profile.cities.hama" },
  { value: "Latakia", labelKey: "profile.cities.latakia" },
  { value: "Tartus", labelKey: "profile.cities.tartus" },
  { value: "Idlib", labelKey: "profile.cities.idlib" },
  { value: "Deir ez-Zor", labelKey: "profile.cities.deirEzZor" },
  { value: "Raqqa", labelKey: "profile.cities.raqqa" },
  { value: "Hasakah", labelKey: "profile.cities.hasakah" },
  { value: "Daraa", labelKey: "profile.cities.daraa" },
  { value: "As-Suwayda", labelKey: "profile.cities.asSuwayda" },
  { value: "Quneitra", labelKey: "profile.cities.quneitra" },
  { value: "Other", labelKey: "profile.cities.other" },
];

export default function MeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { status } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    phone: "",
    city: "",
    cityMenuOpen: false,
    avatar: "",
  });
  const [profileErrors, setProfileErrors] = useState<{
    displayName?: string;
    phone?: string;
    city?: string;
  }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Avatar crop state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<{
    uri: string;
    fileName?: string;
    mimeType?: string;
  } | null>(null);

  // Listings state
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [boostOptions, setBoostOptions] = useState<BoostOption[]>([]);
  const [boostingListingId, setBoostingListingId] = useState<string | null>(null);
  const [boostPlanListing, setBoostPlanListing] = useState<ApiListing | null>(null);
  const [statusUpdatingListingId, setStatusUpdatingListingId] = useState<string | null>(null);
  const [analyticsStats, setAnalyticsStats] = useState<UserStats | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const loadProfile = useCallback(() => {
    let isMounted = true;
    if (status !== "authenticated") {
      setProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      return () => { isMounted = false; };
    }
    setProfileLoading(true);
    getMyProfile()
      .then((data) => {
        if (!isMounted) return;
        setProfile(data);
        setProfileError(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setProfileError(
          error instanceof Error
            ? error.message
            : t("profile.errors.load", { defaultValue: "Unable to load profile." }),
        );
      })
      .finally(() => {
        if (!isMounted) return;
        setProfileLoading(false);
      });
    return () => { isMounted = false; };
  }, [status, t]);

  useEffect(() => {
    const cleanup = loadProfile();
    return () => cleanup?.();
  }, [loadProfile]);

  useEffect(() => {
    if (!profile) return;
    setFormData({
      displayName: profile.displayName ?? "",
      phone: profile.phone ?? "",
      city: profile.city ?? "",
      cityMenuOpen: false,
      avatar: profile.avatar ?? "",
    });
  }, [profile]);

  const loadListings = useCallback(() => {
    let isMounted = true;
    if (status !== "authenticated") {
      setListings([]);
      setListingsError(null);
      setListingsLoading(false);
      return () => { isMounted = false; };
    }
    setListingsLoading(true);
    getMyListings()
      .then((data) => {
        if (!isMounted) return;
        setListings(data);
        setListingsError(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setListingsError(
          error instanceof Error
            ? error.message
            : t("profile.errors.listings", { defaultValue: "Unable to load listings." }),
        );
      })
      .finally(() => {
        if (!isMounted) return;
        setListingsLoading(false);
      });
    return () => { isMounted = false; };
  }, [status, t]);

  useEffect(() => {
    const cleanup = loadListings();
    return () => cleanup?.();
  }, [loadListings]);

  useEffect(() => {
    let isMounted = true;
    getBoostOptions()
      .then((options) => { if (isMounted) setBoostOptions(options); })
      .catch(() => { if (isMounted) setBoostOptions([]); });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!profile?.id) {
      setAnalyticsStats(null);
      setAnalyticsError(null);
      setAnalyticsLoading(false);
      return () => { isMounted = false; };
    }

    setAnalyticsLoading(true);
    getUserStats(profile.id)
      .then((data) => {
        if (!isMounted) return;
        setAnalyticsStats(data);
        setAnalyticsError(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setAnalyticsError(
          error instanceof Error
            ? error.message
            : t("profile.analytics.error", { defaultValue: "Unable to load analytics." }),
        );
      })
      .finally(() => {
        if (!isMounted) return;
        setAnalyticsLoading(false);
      });

    return () => { isMounted = false; };
  }, [profile?.id, t]);

  const handleBoostListing = useCallback(
    async (listing: ApiListing, option: BoostOption) => {
      if (boostingListingId) return;
      if (listing.isBoosted) {
        Alert.alert(
          t("monetization.alreadyBoostedTitle", { defaultValue: "Already boosted" }),
          t("monetization.alreadyBoostedSubtitle", { defaultValue: "This listing is already promoted." }),
        );
        return;
      }
      setBoostPlanListing(null);
      setBoostingListingId(listing.id);
      try {
        const transaction = await createBoostPayment(listing.id, option.id, "/me");
        if (transaction.checkoutUrl) {
          await Linking.openURL(transaction.checkoutUrl);
        } else {
          Alert.alert(
            t("monetization.paymentPendingTitle", { defaultValue: "Payment pending" }),
            t("monetization.paymentPendingSubtitle", {
              defaultValue: "Your boost will activate automatically after payment is confirmed.",
            }),
          );
        }
      } catch (error) {
        Alert.alert(
          t("monetization.boostErrorTitle", { defaultValue: "Unable to boost" }),
          getActionErrorMessage(error, t("monetization.boostErrorSubtitle", { defaultValue: "Please try again." })),
        );
      } finally {
        setBoostingListingId(null);
      }
    },
    [boostingListingId, t],
  );

  const handleListingStatusChange = useCallback(
    async (listing: ApiListing, nextStatus: ListingStatus) => {
      if (statusUpdatingListingId) return;
      setStatusUpdatingListingId(listing.id);
      try {
        const updated =
          nextStatus === "sold"
            ? await markListingSold(listing.id)
            : nextStatus === "hidden"
              ? await hideListing(listing.id)
              : await relistListing(listing.id);
        setListings((current) =>
          current.map((item) => (item.id === listing.id ? updated : item)),
        );
      } catch (error) {
        Alert.alert(
          t("profile.listingStatusUpdateFailedTitle", { defaultValue: "Unable to update listing" }),
          getActionErrorMessage(error, t("profile.listingStatusUpdateFailedBody", { defaultValue: "Please try again." })),
        );
      } finally {
        setStatusUpdatingListingId(null);
      }
    },
    [statusUpdatingListingId, t],
  );

  const handleRefresh = useCallback(() => {
    if (isEditing) { setRefreshing(false); return; }
    let isMounted = true;
    setRefreshing(true);
    Promise.all([getMyProfile(), getMyListings()])
      .then(([profileData, listingsData]) => {
        if (!isMounted) return;
        setProfile(profileData);
        setProfileError(null);
        setListings(listingsData);
        setListingsError(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        const message = error instanceof Error
          ? error.message
          : t("profile.errors.refresh", { defaultValue: "Unable to refresh data." });
        setProfileError(message);
        setListingsError(message);
      })
      .finally(() => {
        if (!isMounted) return;
        setRefreshing(false);
      });
    return () => { isMounted = false; };
  }, [isEditing, t]);

  const handleShareProfile = useCallback(async () => {
    if (!profile?.id) return;
    const name = profile.displayName ?? profile.email;
    const url = `${WEB_BASE_URL}/seller/${profile.id}`;
    try {
      await Share.share({
        title: t("profile.shareTitle", { defaultValue: "{{name}} on SBay", name }),
        message: t("profile.shareMessage", { defaultValue: "View {{name}}'s profile on SBay:\n{{url}}", name, url }),
        url,
      });
    } catch {
      Alert.alert(
        t("profile.shareFailedTitle", { defaultValue: "Share failed" }),
        t("profile.shareFailedBody", { defaultValue: "Unable to share this profile." }),
      );
    }
  }, [profile, t]);

  const handleAvatarChange = async () => {
    if (avatarUploading) return;
    setAvatarUploading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          t("profile.errors.photoPermission", { defaultValue: "Photo library access is required." }),
        );
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setSaveError(null);
      setPendingAvatar({ uri: asset.uri, fileName: asset.fileName ?? undefined, mimeType: asset.mimeType ?? undefined });
      setAvatarModalOpen(true);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : t("profile.errors.uploadAvatar", { defaultValue: "Unable to upload avatar." }),
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const validateProfile = () => {
    const nextErrors: typeof profileErrors = {};
    const nameValue = formData.displayName.trim();
    const phoneValue = formData.phone.trim();
    const cityValue = formData.city.trim();
    if (!nameValue) {
      nextErrors.displayName = t("profile.validation.displayNameRequired", { defaultValue: "User name is required" });
    }
    if (phoneValue) {
      const digits = phoneValue.replace(/[^0-9]/g, "");
      if (digits.length < 7 || digits.length > 15) {
        nextErrors.phone = t("profile.validation.phoneInvalid", { defaultValue: "Enter a valid phone number" });
      }
    }
    if (cityValue.length > 100) {
      nextErrors.city = t("profile.validation.cityTooLong", { defaultValue: "City name is too long" });
    }
    setProfileErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleProfileFieldChange = (field: "displayName" | "phone" | "city", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  };

  if (status === "loading" || profileLoading) {
    return (
      <AppScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </AppScreen>
    );
  }

  if (status !== "authenticated") {
    return (
      <AppScreen>
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>{t("profile.authRequiredTitle")}</Text>
          <Text style={styles.authSubtitle}>{t("profile.authRequiredSubtitle")}</Text>
          <TouchableOpacity style={styles.authPrimaryButton} onPress={() => router.push("/sign-in")} accessibilityRole="button">
            <Text style={styles.authPrimaryLabel}>{t("common.actions.logIn")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.authSecondaryButton} onPress={() => router.push("/sign-up")} accessibilityRole="button">
            <Text style={styles.authSecondaryLabel}>{t("common.actions.createAccount")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.authTextButton} onPress={() => router.push("/")} accessibilityRole="button">
            <Text style={styles.authTextLabel}>{t("common.actions.continueBrowsing")}</Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  if (!profile || profileError) {
    return (
      <AppScreen>
        <ScreenMessage
          title={t("profile.errors.loadTitle", { defaultValue: "Unable to load profile" })}
          subtitle={profileError ?? t("profile.errors.loadSubtitle", { defaultValue: "Please try again." })}
        />
      </AppScreen>
    );
  }

  const displayName = profile.displayName ?? profile.email;
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const cityLabel = (() => {
    if (!profile.city) return t("profile.cityUnknown", { defaultValue: "Unknown city" });
    const option = cityOptions.find((item) => item.value === profile.city);
    return option ? t(option.labelKey, { defaultValue: option.value }) : profile.city;
  })();

  const stats = [
    { label: t("profile.stats.totalOrders", { defaultValue: "Total orders" }), value: profile.totalOrders },
    { label: t("profile.stats.pendingOrders", { defaultValue: "Pending orders" }), value: profile.pendingOrders },
    { label: t("profile.stats.reviews", { defaultValue: "Reviews" }), value: profile.reviewCount },
    { label: t("profile.stats.rating", { defaultValue: "Rating" }), value: profile.rating.toFixed(1) },
    { label: t("profile.stats.revenue", { defaultValue: "Revenue" }), value: profile.totalRevenue },
  ];

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!formData.cityMenuOpen}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
      >
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <Text style={styles.screenTitle}>{t("profile.title")}</Text>
          <View style={styles.toolbarActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleShareProfile}
              accessibilityRole="button"
              accessibilityLabel={t("profile.actions.share", { defaultValue: "Share profile" })}
            >
              <FontAwesome name="share-alt" size={18} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/settings")}
              accessibilityRole="button"
              accessibilityLabel={t("navigation.settings", { defaultValue: "Settings" })}
            >
              <FontAwesome name="cog" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {!isEmailVerified(profile) ? <EmailVerificationBanner onSent={handleRefresh} /> : null}

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBlock}>
            <View style={styles.avatar}>
              {formData.avatar ? (
                <Image
                  source={{ uri: resolveMediaUrl(formData.avatar) ?? formData.avatar }}
                  style={styles.avatarImage}
                  accessibilityLabel={t("profile.avatarLabel", { defaultValue: "Profile photo" })}
                />
              ) : (
                <Text style={styles.avatarLabel}>{initials}</Text>
              )}
            </View>
            {isEditing ? (
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={handleAvatarChange}
                disabled={avatarUploading}
                accessibilityRole="button"
              >
                <Text style={styles.avatarButtonLabel}>
                  {avatarUploading
                    ? t("profile.actions.uploading", { defaultValue: "Uploading..." })
                    : t("profile.actions.changePhoto", { defaultValue: "Change photo" })}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={{ flex: 1 }}>
            {isEditing ? (
              <View style={styles.editFields}>
                <TextInput
                  style={styles.input}
                  value={formData.displayName}
                  onChangeText={(v) => handleProfileFieldChange("displayName", v)}
                  placeholder={t("profile.placeholders.displayName", { defaultValue: "User name" })}
                  placeholderTextColor={theme.inputPlaceholder}
                  accessibilityLabel={t("profile.placeholders.displayName", { defaultValue: "User name" })}
                />
                {profileErrors.displayName ? <Text style={styles.errorText}>{profileErrors.displayName}</Text> : null}
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(v) => handleProfileFieldChange("phone", v)}
                  placeholder={t("profile.placeholders.phone", { defaultValue: "Phone number" })}
                  placeholderTextColor={theme.inputPlaceholder}
                  keyboardType="phone-pad"
                  accessibilityLabel={t("profile.placeholders.phone", { defaultValue: "Phone number" })}
                />
                {profileErrors.phone ? <Text style={styles.errorText}>{profileErrors.phone}</Text> : null}
                <View style={styles.menuField}>
                  <Text style={styles.inputLabel}>{t("profile.fields.city", { defaultValue: "City" })}</Text>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setFormData((prev) => ({ ...prev, cityMenuOpen: !prev.cityMenuOpen }))}
                    style={styles.menuButton}
                    accessibilityRole="button"
                  >
                    <Text style={styles.menuButtonLabel}>
                      {formData.city
                        ? t(
                            cityOptions.find((item) => item.value === formData.city)?.labelKey ?? "profile.cities.other",
                            { defaultValue: formData.city },
                          )
                        : t("profile.placeholders.city", { defaultValue: "Select a city" })}
                    </Text>
                    <Text style={styles.menuChevron}>{formData.cityMenuOpen ? "^" : "v"}</Text>
                  </TouchableOpacity>
                  {formData.cityMenuOpen ? (
                    <View style={styles.menuDropdown}>
                      <ScrollView style={styles.menuList} nestedScrollEnabled showsVerticalScrollIndicator>
                        {cityOptions.map((option) => {
                          const isActive = option.value === formData.city;
                          return (
                            <TouchableOpacity
                              key={option.value}
                              onPress={() => {
                                handleProfileFieldChange("city", option.value);
                                setFormData((prev) => ({ ...prev, city: option.value, cityMenuOpen: false }));
                              }}
                              style={[styles.menuItem, isActive && styles.menuItemActive]}
                              accessibilityRole="button"
                            >
                              <Text style={[styles.menuItemLabel, isActive && styles.menuItemLabelActive]}>
                                {t(option.labelKey, { defaultValue: option.value })}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
                {profileErrors.city ? <Text style={styles.errorText}>{profileErrors.city}</Text> : null}
                {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
              </View>
            ) : (
              <>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileDetail}>{profile.email}</Text>
                <Text style={styles.profileDetail}>{cityLabel}</Text>
              </>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editButton, isSaving && styles.editButtonDisabled]}
                disabled={isSaving}
                onPress={async () => {
                  if (isSaving || !validateProfile()) return;
                  setIsSaving(true);
                  setSaveError(null);
                  try {
                    const updated = await updateMyProfile({
                      displayName: formData.displayName || null,
                      phone: formData.phone || null,
                      city: formData.city || null,
                      avatar: formData.avatar || null,
                    });
                    setProfile(updated);
                    setIsEditing(false);
                  } catch (error) {
                    setSaveError(
                      error instanceof Error
                        ? error.message
                        : t("profile.errors.save", { defaultValue: "Unable to save profile." }),
                    );
                  } finally {
                    setIsSaving(false);
                  }
                }}
                accessibilityRole="button"
              >
                <Text style={styles.editButtonLabel}>
                  {isSaving
                    ? t("profile.actions.saving", { defaultValue: "Saving..." })
                    : t("profile.actions.save", { defaultValue: "Save" })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditing(false);
                  setSaveError(null);
                  setFormData({
                    displayName: profile.displayName ?? "",
                    phone: profile.phone ?? "",
                    city: profile.city ?? "",
                    cityMenuOpen: false,
                    avatar: profile.avatar ?? "",
                  });
                }}
                accessibilityRole="button"
              >
                <Text style={styles.cancelLabel}>
                  {t("profile.actions.cancel", { defaultValue: "Cancel" })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)} accessibilityRole="button">
              <Text style={styles.editButtonLabel}>{t("common.actions.edit")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab === "overview"
                    ? t("profile.tabs.overview", { defaultValue: "Overview" })
                    : tab === "listings"
                      ? t("profile.tabs.listings", { defaultValue: "Listings" })
                      : t("profile.tabs.analytics", { defaultValue: "Analytics" })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === "overview" ? <MeOverviewTab listings={listings} /> : null}

        {activeTab === "listings" ? (
          <MeListingsTab
            listings={listings}
            listingsLoading={listingsLoading}
            listingsError={listingsError}
            boostOptions={boostOptions}
            boostingListingId={boostingListingId}
            statusUpdatingListingId={statusUpdatingListingId}
            onBoostPress={setBoostPlanListing}
            onStatusChange={handleListingStatusChange}
          />
        ) : null}

        {activeTab === "analytics" ? (
          <View style={styles.analyticsSection}>
            <Text style={styles.sectionTitle}>
              {t("profile.analytics.title", { defaultValue: "Seller analytics" })}
            </Text>
            {analyticsLoading ? (
              <View style={styles.analyticsState}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : analyticsError ? (
              <View style={styles.analyticsState}>
                <Text style={styles.errorText}>{analyticsError}</Text>
              </View>
            ) : (
              <View style={styles.statsGrid}>
                {[
                  {
                    label: t("profile.analytics.totalListings", { defaultValue: "Total listings" }),
                    value: analyticsStats?.totalListings ?? listings.length,
                  },
                  {
                    label: t("profile.analytics.activeListings", { defaultValue: "Active listings" }),
                    value: analyticsStats?.activeListings ?? listings.filter((item) => (item.status ?? "active").toLowerCase() === "active").length,
                  },
                  {
                    label: t("profile.analytics.soldListings", { defaultValue: "Sold listings" }),
                    value: analyticsStats?.soldListings ?? listings.filter((item) => (item.status ?? "").toLowerCase() === "sold").length,
                  },
                  {
                    label: t("profile.analytics.rating", { defaultValue: "Rating" }),
                    value: analyticsStats?.averageRating ?? profile.rating.toFixed(1),
                  },
                ].map((item) => (
                  <View key={item.label} style={styles.statCard}>
                    <Text style={styles.statValue}>{String(item.value ?? 0)}</Text>
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      <AvatarCropModal
        visible={avatarModalOpen}
        pendingAvatar={pendingAvatar}
        uploading={avatarUploading}
        setUploading={setAvatarUploading}
        onConfirm={(url) => {
          setFormData((prev) => ({ ...prev, avatar: url }));
          setAvatarModalOpen(false);
          setPendingAvatar(null);
        }}
        onClose={() => {
          setAvatarModalOpen(false);
          setPendingAvatar(null);
        }}
        onError={setSaveError}
      />

      <BoostPlanModal
        visible={boostPlanListing !== null}
        boostOptions={boostOptions}
        onSelect={(option) => {
          if (!boostPlanListing) return;
          void handleBoostListing(boostPlanListing, option);
        }}
        onClose={() => setBoostPlanListing(null)}
      />
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { padding: MarketplaceSpacing.lg, gap: MarketplaceSpacing.md, paddingBottom: 32 },
    loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
    authContainer: { flex: 1, justifyContent: "center", padding: 24, gap: 14, backgroundColor: theme.background },
    authTitle: { fontSize: 24, fontWeight: "700", color: theme.text, textAlign: "center" },
    authSubtitle: { fontSize: 15, color: theme.textMuted, textAlign: "center", lineHeight: 21, marginBottom: 8 },
    authPrimaryButton: { borderRadius: 16, backgroundColor: theme.primary, paddingVertical: 15, alignItems: "center" },
    authPrimaryLabel: { color: theme.primaryForeground, fontSize: 15, fontWeight: "700" },
    authSecondaryButton: { borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingVertical: 15, alignItems: "center" },
    authSecondaryLabel: { color: theme.text, fontSize: 15, fontWeight: "700" },
    authTextButton: { paddingVertical: 8, alignItems: "center" },
    authTextLabel: { color: theme.textMuted, fontSize: 14, fontWeight: "600" },
    toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    screenTitle: { fontSize: MarketplaceTypography.screenTitle, fontWeight: "800", color: theme.text },
    toolbarActions: { flexDirection: "row", gap: MarketplaceSpacing.sm },
    iconButton: { width: 42, height: 42, borderRadius: MarketplaceRadius.md, borderWidth: 1, borderColor: theme.border, justifyContent: "center", alignItems: "center", backgroundColor: theme.surface },
    profileCard: { flexDirection: "row", alignItems: "center", gap: MarketplaceSpacing.lg, padding: MarketplaceSpacing.lg, borderRadius: MarketplaceRadius.sheet, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, shadowColor: theme.shadow, ...MarketplaceShadow.card },
    avatarBlock: { alignItems: "center", gap: 6 },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.primaryMuted, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImage: { width: "100%", height: "100%" },
    avatarLabel: { fontSize: 20, fontWeight: "700", color: theme.chipActiveText },
    avatarButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.surfaceMuted, borderWidth: 1, borderColor: theme.border },
    avatarButtonLabel: { fontSize: 11, fontWeight: "600", color: theme.primary },
    profileName: { fontSize: MarketplaceTypography.title, fontWeight: "800", color: theme.text },
    profileDetail: { fontSize: 14, color: theme.textMuted },
    editFields: { gap: 8 },
    inputLabel: { fontSize: 12, fontWeight: "600", color: theme.textMuted },
    input: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.text, backgroundColor: theme.surface },
    menuField: { gap: 6 },
    menuButton: { borderRadius: 12, borderColor: theme.border, borderWidth: 1, backgroundColor: theme.surface, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    menuButtonLabel: { color: theme.text, fontSize: 14, flex: 1 },
    menuChevron: { color: theme.textMuted, fontSize: 16, marginLeft: 12 },
    menuDropdown: { borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, maxHeight: 200 },
    menuList: { maxHeight: 200 },
    menuItem: { paddingHorizontal: 12, paddingVertical: 10 },
    menuItemActive: { backgroundColor: theme.chipActiveBackground },
    menuItemLabel: { fontSize: 14, color: theme.text, fontWeight: "600" },
    menuItemLabelActive: { color: theme.chipActiveText },
    errorText: { fontSize: 12, color: theme.danger },
    editButton: { borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.surfaceMuted },
    editButtonDisabled: { opacity: 0.6 },
    editButtonLabel: { fontSize: 13, fontWeight: "600", color: theme.primary },
    editActions: { gap: 8, alignItems: "flex-end" },
    cancelButton: { paddingHorizontal: 16, paddingVertical: 8 },
    cancelLabel: { fontSize: 13, fontWeight: "600", color: theme.textSecondary },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: MarketplaceSpacing.sm },
    statCard: { width: "48%", backgroundColor: theme.surface, borderRadius: MarketplaceRadius.lg, padding: MarketplaceSpacing.md, borderWidth: 1, borderColor: theme.border, shadowColor: theme.shadow, ...MarketplaceShadow.subtle },
    statValue: { fontSize: MarketplaceTypography.title, fontWeight: "800", color: theme.text, marginBottom: 4 },
    statLabel: { fontSize: 12, color: theme.textMuted },
    tabsRow: { flexDirection: "row", gap: MarketplaceSpacing.xs, borderRadius: MarketplaceRadius.pill, padding: MarketplaceSpacing.xs, backgroundColor: theme.surfaceMuted },
    tabPill: { flex: 1, alignItems: "center", paddingHorizontal: MarketplaceSpacing.md, paddingVertical: MarketplaceSpacing.sm, borderRadius: MarketplaceRadius.pill, borderWidth: 1, borderColor: "transparent" },
    tabPillActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    tabLabel: { fontSize: MarketplaceTypography.bodySmall, fontWeight: "800", color: theme.textSecondary },
    tabLabelActive: { color: theme.primaryForeground },
    analyticsSection: { gap: 12 },
    sectionTitle: { fontSize: 17, fontWeight: "800", color: theme.text },
    analyticsState: { padding: 16, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: "center" },
  });
