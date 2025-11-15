/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColor = '#1d4ed8';

export const Theme = {
  colors: {
    text: '#111827',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    textSubtle: '#9ca3af',
    background: '#f9fafb',
    surface: '#ffffff',
    surfaceMuted: '#f3f4f6',
    border: '#e5e7eb',
    hairline: '#f3f4f6',
    tint: tintColor,
    icon: tintColor,
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColor,
    primary: tintColor,
    primaryMuted: '#dbeafe',
    primaryForeground: '#ffffff',
    primarySoftText: '#bfdbfe',
    success: '#059669',
    successBackground: '#ecfdf5',
    info: '#4f46e5',
    infoBackground: '#eef2ff',
    warning: '#b45309',
    warningBackground: '#fff7ed',
    danger: '#b91c1c',
    dangerBackground: '#fee2e2',
    pillBackground: tintColor,
    pillForeground: '#ffffff',
    chipBorder: '#e5e7eb',
    chipBackground: '#ffffff',
    chipActiveBackground: '#dbeafe',
    chipActiveText: '#1d4ed8',
    shadow: 'rgba(17, 24, 39, 0.1)',
    overlay: 'rgba(15, 23, 42, 0.05)',
    navigationBackground: '#ffffff',
    navigationBorder: '#e5e7eb',
    inputBackground: '#ffffff',
    inputPlaceholder: '#9ca3af',
  },
};

export type ThemeColors = typeof Theme.colors;

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
