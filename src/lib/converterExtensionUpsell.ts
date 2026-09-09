import { track } from './analytics';

const WEBP_TO_JPG_PATH = '/convert/webp-to-jpg/';
const PICTURE_CONVERTER_STORE_URL = 'https://chromewebstore.google.com/detail/picture-converter/oegpbmdpckfdgodnkdnoggedamfflfcl?utm_source=layerporter&utm_medium=website&utm_campaign=webp-to-jpg-converter';

export function installConverterExtensionUpsell(): void {
  if (typeof window === 'undefined' || window.location.pathname !== WEBP_TO_JPG_PATH) return;

  const widget = document.getElementById('converter-widget');
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
    label.textContent = 'Convert images directly from websites next time';

    const cards = document.createElement('div');
    cards.className = 'cross-sell-cards';

    const link = document.createElement('a');
    link.className = 'cross-sell-card';
    link.href = PICTURE_CONVERTER_STORE_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Add Picture Converter to Chrome';
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
