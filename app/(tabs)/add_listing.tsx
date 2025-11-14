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
import { AppScreen } from "@/components/layout/AppScreen";
import { ChipPicker } from "@/components/form/ChipPicker";
import {
  ADD_LISTING_CATEGORIES,
  CURRENCY_OPTIONS,
  LISTING_CONDITIONS,
  PHOTO_SLOTS,
} from "@/constants/mockData";

const currencyOptions = Array.from(CURRENCY_OPTIONS).map((item) => ({
  id: item,
  label: item,
}));

const conditionOptions = Array.from(LISTING_CONDITIONS).map((item) => ({
  id: item,
  label: item,
}));

export default function AddListingScreen() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(ADD_LISTING_CATEGORIES[0].id);
  const [condition, setCondition] = useState(conditionOptions[0].id);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState(currencyOptions[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = useMemo(() => {
    return title.trim().length > 0 && price.trim().length > 0;
  }, [price, title]);

  const handleSubmit = () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 1500);
  };

  return (
    <AppScreen backgroundColor="#f9fafb">
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create a listing</Text>
            <Text style={styles.subtitle}>
              Add details so people can find and buy your item.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <Text style={styles.sectionHint}>Add up to 5 photos</Text>
            </View>
            <View style={styles.photoGrid}>
              {PHOTO_SLOTS.map((slot) => (
                <TouchableOpacity key={slot} style={styles.photoSlot}>
                  <FontAwesome name="camera" size={20} color="#6b7280" />
                  <Text style={styles.photoSlotLabel}>Add</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.inputLabel}>Listing title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Vintage record player"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={[styles.section, styles.row]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Price</Text>
              <TextInput
                style={styles.input}
                placeholder="$120"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="City, Country"
                placeholderTextColor="#9ca3af"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          <View style={styles.section}>
            <ChipPicker
              label="Category"
              options={ADD_LISTING_CATEGORIES}
              value={category}
              onChange={setCategory}
            />
          </View>

          <View style={styles.section}>
            <ChipPicker
              label="Condition"
              options={conditionOptions}
              value={condition}
              onChange={setCondition}
            />
          </View>

          <View style={styles.section}>
            <ChipPicker
              label="Currency"
              options={currencyOptions}
              value={currency}
              onChange={setCurrency}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Add details buyers should know"
              placeholderTextColor="#9ca3af"
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
              {isSubmitting ? "Publishing..." : "Publish listing"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
    color: "#111827",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#111827",
    shadowOpacity: 0.03,
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
    color: "#111827",
  },
  sectionHint: {
    fontSize: 13,
    color: "#6b7280",
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
    borderColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  photoSlotLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  input: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#f9fafb",
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
    backgroundColor: "#f9fafb",
  },
  submitButton: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#1d4ed8",
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  submitDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
