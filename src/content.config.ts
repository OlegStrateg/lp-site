import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const preservedItem = z.object({
  item: z.string(),
  value: z.string(),
});

const faqItem = z.object({
  q: z.string(),
  a: z.string(),
});

const competitorItem = z.object({
  name: z.string(),
  where: z.string(),
  output: z.string(),
  outputUrl: z.string().optional(),
  limits: z.string(),
  note: z.string().optional(),
});

const howToStep = z.object({
  step: z.string(),
  text: z.string(),
});

const moreConversionItem = z.object({
  label: z.string(),
  slug: z.string(),
});

// --- v2 template fields (ТЗ 19.07: png-to-psd rebuilt to the owner's
// tool-page prototype, generalized 19.07 to the other 8 converter/checker
// pages; layoutVariant gates which pages opt in). All new fields are
// optional/defaulted so a page with none of them set (e.g.
// canva-to-google-slides) still validates and the v2 layout degrades to
// just the sections it has real content for. ---
const expectationSchema = z.object({
  pngLabel: z.string(),
  psdLabel: z.string(),
  pngChecks: z.array(z.string()),
  psdChecks: z.array(z.string()),
  truthNote: z.string(),
});

const whatYouGetItem = z.object({
  title: z.string(),
  text: z.string(),
});

const whatChangesRow = z.object({
  property: z.string(),
  before: z.string(),
  after: z.string(),
});

const useCaseItem = z.object({
  title: z.string(),
  text: z.string(),
});

const threeWaysRow = z.object({
  tool: z.string(),
  runsWhere: z.string(),
  output: z.string(),
  notes: z.string(),
});

const converters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/converters' }),
  schema: z.object({
    key: z.string(),
    // Conversion direction for the widget. Defaults preserve the pilot page.
    // Widget dispatch (see ConverterLayout.astro) reads inputKind AND
    // outputKind together, since wave 2 (yarus B) reuses 'raster' for two
    // different widgets:
    //   inputKind 'pptx'                -> CheckerWidget    (on-page report)
    //   outputKind 'pdf'  (input raster)-> JpgToPdfWidget    (multi-file -> 1 PDF)
    //   inputKind 'pdf'                 -> PdfToJpgWidget    (1 PDF -> JPG/ZIP)
    //   outputKind 'favicon' (input raster) -> FaviconWidget (1 image -> ZIP of sizes)
    //   everything else (raster/psd/webp in, psd/png/jpg out) -> ConverterWidget
    inputKind: z.enum(['raster', 'psd', 'pptx', 'webp', 'pdf']).default('raster'),
    outputKind: z.enum(['psd', 'png', 'jpg', 'slides', 'pdf', 'favicon']).default('psd'),
    h1: z.string(),
    title: z.string(),
    metaDescription: z.string(),
    ogTitle: z.string(),
    ogDescription: z.string(),
    answerFirst: z.string(),
    privacyLine: z.string(),
    // One-sentence blurb for the /convert/ hub's tool-card grid.
    cardBlurb: z.string(),
    toolHeading: z.string(),
    howItWorksHeading: z.string().default('How it works'),
    preservedHeading: z.string().default("What's preserved"),
    comparisonHeading: z.string(),
    faqHeading: z.string().default('FAQ'),
    moreConversionsHeading: z.string().default('More conversions'),
    // Real sibling-page links (rendered as <a href="/convert/{slug}/">{label}</a>).
    // The hub link ("Browse all converters") is appended by ConverterLayout itself.
    moreConversions: z.array(moreConversionItem).default([]),
    howTo: z.array(howToStep),
    // Optional override for the JSON-LD HowTo name. Default is derived from the
    // key ("How to convert X to Y in your browser") — override when the key's
    // "-to-" split reads badly (e.g. canva-to-google-slides).
    howToName: z.string().optional(),
    preserved: z.array(preservedItem),
    // SoftwareApplication.featureList (JSON-LD) — one honest sentence, no fabricated claims.
    featureList: z.string(),
    competitorNote: z.string(),
    competitors: z.array(competitorItem),
    faq: z.array(faqItem),
    // v2 template — see comment above. 'v1' pages ignore all of the below.
    layoutVariant: z.enum(['v1', 'v2']).default('v1'),
    // Gates the "Open in Photopea" continue-card AND the widget's own
    // "Open in Photopea" button (see ConverterLayout.astro's "Continue
    // working with your file" section and ConverterWidget's enablePhotopea
    // prop). Only meaningful on PSD-OUTPUT pages — Photopea opens the PSD
    // the visitor just downloaded, so it's a real next step there and a dead
    // end anywhere else. True on png-to-psd and jpg-to-psd today.
    continuePhotopea: z.boolean().default(false),
    proofChips: z.array(z.string()).default([]),
    expectation: expectationSchema.optional(),
    whatYouGet: z.array(whatYouGetItem).default([]),
    whatChanges: z.array(whatChangesRow).default([]),
    useCases: z.array(useCaseItem).default([]),
    threeWays: z.array(threeWaysRow).default([]),
    // Heading over the threeWays table. Optional — the layout falls back to
    // a derived "Three ways to convert X to Y" from the page key when unset.
    threeWaysHeading: z.string().optional(),
  }),
});

// Wave 2 (yarus C): long-form supporting articles, separate from the
// converter tool pages. Two static sections today — /formats/{slug}/ for
// "what is X format" explainers, /guides/{slug}/ for task-oriented guides —
// picked per-entry via `section`, so adding a third section later is a new
// enum value + a new src/pages/{section}/[slug].astro, not a schema rewrite.
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    key: z.string(), // source filename stem, kept for cross-referencing only
    section: z.enum(['formats', 'guides']),
    slug: z.string(), // final path segment: /{section}/{slug}/
    title: z.string(),
    description: z.string(),
    h1: z.string(),
    answerFirst: z.string(),
    faqHeading: z.string().default('FAQ'),
    faq: z.array(faqItem).default([]),
  }),
});

export const collections = { converters, articles };
