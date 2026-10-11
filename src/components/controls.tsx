// Small interactive controls shared across screens: chips, segmented control,
// toggle switch, radio dot and the two-thumb age range slider.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Text } from '@/components/Text';
import { colors, radii } from '@/theme/tokens';

type Option<T extends string> = { value: T; label: string };

export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  compact,
}: {
  label?: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** 40px chips (filters) instead of the 44px form chips. */
  compact?: boolean;
}) {
  return (
    <View style={{ gap: 10 }}>
      {label && (
        <Text variant="labelM" color={colors.textSecondary}>
          {label}
        </Text>
      )}
      <View style={styles.chipRow} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              hitSlop={compact ? 2 : 0}
              style={[styles.chip, compact && styles.chipCompact, on ? styles.chipOn : styles.chipOff]}>
              <Text variant="labelM" style={compact && { fontSize: 13 }} color={on ? colors.textOnBrand : colors.textPrimary}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  quiet,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Selected segment is a raised grey instead of coral (e.g. Received / Sent). */
  quiet?: boolean;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && { backgroundColor: quiet ? colors.bgRaised : colors.coral }]}>
            <Text
              variant="labelM"
              style={{ fontSize: quiet ? 14 : 13 }}
              color={quiet ? (on ? colors.textPrimary : colors.textSecondary) : on ? colors.textOnBrand : colors.textPrimary}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * `locked` shows the greyed "always on" look. Leaving out `onChange` keeps the
 * normal look but makes the switch read-only.
 */
export function Toggle({
  value,
  onChange,
  locked,
  label,
}: {
  value: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
  label: string;
}) {
  const readOnly = locked || !onChange;
  const on = locked || value;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled: readOnly }}
      disabled={readOnly}
      onPress={() => onChange?.(!value)}
      hitSlop={7}
      style={[
        styles.toggle,
        locked ? { backgroundColor: colors.bgRaised } : on ? { backgroundColor: colors.coral } : styles.toggleOff,
      ]}>
      <View
        style={[
          styles.knob,
          { backgroundColor: on && !locked ? colors.textOnBrand : colors.textTertiary },
          on ? { right: 3 } : { left: 3 },
        ]}
      />
    </Pressable>
  );
}

export function RadioDot({ on }: { on: boolean }) {
  return <View style={[styles.radio, on && { backgroundColor: colors.coral, borderColor: colors.coral }]} />;
}

const THUMB = 24;

/** Two-thumb slider for picking a whole-number range, e.g. ages 22–35. */
export function RangeSlider({
  min,
  max,
  low,
  high,
  onChange,
}: {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}) {
  const [width, setWidth] = useState(0);
  // Unrounded thumb values while dragging, so slow drags still move smoothly.
  const [exact, setExact] = useState({ low, high });
  const travel = Math.max(width - THUMB, 1);
  const toX = (v: number) => ((v - min) / (max - min)) * travel;

  useEffect(() => {
    const l = Math.round(exact.low);
    const h = Math.round(exact.high);
    if (l !== low || h !== high) onChange(l, h);
  }, [exact, low, high, onChange]);

  const drag = (which: 'low' | 'high') =>
    Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .hitSlop(10)
      .onChange((e) => {
        const delta = (e.changeX / travel) * (max - min);
        setExact((v) =>
          which === 'low'
            ? { ...v, low: Math.min(Math.max(v.low + delta, min), v.high - 1) }
            : { ...v, high: Math.max(Math.min(v.high + delta, max), v.low + 1) },
        );
      });

  return (
    <View style={styles.slider} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.track} />
      <View style={[styles.fill, { left: toX(low) + THUMB / 2, width: toX(high) - toX(low) }]} />
      <GestureDetector gesture={drag('low')}>
        <View style={[styles.thumb, { left: toX(low) }]} accessibilityLabel={`Minimum age ${low}`} />
      </GestureDetector>
      <GestureDetector gesture={drag('high')}>
        <View style={[styles.thumb, { left: toX(high) }]} accessibilityLabel={`Maximum age ${high}`} />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 44, paddingHorizontal: 18, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  chipCompact: { height: 40, paddingHorizontal: 16 },
  chipOn: { backgroundColor: colors.coral },
  chipOff: { borderWidth: 1.5, borderColor: colors.borderSubtle },
  segmented: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 18, backgroundColor: colors.bgSurface },
  segment: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toggle: { width: 52, height: 30, borderRadius: 15 },
  toggleOff: { borderWidth: 1.5, borderColor: colors.borderSubtle },
  knob: { position: 'absolute', top: 3, width: 24, height: 24, borderRadius: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderSubtle },
  slider: { height: THUMB, justifyContent: 'center' },
  track: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: colors.borderSubtle },
  fill: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: colors.coral },
  thumb: { position: 'absolute', top: 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: colors.textPrimary },
});
