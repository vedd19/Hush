// Local images are bundled as assets; importing one gives an id that
// expo-image's <Image source> accepts.
declare module '*.svg' {
  const asset: number;
  export default asset;
}
declare module '*.png' {
  const asset: number;
  export default asset;
}
