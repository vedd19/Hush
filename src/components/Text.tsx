import { Text as RNText, type TextProps } from 'react-native';

import { colors, type, type TypeVariant } from '@/theme/tokens';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
};

export function Text({ variant = 'bodyM', color = colors.textPrimary, style, ...rest }: Props) {
  return <RNText style={[type[variant], { color }, style]} {...rest} />;
}
