import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import glowLeft from '@/assets/figma/glow-welcome-left.png';
import glowRight from '@/assets/figma/glow-welcome-right.png';
import iconEyeOff from '@/assets/figma/icon-eyeoff.svg';
import iconLock from '@/assets/figma/icon-lock.svg';
import iconPin from '@/assets/figma/icon-pin.svg';
import iconShield from '@/assets/figma/icon-shield.svg';
import mutualMark from '@/assets/figma/mutual-mark.svg';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme/tokens';

const promises = [
  { icon: iconShield, text: 'Verified adults only, 18+' },
  { icon: iconEyeOff, text: 'A “no” stays invisible — nobody is told' },
  { icon: iconPin, text: 'Your exact location is never shared' },
];

export default function Welcome() {
  return (
    <Screen
      glows={[
        { source: glowRight, x: 350, y: 310, size: 620 },
        { source: glowLeft, x: 50, y: 70, size: 680 },
      ]}
      footer={
        <View style={styles.actions}>
          <Button label="Get started" style={styles.fullWidth} onPress={() => router.push('/verify-id')} />
          {/* Sign-in arrives in Phase 3; for now this skips straight into the app. */}
          <Button label="I already have an account" variant="ghost" onPress={() => router.replace('/nearby')} />
          <Text variant="bodyS" color={colors.textTertiary} style={styles.legal}>
            By continuing you agree to our Terms and Privacy Policy.
          </Text>
        </View>
      }>
      <View style={styles.logo}>
        <Icon source={iconLock} size={22} />
        <Text style={styles.wordmark}>hush</Text>
      </View>
      <Image source={mutualMark} style={styles.mark} contentFit="contain" />
      <Text variant="displayXL">
        Mutual,{'\n'}or it{' '}
        <Text variant="displayXL" style={styles.emphasis}>
          never happened.
        </Text>
      </Text>
      <Text variant="bodyL" color={colors.textSecondary}>
        Stay anonymous. People see only your age, gender and distance. Names and photos appear only when you both
        say yes.
      </Text>
      <View style={styles.promises}>
        {promises.map((p) => (
          <View key={p.text} style={styles.promise}>
            <Icon source={p.icon} size={20} />
            <Text variant="bodyM" style={{ flex: 1 }}>
              {p.text}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: {
    fontFamily: fonts.displayItalic,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -1.5,
    color: colors.textPrimary,
  },
  mark: { width: '100%', maxWidth: 342, aspectRatio: 342 / 160, alignSelf: 'center' },
  emphasis: { fontFamily: fonts.displayItalic, color: colors.coral },
  promises: { gap: 12 },
  promise: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  actions: { gap: 8, alignItems: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  legal: { textAlign: 'center', maxWidth: 300 },
});
