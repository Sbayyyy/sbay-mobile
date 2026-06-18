/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const LightTheme = {
  colors: {
    text: '#0a0a0a',
    textSecondary: '#717182',
    textMuted: '#717182',
    textSubtle: '#a1a1a1',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceMuted: '#ececf0',
    border: 'rgba(0, 0, 0, 0.1)',
    hairline: '#e9ebef',
    tint: '#2563eb',
    icon: '#2563eb',
    tabIconDefault: '#a1a1a1',
    tabIconSelected: '#2563eb',
    primary: '#2563eb',
    primaryMuted: '#dbeafe',
    primaryForeground: '#ffffff',
    primarySoftText: '#93c5fd',
    success: '#16a34a',
    successBackground: '#ecfdf5',
    info: '#4f46e5',
    infoBackground: '#eef2ff',
    warning: '#b45309',
    warningBackground: '#fff7ed',
    danger: '#d4183d',
    dangerBackground: '#fee2e2',
    pillBackground: '#2563eb',
    pillForeground: '#ffffff',
    chipBorder: 'rgba(0, 0, 0, 0.1)',
    chipBackground: '#ffffff',
    chipActiveBackground: '#dbeafe',
    chipActiveText: '#2563eb',
    shadow: 'rgba(2, 6, 23, 0.08)',
    overlay: 'rgba(15, 23, 42, 0.05)',
    navigationBackground: '#ffffff',
    navigationBorder: 'rgba(0, 0, 0, 0.1)',
    inputBackground: '#f3f3f5',
    inputPlaceholder: '#717182',
    warningBackgroundSoft: '#fff7ed',
    warningSoftText: '#b45309',
  },
};

export const DarkTheme = {
  colors: {
    text: '#fafafa',
    textSecondary: '#a1a1a1',
    textMuted: '#a1a1a1',
    textSubtle: '#525252',
    background: '#0a0a0a',
    surface: '#141414',
    surfaceMuted: '#1f1f1f',
    border: '#262626',
    hairline: '#262626',
    tint: '#3b82f6',
    icon: '#3b82f6',
    tabIconDefault: '#a1a1a1',
    tabIconSelected: '#3b82f6',
    primary: '#2563eb',
    primaryMuted: '#1e3a8a',
    primaryForeground: '#ffffff',
    primarySoftText: '#93c5fd',
    success: '#4ade80',
    successBackground: '#0f1f16',
    info: '#818cf8',
    infoBackground: '#1e1b4b',
    warning: '#f59e0b',
    warningBackground: '#2a1a07',
    danger: '#f87171',
    dangerBackground: '#3a0f11',
    pillBackground: '#2563eb',
    pillForeground: '#ffffff',
    chipBorder: '#262626',
    chipBackground: '#0a0a0a',
    chipActiveBackground: '#262626',
    chipActiveText: '#93c5fd',
    shadow: 'rgba(0, 0, 0, 0.4)',
    overlay: 'rgba(0, 0, 0, 0.4)',
    navigationBackground: '#0a0a0a',
    navigationBorder: '#262626',
    inputBackground: '#262626',
    inputPlaceholder: '#a1a1a1',
    warningBackgroundSoft: '#2a1a07',
    warningSoftText: '#f59e0b',
  },
};

export const CoffeeTheme = {
  colors: {
    text: '#2f1b12',
    textSecondary: '#5a3a2a',
    textMuted: '#7f5539',
    textSubtle: '#a07a5a',
    background: '#e2d3c5',
    surface: '#d4bfae',
    surfaceMuted: '#c3a78f',
    border: '#b18f75',
    hairline: '#b18f75',
    tint: '#7f5539',
    icon: '#7f5539',
    tabIconDefault: '#a07a5a',
    tabIconSelected: '#7f5539',
    primary: '#7f5539',
    primaryMuted: '#a17455',
    primaryForeground: '#ffffff',
    primarySoftText: '#5a3a2a',
    success: '#7f5539',
    successBackground: '#d4bfae',
    info: '#a07a5a',
    infoBackground: '#d4bfae',
    warning: '#c79a7a',
    warningBackground: '#d4bfae',
    danger: '#a15c3a',
    dangerBackground: '#d0b29f',
    pillBackground: '#7f5539',
    pillForeground: '#ffffff',
    chipBorder: '#b18f75',
    chipBackground: '#d4bfae',
    chipActiveBackground: '#a17455',
    chipActiveText: '#2f1b12',
    shadow: 'rgba(127, 85, 57, 0.25)',
    overlay: 'rgba(47, 27, 18, 0.08)',
    navigationBackground: '#e2d3c5',
    navigationBorder: '#b18f75',
    inputBackground: '#c3a78f',
    inputPlaceholder: '#7f5539',
    warningBackgroundSoft: '#d4bfae',
    warningSoftText: '#5a3a2a',
  },
};

export type ThemeColors = typeof LightTheme.colors;

export const MarketplaceSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const MarketplaceRadius = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 18,
  card: 16,
  sheet: 20,
  pill: 999,
} as const;

export const MarketplaceTypography = {
  caption: 11,
  meta: 12,
  bodySmall: 13,
  body: 14,
  input: 15,
  title: 18,
  screenTitle: 22,
  hero: 26,
} as const;

export const MarketplaceShadow = {
  subtle: {
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  card: {
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  raised: {
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
