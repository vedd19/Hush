import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import iconBack from '@/assets/figma/icon-back.svg';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { colors } from '@/theme/tokens';

export function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => router.back()}
      style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}>
      <Icon source={iconBack} size={20} />
    </Pressable>
  );
}

// Onboarding top bar: back button + "STEP n OF total" with a segmented progress bar.
export function StepHeader({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <View style={styles.row}>
      <BackButton />
      <View style={styles.progress}>
        <Text variant="caps" color={colors.textTertiary}>
          Step {step} of {total}
        </Text>
        <View style={styles.bars}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={[styles.bar, { backgroundColor: i < step ? colors.coral : colors.borderSubtle }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="displayM">{title}</Text>
      <Text variant="bodyL" color={colors.textSecondary}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { flex: 1, gap: 8 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
});
