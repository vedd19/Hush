// No Figma frame exists for the Chats list; this follows the styles of 07 Requests and 09 Chat.
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { card, LetterAvatar, TabTitle, tabScreen, useTabTopPadding } from '@/components/people';
import { Text } from '@/components/Text';
import { useMock } from '@/mock/store';
import { colors, screenGutter } from '@/theme/tokens';

export default function Chats() {
  const top = useTabTopPadding();
  const matches = useMock((s) => s.matches);
  const messages = useMock((s) => s.messages);

  return (
    <View style={[tabScreen, { paddingHorizontal: 0 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: top }]} showsVerticalScrollIndicator={false}>
        <TabTitle>Chats</TabTitle>
        {matches.length === 0 ? (
          <Text variant="bodyM" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 40 }}>
            No chats yet. When a request is mutual, you can talk here.
          </Text>
        ) : (
          <View style={[card, { overflow: 'hidden' }]}>
            {matches.map((m, i) => {
              const last = messages[m.id]?.at(-1);
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/chat/[matchId]', params: { matchId: m.id } })}
                  style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { backgroundColor: colors.bgRaised }]}>
                  <LetterAvatar name={m.firstName} size={52} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text variant="title">
                      {m.firstName}, {m.age}
                    </Text>
                    <Text variant="bodyS" color={colors.textSecondary} numberOfLines={1}>
                      {last ? `${last.fromMe ? 'You: ' : ''}${last.body}` : 'Say hello 👋'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: screenGutter, paddingBottom: 24, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
});
