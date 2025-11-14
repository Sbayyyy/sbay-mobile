import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type Option<T extends string> = {
  id: T;
  label: string;
};

type ChipPickerProps<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (id: T) => void;
  style?: ViewStyle;
};

export function ChipPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  style,
}: ChipPickerProps<T>) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const isActive = value === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onChange(option.id)}
            >
              <Text
                style={[styles.chipLabel, isActive && styles.chipLabelActive]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  row: {
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
    backgroundColor: "#fff",
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
});
