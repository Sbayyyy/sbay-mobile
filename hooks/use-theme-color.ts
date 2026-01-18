import { Theme } from '@/constants/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Theme.colors
) {
  return props.light ?? props.dark ?? Theme.colors[colorName];
}
