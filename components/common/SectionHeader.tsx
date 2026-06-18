import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  MarketplaceSpacing,
  MarketplaceTypography,
} from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({
  title,
  actionLabel,
  onActionPress,
}: SectionHeaderProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={[styles.action, { color: theme.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: MarketplaceSpacing.lg,
    marginBottom: MarketplaceSpacing.sm,
    paddingHorizontal: MarketplaceSpacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: MarketplaceTypography.title,
    fontWeight: "800",
  },
  action: {
    fontSize: MarketplaceTypography.bodySmall,
    fontWeight: "700",
  },
});
