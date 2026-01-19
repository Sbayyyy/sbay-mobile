import { type ThemeColors } from '@/constants/theme';
import { useThemeContext } from '@/providers/ThemeProvider';

export function useAppTheme(): ThemeColors {
  return useThemeContext().colors;
}
