import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { memo } from "react";

export type FilterChipOption = {
  id: string;
  label: string;
  emoji?: string;
};

type HorizontalFilterChipsProps = {
  options: FilterChipOption[];
  activeId: string;
  onSelect: (id: string) => void;
  style?: ViewStyle;
};

function HorizontalFilterChipsComponent({
  options,
  activeId,
  onSelect,
  style,
}: HorizontalFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, style]}
    >
      {options.map((option) => {
        const isActive = option.id === activeId;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(option.id)}
          >
            {option.emoji ? (
              <Text style={styles.emoji}>{option.emoji}</Text>
            ) : null}
            <Text
              style={[styles.label, isActive && styles.labelActive]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export const HorizontalFilterChips = memo(HorizontalFilterChipsComponent);

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  emoji: {
    fontSize: 16,
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  labelActive: {
    color: "#fff",
  },
});
