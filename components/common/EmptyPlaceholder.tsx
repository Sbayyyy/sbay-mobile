import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

type EmptyPlaceholderProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyPlaceholder({
  icon,
  title,
  subtitle,
  actionLabel,
  onActionPress,
}: EmptyPlaceholderProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          shadowColor: theme.shadow,
          borderColor: theme.border,
        },
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.icon,
            {
              backgroundColor: theme.primaryMuted,
            },
          ]}
        >
          {icon}
        </View>
      ) : null}
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      ) : null}
      {actionLabel ? (
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.primary, borderColor: theme.border },
          ]}
          onPress={onActionPress}
          disabled={!onActionPress}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonLabel, { color: theme.primaryForeground }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 16,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 12,
    borderWidth: 1,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 4,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    fontWeight: "600",
  },
});
