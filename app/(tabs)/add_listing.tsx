import { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";
import { AppScreen } from "@/components/layout/AppScreen";
import { ChipPicker } from "@/components/form/ChipPicker";
import {
  ADD_LISTING_CATEGORIES,
  CURRENCY_OPTIONS,
  LISTING_CONDITIONS,
  PHOTO_SLOTS,
} from "@/constants/mockData";
import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";

const currencyOptions = Array.from(CURRENCY_OPTIONS).map((item) => ({
  id: item,
  label: item,
}));

type ConditionId = (typeof LISTING_CONDITIONS)[number];

export default function AddListingScreen() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(ADD_LISTING_CATEGORIES[0].id);
  const [condition, setCondition] = useState<ConditionId>(LISTING_CONDITIONS[0]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState(currencyOptions[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const theme = useAppTheme();
  const { t } = useTranslation();
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

  const isFormValid = useMemo(() => {
    return title.trim().length > 0 && price.trim().length > 0;
  }, [price, title]);

  const handleSubmit = () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 1500);
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
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
              {PHOTO_SLOTS.map((slot) => (
                <TouchableOpacity key={slot} style={styles.photoSlot}>
                  <FontAwesome name="camera" size={20} color={theme.textMuted} />
                  <Text style={styles.photoSlotLabel}>{t("addListing.photos.add")}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.inputLabel}>{t("addListing.fields.title")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("addListing.fields.titlePlaceholder")}
              placeholderTextColor={theme.inputPlaceholder}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={[styles.section, styles.row]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t("addListing.fields.price")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("addListing.fields.pricePlaceholder")}
                placeholderTextColor={theme.inputPlaceholder}
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t("addListing.fields.location")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("addListing.fields.locationPlaceholder")}
                placeholderTextColor={theme.inputPlaceholder}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

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
            <Text style={styles.inputLabel}>{t("addListing.fields.description")}</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder={t("addListing.fields.descriptionPlaceholder")}
              placeholderTextColor={theme.inputPlaceholder}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
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
                : t("common.actions.publishListing")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
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
    },
    photoSlotLabel: {
      fontSize: 13,
      color: theme.textMuted,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    input: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
      backgroundColor: theme.surface,
    },
    descriptionInput: {
      height: 120,
      textAlignVertical: "top",
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    footer: {
      padding: 20,
      paddingBottom: 28,
      backgroundColor: theme.background,
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
