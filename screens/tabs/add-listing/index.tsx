import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  I18nManager,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppScreen } from "@/components/layout/AppScreen";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { ChipPicker } from "@/components/form/ChipPicker";
import { ValidatedInput } from "@/components/ValidatedInput";
import {
  ADD_LISTING_CATEGORIES,
  CURRENCY_OPTIONS,
  LISTING_CONDITIONS,
  PHOTO_SLOTS,
} from "@/constants/mockData";
import {
  getRegionLabel,
  normalizeRegion,
  SYRIA_REGION_OPTIONS,
  type SyriaRegionId,
} from "@/constants/regions";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  MarketplaceRadius,
  MarketplaceShadow,
  MarketplaceSpacing,
  MarketplaceTypography,
  type ThemeColors,
} from "@/constants/theme";
import {
  createListing,
  getListing,
  updateListing,
  type CreateListingPayload,
  type UpdateListingPayload,
} from "@/services/listings";
import {
  createBoostPayment,
  getBoostOptions,
  type BoostOption,
} from "@/services/monetization";
import { clearCache } from "@/services/cache";
import { uploadImageAsync } from "@/services/uploads";
import { type TextValidator, validateSafeText } from "@/validation";
import { useAuth } from "@/providers/AuthProvider";
import { useAppPopup } from "@/providers/AppPopupProvider";
import { getMyProfile, type UserProfile } from "@/services/user";
import {
  isEmailVerified,
  isUnverifiedEmailError,
  showEmailVerificationRequiredAlert,
} from "@/services/email-verification";
import { getActionErrorMessage } from "@/services/account-status-errors";

const currencyOptions = Array.from(CURRENCY_OPTIONS).map((item) => ({
  id: item,
  label: item,
}));
type CurrencyId = (typeof CURRENCY_OPTIONS)[number];

type ConditionId = (typeof LISTING_CONDITIONS)[number];
type DistrictId = SyriaRegionId | "";

export default function AddListingScreen() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(ADD_LISTING_CATEGORIES[0].id);
  const [condition, setCondition] = useState<ConditionId>(LISTING_CONDITIONS[0]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<DistrictId>("");
  const [districtMenuVisible, setDistrictMenuVisible] = useState(false);
  const [currency, setCurrency] = useState<CurrencyId>(currencyOptions[0].id);
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
    currency: CurrencyId;
    photos: (string | null)[];
  } | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<{ uri: string; index: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [boostAfterPublish, setBoostAfterPublish] = useState(false);
  const [boostOptions, setBoostOptions] = useState<BoostOption[]>([]);
  const [selectedBoostOptionId, setSelectedBoostOptionId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [validation, setValidation] = useState({
    title: true,
    price: true,
    description: true,
    location: true,
  });
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { status } = useAuth();
  const { showError, showSuccess } = useAppPopup();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const previousPhotoIcon = I18nManager.isRTL ? "chevron-right" : "chevron-left";
  const nextPhotoIcon = I18nManager.isRTL ? "chevron-left" : "chevron-right";

  const resetCreateForm = useCallback(() => {
    setTitle("");
    setPrice("");
    setCategory(ADD_LISTING_CATEGORIES[0].id);
    setCondition(LISTING_CONDITIONS[0]);
    setDescription("");
    setLocation("");
    setDistrictMenuVisible(false);
    setCurrency(currencyOptions[0].id);
    setPhotos(Array(PHOTO_SLOTS.length).fill(null));
    setInitialForm(null);
    setShowErrors(false);
    setBoostAfterPublish(false);
    setSelectedBoostOptionId(null);
    setValidation({
      title: true,
      price: true,
      description: true,
      location: false,
    });
  }, []);

  const hasInitializedRef = useRef(false);

  // Reset only on screen unmount so camera return doesn't re-trigger form reset
  useEffect(() => {
    return () => {
      hasInitializedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (id) return undefined;
      if (hasInitializedRef.current) return undefined;
      hasInitializedRef.current = true;
      resetCreateForm();
      return undefined;
    }, [id, mode, resetCreateForm]),
  );

  const categories = useMemo(() => {
    return ADD_LISTING_CATEGORIES.map((item) => ({
      ...item,
      label: t(item.translationKey ?? `categories.${item.id}`, {
        defaultValue: item.label,
      }),
    }));
  }, [t]);

  const districtOptions = useMemo(
    () =>
      SYRIA_REGION_OPTIONS.map((district) => ({
        id: district.id,
        label: t(district.labelKey, { defaultValue: district.id }),
      })),
    [t],
  );

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

  const validateListingText = useCallback(
    (value: string, label: string, options: { minLength?: number; maxLength: number }) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return t("common.errors.required", {
          defaultValue: `${label} is required.`,
        });
      }
      if (options.minLength && trimmed.length < options.minLength) {
        return t("common.errors.minLength", {
          defaultValue: `${label} must be at least ${options.minLength} characters.`,
          field: label,
          count: options.minLength,
        });
      }
      if (trimmed.length > options.maxLength) {
        return t("common.errors.maxLength", {
          defaultValue: `${label} must be ${options.maxLength} characters or less.`,
          field: label,
          count: options.maxLength,
        });
      }
      const safe = validateSafeText(trimmed);
      if (!safe.valid) {
        return t("common.errors.unsafeText", {
          defaultValue: `${label} contains disallowed content. Remove links, scripts, or SQL-like commands.`,
          field: label,
        });
      }
      return null;
    },
    [t],
  );

  const formErrors = useMemo(() => {
    const titleLabel = t("addListing.fields.title", { defaultValue: "Listing title" });
    const descriptionLabel = t("addListing.fields.description", { defaultValue: "Description" });
    const priceLabel = t("addListing.fields.price", { defaultValue: "Price" });
    const normalizedPrice = normalizePriceInput(price);
    const amount = Number(normalizedPrice);
    const next = {
      title: validateListingText(title, titleLabel, { minLength: 3, maxLength: 80 }),
      price: null as string | null,
      description: validateListingText(description, descriptionLabel, { minLength: 20, maxLength: 2000 }),
      location: location.trim()
        ? null
        : t("common.errors.required", {
            defaultValue: `${t("addListing.fields.location", { defaultValue: "Location" })} is required.`,
          }),
    };

    if (!normalizedPrice.trim()) {
      next.price = t("common.errors.required", {
        defaultValue: `${priceLabel} is required.`,
      });
    } else if (!Number.isFinite(amount) || amount <= 0) {
      next.price = t("common.errors.invalidNumber", {
        defaultValue: "Enter a valid price greater than zero.",
      });
    } else if (amount > 1_000_000_000) {
      next.price = t("common.errors.maxPrice", {
        defaultValue: "Enter a lower price.",
      });
    }

    return next;
  }, [description, location, price, t, title, validateListingText]);

  const firstFormError = useMemo(
    () => Object.values(formErrors).find(Boolean) ?? null,
    [formErrors],
  );

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

  const makeListingTextValidator = useCallback(
    (label: string, options: { minLength?: number; maxLength: number }): TextValidator => ({
      validate: (value) => {
        const message = validateListingText(value, label, options);
        return message
          ? { valid: false, issues: [{ message }] }
          : { valid: true, issues: [] };
      },
    }),
    [validateListingText],
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
        if (amount > 1_000_000_000) {
          return {
            valid: false,
            issues: [
              {
                message: t("common.errors.maxPrice", {
                  defaultValue: "Enter a lower price.",
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

  const titleValidators = useMemo(
    () => [
      makeListingTextValidator(t("addListing.fields.title", { defaultValue: "Listing title" }), {
        minLength: 3,
        maxLength: 80,
      }),
    ],
    [makeListingTextValidator, t],
  );
  const descriptionValidators = useMemo(
    () => [
      makeListingTextValidator(t("addListing.fields.description", { defaultValue: "Description" }), {
        minLength: 20,
        maxLength: 2000,
      }),
    ],
    [makeListingTextValidator, t],
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
          const nextLocation = normalizeRegion(listing.region);
          const nextCurrency = (listing.priceCurrency ?? currencyOptions[0].id) as CurrencyId;
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
          showError(
            error instanceof Error
              ? error.message
              : t("addListing.error", {
                  defaultValue: "Unable to load listing.",
                }),
            t("common.errors.title", { defaultValue: "Something went wrong" }),
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
    if (id) return;
    let isMounted = true;
    getBoostOptions()
      .then((options) => {
        if (!isMounted) return;
        setBoostOptions(options);
        setSelectedBoostOptionId((current) => current ?? options[0]?.id ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setBoostOptions([]);
        setSelectedBoostOptionId(null);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    if (status !== "authenticated") {
      setProfile(null);
      return () => {
        isMounted = false;
      };
    }

    getMyProfile()
      .then((data) => {
        if (!isMounted) return;
        setProfile(data);
      })
      .catch(() => {
        if (!isMounted) return;
        setProfile(null);
      });

    return () => {
      isMounted = false;
    };
  }, [status]);

  useEffect(() => {
    setValidation((prev) => ({ ...prev, location: location.trim().length > 0 }));
  }, [location]);

  const isFormValid = useMemo(() => {
    return (
      !firstFormError &&
      validation.title &&
      validation.price &&
      validation.description &&
      validation.location
    );
  }, [firstFormError, validation]);

  const selectedBoostOption = useMemo(
    () =>
      boostOptions.find((option) => option.id === selectedBoostOptionId) ??
      boostOptions[0] ??
      null,
    [boostOptions, selectedBoostOptionId],
  );
  const readinessSteps = useMemo(
    () => [
      {
        key: "photos",
        label: t("addListing.progress.photos", { defaultValue: "Photos" }),
        complete: photos.some(Boolean),
      },
      {
        key: "title",
        label: t("addListing.progress.titleStep", { defaultValue: "Title" }),
        complete: title.trim().length > 0 && !formErrors.title,
      },
      {
        key: "price",
        label: t("addListing.progress.price", { defaultValue: "Price" }),
        complete: price.trim().length > 0 && !formErrors.price,
      },
      {
        key: "location",
        label: t("addListing.progress.location", { defaultValue: "Location" }),
        complete: location.trim().length > 0 && !formErrors.location,
      },
      {
        key: "description",
        label: t("addListing.progress.description", { defaultValue: "Description" }),
        complete: description.trim().length > 0 && !formErrors.description,
      },
    ],
    [description, formErrors, location, photos, price, t, title],
  );
  const completedReadinessSteps = readinessSteps.filter((step) => step.complete).length;
  const readinessPercent = Math.round((completedReadinessSteps / readinessSteps.length) * 100);

  const handleDistrictChange = useCallback((nextDistrict: DistrictId) => {
    setLocation(nextDistrict);
    setDistrictMenuVisible(false);
  }, []);

  const addPhotoAtIndex = useCallback((index: number, uri: string) => {
    setPhotos((prev) => {
      const filled = prev.filter(Boolean) as string[];
      const next = [...filled, ...Array(prev.length - filled.length).fill(null)];
      next[index] = uri;
      const compacted = next.filter(Boolean) as string[];
      return [...compacted, ...Array(prev.length - compacted.length).fill(null)];
    });
  }, []);

  const pickFromLibrary = useCallback(async (index: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t("common.errors.permissionTitle", { defaultValue: "Permission needed" }),
        t("common.errors.permissionPhotos", { defaultValue: "Please allow photo access to continue." }),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: PHOTO_SLOTS.length,
    });
    if (result.canceled || result.assets.length === 0) return;
    result.assets.forEach((asset, i) => {
      addPhotoAtIndex(index + i, asset.uri);
    });
  }, [t, addPhotoAtIndex]);

  const pickFromCamera = useCallback(async (index: number) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t("common.errors.permissionTitle", { defaultValue: "Permission needed" }),
        t("common.errors.permissionCamera", { defaultValue: "Please allow camera access to continue." }),
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    setPendingPhoto({ uri: result.assets[0].uri, index });
  }, [t]);

  const handlePickPhoto = useCallback((index: number) => {
    Alert.alert(
      t("addListing.photos.sourceTitle", { defaultValue: "Add photo" }),
      undefined,
      [
        {
          text: t("addListing.photos.sourceCamera", { defaultValue: "Camera" }),
          onPress: () => { void pickFromCamera(index); },
        },
        {
          text: t("addListing.photos.sourceLibrary", { defaultValue: "Photo library" }),
          onPress: () => { void pickFromLibrary(index); },
        },
        {
          text: t("common.actions.cancel", { defaultValue: "Cancel" }),
          style: "cancel",
        },
      ],
    );
  }, [pickFromCamera, pickFromLibrary, t]);

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
    if (profile && !isEmailVerified(profile)) {
      showEmailVerificationRequiredAlert();
      return;
    }
    setIsSubmitting(true);

    try {
      const selectedPhotos = photos.filter(Boolean) as string[];
      const initialPhotos = initialForm?.photos.filter(Boolean) as string[] | undefined;
      const photosChanged =
        !id ||
        !initialPhotos ||
        selectedPhotos.length !== initialPhotos.length ||
        selectedPhotos.some((uri, index) => uri !== initialPhotos[index]);
      const uploadedUrls = photosChanged
        ? await Promise.all(
          selectedPhotos.map(async (uri, index) => {
          if (uri.startsWith("http://") || uri.startsWith("https://")) {
            return uri;
          }
          const name = `listing-${Date.now()}-${index}.jpg`;
          return uploadImageAsync(uri, name, "image/jpeg");
          }),
        )
        : selectedPhotos;

      const payload: CreateListingPayload = {
        title: title.trim(),
        description: description.trim(),
        priceAmount: Number(price),
        priceCurrency: currency,
        categoryPath: category,
        condition: conditionMap[condition],
        region: normalizeRegion(location) || undefined,
        stock: 1,
        imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      };

      const updatePayload: UpdateListingPayload = {};
      if (id) {
        const nextTitle = title.trim();
        const nextDescription = description.trim();
        const nextPrice = Number(price);
        const nextLocation = normalizeRegion(location);
        updatePayload.title = nextTitle;
        updatePayload.description = nextDescription;
        updatePayload.priceAmount = nextPrice;
        updatePayload.priceCurrency = currency;
        updatePayload.categoryPath = category;
        updatePayload.condition = conditionMap[condition];
        updatePayload.region = nextLocation || undefined;
        if (photosChanged) updatePayload.imageUrls = uploadedUrls;
      }

      const listing = id
        ? await updateListing(id, updatePayload)
        : await createListing(payload);

      if (!id) {
        void Promise.all([
          clearCache("listings.all"),
          clearCache("listings.featured"),
        ]).catch(() => {});
      }

      if (!id && boostAfterPublish && selectedBoostOption) {
        const transaction = await createBoostPayment(listing.id, selectedBoostOption.id, `/listings/${listing.id}`);
        if (transaction.checkoutUrl) {
          await Linking.openURL(transaction.checkoutUrl);
          showSuccess(
            t("addListing.successWithBoostCheckout", {
              defaultValue:
                "Your listing is published. Complete payment to activate the boost.",
            }),
            t("common.actions.success", { defaultValue: "Success" }),
          );
        } else {
          showSuccess(
            t("addListing.successWithBoostPending", {
              defaultValue:
                "Your listing is published. The boost will activate after payment is confirmed.",
            }),
            t("common.actions.success", { defaultValue: "Success" }),
          );
        }
      } else {
        showSuccess(
          id
            ? t("addListing.messages.updated", {
                defaultValue: "Your listing has been updated.",
              })
            : t("addListing.messages.published", {
                defaultValue: "Your listing has been published. It may take a few minutes to appear on the home screen.",
              }),
          t("common.actions.success", { defaultValue: "Success" }),
        );
      }
      router.replace(`/listings/${listing.id}`);
    } catch (error) {
      console.error("Error creating listing:", error);
      if ((!profile || !isEmailVerified(profile)) && isUnverifiedEmailError(error)) {
        showEmailVerificationRequiredAlert();
        return;
      }
      showError(
        getActionErrorMessage(
          error,
          t("addListing.error", {
            defaultValue: "Unable to publish listing. Please try again.",
          }),
        ),
        t("common.errors.title", { defaultValue: "Something went wrong" }),
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

  if (status === "loading") {
    return (
      <AppScreen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </AppScreen>
    );
  }

  if (status !== "authenticated") {
    return (
      <AppScreen>
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>{t("addListing.authRequiredTitle")}</Text>
          <Text style={styles.authSubtitle}>{t("addListing.authRequiredSubtitle")}</Text>
          <TouchableOpacity style={styles.authPrimaryButton} onPress={() => router.push("/sign-in")}>
            <Text style={styles.authPrimaryLabel}>{t("common.actions.logIn")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.authSecondaryButton} onPress={() => router.push("/sign-up")}>
            <Text style={styles.authSecondaryLabel}>{t("common.actions.createAccount")}</Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

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

          {profile && !isEmailVerified(profile) ? <EmailVerificationBanner /> : null}

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>
                {t("addListing.progress.title", { defaultValue: "Listing readiness" })}
              </Text>
              <Text style={styles.progressCount}>
                {completedReadinessSteps}/{readinessSteps.length}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${readinessPercent}%` }]} />
            </View>
            <View style={styles.progressSteps}>
              {readinessSteps.map((step) => (
                <View
                  key={step.key}
                  style={[styles.progressStep, step.complete && styles.progressStepComplete]}
                >
                  <FontAwesome
                    name={step.complete ? "check-circle" : "circle-o"}
                    size={13}
                    color={step.complete ? theme.success : theme.textSubtle}
                  />
                  <Text
                    style={[
                      styles.progressStepLabel,
                      step.complete && styles.progressStepLabelComplete,
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
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
                          <Text style={styles.primaryBadgeText}>
                            {t("addListing.photos.primary", { defaultValue: "Primary" })}
                          </Text>
                        </View>
                      ) : null}
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => removePhoto(index)}
                        accessibilityLabel={t("addListing.photos.remove", {
                          defaultValue: "Remove photo",
                        })}
                      >
                        <FontAwesome name="times" size={14} color="#fff" />
                      </TouchableOpacity>
                      <View style={styles.photoControls}>
                        <TouchableOpacity
                          style={[
                            styles.photoControlButton,
                            index === 0 && styles.photoControlDisabled,
                          ]}
                          onPress={() => movePhoto(index, "left")}
                          disabled={index === 0}
                          accessibilityLabel={t("addListing.photos.moveEarlier", {
                            defaultValue: "Move photo earlier",
                          })}
                        >
                          <FontAwesome name={previousPhotoIcon} size={12} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.photoControlButton,
                            index === photos.length - 1 && styles.photoControlDisabled,
                          ]}
                          onPress={() => movePhoto(index, "right")}
                          disabled={index === photos.length - 1}
                          accessibilityLabel={t("addListing.photos.moveLater", {
                            defaultValue: "Move photo later",
                          })}
                        >
                          <FontAwesome name={nextPhotoIcon} size={12} color="#fff" />
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
              helperText={t("addListing.fields.titleHint", {
                defaultValue: "Use 3 to 80 characters. Example: iPhone 13 Pro, 128GB.",
              })}
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

          <View style={[styles.section, styles.priceCurrencyRow]}>
            <View style={styles.priceField}>
              <ValidatedInput
                label={t("addListing.fields.price")}
                helperText={t("addListing.fields.priceHint", {
                  defaultValue: "Enter numbers only. Decimals are allowed.",
                })}
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
            <View style={styles.currencyField}>
              <ChipPicker
                label={t("addListing.fields.currency")}
                options={currencyOptions}
                value={currency}
                onChange={setCurrency}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.menuField}>
              <Text style={styles.label}>{t("addListing.fields.location")}</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setDistrictMenuVisible((prev) => !prev)}
                style={styles.menuButton}
              >
                <Text style={styles.menuButtonLabel}>
                  {getRegionLabel(location, t) ?? t("addListing.fields.locationPlaceholder")}
                </Text>
                <Text style={styles.menuChevron}>
                  {districtMenuVisible ? "^" : "v"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.fieldHint}>
                {t("addListing.fields.locationHint", {
                  defaultValue: "Choose the city or region where the item is available.",
                })}
              </Text>
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
          {showErrors && formErrors.location ? (
            <Text style={styles.errorText}>
              {formErrors.location}
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
            <ValidatedInput
              label={t("addListing.fields.description")}
              helperText={t("addListing.fields.descriptionHint", {
                defaultValue: "Use at least 20 characters. Include condition, size, and what is included.",
              })}
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

          {!id ? (
            <View style={styles.section}>
              <View style={styles.boostHeaderRow}>
                <View style={styles.boostOptionCopy}>
                <Text style={styles.boostOptionTitle}>
                  {t("addListing.boost.title", {
                    defaultValue: "Boost this listing after publishing",
                  })}
                </Text>
                <Text style={styles.boostOptionSubtitle}>
                  {boostOptions.length > 0
                    ? t("addListing.boost.subtitle", {
                        defaultValue:
                          "Choose a promotion length. The boost activates only after payment is confirmed.",
                      })
                    : t("addListing.boost.unavailable", {
                        defaultValue: "Boost options are not available right now.",
                      })}
                </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.boostSwitch,
                    boostAfterPublish && styles.boostSwitchActive,
                    boostOptions.length === 0 && styles.boostSwitchDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setBoostAfterPublish((value) => !value)}
                  disabled={boostOptions.length === 0}
                >
                  <View
                    style={[
                      styles.boostSwitchKnob,
                      boostAfterPublish && styles.boostSwitchKnobActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>
              {boostOptions.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.boostPlansRow}
                >
                  {boostOptions.map((option) => {
                    const selected = boostAfterPublish && selectedBoostOption?.id === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.boostPlanCard,
                          selected && styles.boostPlanCardActive,
                        ]}
                        activeOpacity={0.88}
                        onPress={() => {
                          setBoostAfterPublish(true);
                          setSelectedBoostOptionId(option.id);
                        }}
                      >
                        <Text
                          style={[
                            styles.boostPlanDays,
                            selected && styles.boostPlanTextActive,
                          ]}
                        >
                          {t("addListing.boost.days", {
                            defaultValue: `${option.durationDays} days`,
                            days: option.durationDays,
                          })}
                        </Text>
                        <Text
                          style={[
                            styles.boostPlanPrice,
                            selected && styles.boostPlanTextActive,
                          ]}
                        >
                          {option.currency} {option.price}
                        </Text>
                        <Text
                          style={[
                            styles.boostPlanMeta,
                            selected && styles.boostPlanTextActive,
                          ]}
                        >
                          {option.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {showErrors && firstFormError ? (
            <View style={styles.validationBanner}>
              <Text style={styles.validationBannerTitle}>
                {t("common.errors.fixFieldsTitle", { defaultValue: "Check the highlighted fields" })}
              </Text>
              <Text style={styles.validationBannerText}>{firstFormError}</Text>
            </View>
          ) : null}
          {id ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleDiscardChanges}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryButtonLabel}>
                {t("common.actions.discardChanges", { defaultValue: "Discard changes" })}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitLabel}>
              {isSubmitting
                ? boostAfterPublish && !id
                  ? t("addListing.boost.creatingPayment", {
                      defaultValue: "Publishing and creating payment...",
                    })
                  : t("common.actions.publishing")
                : id
                  ? t("common.actions.save", { defaultValue: "Save changes" })
                  : t("common.actions.publishListing")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={pendingPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingPhoto(null)}
      >
        <View style={styles.photoPreviewBackdrop}>
          <View style={styles.photoPreviewCard}>
            {pendingPhoto ? (
              <Image
                source={{ uri: pendingPhoto.uri }}
                style={styles.photoPreviewImage}
                resizeMode="contain"
              />
            ) : null}
            <View style={styles.photoPreviewActions}>
              <TouchableOpacity
                style={styles.photoPreviewCancel}
                onPress={() => setPendingPhoto(null)}
              >
                <Text style={styles.photoPreviewCancelLabel}>
                  {t("common.actions.cancel", { defaultValue: "Cancel" })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoPreviewConfirm}
                onPress={() => {
                  if (pendingPhoto) {
                    addPhotoAtIndex(pendingPhoto.index, pendingPhoto.uri);
                    setPendingPhoto(null);
                  }
                }}
              >
                <Text style={styles.photoPreviewConfirmLabel}>
                  {t("addListing.photos.usePhoto", { defaultValue: "Use photo" })}
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
      flex: 1,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    authContainer: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      gap: 14,
      backgroundColor: theme.background,
    },
    authTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
    },
    authSubtitle: {
      fontSize: 15,
      color: theme.textMuted,
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 8,
    },
    authPrimaryButton: {
      borderRadius: 16,
      backgroundColor: theme.primary,
      paddingVertical: 15,
      alignItems: "center",
    },
    authPrimaryLabel: {
      color: theme.primaryForeground,
      fontSize: 15,
      fontWeight: "700",
    },
    authSecondaryButton: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      paddingVertical: 15,
      alignItems: "center",
    },
    authSecondaryLabel: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    content: {
      padding: MarketplaceSpacing.lg,
      gap: MarketplaceSpacing.md,
    },
    header: {
      gap: MarketplaceSpacing.xs,
    },
    title: {
      fontSize: MarketplaceTypography.screenTitle,
      fontWeight: "800",
      color: theme.text,
    },
    subtitle: {
      fontSize: 15,
      color: theme.textMuted,
      lineHeight: 20,
    },
    progressCard: {
      borderRadius: MarketplaceRadius.card,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      padding: MarketplaceSpacing.lg,
      gap: MarketplaceSpacing.md,
      shadowColor: theme.shadow,
      ...MarketplaceShadow.subtle,
    },
    progressHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: MarketplaceSpacing.md,
    },
    progressTitle: {
      flex: 1,
      fontSize: MarketplaceTypography.input,
      fontWeight: "800",
      color: theme.text,
    },
    progressCount: {
      fontSize: MarketplaceTypography.bodySmall,
      fontWeight: "800",
      color: theme.primary,
    },
    progressTrack: {
      height: 7,
      borderRadius: MarketplaceRadius.pill,
      backgroundColor: theme.surfaceMuted,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: MarketplaceRadius.pill,
      backgroundColor: theme.primary,
    },
    progressSteps: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: MarketplaceSpacing.sm,
    },
    progressStep: {
      minHeight: 30,
      flexDirection: "row",
      alignItems: "center",
      gap: MarketplaceSpacing.xs,
      paddingHorizontal: MarketplaceSpacing.sm,
      paddingVertical: MarketplaceSpacing.xs,
      borderRadius: MarketplaceRadius.pill,
      backgroundColor: theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.border,
    },
    progressStepComplete: {
      backgroundColor: theme.successBackground,
      borderColor: theme.success,
    },
    progressStepLabel: {
      maxWidth: 92,
      fontSize: MarketplaceTypography.caption,
      fontWeight: "800",
      color: theme.textMuted,
    },
    progressStepLabelComplete: {
      color: theme.success,
    },
    section: {
      backgroundColor: theme.surface,
      borderRadius: MarketplaceRadius.card,
      padding: MarketplaceSpacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      ...MarketplaceShadow.subtle,
      gap: MarketplaceSpacing.md,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: MarketplaceTypography.input,
      fontWeight: "800",
      color: theme.text,
    },
    sectionHint: {
      fontSize: 13,
      color: theme.textMuted,
    },
    fieldHint: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 16,
    },
    photoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: MarketplaceSpacing.sm,
    },
    photoSlot: {
      width: "31%",
      aspectRatio: 1.08,
      borderRadius: MarketplaceRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
      gap: MarketplaceSpacing.xs,
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
      height: 108,
      textAlignVertical: "top",
    },
    row: {
      flexDirection: "row",
      gap: MarketplaceSpacing.md,
    },
    priceCurrencyRow: {
      flexDirection: "row",
      gap: MarketplaceSpacing.md,
      alignItems: "flex-start",
    },
    priceField: {
      flex: 1.2,
    },
    currencyField: {
      flex: 0.9,
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
      borderRadius: MarketplaceRadius.md,
      borderColor: theme.border,
      borderWidth: 1,
      backgroundColor: theme.surface,
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: theme.shadow,
      ...MarketplaceShadow.subtle,
    },
    menuButtonLabel: {
      color: theme.text,
      fontSize: 15,
      textAlign: I18nManager.isRTL ? "right" : "left",
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
      borderRadius: MarketplaceRadius.sheet,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      maxHeight: "70%",
      overflow: "hidden",
      shadowColor: theme.shadow,
      ...MarketplaceShadow.raised,
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
    photoPreviewBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.85)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    photoPreviewCard: {
      width: "100%",
      borderRadius: MarketplaceRadius.sheet,
      backgroundColor: theme.surface,
      overflow: "hidden",
      gap: 0,
    },
    photoPreviewImage: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor: theme.surfaceMuted,
    },
    photoPreviewActions: {
      flexDirection: "row",
      gap: MarketplaceSpacing.sm,
      padding: MarketplaceSpacing.md,
    },
    photoPreviewCancel: {
      flex: 1,
      borderRadius: MarketplaceRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceMuted,
      paddingVertical: MarketplaceSpacing.md,
      alignItems: "center",
    },
    photoPreviewCancelLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
    },
    photoPreviewConfirm: {
      flex: 1,
      borderRadius: MarketplaceRadius.lg,
      backgroundColor: theme.primary,
      paddingVertical: MarketplaceSpacing.md,
      alignItems: "center",
    },
    photoPreviewConfirmLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.primaryForeground,
    },
    footer: {
      padding: MarketplaceSpacing.lg,
      paddingBottom: 24,
      backgroundColor: theme.background,
      gap: MarketplaceSpacing.sm,
    },
    validationBanner: {
      borderRadius: MarketplaceRadius.lg,
      borderWidth: 1,
      borderColor: theme.danger,
      backgroundColor: theme.dangerBackground,
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.sm,
      gap: MarketplaceSpacing.xs,
    },
    validationBannerTitle: {
      color: theme.danger,
      fontSize: 13,
      fontWeight: "800",
    },
    validationBannerText: {
      color: theme.danger,
      fontSize: 12,
      lineHeight: 17,
    },
    secondaryButton: {
      width: "100%",
      borderRadius: MarketplaceRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      paddingVertical: MarketplaceSpacing.md,
      alignItems: "center",
    },
    secondaryButtonLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
    },
    submitButton: {
      width: "100%",
      borderRadius: MarketplaceRadius.lg,
      backgroundColor: theme.primary,
      paddingVertical: MarketplaceSpacing.md,
      alignItems: "center",
      shadowColor: theme.primary,
      ...MarketplaceShadow.card,
    },
    submitDisabled: {
      backgroundColor: theme.textSubtle,
      shadowOpacity: 0,
    },
    submitLabel: {
      fontSize: MarketplaceTypography.input,
      fontWeight: "800",
      color: theme.primaryForeground,
    },
    errorText: {
      color: theme.danger,
      fontSize: 12,
      lineHeight: 16,
    },
    boostHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    boostSwitch: {
      width: 46,
      height: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceMuted,
      padding: 3,
      justifyContent: "center",
    },
    boostSwitchActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    boostSwitchDisabled: {
      opacity: 0.5,
    },
    boostSwitchKnob: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.surface,
    },
    boostSwitchKnobActive: {
      alignSelf: "flex-end",
    },
    boostOptionCopy: {
      flex: 1,
      gap: 4,
    },
    boostOptionTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "700",
    },
    boostOptionSubtitle: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    boostPlansRow: {
      gap: 10,
      paddingTop: 2,
    },
    boostPlanCard: {
      width: 128,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceMuted,
      padding: 12,
      gap: 5,
    },
    boostPlanCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    boostPlanDays: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "800",
    },
    boostPlanPrice: {
      color: theme.success,
      fontSize: 13,
      fontWeight: "700",
    },
    boostPlanMeta: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },
    boostPlanTextActive: {
      color: theme.primaryForeground,
    },
  });
