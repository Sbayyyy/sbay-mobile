import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { memo } from "react";

import { useAppTheme } from "@/hooks/use-app-theme";

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
  const theme = useAppTheme();

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
            style={[
              styles.chip,
              {
                backgroundColor: theme.chipBackground,
                borderColor: theme.chipBorder,
              },
              isActive && {
                backgroundColor: theme.chipActiveBackground,
                borderColor: theme.primary,
              },
            ]}
            onPress={() => onSelect(option.id)}
          >
            {option.emoji ? (
              <Text style={styles.emoji}>{option.emoji}</Text>
            ) : null}
            <Text
              style={[
                styles.label,
                { color: theme.text },
                isActive && { color: theme.chipActiveText },
              ]}
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
    borderWidth: 1,
  },
  emoji: {
    fontSize: 16,
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
});
