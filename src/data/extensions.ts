// Single source of truth for LayerPorter's browser extensions.
//
// SLEEPING BY DESIGN: every extension below has storeUrl: null until its
// Chrome/Edge Web Store listing is actually published. ExtensionCTA,
// ExtensionFooterLine, and SiteVsExtensionTable (src/components/) all check
// storeUrl before rendering anything, so with every storeUrl null none of
// those components emit any markup on any page.
//
// The one deliberate exception is /extensions/ (src/pages/extensions.astro)
// — a pre-launch showcase page that talks about both extensions on purpose,
// with a "coming to Chrome Web Store" status badge instead of an install
// button. That page becomes the CTA hub once a storeUrl below goes live.
//
// TO ACTIVATE: once a listing URL exists, fill in ONLY that extension's
// storeUrl below. Every gated CTA across the site wakes up at once for that
// extension — no other file needs to change. Do not invent a URL.
//
// job: what real, live task the extension does that the static
// file-converter pages on this site cannot. Today both extensions do the
// same job — capturing a live website into layers — which is deliberate:
// the site's file converters (png-to-psd, jpg-to-psd, psd-to-png,
// psd-to-jpg, jpg-to-pdf, pdf-to-jpg, favicon-generator, webp-to-jpg) only
// ever touch a file you already have, never a live page, so none of them
// share this job. Only pages whose job genuinely matches an extension here
// get a CTA — see the relevance rule in ConverterLayout.astro and
// ArticleLayout.astro. If a new extension is added with a different job,
// it needs its own matching placement, not a copy-paste of an existing one.
export interface Extension {
  id: string;
  name: string;
  job: 'website-capture';
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

// Convenience for gates that only need a yes/no, not the list itself.
export const anyExtensionLive = extensions.some((e) => e.storeUrl !== null);
