import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, Sparkles, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import glowCoral from '@/assets/figma/glow-profile.png';
import glowLilac from '@/assets/figma/glow-verify.png';
import { Button } from '@/components/Button';
import { LetterAvatar } from '@/components/people';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { mock, useMock } from '@/mock/store';
import { colors, fonts, radii } from '@/theme/tokens';

export default function MutualReveal() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const match = useMock((s) => s.matches.find((m) => m.id === matchId));
  const me = useMock((s) => s.me);
  const checkInOn = useMock((s) => s.checkInOn);

  if (!match) return null;

  return (
    <Screen
      glows={[
        { source: glowLilac, x: 80, y: 260, size: 640 },
        { source: glowCoral, x: 320, y: 310, size: 600 },
      ]}>
      <View style={styles.closeRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}>
          <X size={20} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
      </View>

      <View style={styles.pair}>
        <View style={styles.person}>
          <LetterAvatar name={me.firstName} size={136} tone="plain" />
          <Text variant="labelM" color={colors.textSecondary} style={styles.label}>
            You
          </Text>
        </View>
        <View style={[styles.person, { marginLeft: -30 }]}>
          <LetterAvatar name={match.firstName} size={136} />
          <Text variant="labelM" style={[styles.label, { fontFamily: fonts.sansBold }]}>
            {match.firstName}, {match.age}
          </Text>
        </View>
      </View>

      <View style={{ gap: 12, alignItems: 'center' }}>
        <View style={styles.badge}>
          <Sparkles size={14} color={colors.lilac} strokeWidth={2} />
          <Text variant="caps" color={colors.lilac}>
            Both said yes
          </Text>
        </View>
        <Text variant="displayXL" style={{ textAlign: 'center', fontSize: 52, lineHeight: 57 }}>
          It’s{' '}
          <Text variant="displayXL" style={{ fontFamily: fonts.displayItalic, color: colors.coral, fontSize: 52, lineHeight: 57 }}>
            mutual.
          </Text>
        </Text>
        <Text variant="bodyL" color={colors.textSecondary} style={{ textAlign: 'center', paddingHorizontal: 11 }}>
          You and {match.firstName} both said yes. Your names and photos are now visible to each other — and only to
          each other.
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <Button
          label="Say hello"
          onPress={() => router.replace({ pathname: '/chat/[matchId]', params: { matchId: match.id } })}
        />
        <Button label="Keep browsing" variant="ghost" onPress={() => router.dismissTo('/nearby')} />
      </View>

      <View style={{ flex: 1, minHeight: 16 }} />

      <View style={styles.tip}>
        <ShieldCheck size={22} color={colors.mint} strokeWidth={1.75} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="bodyM">Meeting up? Pick a public place first and turn on a safety check-in.</Text>
          {/* The real check-in (trusted contact + timer) arrives in Phase 6. */}
          <Pressable accessibilityRole="button" onPress={() => mock.setCheckIn(!checkInOn)} hitSlop={10}>
            <Text variant="labelM" color={checkInOn ? colors.mint : colors.coral}>
              {checkInOn ? 'Check-in is on' : 'Turn on check-in'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pair: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  person: { alignItems: 'center', gap: 12 },
  label: { fontSize: 15, lineHeight: 19 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(195, 166, 255, 0.14)',
  },
  tip: {
    flexDirection: 'row',
    gap: 12,
    padding: 17,
    borderRadius: radii.card,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
});
