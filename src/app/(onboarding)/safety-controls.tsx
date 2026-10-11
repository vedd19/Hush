import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import glowSafety from '@/assets/figma/glow-safety.png';
import { Button } from '@/components/Button';
import { RangeSlider, Segmented, Toggle } from '@/components/controls';
import { Screen } from '@/components/Screen';
import { Heading, StepHeader } from '@/components/StepHeader';
import { Text } from '@/components/Text';
import { colors, radii } from '@/theme/tokens';

type Visibility = 'anyone' | 'within_5km' | 'paused';

export default function SafetyControls() {
  const [visibility, setVisibility] = useState<Visibility>('anyone');
  const [ages, setAges] = useState({ low: 22, high: 35 });
  const [checkIn, setCheckIn] = useState(false);

  return (
    <Screen
      glows={[{ source: glowSafety, x: 340, y: -30, size: 600 }]}
      footer={<Button label="Finish setup" onPress={() => router.replace('/nearby')} />}>
      <StepHeader step={3} />
      <Heading title="You’re in control" subtitle="Decide who can reach you. Change it anytime." />

      <View style={{ gap: 10 }}>
        <Text variant="labelM" color={colors.textSecondary}>
          Who can send me requests
        </Text>
        <Segmented
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'anyone', label: 'Anyone nearby' },
            { value: 'within_5km', label: 'Within 5 km' },
            { value: 'paused', label: 'Paused' },
          ]}
        />
      </View>

      <View style={[styles.card, { padding: 16, gap: 14 }]}>
        <View style={styles.between}>
          <Text variant="labelM">Age range</Text>
          <Text variant="labelM" color={colors.coral}>
            {ages.low} – {ages.high}
          </Text>
        </View>
        <RangeSlider min={18} max={60} low={ages.low} high={ages.high} onChange={(low, high) => setAges({ low, high })} />
      </View>

      <View style={styles.card}>
        {/* Verified-only is a hard rule of the app (everyone is verified), so it can't be turned off. */}
        <Row title="Only verified adults" detail="Unverified accounts can’t see or request you.">
          <Toggle label="Only verified adults" value />
        </Row>
        <Row title="Distance as a range" detail="Always on. Exact location is never shared." divider>
          <Toggle label="Distance as a range" value locked />
        </Row>
        <Row title="Safety check-in" detail="We ping you after a meet-up. No reply? We alert your trusted contact." divider>
          <Toggle label="Safety check-in" value={checkIn} onChange={setCheckIn} />
        </Row>
      </View>
    </Screen>
  );
}

function Row({
  title,
  detail,
  divider,
  children,
}: {
  title: string;
  detail: string;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="labelM" style={{ fontSize: 15, lineHeight: 20 }}>
          {title}
        </Text>
        <Text variant="bodyS" color={colors.textSecondary}>
          {detail}
        </Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
});
