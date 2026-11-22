/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F3D2E',
    background: '#F7FBF9',
    backgroundElement: '#E6F4EC',
    backgroundSelected: '#CFEDE0',
    surface: '#FFFFFF',
    border: '#C7E3D7',
    textSecondary: '#477267',
    primary: '#087F5B',
    primaryForeground: '#FFFFFF',
    positive: '#087F5B',
    warning: '#B7791F',
    destructive: '#C53030',
  },
  dark: {
    text: '#E6F4EC',
    background: '#081E17',
    backgroundElement: '#0F3D2E',
    backgroundSelected: '#145540',
    surface: '#102A21',
    border: '#28634F',
    textSecondary: '#9BE8C6',
    primary: '#2FBF8B',
    primaryForeground: '#081E17',
    positive: '#4FD1A1',
    warning: '#F6C453',
    destructive: '#FC8181',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  small: 8,
  medium: 14,
  large: 20,
  pill: 999,
} as const;

export const Typography = {
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 13, lineHeight: 18 },
  amount: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
