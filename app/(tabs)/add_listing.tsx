import { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

const categories = [
  { id: "electronics", label: "Electronics" },
  { id: "fashion", label: "Fashion" },
  { id: "home", label: "Home" },
  { id: "sports", label: "Sports" },
  { id: "toys", label: "Toys" },
];

const conditions = ["New", "Like New", "Good", "Fair"];

const currencyOptions = ["SYP", "USD", "EUR"];

const photoSlots = Array.from({ length: 5 }, (_, index) => index + 1);

export default function AddListingScreen() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(categories[0].id);
  const [condition, setCondition] = useState(conditions[0]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState(currencyOptions[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = useMemo(() => {
    return title.trim().length > 0 && price.trim().length > 0;
  }, [price, title]);

  const handleSubmit = () => {
    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
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
            {photoSlots.map((slot) => (
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
          <Text style={styles.inputLabel}>Currency</Text>
          <View style={styles.chipRow}>
            {currencyOptions.map((item) => {
              const isActive = currency === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setCurrency(item)}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      isActive && styles.chipLabelActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.chipRow}>
            {categories.map((item) => {
              const isActive = category === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.chip,
                    isActive && styles.chipActive,
                  ]}
                  onPress={() => setCategory(item.id)}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      isActive && styles.chipLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.inputLabel}>Condition</Text>
          <View style={styles.chipRow}>
            {conditions.map((item) => {
              const isActive = condition === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chip,
                    isActive && styles.chipActive,
                  ]}
                  onPress={() => setCondition(item)}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      isActive && styles.chipLabelActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Describe your item, its condition, and any extras"
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isFormValid || isSubmitting) && styles.submitDisabled,
            ]}
            disabled={!isFormValid || isSubmitting}
            onPress={handleSubmit}
          >
            <Text style={styles.submitLabel}>
              {!isFormValid
                ? "Add title and price to continue"
                : isSubmitting
                ? "Submitting..."
                : "Publish listing"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 24,
  },
  header: {
    gap: 6,
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
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  chipLabelActive: {
    color: "#1d4ed8",
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
