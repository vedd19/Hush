import { router } from 'expo-router';
import { Clock, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import glowLilac from '@/assets/figma/glow-verify.png';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/controls';
import { AnonymousAvatar, card, TabTitle, tabScreen, useTabTopPadding, VerifiedLine } from '@/components/people';
import { Glows } from '@/components/Screen';
import { Text } from '@/components/Text';
import { mock, useMock, type Stranger } from '@/mock/store';
import { colors, screenGutter } from '@/theme/tokens';

type Tab = 'received' | 'sent';

export default function Requests() {
  const top = useTabTopPadding();
  const [tab, setTab] = useState<Tab>('received');
  const received = useMock((s) => s.received);
  const sent = useMock((s) => s.sent);

  return (
    <View style={[tabScreen, { paddingHorizontal: 0 }]}>
      <Glows glows={[{ source: glowLilac, x: 340, y: -60, size: 560 }]} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: top }]} showsVerticalScrollIndicator={false}>
        <TabTitle>Requests</TabTitle>
        <Segmented
          quiet
          value={tab}
          onChange={setTab}
          options={[
            { value: 'received', label: `Received · ${received.length}` },
            { value: 'sent', label: `Sent · ${sent.length}` },
          ]}
        />

        {tab === 'received' ? (
          <>
            {received.map((r) => (
              <RequestCard key={r.id} person={r.from} hoursLeft={r.hoursLeft} line="Wants to connect with you.">
                <View style={styles.actions}>
                  <Button label="Ignore" variant="outline" style={styles.action} onPress={() => mock.ignoreRequest(r.id)} />
                  <Button
                    label="Accept"
                    style={styles.action}
                    onPress={() => {
                      const matchId = mock.acceptRequest(r.id);
                      if (matchId) router.push({ pathname: '/reveal/[matchId]', params: { matchId } });
                    }}
                  />
                </View>
              </RequestCard>
            ))}
            {received.length === 0 && <Empty text="No new requests. When someone nearby is interested, they’ll show up here." />}
            <View style={styles.note}>
              <EyeOff size={20} color={colors.textTertiary} strokeWidth={1.75} />
              <Text variant="bodyM" color={colors.textSecondary} style={{ flex: 1 }}>
                Ignoring is silent. The other person is never notified.
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* The sender only ever sees "waiting" — an ignore looks exactly like no answer yet. */}
            {sent.map((r) => (
              <RequestCard key={r.id} person={r.to} hoursLeft={r.hoursLeft} line="Waiting. You’ll know only if it’s mutual." />
            ))}
            {sent.length === 0 && <Empty text="You haven’t sent any requests today." />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function RequestCard({
  person,
  hoursLeft,
  line,
  children,
}: {
  person: Stranger;
  hoursLeft: number;
  line: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={[card, styles.card]}>
      <View style={styles.top}>
        <AnonymousAvatar size={52} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="title">
            {person.gender}, {person.age}
          </Text>
          <VerifiedLine bucket={person.bucket} />
        </View>
        <View style={styles.timer}>
          <Clock size={13} color={colors.textTertiary} strokeWidth={2} />
          <Text variant="bodyS" color={colors.textTertiary} style={{ fontSize: 12, lineHeight: 17 }}>
            {hoursLeft}h left
          </Text>
        </View>
      </View>
      <Text variant="bodyM" color={colors.textSecondary}>
        {line}
      </Text>
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Text variant="bodyM" color={colors.textSecondary} style={{ textAlign: 'center', marginVertical: 24 }}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: screenGutter, paddingBottom: 24, gap: 16 },
  card: { padding: 17, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 27,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: colors.bgRaised,
  },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, height: 48 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
});
