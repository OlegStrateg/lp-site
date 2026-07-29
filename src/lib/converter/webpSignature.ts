// Pure byte-signature check, split out of ConverterWidget.astro's inline
// script so it has a module path the node smoke gate can import directly
// (an inline <script> block inside an .astro file isn't importable from
// node). WebP = a RIFF container: bytes 0-3 "RIFF", bytes 8-11 "WEBP".
export function looksLikeWebpBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return riff && webp;
}
