import { StyleSheet, TextInput, TouchableOpacity, View, Text } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/hooks/use-app-theme";

type SearchBarProps = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  notificationCount?: number;
};

export function SearchBar({
  value,
  onChange,
  placeholder,
  onSubmit,
  notificationCount,
}: SearchBarProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const resolvedPlaceholder = placeholder ?? t("common.search");

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
            borderColor: theme.border,
          },
        ]}
      >
        <FontAwesome name="search" size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={resolvedPlaceholder}
          placeholderTextColor={theme.inputPlaceholder}
          value={value}
          onChangeText={onChange}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
        {value.length > 0 ? (
          <TouchableOpacity onPress={() => onChange("")}>
            <FontAwesome name="times" size={16} color={theme.textSubtle} />
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        testID="notification-button"
        style={[
          styles.notificationButton,
          {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
            borderColor: theme.border,
          },
        ]}
        onPress={() => router.push("/notifications")}
      >
        <FontAwesome name="bell-o" size={20} color={theme.primary} />
        {notificationCount && notificationCount > 0 && (
          <View
            testID="notification-badge"
            style={[
              styles.badge,
              {
                backgroundColor: "#E53935",
              },
            ]}
          >
            <Text style={styles.badgeText}>
              {notificationCount > 99 ? "99+" : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  notificationButton: {
    width: 55,
    height: 65,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
