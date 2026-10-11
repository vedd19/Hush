import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, screenGutter } from '@/theme/tokens';

/** A soft blurred circle behind the content. `x`/`y` are its centre in the 390-wide Figma frame. */
export type Glow = { source: number; x: number; y: number; size: number };

type Props = {
  children: ReactNode;
  glows?: Glow[];
  /** Pinned below the scrolling content (e.g. the primary button). */
  footer?: ReactNode;
  gap?: number;
};

/** Background glow layer; place it first inside a full-screen container. */
export function Glows({ glows }: { glows: Glow[] }) {
  return (
    <View style={styles.glows}>
      {glows.map((g, i) => (
        <Image
          key={i}
          source={g.source}
          style={{ position: 'absolute', width: g.size, height: g.size, left: g.x - g.size / 2, top: g.y - g.size / 2 }}
        />
      ))}
    </View>
  );
}

// Standard Hush page: dark background, optional glows, 24px gutters, content that
// scrolls on short phones, and a footer that stays at the bottom.
export function Screen({ children, glows = [], footer, gap = 18 }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Glows glows={glows} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { gap, paddingTop: insets.top + 12 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase, overflow: 'hidden' },
  glows: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: screenGutter, paddingBottom: 18 },
  footer: { paddingHorizontal: screenGutter, paddingTop: 8 },
});
