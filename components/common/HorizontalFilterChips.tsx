import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { memo } from "react";

import {
  MarketplaceRadius,
  MarketplaceSpacing,
  MarketplaceTypography,
} from "@/constants/theme";
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
            activeOpacity={0.85}
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
    paddingHorizontal: MarketplaceSpacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 38,
    paddingHorizontal: MarketplaceSpacing.md,
    paddingVertical: MarketplaceSpacing.sm,
    marginHorizontal: MarketplaceSpacing.xs,
    borderRadius: MarketplaceRadius.pill,
    borderWidth: 1,
  },
  emoji: {
    fontSize: 15,
    marginRight: MarketplaceSpacing.xs,
  },
  label: {
    fontSize: MarketplaceTypography.bodySmall,
    fontWeight: "700",
  },
});
