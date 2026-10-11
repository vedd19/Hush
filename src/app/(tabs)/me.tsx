import { router, type Href } from 'expo-router';
import {
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Database,
  Lock,
  Pencil,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import glowCoral from '@/assets/figma/glow-profile.png';
import { card, LetterAvatar, TabTitle, tabScreen, useTabTopPadding } from '@/components/people';
import { Glows } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useMock } from '@/mock/store';
import { colors, fonts, screenGutter } from '@/theme/tokens';

// Rows without a destination get their screens in later phases (6–7).
const settings: { Icon: LucideIcon; label: string; href?: Href }[] = [
  { Icon: Pencil, label: 'Edit hidden profile', href: '/hidden-profile' },
  { Icon: Shield, label: 'Safety controls', href: '/safety-controls' },
  { Icon: Users, label: 'Trusted contact' },
  { Icon: Bell, label: 'Notifications' },
  { Icon: Database, label: 'Privacy & my data' },
  { Icon: CircleHelp, label: 'Help & community rules' },
];

export default function Me() {
  const top = useTabTopPadding();
  const me = useMock((s) => s.me);

  return (
    <View style={[tabScreen, { paddingHorizontal: 0 }]}>
      <Glows glows={[{ source: glowCoral, x: 350, y: -50, size: 600 }]} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: top }]} showsVerticalScrollIndicator={false}>
        <TabTitle>Me</TabTitle>

        <View style={[card, styles.profile]}>
          <View style={styles.profileTop}>
            <LetterAvatar name={me.firstName} size={68} />
            <View style={{ gap: 6, alignItems: 'flex-start' }}>
              <Text variant="title" style={{ fontSize: 19, lineHeight: 25 }}>
                {me.firstName}, {me.age}
              </Text>
              <View style={styles.verified}>
                <Check size={13} color={colors.mint} strokeWidth={2.4} />
                <Text variant="bodyS" color={colors.mint} style={{ fontSize: 12, lineHeight: 17, fontFamily: fonts.sansSemiBold }}>
                  Verified adult
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.strangers}>
            <Lock size={18} color={colors.textTertiary} strokeWidth={1.75} />
            <Text variant="bodyS" color={colors.textSecondary} style={{ flex: 1 }}>
              Strangers see: {me.gender}, {me.age} · distance range
            </Text>
          </View>
        </View>

        <View style={[card, { overflow: 'hidden' }]}>
          {settings.map(({ Icon, label, href }, i) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              onPress={() => href && router.push(href)}
              style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { backgroundColor: colors.bgRaised }]}>
              <Icon size={20} color={colors.textSecondary} strokeWidth={1.75} />
              <Text variant="labelM" style={{ flex: 1, fontSize: 15, lineHeight: 19 }}>
                {label}
              </Text>
              <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} />
            </Pressable>
          ))}
        </View>

        <View style={styles.premium}>
          <Sparkles size={22} color={colors.lilac} strokeWidth={1.75} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="labelM" color={colors.lilac} style={{ fontFamily: fonts.sansBold, fontSize: 15, lineHeight: 19 }}>
              Hush Premium · coming soon
            </Text>
            <Text variant="bodyS" color={colors.textSecondary}>
              No ads, plus more requests each day.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: screenGutter, paddingBottom: 24, gap: 16 },
  profile: { padding: 19, gap: 16 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 25,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(95, 214, 180, 0.14)',
  },
  strangers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 49 },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  premium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 17,
    paddingVertical: 15,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(195, 166, 255, 0.45)',
    backgroundColor: 'rgba(195, 166, 255, 0.08)',
  },
});
