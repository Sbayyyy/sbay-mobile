import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

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
  const theme = useAppTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const isActive = value === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.chip,
                {
                  borderColor: theme.chipBorder,
                  backgroundColor: theme.chipBackground,
                },
                isActive && {
                  backgroundColor: theme.chipActiveBackground,
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => onChange(option.id)}
            >
              <Text
                style={[
                  styles.chipLabel,
                  { color: theme.textSecondary },
                  isActive && { color: theme.chipActiveText },
                ]}
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
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
