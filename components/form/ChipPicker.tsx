import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import {
  MarketplaceRadius,
  MarketplaceSpacing,
  MarketplaceTypography,
} from "@/constants/theme";
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
    gap: MarketplaceSpacing.sm,
  },
  label: {
    fontSize: MarketplaceTypography.body,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: MarketplaceSpacing.sm,
  },
  chip: {
    minHeight: 36,
    borderRadius: MarketplaceRadius.pill,
    paddingHorizontal: MarketplaceSpacing.md,
    paddingVertical: MarketplaceSpacing.sm,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: MarketplaceTypography.bodySmall,
    fontWeight: "700",
  },
});
