// Format detection + routing table for the home-page universal dropzone
// (UniversalDropzone.astro). Detection is by MAGIC BYTES, never by file
// extension or the unreliable file.type — same policy every widget on this
// site already follows (see looksLikePsd/looksLikeWebp etc. in the widgets).
//
// The routing table only ever points at converters that actually exist on
// this site. Formats we can identify but not convert (gif/bmp/ico/svg) get
// an honest "no converter yet" answer in the dropzone, not an invented tool.

export type DetectedFormat =
  | 'png'
  | 'jpg'
  | 'webp'
  | 'psd'
  | 'pdf'
  | 'pptx'
  | 'gif'
  | 'bmp'
  | 'ico'
  | 'svg'
  | 'unknown';

export interface Route {
  href: string;
  label: string;
  target: string; // analytics id for track('universal_route_click')
}

// Which converters make sense for each detected format. jpg-to-pdf accepts
// PNG too (its widget takes image/jpeg,image/png), so PNG offers it as well.
// pptx: ZIP magic bytes (PK\x03\x04) — the checker itself validates the
// actual PPTX structure, the dropzone only routes.
export const FORMAT_ROUTES: Partial<Record<DetectedFormat, Route[]>> = {
  png: [
    { href: '/convert/png-to-psd/', label: 'PNG to PSD', target: 'png-to-psd' },
    { href: '/convert/jpg-to-pdf/', label: 'JPG to PDF', target: 'jpg-to-pdf' },
    { href: '/convert/favicon-generator/', label: 'Favicon Generator', target: 'favicon-generator' },
  ],
  jpg: [
    { href: '/convert/jpg-to-psd/', label: 'JPG to PSD', target: 'jpg-to-psd' },
    { href: '/convert/jpg-to-pdf/', label: 'JPG to PDF', target: 'jpg-to-pdf' },
    { href: '/convert/favicon-generator/', label: 'Favicon Generator', target: 'favicon-generator' },
  ],
  webp: [{ href: '/convert/webp-to-jpg/', label: 'WebP to JPG', target: 'webp-to-jpg' }],
  psd: [
    { href: '/convert/psd-to-png/', label: 'PSD to PNG', target: 'psd-to-png' },
    { href: '/convert/psd-to-jpg/', label: 'PSD to JPG', target: 'psd-to-jpg' },
  ],
  pdf: [{ href: '/convert/pdf-to-jpg/', label: 'PDF to JPG', target: 'pdf-to-jpg' }],
  pptx: [
    { href: '/convert/canva-to-google-slides/', label: 'Canva → Slides Checker', target: 'canva-to-google-slides' },
  ],
};

export async function detectFormat(file: File): Promise<DetectedFormat> {
  let b: Uint8Array;
  try {
    b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch {
    return 'unknown';
  }

  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return 'webp'; // RIFF....WEBP
  }
  if (b[0] === 0x38 && b[1] === 0x42 && b[2] === 0x50 && b[3] === 0x53) return 'psd'; // 8BPS
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf'; // %PDF
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'pptx'; // PK zip
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'gif'; // GIF8
  if (b[0] === 0x42 && b[1] === 0x4d) return 'bmp'; // BM
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) return 'ico';

  // SVG is text — sniff the first kilobyte for an <svg root (possibly after
  // an XML declaration / doctype / comments).
  try {
    const head = (await file.slice(0, 1024).text()).toLowerCase();
    if (head.includes('<svg')) return 'svg';
  } catch {
    /* fall through */
  }

  return 'unknown';
}
