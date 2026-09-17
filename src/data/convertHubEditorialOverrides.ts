import type { ConvertHubLocale } from './convertHubLocales';

type CopyPatch = Record<string, string>;

// LP-109 — presentation/CRO cleanup only.
// SEO-sensitive title, meta description and H1 roots stay in convertHubLocales.ts
// and remain protected by scripts/verify-convert-hub.mjs.
const CORE_COPY_PATCHES: Record<string, CopyPatch> = {
  en: {
    heroEyebrow: 'File converters',
    heroB: 'Choose the format you need.',
    heroBody: 'JPG to PDF, PDF to JPG, WebP to JPG, PSD tools, favicon generation and a Canva → Google Slides checker — all in one place.',
    proofLocal: 'Local processing where supported',
    chooseConversion: 'Choose a converter',
    allCurrentTools: 'ALL TOOLS',
    compatibilityChecker: 'Canva → Google Slides checker',
    faqLabel: '04 · Questions',
    faqHeading: 'Common questions',
  },
  ru: {
    heroEyebrow: 'Конвертеры файлов',
    heroB: 'Выберите нужный формат.',
    heroBody: 'JPG в PDF, PDF в JPG, WebP в JPG, инструменты для PSD, генератор favicon и проверка Canva → Google Slides — всё на одной странице.',
    proofLocal: 'Локальная обработка, где она поддерживается',
    chooseConversion: 'Выберите конвертер',
    allCurrentTools: 'ВСЕ ИНСТРУМЕНТЫ',
    compatibilityChecker: 'Проверка Canva → Google Slides',
    faqLabel: '04 · Вопросы',
    faqHeading: 'Частые вопросы',
  },
  de: {
    heroEyebrow: 'Dateikonverter',
    heroB: 'Wähle das gewünschte Format.',
    heroBody: 'JPG zu PDF, PDF zu JPG, WebP zu JPG, PSD-Konverter, Favicon-Generator und Canva → Google Slides – an einem Ort.',
    proofLocal: 'Lokale Verarbeitung, wenn unterstützt',
    chooseConversion: 'Konverter auswählen',
    allCurrentTools: 'ALLE TOOLS',
    compatibilityChecker: 'Canva → Google Slides prüfen',
    faqLabel: '04 · Fragen',
    faqHeading: 'Häufige Fragen',
  },
  es: {
    heroEyebrow: 'Convertidores de archivos',
    heroB: 'Elige el formato que necesitas.',
    heroBody: 'JPG a PDF, PDF a JPG, WebP a JPG, herramientas PSD, generador de favicon y comprobación Canva → Google Slides, todo en un solo lugar.',
    proofLocal: 'Procesamiento local cuando es compatible',
    chooseConversion: 'Elige un convertidor',
    allCurrentTools: 'TODAS LAS HERRAMIENTAS',
    compatibilityChecker: 'Comprobar Canva → Google Slides',
    faqLabel: '04 · Preguntas',
    faqHeading: 'Preguntas frecuentes',
  },
  fr: {
    heroEyebrow: 'Convertisseurs de fichiers',
    heroB: 'Choisissez le format voulu.',
    heroBody: 'JPG vers PDF, PDF vers JPG, WebP vers JPG, outils PSD, générateur de favicon et vérification Canva → Google Slides, au même endroit.',
    proofLocal: 'Traitement local lorsque disponible',
    chooseConversion: 'Choisir un convertisseur',
    allCurrentTools: 'TOUS LES OUTILS',
    compatibilityChecker: 'Vérifier Canva → Google Slides',
    faqLabel: '04 · Questions',
    faqHeading: 'Questions fréquentes',
  },
  'pt-br': {
    heroEyebrow: 'Conversores de arquivos',
    heroB: 'Escolha o formato que você precisa.',
    heroBody: 'JPG para PDF, PDF para JPG, WebP para JPG, ferramentas PSD, gerador de favicon e verificação Canva → Google Slides em um só lugar.',
    proofLocal: 'Processamento local quando disponível',
    chooseConversion: 'Escolha um conversor',
    allCurrentTools: 'TODAS AS FERRAMENTAS',
    compatibilityChecker: 'Verificar Canva → Google Slides',
    faqLabel: '04 · Dúvidas',
    faqHeading: 'Perguntas frequentes',
  },
  ja: {
    heroEyebrow: 'ファイル変換ツール',
    heroB: '必要な形式を選んでください。',
    heroBody: 'JPG→PDF、PDF→JPG、WebP→JPG、PSD変換、favicon作成、Canva→Google Slidesの互換性チェックをまとめて利用できます。',
    proofLocal: '対応ツールはブラウザ内で処理',
    chooseConversion: '変換ツールを選ぶ',
    allCurrentTools: 'すべてのツール',
    compatibilityChecker: 'Canva → Google Slides の互換性チェック',
    faqLabel: '04 · 質問',
    faqHeading: 'よくある質問',
  },
  'zh-cn': {
    heroEyebrow: '文件转换工具',
    heroB: '选择你需要的格式。',
    heroBody: 'JPG 转 PDF、PDF 转 JPG、WebP 转 JPG、PSD 工具、favicon 生成器以及 Canva → Google Slides 兼容性检查，都集中在这里。',
    proofLocal: '支持的工具在浏览器本地处理',
    chooseConversion: '选择转换工具',
    allCurrentTools: '全部工具',
    compatibilityChecker: 'Canva → Google Slides 兼容性检查',
    faqLabel: '04 · 常见问题',
    faqHeading: '常见问题',
  },
};

export function applyConvertHubEditorialOverrides(locales: ConvertHubLocale[]): void {
  for (const locale of locales) {
    const patch = CORE_COPY_PATCHES[locale.code];
    if (!patch) continue;
    Object.assign(locale.copy, patch);
  }
}
