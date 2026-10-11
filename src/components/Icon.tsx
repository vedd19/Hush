import { Image, type ImageSource } from 'expo-image';

type Props = {
  source: ImageSource | number;
  size: number;
  /** Recolours every visible pixel — used when one icon appears in several states. */
  tintColor?: string;
};

// Renders an icon exported from Figma (an .svg in assets/figma) at its design size.
export function Icon({ source, size, tintColor }: Props) {
  return <Image source={source} style={{ width: size, height: size }} tintColor={tintColor} contentFit="contain" />;
}
