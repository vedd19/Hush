import { router, useLocalSearchParams } from 'expo-router';
import { Clock, EyeOff, Lock } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { AnonymousAvatar, VerifiedLine } from '@/components/people';
import { Text } from '@/components/Text';
import { mock, useMock } from '@/mock/store';
import { colors, fonts, screenGutter } from '@/theme/tokens';

const points = [
  { Icon: EyeOff, color: colors.coral, text: 'They’ll see only your age, gender and distance range.' },
  { Icon: Lock, color: colors.lilac, text: 'If they say yes, you both see names and photos.' },
  { Icon: Clock, color: colors.mint, text: 'If not, it quietly expires in 24 hours. You’re never told “no”.' },
];

export default function SendRequest() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const person = useMock(() => mock.stranger(id));
  const left = useMock((s) => s.requestsLeft);
  const { bottom } = useSafeAreaInsets();

  if (!person) return null;

  return (
    <View style={[styles.sheet, { paddingBottom: bottom + 16 }]}>
      <View style={styles.who}>
        <AnonymousAvatar size={64} />
        <View style={{ gap: 4 }}>
          <Text variant="title" style={{ fontSize: 19, lineHeight: 25 }}>
            {person.gender}, {person.age}
          </Text>
          <VerifiedLine bucket={person.bucket} />
        </View>
      </View>

      <Text variant="displayM">Send a request?</Text>

      <View style={{ gap: 14 }}>
        {points.map(({ Icon, color, text }) => (
          <View key={text} style={styles.point}>
            <Icon size={20} color={color} strokeWidth={1.75} />
            <Text variant="bodyM" color={colors.textSecondary} style={{ flex: 1 }}>
              {text}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 10, marginTop: 2 }}>
        <Button
          label="Send request"
          onPress={() => {
            mock.sendRequest(person.id);
            router.back();
          }}
        />
        <Button label="Not now" variant="outline" onPress={() => router.back()} />
        <Text variant="bodyS" color={colors.textTertiary} style={{ textAlign: 'center', fontFamily: fonts.sansMedium }}>
          Uses 1 of your {left} requests left today
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.bgSurface, paddingHorizontal: screenGutter + 1, paddingTop: 38, gap: 20 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
});
