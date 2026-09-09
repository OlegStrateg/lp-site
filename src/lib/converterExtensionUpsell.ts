type TrackFn = (name: string, props?: Record<string, string | number | boolean | undefined>) => void;

type UpsellConfig = {
  campaign: string;
  widgetId: string;
  inlineTitle: string;
  inlineBody: string;
  successLabel: string;
  cta: string;
  kicker?: string;
  detailsLabel?: string;
  detailsHref?: string;
  successEnabled?: boolean;
};

const PICTURE_CONVERTER_BASE_URL = 'https://chromewebstore.google.com/detail/picture-converter/oegpbmdpckfdgodnkdnoggedamfflfcl';

const ADJACENT_IMAGE_BODY = 'For everyday image conversion beyond PSD, Picture Converter handles selected website images and local WebP, HEIC, AVIF, PNG, JPG and other image files, with JPG, PNG, WebP, PDF or ICO output. This PSD conversion stays on LayerPorter.';

const UPSELLS: Record<string, UpsellConfig> = {
  '/convert/webp-to-jpg/': {
    campaign: 'webp-to-jpg-converter',
    widgetId: 'converter-widget',
    inlineTitle: 'Convert straight from websites next time — and keep the tool one click away in Chrome.',
    inlineBody: 'Picture Converter converts a selected website image or a local image file to JPG, PNG, WebP, PDF or ICO without reopening LayerPorter.',
    successLabel: 'Keep this workflow in Chrome — convert selected website images without coming back here',
    cta: 'Add Picture Converter to Chrome',
  },
  '/convert/jpg-to-pdf/': {
    campaign: 'jpg-to-pdf-converter',
    widgetId: 'jpg-pdf-widget',
    inlineTitle: 'Turn images into PDF from Chrome next time — without coming back to this page.',
    inlineBody: 'Picture Converter works with website images and local image files in Chrome, and can combine up to 30 images into one ordered PDF.',
    successLabel: 'Next time, keep JPG → PDF in Chrome instead of reopening this page',
    cta: 'Add Picture Converter to Chrome',
  },
  '/pt-br/convert/jpg-to-pdf/': {
    campaign: 'pt-br-jpg-to-pdf-converter',
    widgetId: 'jpg-pdf-widget',
    kicker: 'Deixe no Chrome',
    inlineTitle: 'Na próxima vez, converta imagens direto dos sites — e deixe o Picture Converter sempre à mão no Chrome.',
    inlineBody: 'O Picture Converter converte imagens de sites ou arquivos locais para JPG, PNG, WebP, PDF ou ICO e pode juntar até 30 imagens em um único PDF.',
    successLabel: 'Deixe JPG → PDF sempre à mão no Chrome',
    cta: 'Adicionar Picture Converter ao Chrome',
    detailsLabel: 'Ver como funciona',
    detailsHref: '/pt-br/picture-converter/',
  },
  '/convert/favicon-generator/': {
    campaign: 'favicon-generator-converter',
    widgetId: 'favicon-widget',
    inlineTitle: 'Need a quick image → ICO conversion later? Keep it in Chrome.',
    inlineBody: 'Picture Converter converts a selected website image or a local image file to ICO, JPG, PNG, WebP or PDF directly in Chrome.',
    successLabel: 'Keep image → ICO conversion one click away in Chrome',
    cta: 'Add Picture Converter to Chrome',
  },
  '/convert/png-to-psd/': {
    campaign: 'png-to-psd-adjacent-image-conversion',
    widgetId: 'converter-widget',
    inlineTitle: 'Keep the rest of your image conversion work one click away in Chrome.',
    inlineBody: ADJACENT_IMAGE_BODY,
    successLabel: '',
    cta: 'Add Picture Converter to Chrome',
    successEnabled: false,
  },
  '/convert/jpg-to-psd/': {
    campaign: 'jpg-to-psd-adjacent-image-conversion',
    widgetId: 'converter-widget',
    inlineTitle: 'Keep the rest of your image conversion work one click away in Chrome.',
    inlineBody: ADJACENT_IMAGE_BODY,
    successLabel: '',
    cta: 'Add Picture Converter to Chrome',
    successEnabled: false,
  },
  '/convert/psd-to-png/': {
    campaign: 'psd-to-png-adjacent-image-conversion',
    widgetId: 'converter-widget',
    inlineTitle: 'Keep the rest of your image conversion work one click away in Chrome.',
    inlineBody: ADJACENT_IMAGE_BODY,
    successLabel: '',
    cta: 'Add Picture Converter to Chrome',
    successEnabled: false,
  },
  '/convert/psd-to-jpg/': {
    campaign: 'psd-to-jpg-adjacent-image-conversion',
    widgetId: 'converter-widget',
    inlineTitle: 'Keep the rest of your image conversion work one click away in Chrome.',
    inlineBody: ADJACENT_IMAGE_BODY,
    successLabel: '',
    cta: 'Add Picture Converter to Chrome',
    successEnabled: false,
  },
};

function storeUrl(campaign: string): string {
  return `${PICTURE_CONVERTER_BASE_URL}?utm_source=layerporter&utm_medium=website&utm_campaign=${campaign}`;
}

function installInlineOffer(config: UpsellConfig, track: TrackFn): void {
  if (document.getElementById('extension-inline-offer')) return;

  const host = document.querySelector<HTMLElement>('.hero2-copy') ?? document.querySelector<HTMLElement>('.hero');
  if (!host) return;

  const block = document.createElement('div');
  block.className = 'cross-sell';
  block.id = 'extension-inline-offer';

  const kicker = document.createElement('p');
  kicker.className = 'cross-sell-label';
  kicker.textContent = config.kicker ?? 'Keep it in Chrome';

  const title = document.createElement('p');
  title.className = 'dz-title';
  title.textContent = config.inlineTitle;

  const body = document.createElement('p');
  body.className = 'dz-sub';
  body.textContent = config.inlineBody;

  const actions = document.createElement('div');
  actions.className = 'ext-actions';

  const install = document.createElement('a');
  install.className = 'btn';
  install.href = storeUrl(config.campaign);
  install.target = '_blank';
  install.rel = 'noopener noreferrer';
  install.textContent = config.cta;
  install.addEventListener('click', () => {
    track('extension_store_click', {
      product: 'picture_converter',
      placement: 'converter_inline_offer',
    });
  });

  const details = document.createElement('a');
  details.className = 'btn secondary';
  details.href = config.detailsHref ?? '/picture-converter/';
  details.textContent = config.detailsLabel ?? 'See how it works';

  actions.append(install, details);
  block.append(kicker, title, body, actions);
  host.appendChild(block);
}

export function installConverterExtensionUpsell(track: TrackFn): void {
  if (typeof window === 'undefined') return;

  const config = UPSELLS[window.location.pathname];
  if (!config) return;

  installInlineOffer(config, track);
  if (config.successEnabled === false) return;

  const widget = document.getElementById(config.widgetId);
  const successView = widget?.querySelector<HTMLElement>('[data-state-view="success"]');
  if (!widget || !successView) return;

  let inserted = false;

  const maybeInsert = () => {
    if (inserted || widget.dataset.state !== 'success') return;
    inserted = true;

    const block = document.createElement('div');
    block.className = 'cross-sell';
    block.id = 'extension-success-upsell';

    const label = document.createElement('p');
    label.className = 'cross-sell-label';
    label.textContent = config.successLabel;

    const cards = document.createElement('div');
    cards.className = 'cross-sell-cards';

    const link = document.createElement('a');
    link.className = 'cross-sell-card';
    link.href = storeUrl(config.campaign);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = config.cta;
    link.addEventListener('click', () => {
      track('extension_store_click', {
        product: 'picture_converter',
        placement: 'converter_success',
      });
    });

    cards.appendChild(link);
    block.append(label, cards);
    successView.appendChild(block);
  };

  maybeInsert();

  const observer = new MutationObserver(maybeInsert);
  observer.observe(widget, { attributes: true, attributeFilter: ['data-state'] });
}
