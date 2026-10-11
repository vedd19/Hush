import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radii } from '@/theme/tokens';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
};

export function Button({ label, variant = 'primary', style, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      style={(state) => [
        styles.base,
        styles[variant],
        state.pressed && { opacity: 0.85 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {variant === 'ghost' ? (
        <Text variant="labelM" color={colors.textSecondary}>
          {label}
        </Text>
      ) : (
        <Text variant="button" color={variant === 'primary' ? colors.textOnBrand : colors.textPrimary}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primary: { backgroundColor: colors.coral },
  secondary: { backgroundColor: colors.bgRaised, borderWidth: 1, borderColor: colors.borderSubtle },
  outline: { height: 50, borderWidth: 1.5, borderColor: colors.borderSubtle },
  ghost: { height: 44 },
});
