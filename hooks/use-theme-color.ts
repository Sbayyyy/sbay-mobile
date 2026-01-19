import { type ThemeColors } from '@/constants/theme';
import { useThemeContext } from '@/providers/ThemeProvider';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ThemeColors
) {
  const { colors, isDark } = useThemeContext();
  return isDark ? props.dark ?? colors[colorName] : props.light ?? colors[colorName];
}
