import { Theme, type ThemeColors } from '@/constants/theme';

export function useAppTheme(): ThemeColors {
  return Theme.colors;
}
