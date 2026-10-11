// Building blocks for showing people: the faceless avatar used before a match,
// the letter avatar used after one, and the "distance · ✓ Verified" line.
import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import avatarAnonymous from '@/assets/figma/avatar-anonymous.svg';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { colors, fonts, radii, screenGutter } from '@/theme/tokens';

/** Round faceless avatar. Before a match this is all anyone sees. */
export function AnonymousAvatar({ size }: { size: number }) {
  return (
    <View style={[styles.anon, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon source={avatarAnonymous} size={size} />
    </View>
  );
}

/** Stand-in for a profile photo until real photos arrive in Phase 3. */
export function LetterAvatar({
  name,
  size,
  tone = 'coral',
  style,
}: {
  name: string;
  size: number;
  tone?: 'coral' | 'plain';
  style?: ViewStyle;
}) {
  const coral = tone === 'coral';
  return (
    <View
      style={[
        styles.letter,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: size > 80 ? 3 : 2,
          borderColor: coral ? colors.coral : '#1F1A26',
          backgroundColor: coral ? 'rgba(255, 111, 97, 0.18)' : 'rgba(13, 10, 18, 0.6)',
        },
        style,
      ]}>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: Math.round(size * 0.47),
          lineHeight: Math.round(size * 0.6),
          color: coral ? colors.textPrimary : colors.textTertiary,
        }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/** "Under 2 km · ✓ Verified" */
export function VerifiedLine({ bucket }: { bucket: string }) {
  return (
    <View style={styles.verified}>
      <Text variant="bodyS" color={colors.textSecondary}>
        {bucket} ·{' '}
      </Text>
      <Check size={14} color={colors.mint} strokeWidth={2.2} />
      <Text variant="bodyS" color={colors.mint}>
        {' '}
        Verified
      </Text>
    </View>
  );
}

/** Page title for tab screens ("Nearby", "Requests", "Me"). */
export function TabTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <Text variant="displayL">{children}</Text>
      {right}
    </View>
  );
}

/** Top padding for tab screens: safe area plus the gap Figma leaves under the status bar. */
export function useTabTopPadding() {
  return useSafeAreaInsets().top + 12;
}

export const card: ViewStyle = {
  backgroundColor: colors.bgSurface,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  borderRadius: radii.card,
};

export const tabScreen: ViewStyle = { flex: 1, backgroundColor: colors.bgBase, paddingHorizontal: screenGutter };

const styles = StyleSheet.create({
  anon: { overflow: 'hidden', backgroundColor: colors.bgRaised },
  letter: { alignItems: 'center', justifyContent: 'center' },
  verified: { flexDirection: 'row', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
});
