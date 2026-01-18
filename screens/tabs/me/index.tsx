import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import ViewShot, { captureRef } from "@/lib/view-shot";

import { ScreenMessage } from "@/components/common/ScreenMessage";
import { SectionHeader } from "@/components/common/SectionHeader";
import { AppScreen } from "@/components/layout/AppScreen";
import { ListingCard } from "@/components/listings/ListingCard";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { getMyListings, type Listing as ApiListing } from "@/services/listings";
import { getMyProfile, updateMyProfile, type UserProfile } from "@/services/user";
import { uploadImageAsync } from "@/services/uploads";

const tabs = ["overview", "listings"] as const;

const cityOptions = [
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
];

const CROP_SIZE = 220;
const PREVIEW_IMAGE_SIZE = 280;

type TabId = (typeof tabs)[number];

type StatEntry = {
  label: string;
  value: string | number;
};

export default function MeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<{
    uri: string;
    fileName?: string;
    mimeType?: string;
  } | null>(null);
  const viewShotRef = useRef<any>(null);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isWeb = Platform.OS === "web";
  const CropShot = isWeb ? View : ViewShot;
  const cropShotProps = isWeb
    ? {}
    : {
        ref: viewShotRef,
        options: { format: "png", quality: 1, result: "tmpfile" },
      };
  const maxPan = (PREVIEW_IMAGE_SIZE - CROP_SIZE) / 2;
  const clampPan = (value: number) =>
    Math.min(maxPan, Math.max(-maxPan, value));
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pan.setOffset({
            x: (pan.x as any).__getValue(),
            y: (pan.y as any).__getValue(),
          });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false },
        ),
        onPanResponderRelease: () => {
          pan.flattenOffset();
          const nextX = clampPan((pan.x as any).__getValue());
          const nextY = clampPan((pan.y as any).__getValue());
          pan.setValue({ x: nextX, y: nextY });
        },
      }),
    [maxPan, pan],
  );

  const [listings, setListings] = useState<ApiListing[]>([]);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
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
          error instanceof Error ? error.message : "Unable to load profile.",
        );
      })
      .finally(() => {
        if (!isMounted) return;
        setProfileLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

  useEffect(() => {
    let isMounted = true;
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
          error instanceof Error ? error.message : "Unable to load listings.",
        );
      })
      .finally(() => {
        if (!isMounted) return;
        setListingsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (profileLoading) {
    return (
      <AppScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </AppScreen>
    );
  }

  if (!profile || profileError) {
    return (
      <AppScreen>
        <ScreenMessage
          title="Unable to load profile"
          subtitle={profileError ?? "Please try again."}
        />
      </AppScreen>
    );
  }

  const displayName = profile.displayName ?? profile.email;
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const cityLabel = profile.city ?? "Unknown city";

  const stats: StatEntry[] = [
    { label: "Total orders", value: profile.totalOrders },
    { label: "Pending orders", value: profile.pendingOrders },
    { label: "Reviews", value: profile.reviewCount },
    { label: "Rating", value: profile.rating.toFixed(1) },
    { label: "Revenue", value: profile.totalRevenue },
  ];

  const validateProfile = () => {
    const nextErrors: typeof profileErrors = {};
    const nameValue = formData.displayName.trim();
    const phoneValue = formData.phone.trim();
    const cityValue = formData.city.trim();

    if (!nameValue) {
      nextErrors.displayName = "User name is required";
    }

    if (phoneValue) {
      const digits = phoneValue.replace(/[^0-9]/g, "");
      if (digits.length < 7 || digits.length > 15) {
        nextErrors.phone = "Enter a valid phone number";
      }
    }

    if (cityValue.length > 100) {
      nextErrors.city = "City name is too long";
    }

    setProfileErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleProfileFieldChange = (
    field: "displayName" | "phone" | "city",
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  };

  const handleAvatarChange = async () => {
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
      setSaveError(null);
      pan.setValue({ x: 0, y: 0 });
      setPendingAvatar({
        uri: asset.uri,
        fileName: asset.fileName ?? undefined,
        mimeType: asset.mimeType ?? undefined,
      });
      setAvatarModalOpen(true);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to upload avatar.",
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleConfirmAvatar = async () => {
    if (!pendingAvatar || avatarUploading) return;
    setSaveError(null);
    setAvatarUploading(true);
    try {
      const offsetX = (pan.x as any).__getValue();
      const offsetY = (pan.y as any).__getValue();
      if (isWeb) {
        const url = await uploadImageAsync(
          pendingAvatar.uri,
          pendingAvatar.fileName,
          pendingAvatar.mimeType,
          {
            circleCrop: true,
            outputSize: 512,
            offsetX,
            offsetY,
            cropSize: CROP_SIZE,
            previewImageSize: PREVIEW_IMAGE_SIZE,
          },
        );
        setFormData((prev) => ({ ...prev, avatar: url }));
        setAvatarModalOpen(false);
        setPendingAvatar(null);
        return;
      }

      if (!viewShotRef.current) {
        throw new Error("Unable to process the selected photo.");
      }

      const capturedUri = await captureRef(viewShotRef.current, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      const fileName = pendingAvatar.fileName
        ? pendingAvatar.fileName.replace(/\.[^/.]+$/, ".png")
        : `avatar-${Date.now()}.png`;
      const url = await uploadImageAsync(capturedUri, fileName, "image/png");
      setFormData((prev) => ({ ...prev, avatar: url }));
      setAvatarModalOpen(false);
      setPendingAvatar(null);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to upload avatar.",
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toolbar}>
          <Text style={styles.screenTitle}>{t("profile.title")}</Text>
          <View style={styles.toolbarActions}>
            <TouchableOpacity style={styles.iconButton}>
              <FontAwesome name="share-alt" size={18} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/settings")}
            >
              <FontAwesome name="cog" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarBlock}>
            <View style={styles.avatar}>
              {formData.avatar ? (
                <Image
                  source={{ uri: formData.avatar }}
                  style={styles.avatarImage}
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
              >
                <Text style={styles.avatarButtonLabel}>
                  {avatarUploading ? "Uploading..." : "Change photo"}
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
                  onChangeText={(value) =>
                    handleProfileFieldChange("displayName", value)
                  }
                  placeholder="User name"
                  placeholderTextColor={theme.inputPlaceholder}
                />
                {profileErrors.displayName ? (
                  <Text style={styles.errorText}>{profileErrors.displayName}</Text>
                ) : null}
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(value) => handleProfileFieldChange("phone", value)}
                  placeholder="Phone number"
                  placeholderTextColor={theme.inputPlaceholder}
                  keyboardType="phone-pad"
                />
                {profileErrors.phone ? (
                  <Text style={styles.errorText}>{profileErrors.phone}</Text>
                ) : null}
                <View style={styles.menuField}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        cityMenuOpen: !prev.cityMenuOpen,
                      }))
                    }
                    style={styles.menuButton}
                  >
                    <Text style={styles.menuButtonLabel}>
                      {formData.city || "Select a city"}
                    </Text>
                    <Text style={styles.menuChevron}>
                      {formData.cityMenuOpen ? "^" : "v"}
                    </Text>
                  </TouchableOpacity>
                  {formData.cityMenuOpen ? (
                    <View style={styles.menuDropdown}>
                      <ScrollView style={styles.menuList}>
                        {cityOptions.map((option) => {
                          const isActive = option === formData.city;
                          return (
                            <TouchableOpacity
                              key={option}
                              onPress={() => {
                                handleProfileFieldChange("city", option);
                                setFormData((prev) => ({
                                  ...prev,
                                  city: option,
                                  cityMenuOpen: false,
                                }));
                              }}
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
                                {option}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
                {profileErrors.city ? (
                  <Text style={styles.errorText}>{profileErrors.city}</Text>
                ) : null}
                {saveError ? (
                  <Text style={styles.errorText}>{saveError}</Text>
                ) : null}
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
                onPress={async () => {
                  if (isSaving) return;
                  if (!validateProfile()) return;
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
                        : "Unable to save profile.",
                    );
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                <Text style={styles.editButtonLabel}>
                  {isSaving ? "Saving..." : "Save"}
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
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonLabel}>{t("common.actions.edit")}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}
                >
                  {tab === "overview" ? "Overview" : "Listings"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === "overview" ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent activity</Text>
              <Text style={styles.sectionMeta}>Last 7 days</Text>
            </View>
            {listings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No activity yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create your first listing to get started.
                </Text>
              </View>
            ) : (
              <View style={styles.activityRow}>
                <View style={styles.activityIcon}>
                  <FontAwesome name="tag" size={16} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>Listing published</Text>
                  <Text style={styles.activitySubtitle}>
                    {listings[0].title}
                  </Text>
                </View>
                <Text style={styles.activityMeta}>Just now</Text>
              </View>
            )}
          </View>
        ) : null}

        {activeTab === "listings" ? (
          <View>
            <SectionHeader
              title={t("profile.myListings")}
              actionLabel={t("common.actions.seeAll")}
            />
            {listingsLoading ? (
              <View style={styles.loadingListings}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : listingsError ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Unable to load listings</Text>
                <Text style={styles.emptySubtitle}>{listingsError}</Text>
              </View>
            ) : listings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{t("common.empty.noListings")}</Text>
                <Text style={styles.emptySubtitle}>
                  {t("profile.emptyListingsSubtitle")}
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {listings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={{
                      id: item.id,
                      title: item.title,
                      price: `${item.priceCurrency} ${item.priceAmount}`,
                      category: item.categoryPath ?? "other",
                      image: item.thumbnailUrl ?? item.imageUrls[0] ?? "",
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
      <Modal
        visible={avatarModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (avatarUploading) return;
          setAvatarModalOpen(false);
          pan.setValue({ x: 0, y: 0 });
          setPendingAvatar(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Crop avatar</Text>
            <Text style={styles.modalSubtitle}>
              Preview how your photo will appear.
            </Text>
            <View style={styles.cropFrame}>
              <CropShot {...(cropShotProps as any)}>
                <View style={styles.cropCircle}>
                  {pendingAvatar?.uri ? (
                    <Animated.View
                      style={[
                        styles.cropImageFrame,
                        { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
                      ]}
                      {...panResponder.panHandlers}
                    >
                      <Image
                        source={{ uri: pendingAvatar.uri }}
                        style={styles.cropImage}
                        resizeMode="cover"
                      />
                    </Animated.View>
                  ) : null}
                </View>
              </CropShot>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  if (avatarUploading) return;
                  setAvatarModalOpen(false);
                  pan.setValue({ x: 0, y: 0 });
                  setPendingAvatar(null);
                }}
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editButton,
                  avatarUploading && styles.editButtonDisabled,
                ]}
                onPress={handleConfirmAvatar}
                disabled={avatarUploading}
              >
                <Text style={styles.editButtonLabel}>
                  {avatarUploading ? "Uploading..." : "Use photo"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: 20,
      gap: 16,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    toolbar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    screenTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
    },
    toolbarActions: {
      flexDirection: "row",
      gap: 12,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.surface,
    },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      padding: 16,
      borderRadius: 18,
      backgroundColor: theme.surface,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    avatarBlock: {
      alignItems: "center",
      gap: 6,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarLabel: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.chipActiveText,
    },
    avatarButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.surfaceMuted,
    },
    avatarButtonLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.primary,
    },
    profileName: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    profileDetail: {
      fontSize: 14,
      color: theme.textMuted,
    },
    editFields: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.textMuted,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.surface,
    },
    menuField: {
      gap: 6,
    },
    menuButton: {
      borderRadius: 12,
      borderColor: theme.border,
      borderWidth: 1,
      backgroundColor: theme.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    menuButtonLabel: {
      color: theme.text,
      fontSize: 14,
      flex: 1,
    },
    menuChevron: {
      color: theme.textMuted,
      fontSize: 16,
      marginLeft: 12,
    },
    menuDropdown: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      maxHeight: 200,
    },
    menuList: {
      maxHeight: 200,
    },
    menuItem: {
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    menuItemActive: {
      backgroundColor: theme.chipActiveBackground,
    },
    menuItemLabel: {
      fontSize: 14,
      color: theme.text,
      fontWeight: "600",
    },
    menuItemLabelActive: {
      color: theme.chipActiveText,
    },
    errorText: {
      fontSize: 12,
      color: theme.danger,
    },
    editButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.surfaceMuted,
    },
    editButtonDisabled: {
      opacity: 0.6,
    },
    editButtonLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.primary,
    },
    editActions: {
      gap: 8,
      alignItems: "flex-end",
    },
    cancelButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    cancelLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    statCard: {
      width: "47%",
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 12,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textMuted,
    },
    tabsRow: {
      flexDirection: "row",
      gap: 10,
    },
    tabPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    tabPillActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    tabLabelActive: {
      color: theme.primaryForeground,
    },
    sectionCard: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      padding: 16,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      gap: 12,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    sectionMeta: {
      fontSize: 12,
      color: theme.textMuted,
    },
    activityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    activityIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    activityTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    activitySubtitle: {
      fontSize: 12,
      color: theme.textMuted,
    },
    activityMeta: {
      fontSize: 12,
      color: theme.textSubtle,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 16,
    },
    loadingListings: {
      paddingVertical: 20,
      alignItems: "center",
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: "center",
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: "center",
      paddingHorizontal: 20,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    modalCard: {
      width: "100%",
      maxWidth: 360,
      borderRadius: 18,
      backgroundColor: theme.surface,
      padding: 20,
      gap: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    modalSubtitle: {
      fontSize: 13,
      color: theme.textMuted,
    },
    cropFrame: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
    },
    cropCircle: {
      width: CROP_SIZE,
      height: CROP_SIZE,
      borderRadius: CROP_SIZE / 2,
      overflow: "hidden",
      backgroundColor: "transparent",
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    cropImageFrame: {
      width: PREVIEW_IMAGE_SIZE,
      height: PREVIEW_IMAGE_SIZE,
    },
    cropImage: {
      width: "100%",
      height: "100%",
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
  });
