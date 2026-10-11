import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, Send, Shield } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LetterAvatar, VerifiedLine } from '@/components/people';
import { Text } from '@/components/Text';
import { mock, useMock, type Message } from '@/mock/store';
import { colors, fonts, type } from '@/theme/tokens';

// Shared empty list so the store selector returns the same value each time.
const NO_MESSAGES: Message[] = [];

export default function Chat() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const match = useMock((s) => s.matches.find((m) => m.id === matchId));
  const messages = useMock((s) => s.messages[matchId] ?? NO_MESSAGES);
  const checkInOn = useMock((s) => s.checkInOn);
  const { top, bottom } = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);

  // Unmatched or blocked: the chat disappears entirely.
  if (!match) return null;

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    mock.sendMessage(match.id, body);
    setDraft('');
  };
  const lastIsMine = messages.length > 0 && messages[messages.length - 1].fromMe;

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <View style={[styles.header, { paddingTop: top + 4 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.headerButton}>
          <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
        <LetterAvatar name={match.firstName} size={42} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title">
            {match.firstName}, {match.age}
          </Text>
          <VerifiedLine bucket={match.bucket} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Safety options"
          onPress={() => router.push({ pathname: '/safety/[matchId]', params: { matchId: match.id } })}
          style={({ pressed }) => [styles.headerButton, styles.bordered, pressed && { opacity: 0.7 }]}>
          <Shield size={20} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled">
        <Text variant="caps" color={colors.textTertiary} style={{ alignSelf: 'center', letterSpacing: 0.5 }}>
          {match.matchedLabel}
        </Text>
        <View style={styles.system}>
          <Text variant="bodyS" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            You both said yes. Be kind — block or report anytime from the shield.
          </Text>
        </View>
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.fromMe ? styles.mine : styles.theirs]}>
            <Text style={[styles.bubbleText, { color: m.fromMe ? colors.textOnBrand : colors.textPrimary }]}>{m.body}</Text>
          </View>
        ))}
        {lastIsMine && (
          <Text style={styles.seen} color={colors.textTertiary}>
            Seen 6:42 pm
          </Text>
        )}
      </ScrollView>

      {!checkInOn && (
        <View style={styles.banner}>
          <Clock size={18} color={colors.coral} strokeWidth={1.75} />
          <Text variant="bodyM" style={{ flex: 1 }}>
            Meeting today? Set a safety check-in
          </Text>
          {/* The real check-in flow arrives in Phase 6. */}
          <Pressable accessibilityRole="button" onPress={() => mock.setCheckIn(true)} hitSlop={12}>
            <Text variant="labelM" color={colors.coral} style={{ fontFamily: fonts.sansBold }}>
              Set
            </Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.composer, { paddingBottom: bottom + 12 }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`Message ${match.firstName}`}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          onPress={send}
          style={({ pressed }) => [styles.send, pressed && { opacity: 0.85 }]}>
          <Send size={20} color={colors.textOnBrand} strokeWidth={1.9} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bordered: { borderRadius: 14, borderWidth: 1.5, borderColor: colors.borderSubtle },
  messages: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, gap: 10 },
  system: {
    alignSelf: 'center',
    maxWidth: 300,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 0,
  },
  bubble: { maxWidth: '76%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.coral },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.bgRaised },
  bubbleText: { ...type.bodyL, fontSize: 15, lineHeight: 23 },
  seen: { alignSelf: 'flex-end', fontFamily: fonts.sansMedium, fontSize: 11, lineHeight: 16 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.coralTint,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  input: {
    ...type.bodyL,
    flex: 1,
    height: 50,
    paddingHorizontal: 19,
    paddingVertical: 0,
    borderRadius: 25,
    backgroundColor: colors.bgSurface,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    color: colors.textPrimary,
  },
  send: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
});
