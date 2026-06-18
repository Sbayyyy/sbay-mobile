import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

type PasswordVisibilityToggleProps = {
  isVisible: boolean;
  onPress: () => void;
  color: string;
  style?: StyleProp<ViewStyle>;
};

export function PasswordVisibilityToggle({
  isVisible,
  onPress,
  color,
  style,
}: PasswordVisibilityToggleProps) {
  const { t } = useTranslation();
  const label = isVisible
    ? t("common.passwordVisibility.hide", { defaultValue: "Hide password" })
    : t("common.passwordVisibility.show", { defaultValue: "Show password" });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={style}
    >
      <Ionicons
        name={isVisible ? "eye-off-outline" : "eye-outline"}
        size={20}
        color={color}
      />
    </Pressable>
  );
}
