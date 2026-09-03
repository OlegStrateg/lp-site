// Single source of truth for LayerPorter's browser extensions.
//
// storeUrl is null until the extension is actually published.
// Gated CTAs must check BOTH availability and job relevance: a live image
// converter must never wake up a CTA that promises live website capture.
//
// Jobs:
// - image-conversion: converts images/files in the browser.
// - media-download: saves media from the active browser page.
// - website-capture: turns a live webpage into editable design output.
//
export interface Extension {
  id: string;
  name: string;
  job: 'image-conversion' | 'media-download' | 'website-capture';
  storeUrl: string | null;
  blurb: string;
  // Fields below are for /extensions/ (src/pages/extensions.astro) — the
  // pre-launch showcase page for extensions that aren't in a store yet.
  whatItDoes: string; // one/two-sentence description of the actual mechanic
  bullets: string[]; // 3 honest capability bullets, no invented claims
  bridgeHref: string; // where the "meanwhile, try the site" line points
  bridgeLabel: string; // link text for that bridge line
}

export const extensions: Extension[] = [
  {
    id: 'picture-converter',
    name: 'Picture Converter',
    job: 'image-conversion',
    storeUrl: 'https://chromewebstore.google.com/detail/picture-converter/oegpbmdpckfdgodnkdnoggedamfflfcl?utm_source=layerporter&utm_medium=website&utm_campaign=extensions-page',
    blurb: "Convert one selected website image or a local image file to JPG, PNG, WebP, PDF or ICO in Chrome.",
    whatItDoes:
      "Select one image on a website or open a local WebP, HEIC, AVIF, PNG, JPG, JPEG, GIF, BMP, JFIF or SVG file, choose an output format, and save a converted copy. Up to 30 images can be combined into one PDF.",
    bullets: [
      'Website image → JPG / PNG / WebP / PDF / ICO',
      'WebP / HEIC / AVIF / SVG and other local image inputs',
      'Up to 30 images → one ordered PDF',
    ],
    bridgeHref: '/picture-converter/',
    bridgeLabel: 'Open Picture Converter details',
  },
  {
    id: 'site-to-canva',
    name: 'Site to Canva',
    job: 'website-capture',
    storeUrl: null, // <- fill in with the published Chrome/Edge listing URL
    blurb: "Capture any live page as editable layers, right from the page you're looking at, and drop them into Canva.",
    whatItDoes:
      "Select a section of any live site, and it lands on your Canva canvas as separate, editable layers — text, shapes, and images kept apart instead of merged into one flat picture.",
    bullets: [
      'Real text and positions, not a screenshot',
      'One-time pairing code, captures auto-delete in 24h',
      'activeTab: reads a page only when you click',
    ],
    bridgeHref: '/convert/',
    bridgeLabel: 'Browse converters',
  },
  {
    // "PSD Export" is a working name, pending final approval before the
    // store listing goes live — update here (id can stay) once confirmed.
    id: 'psd-export',
    name: 'PSD Export',
    job: 'website-capture',
    storeUrl: null, // <- fill in with the published Chrome/Edge listing URL
    blurb: "Capture any live page as a layered PSD, right from the page you're looking at, and open it in Photoshop, GIMP, or Photopea.",
    whatItDoes:
      "Select a section of any live site and download it as a layered .psd — the same layer separation as Site to Canva, packaged for Photoshop instead of Canva.",
    bullets: [
      'Editable layers in Photoshop, GIMP, Photopea',
      '100% on your device, nothing uploaded',
      'activeTab-only',
    ],
    bridgeHref: '/convert/png-to-psd/',
    bridgeLabel: 'Try PNG to PSD',
  },
];

export function liveExtensionsForJob(job: Extension['job']): Extension[] {
  return extensions.filter((e) => e.job === job && e.storeUrl !== null);
}

// Convenience for truly global surfaces that only need a yes/no.
export const anyExtensionLive = extensions.some((e) => e.storeUrl !== null);
