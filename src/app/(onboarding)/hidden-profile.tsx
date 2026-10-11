import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import avatarAnonymous from '@/assets/figma/avatar-anonymous.svg';
import glowProfile from '@/assets/figma/glow-profile.png';
import iconCamera from '@/assets/figma/icon-camera.svg';
import iconLock from '@/assets/figma/icon-lock-onbrand.svg';
import { Button } from '@/components/Button';
import { ChipGroup } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Heading, StepHeader } from '@/components/StepHeader';
import { Text } from '@/components/Text';
import { colors, radii, type } from '@/theme/tokens';

type Gender = 'woman' | 'man' | 'nonbinary';
type Interest = 'men' | 'women' | 'everyone';

const genderLabel: Record<Gender, string> = { woman: 'Woman', man: 'Man', nonbinary: 'Non-binary' };

// Mock: comes from the verified birth date in Phase 3.
const MOCK_AGE = 24;

export default function HiddenProfile() {
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const [gender, setGender] = useState<Gender>('woman');
  const [interest, setInterest] = useState<Interest>('men');

  return (
    <Screen
      glows={[{ source: glowProfile, x: 330, y: -30, size: 600 }]}
      footer={<Button label="Continue" onPress={() => router.push('/safety-controls')} />}>
      <StepHeader step={2} />
      <Heading title="Your hidden profile" subtitle="Name and photo stay locked until someone you like says yes too." />

      <View style={styles.photoRow}>
        {/* Photo picking and upload arrive in Phase 3. */}
        <View style={styles.addPhoto} accessibilityLabel="Add photo">
          <Icon source={iconCamera} size={24} />
          <Text variant="bodyS" color={colors.textSecondary} style={{ fontSize: 11, lineHeight: 16 }}>
            Add photo
          </Text>
          <View style={styles.lockBadge}>
            <Icon source={iconLock} size={15} />
          </View>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Text variant="labelM" color={colors.textSecondary}>
            First name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your first name"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            autoComplete="given-name"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[styles.input, focused && { borderColor: colors.coral }]}
          />
        </View>
      </View>

      <ChipGroup
        label="I am"
        value={gender}
        onChange={setGender}
        options={[
          { value: 'woman', label: 'Woman' },
          { value: 'man', label: 'Man' },
          { value: 'nonbinary', label: 'Non-binary' },
        ]}
      />
      <ChipGroup
        label="Interested in"
        value={interest}
        onChange={setInterest}
        options={[
          { value: 'men', label: 'Men' },
          { value: 'women', label: 'Women' },
          { value: 'everyone', label: 'Everyone' },
        ]}
      />

      <View style={styles.preview}>
        <Text variant="caps" color={colors.textTertiary}>
          Before a match, people see only
        </Text>
        <View style={styles.previewRow}>
          <View style={styles.avatar}>
            <Icon source={avatarAnonymous} size={52} />
          </View>
          <View style={{ gap: 3 }}>
            <Text variant="title">
              {genderLabel[gender]}, {MOCK_AGE}
            </Text>
            <Text variant="bodyS" color={colors.textSecondary}>
              Under 2 km · Verified
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  addPhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.textTertiary,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  lockBadge: {
    position: 'absolute',
    left: 63,
    top: 63,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    ...type.bodyL,
    color: colors.textPrimary,
    height: 52,
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgSurface,
  },
  preview: {
    gap: 14,
    padding: 16,
    borderRadius: radii.card,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', backgroundColor: colors.bgRaised },
});
