import { router } from 'expo-router';
import { ListFilter, MapPin, Send } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import avatarAnonymous from '@/assets/figma/avatar-anonymous.svg';
import glowCoral from '@/assets/figma/glow-profile.png';
import { ChipGroup } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Glows } from '@/components/Screen';
import { card, TabTitle, tabScreen, useTabTopPadding } from '@/components/people';
import { Text } from '@/components/Text';
import { mock, useMock, type DistanceBucket, type Stranger } from '@/mock/store';
import { colors, fonts } from '@/theme/tokens';

const buckets: { value: DistanceBucket; label: string }[] = [
  { value: 'Under 2 km', label: 'Under 2 km' },
  { value: '2–5 km', label: '2–5 km' },
  { value: '5–10 km', label: '5–10 km' },
];

export default function Nearby() {
  const top = useTabTopPadding();
  const [bucket, setBucket] = useState<DistanceBucket>('Under 2 km');
  const people = useMock((s) => s.nearby);
  const left = useMock((s) => s.requestsLeft);
  const shown = people.filter((p) => p.bucket === bucket);

  return (
    <View style={tabScreen}>
      {/* Figma: 280px coral glow centred at (360, -60). */}
      <Glows glows={[{ source: glowCoral, x: 360, y: -60, size: 560 }]} />
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingTop: top, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 4 }}>
            <TabTitle
              right={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Filters"
                  onPress={() => router.push('/safety-controls')}
                  style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}>
                  <ListFilter size={20} color={colors.textPrimary} strokeWidth={1.75} />
                </Pressable>
              }>
              Nearby
            </TabTitle>
            <View style={styles.leftPill}>
              <Send size={16} color={colors.coral} strokeWidth={1.75} />
              <Text variant="labelM" color={colors.coral} style={{ fontSize: 13 }}>
                {left} of {mock.dailyLimit} requests left today
              </Text>
            </View>
            <ChipGroup compact options={buckets} value={bucket} onChange={setBucket} />
          </View>
        }
        ListEmptyComponent={
          <Text variant="bodyM" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 40 }}>
            No one {bucket === 'Under 2 km' ? 'under 2 km' : `${bucket} away`} right now. Try another distance.
          </Text>
        }
        renderItem={({ item }) => <PersonCard person={item} disabled={left <= 0} />}
      />
    </View>
  );
}

function PersonCard({ person, disabled }: { person: Stranger; disabled: boolean }) {
  return (
    <View style={[card, styles.card]}>
      <View style={styles.photo}>
        <Icon source={avatarAnonymous} size={96} />
        {person.active && (
          <View style={styles.activePill}>
            <View style={styles.dot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        )}
      </View>
      <View style={{ gap: 3, paddingHorizontal: 2 }}>
        <Text variant="title" style={{ fontSize: 16, lineHeight: 21 }}>
          {person.gender}, {person.age}
        </Text>
        <View style={styles.distance}>
          <MapPin size={14} color={colors.textSecondary} strokeWidth={1.75} />
          <Text variant="bodyS" color={colors.textSecondary}>
            {person.bucket}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Send request to ${person.gender}, ${person.age}`}
        disabled={disabled}
        onPress={() => router.push({ pathname: '/send-request', params: { id: person.id } })}
        style={({ pressed }) => [styles.outline, (pressed || disabled) && { opacity: 0.6 }]}>
        <Text variant="labelM" style={{ fontFamily: fonts.sansBold }}>
          Send request
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    height: 33,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.coralTint,
  },
  card: { flex: 1, maxWidth: '50%', padding: 11, gap: 10 },
  photo: {
    height: 104,
    borderRadius: 16,
    backgroundColor: colors.bgRaised,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  activePill: {
    position: 'absolute',
    left: 8,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(13, 10, 18, 0.75)',
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.mint },
  activeText: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 16, color: colors.textPrimary },
  distance: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  outline: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
});
