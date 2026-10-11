import { router, useLocalSearchParams } from 'expo-router';
import { Ban, ChevronRight, Flag, MapPin, X, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { mock } from '@/mock/store';
import { colors, radii, screenGutter } from '@/theme/tokens';

type Option = {
  Icon: LucideIcon;
  title: string;
  detail: string;
  tone: 'mint' | 'plain' | 'danger';
  onPress: () => void;
};

export default function BlockAndReport() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { bottom } = useSafeAreaInsets();

  // Unmatch and block both make the person disappear from Chats entirely.
  const removeAndLeave = () => {
    mock.removeMatch(matchId);
    router.dismissTo('/chats');
  };

  const options: Option[] = [
    // Sharing a plan and the report form arrive with the safety features in Phase 6.
    { Icon: MapPin, tone: 'mint', title: 'Share my meet-up plan', detail: 'Send time and place to your trusted contact.', onPress: () => router.back() },
    { Icon: X, tone: 'plain', title: 'Unmatch', detail: 'Hide names and photos again for both of you.', onPress: removeAndLeave },
    { Icon: Ban, tone: 'plain', title: 'Block', detail: 'They can’t see or contact you again.', onPress: removeAndLeave },
    { Icon: Flag, tone: 'danger', title: 'Report', detail: 'Harassment, fake profile, underage, or asking for money.', onPress: () => router.back() },
  ];

  return (
    <View style={[styles.sheet, { paddingBottom: bottom + 16 }]}>
      <View style={{ gap: 6 }}>
        <Text variant="displayM">Keep yourself safe</Text>
        <Text variant="bodyM" color={colors.textSecondary}>
          They won’t be told who reported them. Our team reviews every report within 24 hours.
        </Text>
      </View>

      <View style={styles.options}>
        {options.map((o, i) => {
          const tint = o.tone === 'mint' ? 'rgba(95, 214, 180, 0.14)' : o.tone === 'danger' ? colors.coralTint : colors.bgRaised;
          const iconColor = o.tone === 'mint' ? colors.mint : o.tone === 'danger' ? colors.coral : colors.textPrimary;
          return (
            <Pressable
              key={o.title}
              accessibilityRole="button"
              onPress={o.onPress}
              style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { backgroundColor: colors.bgRaised }]}>
              <View style={[styles.tile, { backgroundColor: tint }]}>
                <o.Icon size={20} color={iconColor} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="labelM" style={{ fontSize: 15, lineHeight: 19 }} color={o.tone === 'danger' ? colors.coral : colors.textPrimary}>
                  {o.title}
                </Text>
                <Text variant="bodyS" color={colors.textSecondary}>
                  {o.detail}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} />
            </Pressable>
          );
        })}
      </View>

      <Button label="Cancel" variant="outline" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.bgSurface, paddingHorizontal: screenGutter + 1, paddingTop: 36, gap: 18 },
  options: { borderRadius: radii.card, borderWidth: 1, borderColor: colors.borderSubtle, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 87 },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
