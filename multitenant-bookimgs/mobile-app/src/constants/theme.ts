/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Reused 1:1 from admin-app/src/app/globals.css `:root` — the web app is a
// single fixed light theme, so these are flat (not light/dark variants).
export const Brand = {
  brand: '#7c3565',
  brandDark: '#5e274c',
  brandLight: '#fdf4fb',
  brandTint: '#f5e6f2',
  border: '#e4dfd9',
  border2: '#cfc8c1',
  text1: '#1c1917',
  text2: '#6b6560',
  text3: '#a39d97',
  successBg: '#f0fdf4',
  successFg: '#15803d',
  dangerBg: '#fef2f2',
  dangerFg: '#dc2626',
  warningBg: '#fffbeb',
  warningFg: '#b45309',
} as const;

export const BookingStatusColor: Record<'PENDING' | 'BOOKED' | 'REJECTED', string> = {
  PENDING: '#f59e0b',
  BOOKED: '#10b981',
  REJECTED: '#ef4444',
};

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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
