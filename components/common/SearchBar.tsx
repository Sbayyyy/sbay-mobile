import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";

import { useAppTheme } from "@/hooks/use-app-theme";

type SearchBarProps = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("common.search");

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
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
        />
        {value.length > 0 ? (
          <TouchableOpacity onPress={() => onChange("")}>
            <FontAwesome name="times" size={16} color={theme.textSubtle} />
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        style={[
          styles.notificationButton,
          {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <FontAwesome name="bell-o" size={20} color={theme.primary} />
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
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
