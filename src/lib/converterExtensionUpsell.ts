type TrackFn = (name: string, props?: Record<string, string | number | boolean | undefined>) => void;

type UpsellConfig = {
  campaign: string;
  widgetId: string;
  label: string;
  cta: string;
};

const PICTURE_CONVERTER_BASE_URL = 'https://chromewebstore.google.com/detail/picture-converter/oegpbmdpckfdgodnkdnoggedamfflfcl';

const UPSELLS: Record<string, UpsellConfig> = {
  '/convert/webp-to-jpg/': {
    campaign: 'webp-to-jpg-converter',
    widgetId: 'converter-widget',
    label: 'Convert images directly from websites next time',
    cta: 'Add Picture Converter to Chrome',
  },
  '/convert/jpg-to-pdf/': {
    campaign: 'jpg-to-pdf-converter',
    widgetId: 'jpg-pdf-widget',
    label: 'Turn website images into PDF directly in Chrome next time',
    cta: 'Add Picture Converter to Chrome',
  },
  '/pt-br/convert/jpg-to-pdf/': {
    campaign: 'jpg-to-pdf-converter-pt-br',
    widgetId: 'jpg-pdf-widget',
    label: 'Converta imagens de sites direto no Chrome da próxima vez',
    cta: 'Adicionar Picture Converter ao Chrome',
  },
};

export function installConverterExtensionUpsell(track: TrackFn): void {
  if (typeof window === 'undefined') return;

  const config = UPSELLS[window.location.pathname];
  if (!config) return;

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
    label.textContent = config.label;

    const cards = document.createElement('div');
    cards.className = 'cross-sell-cards';

    const link = document.createElement('a');
    link.className = 'cross-sell-card';
    link.href = `${PICTURE_CONVERTER_BASE_URL}?utm_source=layerporter&utm_medium=website&utm_campaign=${config.campaign}`;
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
