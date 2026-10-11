import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import glowVerify from '@/assets/figma/glow-verify.png';
import iconCamera from '@/assets/figma/icon-camera-lilac.svg';
import iconIdCard from '@/assets/figma/icon-idcard.svg';
import iconLock from '@/assets/figma/icon-lock-mint.svg';
import iconPassport from '@/assets/figma/icon-passport.svg';
import iconShield from '@/assets/figma/icon-shield-onbrand.svg';
import { Button } from '@/components/Button';
import { RadioDot } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Heading, StepHeader } from '@/components/StepHeader';
import { Text } from '@/components/Text';
import { colors, fonts, radii } from '@/theme/tokens';

type Method = 'digilocker' | 'pan' | 'document';

const methods: { id: Method; icon: number; title: string; detail: string; cta: string }[] = [
  { id: 'digilocker', icon: iconShield, title: 'Aadhaar via DigiLocker', detail: 'Fastest · official, consent-based', cta: 'Continue with DigiLocker' },
  { id: 'pan', icon: iconIdCard, title: 'PAN card', detail: 'Photo of card + selfie match', cta: 'Continue with PAN card' },
  { id: 'document', icon: iconPassport, title: 'Passport or Driving licence', detail: 'Photo of document + selfie match', cta: 'Continue with document' },
];

export default function VerifyId() {
  const [method, setMethod] = useState<Method>('digilocker');
  const chosen = methods.find((m) => m.id === method)!;

  return (
    <Screen
      glows={[{ source: glowVerify, x: 350, y: -10, size: 600 }]}
      // Real verification (via a licensed provider) arrives in Phase 3. For now this just moves on.
      footer={<Button label={chosen.cta} onPress={() => router.push('/hidden-profile')} />}>
      <StepHeader step={1} />
      <Heading
        title="Prove you’re a real adult"
        subtitle="One quick check keeps fakes and minors out. Your ID is never shown to anyone."
      />
      <View style={{ gap: 10 }} accessibilityRole="radiogroup">
        {methods.map((m) => {
          const on = m.id === method;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setMethod(m.id)}
              style={[styles.method, on ? styles.methodOn : styles.methodOff]}>
              <View style={[styles.tile, { backgroundColor: on ? colors.coralTint : colors.bgRaised }]}>
                <Icon source={m.icon} size={22} tintColor={on ? colors.coral : colors.textSecondary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="labelM" style={{ fontFamily: fonts.sansBold, fontSize: 15, lineHeight: 20 }}>
                  {m.title}
                </Text>
                <Text variant="bodyS" color={on ? colors.coral : colors.textSecondary}>
                  {m.detail}
                </Text>
              </View>
              <RadioDot on={on} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.note}>
        <View style={styles.noteRow}>
          <Icon source={iconCamera} size={20} />
          <Text variant="bodyM" style={{ flex: 1 }}>
            Then a 5-second live selfie confirms the ID is really yours.
          </Text>
        </View>
        <View style={styles.noteRow}>
          <Icon source={iconLock} size={20} />
          <Text variant="bodyM" color={colors.textSecondary} style={{ flex: 1 }}>
            We keep only “verified” and your age. Others see age, gender and a distance range — nothing else.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  method: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20 },
  methodOn: { backgroundColor: colors.bgRaised, borderWidth: 1.5, borderColor: colors.coral },
  methodOff: { backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle },
  tile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  note: {
    gap: 12,
    padding: 16,
    borderRadius: radii.card,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
});
