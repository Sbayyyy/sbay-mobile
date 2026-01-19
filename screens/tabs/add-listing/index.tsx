import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppScreen } from "@/components/layout/AppScreen";
import { ChipPicker } from "@/components/form/ChipPicker";
import { ValidatedInput } from "@/components/ValidatedInput";
import {
  ADD_LISTING_CATEGORIES,
  CURRENCY_OPTIONS,
  LISTING_CONDITIONS,
  PHOTO_SLOTS,
} from "@/constants/mockData";
import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";
import { createListing, getListing, updateListing } from "@/services/listings";
import { uploadImageAsync } from "@/services/uploads";
import { type TextValidator } from "@/validation";

const currencyOptions = Array.from(CURRENCY_OPTIONS).map((item) => ({
  id: item,
  label: item,
}));

type ConditionId = (typeof LISTING_CONDITIONS)[number];
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

export default function AddListingScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(ADD_LISTING_CATEGORIES[0].id);
  const [condition, setCondition] = useState<ConditionId>(LISTING_CONDITIONS[0]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<DistrictId>("");
  const [districtMenuVisible, setDistrictMenuVisible] = useState(false);
  const [currency, setCurrency] = useState(currencyOptions[0].id);
  const [photos, setPhotos] = useState<(string | null)[]>(
    Array(PHOTO_SLOTS.length).fill(null),
  );
  const [initialForm, setInitialForm] = useState<{
    title: string;
    description: string;
    price: string;
    category: string;
    condition: ConditionId;
    location: DistrictId;
    currency: string;
    photos: (string | null)[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [validation, setValidation] = useState({
    title: true,
    price: true,
    description: true,
    location: true,
  });
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const categories = useMemo(() => {
    return ADD_LISTING_CATEGORIES.map((item) => ({
      ...item,
      label: t(item.translationKey ?? `categories.${item.id}`, {
        defaultValue: item.label,
      }),
    }));
  }, [t]);

  const conditionOptions = useMemo(() => {
    return Array.from(LISTING_CONDITIONS).map((item) => ({
      id: item,
      label: t(`addListing.conditions.${item}`),
    }));
  }, [t]);

  const conditionMap: Record<ConditionId, string> = {
    new: "New",
    like_new: "LikeNew",
    good: "Good",
    fair: "Fair",
  };

  const conditionFromApi: Record<string, ConditionId> = {
    New: "new",
    LikeNew: "like_new",
    Good: "good",
    Fair: "fair",
  };

  const normalizePriceInput = (value: string) => {
    const sanitized = value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    if (parts.length <= 1) return sanitized;
    return `${parts[0]}.${parts.slice(1).join("")}`;
  };

  const requiredValidator = useMemo<TextValidator>(
    () => ({
      validate: (value, context) => {
        if (value.trim().length === 0) {
          return {
            valid: false,
            issues: [
              {
                message: t("common.errors.required", {
                  defaultValue: `${context?.label ?? "Field"} is required.`,
                }),
              },
            ],
          };
        }
        return { valid: true, issues: [] };
      },
    }),
    [t],
  );

  const priceValidator = useMemo<TextValidator>(
    () => ({
      normalize: normalizePriceInput,
      validate: (value) => {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) {
          return {
            valid: false,
            issues: [
              {
                message: t("common.errors.invalidNumber", {
                  defaultValue: "Enter a valid price.",
                }),
              },
            ],
          };
        }
        return { valid: true, issues: [] };
      },
    }),
    [t],
  );

  const titleValidators = useMemo(() => [requiredValidator], [requiredValidator]);
  const descriptionValidators = useMemo(
    () => [requiredValidator],
    [requiredValidator],
  );
  const priceValidators = useMemo(() => [requiredValidator, priceValidator], [
    requiredValidator,
    priceValidator,
  ]);

  const loadListing = useCallback(
    (mode: "initial" | "refresh" = "initial") => {
      let isMounted = true;
      if (!id) {
        if (mode === "refresh") setRefreshing(false);
        return () => {
          isMounted = false;
        };
      }

      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }

      getListing(id)
        .then((listing) => {
          if (!isMounted) return;
          const nextTitle = listing.title ?? "";
          const nextDescription = listing.description ?? "";
          const nextPrice = String(listing.priceAmount ?? "");
          const nextCategory = listing.categoryPath ?? ADD_LISTING_CATEGORIES[0].id;
          const matchedDistrict =
            districtOptions.find(
              (item) => item.id === listing.region || item.label === listing.region,
            ) ?? null;
          const nextLocation = matchedDistrict?.id ?? "";
          const nextCurrency = listing.priceCurrency ?? currencyOptions[0].id;
          const nextCondition =
            conditionFromApi[listing.condition ?? ""] ?? LISTING_CONDITIONS[0];
          const nextPhotos = Array(PHOTO_SLOTS.length).fill(null) as Array<
            string | null
          >;
          listing.imageUrls?.slice(0, PHOTO_SLOTS.length).forEach((url, index) => {
            nextPhotos[index] = url;
          });

          setTitle(nextTitle);
          setDescription(nextDescription);
          setPrice(nextPrice);
          setCategory(nextCategory);
          setLocation(nextLocation);
          setCurrency(nextCurrency);
          setCondition(nextCondition);
          setPhotos(nextPhotos);
          setInitialForm({
            title: nextTitle,
            description: nextDescription,
            price: nextPrice,
            category: nextCategory,
            condition: nextCondition,
            location: nextLocation,
            currency: nextCurrency,
            photos: nextPhotos,
          });
        })
        .catch((error) => {
          if (!isMounted) return;
          Alert.alert(
            t("common.errors.title", { defaultValue: "Something went wrong" }),
            error instanceof Error
              ? error.message
              : t("addListing.error", {
                  defaultValue: "Unable to load listing.",
                }),
          );
        })
        .finally(() => {
          if (!isMounted) return;
          setIsLoading(false);
          setRefreshing(false);
        });

      return () => {
        isMounted = false;
      };
    },
    [id, t],
  );

  useEffect(() => {
    const cleanup = loadListing("initial");
    return () => cleanup?.();
  }, [loadListing]);

  useEffect(() => {
    setValidation((prev) => ({ ...prev, location: location.trim().length > 0 }));
  }, [location]);

  const isFormValid = useMemo(() => {
    const priceValue = Number(price);
    return (
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      Number.isFinite(priceValue) &&
      priceValue > 0 &&
      location.trim().length > 0 &&
      validation.title &&
      validation.price &&
      validation.description &&
      validation.location
    );
  }, [description, price, title, validation]);

  const handleDistrictChange = useCallback((nextDistrict: DistrictId) => {
    setLocation(nextDistrict);
    setDistrictMenuVisible(false);
  }, []);

  const handlePickPhoto = async (index: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t("common.errors.permissionTitle", { defaultValue: "Permission needed" }),
        t("common.errors.permissionPhotos", {
          defaultValue: "Please allow photo access to continue.",
        }),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setPhotos((prev) => {
      const filled = prev.filter(Boolean) as string[];
      const next = [...filled, ...Array(prev.length - filled.length).fill(null)];
      next[index] = asset.uri;
      const compacted = next.filter(Boolean) as string[];
      return [...compacted, ...Array(prev.length - compacted.length).fill(null)];
    });
  };

  const movePhoto = useCallback((fromIndex: number, direction: "left" | "right") => {
    setPhotos((prev) => {
      const filled = prev.filter(Boolean) as string[];
      const next = [...filled, ...Array(prev.length - filled.length).fill(null)];
      const targetIndex = direction === "left" ? fromIndex - 1 : fromIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const temp = next[targetIndex];
      next[targetIndex] = next[fromIndex];
      next[fromIndex] = temp;
      const compacted = next.filter(Boolean) as string[];
      return [...compacted, ...Array(prev.length - compacted.length).fill(null)];
    });
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      const compacted = next.filter(Boolean) as string[];
      return [...compacted, ...Array(prev.length - compacted.length).fill(null)];
    });
  }, []);

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) {
      setShowErrors(true);
      return;
    }
    setIsSubmitting(true);

    try {
      const selectedPhotos = photos.filter(Boolean) as string[];
      const uploadedUrls = await Promise.all(
        selectedPhotos.map(async (uri, index) => {
          if (uri.startsWith("http://") || uri.startsWith("https://")) {
            return uri;
          }
          const name = `listing-${Date.now()}-${index}.jpg`;
          return uploadImageAsync(uri, name, "image/jpeg");
        }),
      );

      const payload = {
        title: title.trim(),
        description: description.trim(),
        priceAmount: Number(price),
        priceCurrency: currency,
        categoryPath: category,
        condition: conditionMap[condition],
        region: location.trim() || undefined,
        stock: 1,
        imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      };

      const listing = id
        ? await updateListing(id, payload)
        : await createListing(payload);

      Alert.alert(
        t("common.actions.success", { defaultValue: "Success" }),
        id
          ? t("addListing.updated", {
              defaultValue: "Your listing has been updated.",
            })
          : t("addListing.success", {
              defaultValue: "Your listing has been published.",
            }),
      );
      router.push(`/listings/${listing.id}`);
    } catch (error) {
      console.error("Error creating listing:", error);
      Alert.alert(
        t("common.errors.title", { defaultValue: "Something went wrong" }),
        t("addListing.error", {
          defaultValue: "Unable to publish listing. Please try again.",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardChanges = useCallback(() => {
    if (!initialForm) return;
    setTitle(initialForm.title);
    setDescription(initialForm.description);
    setPrice(initialForm.price);
    setCategory(initialForm.category);
    setCondition(initialForm.condition);
    setLocation(initialForm.location);
    setCurrency(initialForm.currency);
    setPhotos(initialForm.photos);
    setShowErrors(false);
    setValidation({
      title: true,
      price: true,
      description: true,
      location: initialForm.location.trim().length > 0,
    });
  }, [initialForm]);

  if (isLoading) {
    return (
      <AppScreen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadListing("refresh")}
              tintColor={theme.primary}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t("addListing.title")}</Text>
            <Text style={styles.subtitle}>{t("addListing.subtitle")}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("addListing.photos.title")}</Text>
              <Text style={styles.sectionHint}>{t("addListing.photos.hint")}</Text>
            </View>
            <View style={styles.photoGrid}>
              {PHOTO_SLOTS.map((slot, index) => (
                <TouchableOpacity
                  key={slot}
                  style={styles.photoSlot}
                  onPress={() => handlePickPhoto(index)}
                >
                  {photos[index] ? (
                    <>
                      <Image source={{ uri: photos[index]! }} style={styles.photoImage} />
                      {index === 0 ? (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>Primary</Text>
                        </View>
                      ) : null}
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => removePhoto(index)}
                      >
                        <Text style={styles.removePhotoLabel}>×</Text>
                      </TouchableOpacity>
                      <View style={styles.photoControls}>
                        <TouchableOpacity
                          style={[
                            styles.photoControlButton,
                            index === 0 && styles.photoControlDisabled,
                          ]}
                          onPress={() => movePhoto(index, "left")}
                          disabled={index === 0}
                        >
                          <Text style={styles.photoControlLabel}>◀</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.photoControlButton,
                            index === photos.length - 1 && styles.photoControlDisabled,
                          ]}
                          onPress={() => movePhoto(index, "right")}
                          disabled={index === photos.length - 1}
                        >
                          <Text style={styles.photoControlLabel}>▶</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <FontAwesome name="camera" size={20} color={theme.textMuted} />
                      <Text style={styles.photoSlotLabel}>
                        {t("addListing.photos.add")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <ValidatedInput
              label={t("addListing.fields.title")}
              placeholder={t("addListing.fields.titlePlaceholder")}
              value={title}
              onChangeText={setTitle}
              validators={titleValidators}
              validationContext={{ label: t("addListing.fields.title") }}
              validateOnChange
              showErrors={showErrors}
              onValidationChange={(result) =>
                setValidation((prev) => ({ ...prev, title: result.valid }))
              }
            />
          </View>

          <View style={[styles.section, styles.row]}>
            <View style={{ flex: 1 }}>
              <ValidatedInput
                label={t("addListing.fields.price")}
                placeholder={t("addListing.fields.pricePlaceholder")}
                keyboardType="decimal-pad"
                value={price}
                onChangeText={(text) => setPrice(normalizePriceInput(text))}
                validators={priceValidators}
                validationContext={{ label: t("addListing.fields.price") }}
                validateOnChange
                showErrors={showErrors}
                onValidationChange={(result) =>
                  setValidation((prev) => ({ ...prev, price: result.valid }))
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.menuField}>
                <Text style={styles.label}>{t("addListing.fields.location")}</Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setDistrictMenuVisible((prev) => !prev)}
                  style={styles.menuButton}
                >
                  <Text style={styles.menuButtonLabel}>
                    {location || t("addListing.fields.locationPlaceholder")}
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
                        <Text style={styles.modalTitle}>
                          {t("addListing.fields.locationPlaceholder")}
                        </Text>
                      </View>
                      <FlatList
                        data={districtOptions}
                        keyExtractor={(item) => item.id}
                        style={styles.modalList}
                        contentContainerStyle={styles.menuListContent}
                        showsVerticalScrollIndicator
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => {
                          const isActive = item.id === location;
                          return (
                            <TouchableOpacity
                              onPress={() =>
                                handleDistrictChange(item.id as DistrictId)
                              }
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
            </View>
          </View>
          {showErrors && !validation.location ? (
            <Text style={styles.errorText}>
              {t("common.errors.required", { defaultValue: "City is required." })}
            </Text>
          ) : null}

          <View style={styles.section}>
            <ChipPicker
              label={t("addListing.fields.category")}
              options={categories}
              value={category}
              onChange={setCategory}
            />
          </View>

          <View style={styles.section}>
            <ChipPicker
              label={t("addListing.fields.condition")}
              options={conditionOptions}
              value={condition}
              onChange={setCondition}
            />
          </View>

          <View style={styles.section}>
            <ChipPicker
              label={t("addListing.fields.currency")}
              options={currencyOptions}
              value={currency}
              onChange={setCurrency}
            />
          </View>

          <View style={styles.section}>
            <ValidatedInput
              label={t("addListing.fields.description")}
              style={styles.descriptionInput}
              placeholder={t("addListing.fields.descriptionPlaceholder")}
              value={description}
              onChangeText={setDescription}
              multiline
              validators={descriptionValidators}
              validationContext={{ label: t("addListing.fields.description") }}
              validateOnChange
              showErrors={showErrors}
              onValidationChange={(result) =>
                setValidation((prev) => ({
                  ...prev,
                  description: result.valid,
                }))
              }
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {id ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleDiscardChanges}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryButtonLabel}>Discard changes</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isFormValid || isSubmitting) && styles.submitDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            <Text style={styles.submitLabel}>
              {isSubmitting
                ? t("common.actions.publishing")
                : id
                  ? t("common.actions.save", { defaultValue: "Save changes" })
                  : t("common.actions.publishListing")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: 20,
      gap: 16,
    },
    header: {
      gap: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
    },
    subtitle: {
      fontSize: 15,
      color: theme.textMuted,
      lineHeight: 20,
    },
    section: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
      gap: 12,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    sectionHint: {
      fontSize: 13,
      color: theme.textMuted,
    },
    photoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    photoSlot: {
      width: "30%",
      aspectRatio: 1,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.surfaceMuted,
      overflow: "hidden",
    },
    photoSlotLabel: {
      fontSize: 13,
      color: theme.textMuted,
    },
    photoImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    photoControls: {
      position: "absolute",
      bottom: 6,
      right: 6,
      flexDirection: "row",
      gap: 6,
    },
    photoControlButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
    photoControlDisabled: {
      opacity: 0.4,
    },
    photoControlLabel: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
    removePhotoButton: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#E11D48",
    },
    removePhotoLabel: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 18,
    },
    primaryBadge: {
      position: "absolute",
      top: 6,
      left: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    primaryBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#fff",
    },
    descriptionInput: {
      height: 120,
      textAlignVertical: "top",
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    menuField: {
      gap: 6,
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
    footer: {
      padding: 20,
      paddingBottom: 28,
      backgroundColor: theme.background,
      gap: 12,
    },
    secondaryButton: {
      width: "100%",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      paddingVertical: 14,
      alignItems: "center",
    },
    secondaryButtonLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
    },
    submitButton: {
      width: "100%",
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
  });
