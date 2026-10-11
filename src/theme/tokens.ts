// Design tokens mirrored from the Figma "Hush / Color" variables and type scale.
// Dark theme only for the MVP.

export const colors = {
  bgBase: '#0D0A12',
  bgSurface: '#17131D',
  bgRaised: '#221C29',
  borderSubtle: '#2E2636',
  textPrimary: '#F8F2EE',
  textSecondary: '#A69DB0',
  textTertiary: '#8E8599',
  textOnBrand: '#1A0F12',
  coral: '#FF6F61',
  lilac: '#C3A6FF',
  mint: '#5FD6B4',
  coralTint: 'rgba(255, 111, 97, 0.16)',
} as const;

export const fonts = {
  display: 'Fraunces_400Regular',
  displayItalic: 'Fraunces_400Regular_Italic',
  displayMedium: 'Fraunces_500Medium',
  sans: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansSemiBold: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
} as const;

// Mirrors the Figma text styles. Figma line heights are multipliers; RN needs pixels.
export const type = {
  displayXL: { fontFamily: fonts.display, fontSize: 46, lineHeight: 48, letterSpacing: -1.5 },
  displayL: { fontFamily: fonts.display, fontSize: 36, lineHeight: 39, letterSpacing: -1 },
  displayM: { fontFamily: fonts.display, fontSize: 28, lineHeight: 31, letterSpacing: -0.5 },
  title: { fontFamily: fonts.sansBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  bodyL: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  bodyM: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21 },
  bodyS: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 19 },
  labelM: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 18 },
  button: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 19 },
  caps: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.88, textTransform: 'uppercase' },
} as const;

export type TypeVariant = keyof typeof type;

export const radii = {
  button: 18,
  card: 22,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Horizontal screen padding used across every Figma frame (390 wide, 24 gutters).
export const screenGutter = 24;
export const minTouchTarget = 44;
