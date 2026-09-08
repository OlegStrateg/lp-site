export type ConvertHubLocale = {
  code: string;
  lang: string;
  hreflang: string;
  name: string;
  route: string;
  dir: 'ltr' | 'rtl';
  title: string;
  description: string;
  schemaName: string;
  nav: {
    converters: string; extensions: string; learn: string; mainAria: string;
    localEngine: string; localTitle: string;
  };
  footer: {
    tagline: string; about: string; extensions: string; privacy: string; terms: string; footerAria: string;
  };
  copy: Record<string, string>;
};

export const CONVERT_HUB_LOCALES: ConvertHubLocale[] = [
  {
    code: 'en', lang: 'en', hreflang: 'en', name: 'English', route: '', dir: 'ltr',
    title: 'Free File Converter — JPG, PDF, WebP & PSD | LayerPorter',
    description: 'Free file converters for JPG, PNG, PDF, WebP and PSD. Convert files in your browser with no uploads, no account and no server processing.',
    schemaName: 'Free File Converter',
    nav: { converters: 'Converters', extensions: 'Extensions', learn: 'Learn', mainAria: 'Main', localEngine: 'Local engine', localTitle: 'All tools run on your device' },
    footer: { tagline: 'LayerPorter — free, in-browser file converters. No uploads.', about: 'About', extensions: 'Extensions', privacy: 'Privacy', terms: 'Terms', footerAria: 'Footer' },
    copy: {
      language: 'Language', heroEyebrow: 'All browser conversion routes', heroA: 'Free file converters.', heroB: 'Choose the exact route.',
      heroBody: 'All LayerPorter web converters in one place: JPG, PNG, PDF, WebP, PSD and ICO. Open the exact format pair you need — no account and no server upload queue.',
      proofConverters: '8 converters', proofChecker: '1 compatibility checker', proofLocal: 'Local browser processing', proofAria: 'Converter hub facts',
      chooseConversion: 'Choose a conversion', allCurrentTools: 'ALL CURRENT TOOLS', routeAria: 'All available converters', filesStay: 'Files stay on this device', checkerJump: 'Canva → Slides checker ↓',
      jpgPdfShort: 'Combine images into one PDF', pdfJpgShort: 'Turn pages into images', webpJpgShort: 'Make WebP widely compatible', faviconShort: 'Create ICO and favicon sizes', psdPngShort: 'Flatten with transparency', psdJpgShort: 'Export a standard image', pngPsdShort: 'Move into a PSD workflow', jpgPsdShort: 'Move into a PSD workflow',
      popularLabel: '01 · Popular converters', popularHeading: 'Choose the conversion that matches the file you have and the result you need.', popularIntro: 'Each tool handles one clear task, with obvious input and output formats, no account and no unnecessary steps.',
      jpgPdfDesc: 'Combine JPG or PNG images into one ordered PDF. Each image becomes a page.', pdfJpgDesc: 'Render every PDF page into its own JPG image file.', webpJpgDesc: 'Convert a WebP image into a JPG that works almost everywhere.', faviconDesc: 'Create a favicon set and ICO file from one source image.', openConverter: 'Open converter', openTool: 'Open tool',
      jpgPdfAlt: 'Images ready to combine into one PDF', webpJpgAlt: 'WebP image ready to convert to JPG',
      designLabel: '02 · Image & design converters', designHeading: 'Convert PSD files to PNG or JPG, or move PNG and JPG into a PSD document.', designIntro: 'Use PSD → PNG when you need transparency, PSD → JPG for broad compatibility, or PNG/JPG → PSD to continue in a PSD-based workflow.',
      psdPngDesc: 'Flatten a PSD into a PNG while keeping transparent areas transparent.', psdJpgDesc: 'Flatten a PSD into a standard JPG image for easy sharing and compatibility.', pngPsdDesc: 'Put a PNG into a PSD document so it can continue through a PSD-based workflow.', jpgPsdDesc: 'Move a JPG into a PSD document for the next stage of the editing workflow.',
      compatibilityChecker: 'Compatibility checker', checkerDesc: 'Inspect a Canva PPTX locally before import and surface fonts, grouped objects or effects that may behave differently in Google Slides.', openChecker: 'Open checker', analysis: '18 slides · local analysis', fontCompatibility: 'Font compatibility', fontResult: '2 fonts may be substituted', groupedObjects: 'Grouped objects', groupedResult: 'Compatible with Slides', effects: 'Effects', effectsResult: '1 effect may render differently', check: 'CHECK', ok: 'OK',
      chromeExtension: 'Chrome extension', extensionHeading: 'Need more image formats or conversion directly from a website?', extensionBody: 'Picture Converter adds WebP, HEIC, AVIF and other image workflows directly to Chrome, including images you are already viewing on a page.', addChrome: 'Add to Chrome ↗', seePicture: 'See Picture Converter', pictureAlt: 'Picture Converter Chrome extension interface', pictureIconAlt: 'Picture Converter icon',
      trustLabel: '04 · Why LayerPorter converters', trustHeading: 'Focused tools, without the usual conversion overhead.', noUploads: 'No uploads', noUploadsDesc: 'Supported conversion work runs in the browser instead of through a remote upload queue.', noAccount: 'No account', noAccountDesc: 'Open the exact tool and start. There is no registration step between the search and the converter.', oneJob: 'One clear job', oneJobDesc: 'Each page stays focused on one conversion instead of becoming a heavyweight universal editor.',
      faqLabel: '05 · Useful information', faqHeading: 'Everything else, below the tools.', faq1q: 'Which file converters are available?', faq1a: 'LayerPorter currently includes JPG to PDF, PDF to JPG, WebP to JPG, Favicon Generator, PSD to PNG, PSD to JPG, PNG to PSD, JPG to PSD and the Canva to Google Slides compatibility checker.', faq2q: 'Are files uploaded to a server?', faq2a: 'Where supported by the selected tool, processing runs locally in the browser on the device instead of through a remote upload queue.', faq3q: 'What does Picture Converter add?', faq3a: 'Picture Converter adds more image formats and lets you convert selected images directly from websites in Chrome, as well as work with local image files.', faq4q: 'Why does every conversion have its own page?', faq4a: 'Each page is built around one concrete job, so users can open the exact conversion they searched for instead of navigating a large all-purpose interface.'
    }
  },
  {
    code: 'ru', lang: 'ru', hreflang: 'ru', name: 'Русский', route: 'ru', dir: 'ltr',
    title: 'Бесплатный конвертер файлов — JPG, PDF, WebP и PSD | LayerPorter',
    description: 'Бесплатный конвертер файлов JPG, PNG, PDF, WebP и PSD. Конвертируйте файлы в браузере без загрузки на сервер и без регистрации.',
    schemaName: 'Бесплатный конвертер файлов',
    nav: { converters: 'Конвертеры', extensions: 'Расширения', learn: 'Материалы', mainAria: 'Основная навигация', localEngine: 'Локальная обработка', localTitle: 'Инструменты работают на вашем устройстве' },
    footer: { tagline: 'LayerPorter — бесплатные конвертеры файлов в браузере. Без загрузки на сервер.', about: 'О проекте', extensions: 'Расширения', privacy: 'Конфиденциальность', terms: 'Условия', footerAria: 'Навигация в подвале' },
    copy: {
      language: 'Язык', heroEyebrow: 'Все варианты конвертации в браузере', heroA: 'Бесплатные конвертеры файлов.', heroB: 'Выберите нужное преобразование.',
      heroBody: 'Все веб-конвертеры LayerPorter в одном месте: JPG, PNG, PDF, WebP, PSD и ICO. Откройте нужную пару форматов — без регистрации и без загрузки файла на сервер.',
      proofConverters: '8 конвертеров', proofChecker: '1 проверка совместимости', proofLocal: 'Локальная обработка в браузере', proofAria: 'Возможности конвертеров',
      chooseConversion: 'Выберите конвертацию', allCurrentTools: 'ВСЕ ИНСТРУМЕНТЫ', routeAria: 'Все доступные конвертеры', filesStay: 'Файлы остаются на устройстве', checkerJump: 'Проверка Canva → Slides ↓',
      jpgPdfShort: 'Объединить изображения в один PDF', pdfJpgShort: 'Преобразовать страницы в изображения', webpJpgShort: 'Сделать WebP совместимым через JPG', faviconShort: 'Создать ICO и размеры favicon', psdPngShort: 'Сохранить с прозрачностью', psdJpgShort: 'Экспортировать обычное изображение', pngPsdShort: 'Перенести в формат PSD', jpgPsdShort: 'Перенести в формат PSD',
      popularLabel: '01 · Популярные конвертеры', popularHeading: 'Выберите конвертацию под исходный файл и нужный результат.', popularIntro: 'Каждый инструмент решает одну задачу: понятные входной и выходной форматы, без регистрации и лишних шагов.',
      jpgPdfDesc: 'Объедините изображения JPG или PNG в один PDF в нужном порядке. Каждое изображение станет отдельной страницей.', pdfJpgDesc: 'Преобразуйте каждую страницу PDF в отдельное изображение JPG.', webpJpgDesc: 'Преобразуйте WebP в JPG, который поддерживается почти везде.', faviconDesc: 'Создайте набор favicon и файл ICO из одного исходного изображения.', openConverter: 'Открыть конвертер', openTool: 'Открыть инструмент',
      jpgPdfAlt: 'Изображения для объединения в один PDF', webpJpgAlt: 'Изображение WebP для конвертации в JPG',
      designLabel: '02 · Конвертеры изображений и дизайна', designHeading: 'Конвертируйте PSD в PNG или JPG либо переносите PNG и JPG в PSD-документ.', designIntro: 'PSD → PNG подходит, когда нужна прозрачность, PSD → JPG — для широкой совместимости, а PNG/JPG → PSD — чтобы продолжить работу в PSD-процессе.',
      psdPngDesc: 'Преобразуйте PSD в PNG, сохранив прозрачные области.', psdJpgDesc: 'Преобразуйте PSD в обычный JPG для отправки и широкой совместимости.', pngPsdDesc: 'Поместите PNG в документ PSD для дальнейшей работы в PSD-процессе.', jpgPsdDesc: 'Перенесите JPG в документ PSD для следующего этапа редактирования.',
      compatibilityChecker: 'Проверка совместимости', checkerDesc: 'Проверьте файл PPTX из Canva локально перед импортом и найдите шрифты, сгруппированные объекты или эффекты, которые могут иначе работать в Google Slides.', openChecker: 'Открыть проверку', analysis: '18 слайдов · локальный анализ', fontCompatibility: 'Совместимость шрифтов', fontResult: '2 шрифта могут быть заменены', groupedObjects: 'Сгруппированные объекты', groupedResult: 'Совместимы со Slides', effects: 'Эффекты', effectsResult: '1 эффект может отображаться иначе', check: 'ПРОВЕРИТЬ', ok: 'OK',
      chromeExtension: 'Расширение Chrome', extensionHeading: 'Нужно больше форматов изображений или конвертация прямо с сайта?', extensionBody: 'Picture Converter добавляет в Chrome работу с WebP, HEIC, AVIF и другими форматами, включая изображения, которые уже открыты на веб-странице.', addChrome: 'Добавить в Chrome ↗', seePicture: 'Подробнее о Picture Converter', pictureAlt: 'Интерфейс расширения Picture Converter для Chrome', pictureIconAlt: 'Значок Picture Converter',
      trustLabel: '04 · Почему конвертеры LayerPorter', trustHeading: 'Точные инструменты без лишних шагов вокруг конвертации.', noUploads: 'Без загрузки файлов', noUploadsDesc: 'Поддерживаемые операции выполняются в браузере вместо отправки файла в удалённую очередь конвертации.', noAccount: 'Без регистрации', noAccountDesc: 'Откройте нужный инструмент и начинайте работу. Между поиском и конвертацией нет шага регистрации.', oneJob: 'Одна понятная задача', oneJobDesc: 'Каждая страница решает одну конкретную задачу конвертации и не превращается в тяжёлый универсальный редактор.',
      faqLabel: '05 · Полезная информация', faqHeading: 'Дополнительные детали — после инструментов.', faq1q: 'Какие конвертеры доступны в LayerPorter?', faq1a: 'Сейчас доступны JPG в PDF, PDF в JPG, WebP в JPG, генератор favicon, PSD в PNG, PSD в JPG, PNG в PSD, JPG в PSD и проверка совместимости Canva с Google Slides.', faq2q: 'Файлы загружаются на сервер?', faq2a: 'Если выбранный инструмент поддерживает локальную обработку, файл обрабатывается прямо в браузере на устройстве, а не отправляется в удалённую очередь.', faq3q: 'Что добавляет Picture Converter?', faq3a: 'Picture Converter поддерживает дополнительные форматы изображений и позволяет конвертировать выбранные изображения прямо с сайтов в Chrome, а также работать с локальными файлами.', faq4q: 'Почему для каждой конвертации отдельная страница?', faq4a: 'Каждая страница построена вокруг одной конкретной задачи, поэтому можно сразу открыть нужную конвертацию без навигации по большому универсальному интерфейсу.'
    }
  },
  {
    code: 'de', lang: 'de', hreflang: 'de', name: 'Deutsch', route: 'de', dir: 'ltr',
    title: 'Kostenloser Dateikonverter — JPG, PDF, WebP & PSD | LayerPorter',
    description: 'Kostenloser Dateikonverter für JPG, PNG, PDF, WebP und PSD. Dateien direkt im Browser konvertieren — ohne Upload, Konto oder Serververarbeitung.',
    schemaName: 'Kostenloser Dateikonverter',
    nav: { converters: 'Konverter', extensions: 'Erweiterungen', learn: 'Ratgeber', mainAria: 'Hauptnavigation', localEngine: 'Lokale Verarbeitung', localTitle: 'Alle Tools laufen auf deinem Gerät' },
    footer: { tagline: 'LayerPorter — kostenlose Dateikonverter im Browser. Ohne Uploads.', about: 'Über uns', extensions: 'Erweiterungen', privacy: 'Datenschutz', terms: 'Bedingungen', footerAria: 'Fußnavigation' },
    copy: {
      language: 'Sprache', heroEyebrow: 'Alle Konvertierungswege im Browser', heroA: 'Kostenlose Dateikonverter.', heroB: 'Wähle den passenden Weg.',
      heroBody: 'Alle LayerPorter-Webkonverter an einem Ort: JPG, PNG, PDF, WebP, PSD und ICO. Öffne genau die Formatkombination, die du brauchst — ohne Konto und ohne Upload-Warteschlange.',
      proofConverters: '8 Konverter', proofChecker: '1 Kompatibilitätsprüfung', proofLocal: 'Lokale Verarbeitung im Browser', proofAria: 'Fakten zum Konverter-Hub',
      chooseConversion: 'Konvertierung wählen', allCurrentTools: 'ALLE TOOLS', routeAria: 'Alle verfügbaren Konverter', filesStay: 'Dateien bleiben auf diesem Gerät', checkerJump: 'Canva → Slides prüfen ↓',
      jpgPdfShort: 'Bilder in einer PDF zusammenführen', pdfJpgShort: 'Seiten in Bilder umwandeln', webpJpgShort: 'WebP als JPG kompatibel machen', faviconShort: 'ICO und Favicon-Größen erstellen', psdPngShort: 'Mit Transparenz exportieren', psdJpgShort: 'Als Standardbild exportieren', pngPsdShort: 'In einen PSD-Workflow wechseln', jpgPsdShort: 'In einen PSD-Workflow wechseln',
      popularLabel: '01 · Beliebte Konverter', popularHeading: 'Wähle die Konvertierung passend zu deiner Ausgangsdatei und dem gewünschten Ergebnis.', popularIntro: 'Jedes Tool erledigt genau eine Aufgabe — mit klaren Ein- und Ausgabeformaten, ohne Konto und ohne unnötige Zwischenschritte.',
      jpgPdfDesc: 'JPG- oder PNG-Bilder in der gewünschten Reihenfolge zu einer PDF zusammenführen. Jedes Bild wird eine eigene Seite.', pdfJpgDesc: 'Jede PDF-Seite als eigene JPG-Bilddatei ausgeben.', webpJpgDesc: 'Ein WebP-Bild in ein nahezu überall unterstütztes JPG umwandeln.', faviconDesc: 'Aus einem Quellbild ein Favicon-Set und eine ICO-Datei erstellen.', openConverter: 'Konverter öffnen', openTool: 'Tool öffnen',
      jpgPdfAlt: 'Bilder zum Zusammenführen in einer PDF', webpJpgAlt: 'WebP-Bild zur Konvertierung in JPG',
      designLabel: '02 · Bild- & Design-Konverter', designHeading: 'PSD in PNG oder JPG umwandeln oder PNG und JPG in ein PSD-Dokument übernehmen.', designIntro: 'PSD → PNG eignet sich für Transparenz, PSD → JPG für breite Kompatibilität und PNG/JPG → PSD, wenn du in einem PSD-Workflow weiterarbeiten möchtest.',
      psdPngDesc: 'Eine PSD in PNG umwandeln und transparente Bereiche transparent lassen.', psdJpgDesc: 'Eine PSD in ein Standard-JPG für einfache Weitergabe und breite Kompatibilität umwandeln.', pngPsdDesc: 'Eine PNG-Datei in ein PSD-Dokument übernehmen und im PSD-Workflow weiterarbeiten.', jpgPsdDesc: 'Ein JPG in ein PSD-Dokument übernehmen und im nächsten Bearbeitungsschritt weiterarbeiten.',
      compatibilityChecker: 'Kompatibilitätsprüfung', checkerDesc: 'Eine Canva-PPTX vor dem Import lokal prüfen und Schriften, gruppierte Objekte oder Effekte erkennen, die sich in Google Slides anders verhalten können.', openChecker: 'Prüfung öffnen', analysis: '18 Folien · lokale Analyse', fontCompatibility: 'Schriftkompatibilität', fontResult: '2 Schriften könnten ersetzt werden', groupedObjects: 'Gruppierte Objekte', groupedResult: 'Mit Slides kompatibel', effects: 'Effekte', effectsResult: '1 Effekt kann anders erscheinen', check: 'PRÜFEN', ok: 'OK',
      chromeExtension: 'Chrome-Erweiterung', extensionHeading: 'Mehr Bildformate oder direkt von einer Website konvertieren?', extensionBody: 'Picture Converter bringt WebP-, HEIC-, AVIF- und weitere Bild-Workflows direkt in Chrome — auch für Bilder, die bereits auf einer Webseite geöffnet sind.', addChrome: 'Zu Chrome hinzufügen ↗', seePicture: 'Picture Converter ansehen', pictureAlt: 'Oberfläche der Picture-Converter-Erweiterung für Chrome', pictureIconAlt: 'Picture-Converter-Symbol',
      trustLabel: '04 · Warum LayerPorter-Konverter', trustHeading: 'Fokussierte Tools ohne den üblichen Konvertierungsaufwand.', noUploads: 'Keine Uploads', noUploadsDesc: 'Unterstützte Konvertierungen laufen im Browser statt über eine entfernte Upload-Warteschlange.', noAccount: 'Kein Konto', noAccountDesc: 'Das passende Tool öffnen und direkt starten. Zwischen Suche und Konvertierung gibt es keine Registrierung.', oneJob: 'Eine klare Aufgabe', oneJobDesc: 'Jede Seite bleibt auf eine konkrete Konvertierung fokussiert statt zu einem schweren Universal-Editor zu werden.',
      faqLabel: '05 · Nützliche Informationen', faqHeading: 'Weitere Details unterhalb der Tools.', faq1q: 'Welche Dateikonverter sind verfügbar?', faq1a: 'LayerPorter bietet derzeit JPG zu PDF, PDF zu JPG, WebP zu JPG, Favicon Generator, PSD zu PNG, PSD zu JPG, PNG zu PSD, JPG zu PSD sowie die Canva-zu-Google-Slides-Kompatibilitätsprüfung.', faq2q: 'Werden Dateien auf einen Server hochgeladen?', faq2a: 'Wenn das gewählte Tool lokale Verarbeitung unterstützt, wird die Datei direkt im Browser auf dem Gerät verarbeitet und nicht an eine entfernte Warteschlange gesendet.', faq3q: 'Was bietet Picture Converter zusätzlich?', faq3a: 'Picture Converter unterstützt weitere Bildformate und kann ausgewählte Website-Bilder direkt in Chrome konvertieren. Auch lokale Bilddateien werden unterstützt.', faq4q: 'Warum hat jede Konvertierung eine eigene Seite?', faq4a: 'Jede Seite ist für eine konkrete Aufgabe gebaut, damit Nutzer direkt die gesuchte Konvertierung öffnen können, statt sich durch eine große Universaloberfläche zu bewegen.'
    }
  },
  {
    code: 'es', lang: 'es', hreflang: 'es', name: 'Español', route: 'es', dir: 'ltr',
    title: 'Convertidor de archivos gratis — JPG, PDF, WebP y PSD | LayerPorter',
    description: 'Convertidor de archivos gratis para JPG, PNG, PDF, WebP y PSD. Convierte archivos en el navegador sin subirlos, sin cuenta y sin procesamiento en servidor.',
    schemaName: 'Convertidor de archivos gratis',
    nav: { converters: 'Convertidores', extensions: 'Extensiones', learn: 'Guías', mainAria: 'Navegación principal', localEngine: 'Procesamiento local', localTitle: 'Todas las herramientas funcionan en tu dispositivo' },
    footer: { tagline: 'LayerPorter — convertidores de archivos gratis en el navegador. Sin subidas.', about: 'Acerca de', extensions: 'Extensiones', privacy: 'Privacidad', terms: 'Términos', footerAria: 'Navegación del pie' },
    copy: {
      language: 'Idioma', heroEyebrow: 'Todas las rutas de conversión en el navegador', heroA: 'Convertidores de archivos gratis.', heroB: 'Elige la conversión exacta.',
      heroBody: 'Todos los convertidores web de LayerPorter en un solo lugar: JPG, PNG, PDF, WebP, PSD e ICO. Abre la combinación de formatos que necesitas — sin cuenta y sin cola de subida al servidor.',
      proofConverters: '8 convertidores', proofChecker: '1 comprobador de compatibilidad', proofLocal: 'Procesamiento local en el navegador', proofAria: 'Datos del centro de conversión',
      chooseConversion: 'Elige una conversión', allCurrentTools: 'TODAS LAS HERRAMIENTAS', routeAria: 'Todos los convertidores disponibles', filesStay: 'Los archivos permanecen en este dispositivo', checkerJump: 'Comprobar Canva → Slides ↓',
      jpgPdfShort: 'Combinar imágenes en un PDF', pdfJpgShort: 'Convertir páginas en imágenes', webpJpgShort: 'Hacer WebP compatible como JPG', faviconShort: 'Crear ICO y tamaños de favicon', psdPngShort: 'Exportar con transparencia', psdJpgShort: 'Exportar una imagen estándar', pngPsdShort: 'Pasar a un flujo PSD', jpgPsdShort: 'Pasar a un flujo PSD',
      popularLabel: '01 · Convertidores populares', popularHeading: 'Elige la conversión según el archivo que tienes y el resultado que necesitas.', popularIntro: 'Cada herramienta resuelve una sola tarea, con formatos de entrada y salida claros, sin cuenta ni pasos innecesarios.',
      jpgPdfDesc: 'Combina imágenes JPG o PNG en un solo PDF ordenado. Cada imagen se convierte en una página.', pdfJpgDesc: 'Convierte cada página de un PDF en un archivo de imagen JPG independiente.', webpJpgDesc: 'Convierte una imagen WebP en un JPG compatible prácticamente en todas partes.', faviconDesc: 'Crea un conjunto de favicon y un archivo ICO a partir de una imagen.', openConverter: 'Abrir convertidor', openTool: 'Abrir herramienta',
      jpgPdfAlt: 'Imágenes listas para combinarse en un PDF', webpJpgAlt: 'Imagen WebP lista para convertirse a JPG',
      designLabel: '02 · Convertidores de imagen y diseño', designHeading: 'Convierte PSD a PNG o JPG, o pasa PNG y JPG a un documento PSD.', designIntro: 'Usa PSD → PNG cuando necesites transparencia, PSD → JPG para mayor compatibilidad y PNG/JPG → PSD para continuar el trabajo en un flujo PSD.',
      psdPngDesc: 'Convierte un PSD en PNG manteniendo transparentes las áreas transparentes.', psdJpgDesc: 'Convierte un PSD en una imagen JPG estándar para compartirla y usarla ampliamente.', pngPsdDesc: 'Pasa un PNG a un documento PSD para continuar dentro de un flujo de trabajo PSD.', jpgPsdDesc: 'Pasa un JPG a un documento PSD para continuar con la siguiente etapa de edición.',
      compatibilityChecker: 'Comprobador de compatibilidad', checkerDesc: 'Analiza localmente un PPTX de Canva antes de importarlo y detecta fuentes, objetos agrupados o efectos que pueden comportarse de forma distinta en Google Slides.', openChecker: 'Abrir comprobador', analysis: '18 diapositivas · análisis local', fontCompatibility: 'Compatibilidad de fuentes', fontResult: '2 fuentes pueden sustituirse', groupedObjects: 'Objetos agrupados', groupedResult: 'Compatibles con Slides', effects: 'Efectos', effectsResult: '1 efecto puede mostrarse distinto', check: 'REVISAR', ok: 'OK',
      chromeExtension: 'Extensión de Chrome', extensionHeading: '¿Necesitas más formatos de imagen o convertir directamente desde una web?', extensionBody: 'Picture Converter añade flujos para WebP, HEIC, AVIF y otros formatos directamente en Chrome, incluso para imágenes que ya estás viendo en una página.', addChrome: 'Añadir a Chrome ↗', seePicture: 'Ver Picture Converter', pictureAlt: 'Interfaz de la extensión Picture Converter para Chrome', pictureIconAlt: 'Icono de Picture Converter',
      trustLabel: '04 · Por qué usar los convertidores de LayerPorter', trustHeading: 'Herramientas específicas sin los pasos extra habituales.', noUploads: 'Sin subidas', noUploadsDesc: 'Las conversiones compatibles se ejecutan en el navegador en lugar de pasar por una cola de subida remota.', noAccount: 'Sin cuenta', noAccountDesc: 'Abre la herramienta exacta y empieza. No hay un paso de registro entre la búsqueda y la conversión.', oneJob: 'Una tarea clara', oneJobDesc: 'Cada página se centra en una conversión concreta en vez de convertirse en un editor universal pesado.',
      faqLabel: '05 · Información útil', faqHeading: 'El resto de detalles, debajo de las herramientas.', faq1q: '¿Qué convertidores de archivos están disponibles?', faq1a: 'LayerPorter incluye JPG a PDF, PDF a JPG, WebP a JPG, Favicon Generator, PSD a PNG, PSD a JPG, PNG a PSD, JPG a PSD y el comprobador de compatibilidad de Canva con Google Slides.', faq2q: '¿Los archivos se suben a un servidor?', faq2a: 'Cuando la herramienta seleccionada admite procesamiento local, el archivo se procesa directamente en el navegador del dispositivo y no se envía a una cola remota.', faq3q: '¿Qué añade Picture Converter?', faq3a: 'Picture Converter admite más formatos de imagen y permite convertir imágenes seleccionadas directamente desde sitios web en Chrome, además de trabajar con archivos locales.', faq4q: '¿Por qué cada conversión tiene su propia página?', faq4a: 'Cada página está diseñada para una tarea concreta, de modo que puedes abrir directamente la conversión buscada sin navegar por una gran interfaz universal.'
    }
  },
  {
    code: 'fr', lang: 'fr', hreflang: 'fr', name: 'Français', route: 'fr', dir: 'ltr',
    title: 'Convertisseur de fichiers gratuit — JPG, PDF, WebP et PSD | LayerPorter',
    description: 'Convertisseur de fichiers gratuit pour JPG, PNG, PDF, WebP et PSD. Convertissez dans le navigateur sans téléversement, sans compte et sans traitement serveur.',
    schemaName: 'Convertisseur de fichiers gratuit',
    nav: { converters: 'Convertisseurs', extensions: 'Extensions', learn: 'Guides', mainAria: 'Navigation principale', localEngine: 'Traitement local', localTitle: 'Tous les outils fonctionnent sur votre appareil' },
    footer: { tagline: 'LayerPorter — convertisseurs de fichiers gratuits dans le navigateur. Sans téléversement.', about: 'À propos', extensions: 'Extensions', privacy: 'Confidentialité', terms: 'Conditions', footerAria: 'Navigation de pied de page' },
    copy: {
      language: 'Langue', heroEyebrow: 'Toutes les conversions dans le navigateur', heroA: 'Convertisseurs de fichiers gratuits.', heroB: 'Choisissez la conversion exacte.',
      heroBody: 'Tous les convertisseurs web LayerPorter au même endroit : JPG, PNG, PDF, WebP, PSD et ICO. Ouvrez la paire de formats dont vous avez besoin — sans compte et sans file de téléversement serveur.',
      proofConverters: '8 convertisseurs', proofChecker: '1 vérificateur de compatibilité', proofLocal: 'Traitement local dans le navigateur', proofAria: 'Informations sur les convertisseurs',
      chooseConversion: 'Choisir une conversion', allCurrentTools: 'TOUS LES OUTILS', routeAria: 'Tous les convertisseurs disponibles', filesStay: 'Les fichiers restent sur cet appareil', checkerJump: 'Vérifier Canva → Slides ↓',
      jpgPdfShort: 'Fusionner des images dans un PDF', pdfJpgShort: 'Transformer les pages en images', webpJpgShort: 'Rendre WebP compatible via JPG', faviconShort: 'Créer ICO et tailles de favicon', psdPngShort: 'Exporter avec transparence', psdJpgShort: 'Exporter une image standard', pngPsdShort: 'Passer dans un flux PSD', jpgPsdShort: 'Passer dans un flux PSD',
      popularLabel: '01 · Convertisseurs populaires', popularHeading: 'Choisissez la conversion adaptée à votre fichier de départ et au résultat recherché.', popularIntro: 'Chaque outil répond à une seule tâche, avec des formats d’entrée et de sortie clairs, sans compte ni étapes inutiles.',
      jpgPdfDesc: 'Regroupez des images JPG ou PNG dans un seul PDF ordonné. Chaque image devient une page.', pdfJpgDesc: 'Transformez chaque page PDF en fichier image JPG distinct.', webpJpgDesc: 'Convertissez une image WebP en JPG compatible presque partout.', faviconDesc: 'Créez un ensemble de favicons et un fichier ICO à partir d’une seule image.', openConverter: 'Ouvrir le convertisseur', openTool: 'Ouvrir l’outil',
      jpgPdfAlt: 'Images prêtes à être regroupées dans un PDF', webpJpgAlt: 'Image WebP prête à être convertie en JPG',
      designLabel: '02 · Convertisseurs image & design', designHeading: 'Convertissez un PSD en PNG ou JPG, ou placez un PNG ou un JPG dans un document PSD.', designIntro: 'Utilisez PSD → PNG pour conserver la transparence, PSD → JPG pour une compatibilité plus large, et PNG/JPG → PSD pour poursuivre le travail dans un flux PSD.',
      psdPngDesc: 'Convertissez un PSD en PNG tout en conservant les zones transparentes.', psdJpgDesc: 'Convertissez un PSD en image JPG standard pour le partage et la compatibilité.', pngPsdDesc: 'Placez un PNG dans un document PSD pour poursuivre un flux de travail PSD.', jpgPsdDesc: 'Placez un JPG dans un document PSD pour poursuivre l’étape suivante de retouche.',
      compatibilityChecker: 'Vérificateur de compatibilité', checkerDesc: 'Analysez localement un PPTX Canva avant l’import et repérez les polices, objets groupés ou effets susceptibles de se comporter différemment dans Google Slides.', openChecker: 'Ouvrir le vérificateur', analysis: '18 diapositives · analyse locale', fontCompatibility: 'Compatibilité des polices', fontResult: '2 polices peuvent être remplacées', groupedObjects: 'Objets groupés', groupedResult: 'Compatibles avec Slides', effects: 'Effets', effectsResult: '1 effet peut s’afficher différemment', check: 'VÉRIFIER', ok: 'OK',
      chromeExtension: 'Extension Chrome', extensionHeading: 'Besoin de plus de formats d’image ou d’une conversion directement depuis un site ?', extensionBody: 'Picture Converter ajoute les workflows WebP, HEIC, AVIF et d’autres formats directement dans Chrome, y compris pour les images déjà affichées sur une page.', addChrome: 'Ajouter à Chrome ↗', seePicture: 'Voir Picture Converter', pictureAlt: 'Interface de l’extension Picture Converter pour Chrome', pictureIconAlt: 'Icône Picture Converter',
      trustLabel: '04 · Pourquoi les convertisseurs LayerPorter', trustHeading: 'Des outils ciblés, sans les étapes inutiles habituelles.', noUploads: 'Sans téléversement', noUploadsDesc: 'Les conversions prises en charge s’exécutent dans le navigateur au lieu de passer par une file de téléversement distante.', noAccount: 'Sans compte', noAccountDesc: 'Ouvrez l’outil exact et commencez. Aucune inscription ne sépare la recherche de la conversion.', oneJob: 'Une tâche claire', oneJobDesc: 'Chaque page reste centrée sur une conversion précise au lieu de devenir un éditeur universel lourd.',
      faqLabel: '05 · Informations utiles', faqHeading: 'Le reste des détails, sous les outils.', faq1q: 'Quels convertisseurs de fichiers sont disponibles ?', faq1a: 'LayerPorter propose actuellement JPG vers PDF, PDF vers JPG, WebP vers JPG, Favicon Generator, PSD vers PNG, PSD vers JPG, PNG vers PSD, JPG vers PSD et le vérificateur de compatibilité Canva vers Google Slides.', faq2q: 'Les fichiers sont-ils téléversés vers un serveur ?', faq2a: 'Lorsque l’outil choisi prend en charge le traitement local, le fichier est traité directement dans le navigateur sur l’appareil et n’est pas envoyé dans une file distante.', faq3q: 'Que propose Picture Converter en plus ?', faq3a: 'Picture Converter prend en charge davantage de formats d’image et permet de convertir directement dans Chrome des images sélectionnées sur des sites web, ainsi que des fichiers locaux.', faq4q: 'Pourquoi chaque conversion a-t-elle sa propre page ?', faq4a: 'Chaque page répond à une tâche précise afin d’ouvrir directement la conversion recherchée sans parcourir une grande interface universelle.'
    }
  },
  {
    code: 'pt-br', lang: 'pt-BR', hreflang: 'pt-BR', name: 'Português', route: 'pt-br', dir: 'ltr',
    title: 'Conversor de arquivos grátis — JPG, PDF, WebP e PSD | LayerPorter',
    description: 'Conversor de arquivos grátis para JPG, PNG, PDF, WebP e PSD. Converta arquivos no navegador sem upload, sem conta e sem processamento no servidor.',
    schemaName: 'Conversor de arquivos grátis',
    nav: { converters: 'Conversores', extensions: 'Extensões', learn: 'Guias', mainAria: 'Navegação principal', localEngine: 'Processamento local', localTitle: 'Todas as ferramentas funcionam no seu dispositivo' },
    footer: { tagline: 'LayerPorter — conversores de arquivos grátis no navegador. Sem uploads.', about: 'Sobre', extensions: 'Extensões', privacy: 'Privacidade', terms: 'Termos', footerAria: 'Navegação do rodapé' },
    copy: {
      language: 'Idioma', heroEyebrow: 'Todas as rotas de conversão no navegador', heroA: 'Conversores de arquivos grátis.', heroB: 'Escolha a conversão exata.',
      heroBody: 'Todos os conversores web do LayerPorter em um só lugar: JPG, PNG, PDF, WebP, PSD e ICO. Abra a combinação de formatos que você precisa — sem conta e sem fila de upload para servidor.',
      proofConverters: '8 conversores', proofChecker: '1 verificador de compatibilidade', proofLocal: 'Processamento local no navegador', proofAria: 'Informações do hub de conversão',
      chooseConversion: 'Escolha uma conversão', allCurrentTools: 'TODAS AS FERRAMENTAS', routeAria: 'Todos os conversores disponíveis', filesStay: 'Os arquivos permanecem neste dispositivo', checkerJump: 'Verificar Canva → Slides ↓',
      jpgPdfShort: 'Juntar imagens em um PDF', pdfJpgShort: 'Transformar páginas em imagens', webpJpgShort: 'Tornar WebP compatível como JPG', faviconShort: 'Criar ICO e tamanhos de favicon', psdPngShort: 'Exportar com transparência', psdJpgShort: 'Exportar uma imagem padrão', pngPsdShort: 'Levar para um fluxo PSD', jpgPsdShort: 'Levar para um fluxo PSD',
      popularLabel: '01 · Conversores populares', popularHeading: 'Escolha a conversão de acordo com o arquivo que você tem e o resultado que precisa.', popularIntro: 'Cada ferramenta resolve uma única tarefa, com formatos de entrada e saída claros, sem conta e sem etapas desnecessárias.',
      jpgPdfDesc: 'Junte imagens JPG ou PNG em um único PDF na ordem desejada. Cada imagem vira uma página.', pdfJpgDesc: 'Converta cada página de um PDF em um arquivo de imagem JPG separado.', webpJpgDesc: 'Converta uma imagem WebP em JPG, compatível praticamente em qualquer lugar.', faviconDesc: 'Crie um conjunto de favicons e um arquivo ICO a partir de uma única imagem.', openConverter: 'Abrir conversor', openTool: 'Abrir ferramenta',
      jpgPdfAlt: 'Imagens prontas para serem reunidas em um PDF', webpJpgAlt: 'Imagem WebP pronta para converter em JPG',
      designLabel: '02 · Conversores de imagem e design', designHeading: 'Converta PSD para PNG ou JPG, ou leve PNG e JPG para um documento PSD.', designIntro: 'Use PSD → PNG quando precisar de transparência, PSD → JPG para maior compatibilidade e PNG/JPG → PSD para continuar o trabalho em um fluxo PSD.',
      psdPngDesc: 'Converta um PSD em PNG mantendo transparentes as áreas transparentes.', psdJpgDesc: 'Converta um PSD em uma imagem JPG padrão para compartilhar e usar com ampla compatibilidade.', pngPsdDesc: 'Coloque um PNG em um documento PSD para continuar em um fluxo de trabalho PSD.', jpgPsdDesc: 'Coloque um JPG em um documento PSD para seguir para a próxima etapa de edição.',
      compatibilityChecker: 'Verificador de compatibilidade', checkerDesc: 'Analise localmente um PPTX do Canva antes da importação e identifique fontes, objetos agrupados ou efeitos que podem se comportar de forma diferente no Google Slides.', openChecker: 'Abrir verificador', analysis: '18 slides · análise local', fontCompatibility: 'Compatibilidade de fontes', fontResult: '2 fontes podem ser substituídas', groupedObjects: 'Objetos agrupados', groupedResult: 'Compatíveis com Slides', effects: 'Efeitos', effectsResult: '1 efeito pode aparecer diferente', check: 'VERIFICAR', ok: 'OK',
      chromeExtension: 'Extensão do Chrome', extensionHeading: 'Precisa de mais formatos de imagem ou conversão direto de um site?', extensionBody: 'Picture Converter adiciona fluxos de WebP, HEIC, AVIF e outros formatos diretamente ao Chrome, inclusive para imagens que você já está vendo em uma página.', addChrome: 'Adicionar ao Chrome ↗', seePicture: 'Ver Picture Converter', pictureAlt: 'Interface da extensão Picture Converter para Chrome', pictureIconAlt: 'Ícone do Picture Converter',
      trustLabel: '04 · Por que usar os conversores LayerPorter', trustHeading: 'Ferramentas focadas, sem as etapas extras comuns da conversão.', noUploads: 'Sem uploads', noUploadsDesc: 'As conversões compatíveis são executadas no navegador em vez de passar por uma fila de upload remota.', noAccount: 'Sem conta', noAccountDesc: 'Abra a ferramenta certa e comece. Não há cadastro entre a busca e a conversão.', oneJob: 'Uma tarefa clara', oneJobDesc: 'Cada página permanece focada em uma conversão específica em vez de virar um editor universal pesado.',
      faqLabel: '05 · Informações úteis', faqHeading: 'Os outros detalhes ficam abaixo das ferramentas.', faq1q: 'Quais conversores de arquivos estão disponíveis?', faq1a: 'O LayerPorter inclui JPG para PDF, PDF para JPG, WebP para JPG, Favicon Generator, PSD para PNG, PSD para JPG, PNG para PSD, JPG para PSD e o verificador de compatibilidade Canva para Google Slides.', faq2q: 'Os arquivos são enviados para um servidor?', faq2a: 'Quando a ferramenta escolhida oferece processamento local, o arquivo é processado diretamente no navegador do dispositivo e não é enviado para uma fila remota.', faq3q: 'O que o Picture Converter adiciona?', faq3a: 'Picture Converter oferece mais formatos de imagem e permite converter imagens selecionadas diretamente de sites no Chrome, além de trabalhar com arquivos locais.', faq4q: 'Por que cada conversão tem sua própria página?', faq4a: 'Cada página é feita para uma tarefa específica, para que você possa abrir diretamente a conversão procurada sem navegar por uma grande interface universal.'
    }
  },
  {
    code: 'ja', lang: 'ja', hreflang: 'ja', name: '日本語', route: 'ja', dir: 'ltr',
    title: '無料ファイル変換 — JPG・PDF・WebP・PSD | LayerPorter',
    description: 'JPG、PNG、PDF、WebP、PSDに対応した無料ファイル変換ツール。アップロードやアカウント登録なしで、ブラウザ上でファイルを変換できます。',
    schemaName: '無料ファイル変換',
    nav: { converters: '変換ツール', extensions: '拡張機能', learn: 'ガイド', mainAria: 'メインナビゲーション', localEngine: 'ローカル処理', localTitle: 'ツールは端末上で動作します' },
    footer: { tagline: 'LayerPorter — ブラウザで使える無料ファイル変換ツール。アップロード不要。', about: '概要', extensions: '拡張機能', privacy: 'プライバシー', terms: '利用規約', footerAria: 'フッターナビゲーション' },
    copy: {
      language: '言語', heroEyebrow: 'ブラウザで使えるすべての変換ルート', heroA: '無料ファイル変換ツール。', heroB: '必要な変換を選ぶだけ。',
      heroBody: 'LayerPorterのWeb変換ツールを1か所にまとめました。JPG、PNG、PDF、WebP、PSD、ICOに対応。必要な形式の組み合わせを直接開けます。アカウント登録もサーバーへのアップロード待ちもありません。',
      proofConverters: '8種類の変換', proofChecker: '互換性チェック 1種類', proofLocal: 'ブラウザ内でローカル処理', proofAria: '変換ハブの特徴',
      chooseConversion: '変換を選ぶ', allCurrentTools: 'すべてのツール', routeAria: '利用できるすべての変換ツール', filesStay: 'ファイルはこの端末内に残ります', checkerJump: 'Canva → Slidesをチェック ↓',
      jpgPdfShort: '画像を1つのPDFにまとめる', pdfJpgShort: 'ページを画像に変換', webpJpgShort: 'WebPをJPGで扱いやすくする', faviconShort: 'ICOとfaviconサイズを作成', psdPngShort: '透明部分を保って書き出す', psdJpgShort: '標準画像として書き出す', pngPsdShort: 'PSDワークフローへ移す', jpgPsdShort: 'PSDワークフローへ移す',
      popularLabel: '01 · よく使う変換ツール', popularHeading: '元のファイルと必要な結果に合う変換を選べます。', popularIntro: '各ツールは1つの変換に集中し、入力形式と出力形式が明確です。アカウント登録や余計な手順はありません。',
      jpgPdfDesc: 'JPGまたはPNG画像を好きな順番で1つのPDFにまとめます。各画像が1ページになります。', pdfJpgDesc: 'PDFの各ページを個別のJPG画像ファイルに変換します。', webpJpgDesc: 'WebP画像を、ほぼどこでも使えるJPGに変換します。', faviconDesc: '1枚の元画像からfavicon一式とICOファイルを作成します。', openConverter: '変換ツールを開く', openTool: 'ツールを開く',
      jpgPdfAlt: '1つのPDFにまとめる画像', webpJpgAlt: 'JPGに変換するWebP画像',
      designLabel: '02 · 画像・デザイン変換', designHeading: 'PSDをPNGやJPGに変換し、PNGやJPGをPSDドキュメントに移せます。', designIntro: '透明部分を残したい場合はPSD→PNG、幅広い互換性が必要ならPSD→JPG、PSDベースの作業を続けるならPNG/JPG→PSDを使えます。',
      psdPngDesc: 'PSDをPNGに変換し、透明部分は透明のまま保持します。', psdJpgDesc: 'PSDを共有しやすく互換性の高い標準JPG画像に変換します。', pngPsdDesc: 'PNGをPSDドキュメントに入れて、PSDベースの作業を続けられるようにします。', jpgPsdDesc: 'JPGをPSDドキュメントに入れて、次の編集工程へ進めます。',
      compatibilityChecker: '互換性チェック', checkerDesc: 'Canvaから書き出したPPTXをインポート前にローカルで確認し、Google Slidesで挙動が変わる可能性のあるフォント、グループ化オブジェクト、効果を検出します。', openChecker: 'チェックを開く', analysis: '18スライド · ローカル解析', fontCompatibility: 'フォント互換性', fontResult: '2フォントが置換される可能性', groupedObjects: 'グループ化オブジェクト', groupedResult: 'Slidesと互換', effects: '効果', effectsResult: '1つの効果が異なって表示される可能性', check: '確認', ok: 'OK',
      chromeExtension: 'Chrome拡張機能', extensionHeading: 'もっと多くの画像形式や、Webサイト上で直接変換したいですか？', extensionBody: 'Picture Converterなら、WebP、HEIC、AVIFなどの画像処理をChrome内で実行できます。Webページ上で見ている画像もそのまま扱えます。', addChrome: 'Chromeに追加 ↗', seePicture: 'Picture Converterを見る', pictureAlt: 'Chrome版Picture Converter拡張機能の画面', pictureIconAlt: 'Picture Converterアイコン',
      trustLabel: '04 · LayerPorterを使う理由', trustHeading: '余計な手順を増やさず、1つの変換に集中。', noUploads: 'アップロード不要', noUploadsDesc: '対応する変換処理は、リモートのアップロードキューではなくブラウザ内で実行されます。', noAccount: 'アカウント不要', noAccountDesc: '必要なツールを開いてすぐに開始できます。検索から変換までの間に登録はありません。', oneJob: '1ページ1タスク', oneJobDesc: '各ページは1つの具体的な変換に集中し、重い万能エディターにはなりません。',
      faqLabel: '05 · よくある質問', faqHeading: '追加情報はツールの下にまとめています。', faq1q: 'どのファイル変換ツールがありますか？', faq1a: '現在、JPG→PDF、PDF→JPG、WebP→JPG、Favicon Generator、PSD→PNG、PSD→JPG、PNG→PSD、JPG→PSD、Canva→Google Slides互換性チェックを提供しています。', faq2q: 'ファイルはサーバーにアップロードされますか？', faq2a: '選択したツールがローカル処理に対応している場合、ファイルは端末のブラウザ内で処理され、リモートキューには送信されません。', faq3q: 'Picture Converterでは何が追加されますか？', faq3a: 'Picture Converterは対応画像形式を増やし、Chrome上のWebサイトで選択した画像を直接変換できます。ローカル画像ファイルにも対応しています。', faq4q: 'なぜ変換ごとに別ページなのですか？', faq4a: '各ページを1つの具体的な作業に絞ることで、大きな万能画面を操作せず、検索した変換をすぐに開けるようにしています。'
    }
  },
  {
    code: 'zh-cn', lang: 'zh-CN', hreflang: 'zh-CN', name: '简体中文', route: 'zh-cn', dir: 'ltr',
    title: '免费文件转换器 — JPG、PDF、WebP 和 PSD | LayerPorter',
    description: '免费文件转换器，支持 JPG、PNG、PDF、WebP 和 PSD。无需上传文件、无需注册账号，直接在浏览器中完成转换。',
    schemaName: '免费文件转换器',
    nav: { converters: '转换工具', extensions: '扩展程序', learn: '指南', mainAria: '主导航', localEngine: '本地处理', localTitle: '所有工具都在你的设备上运行' },
    footer: { tagline: 'LayerPorter — 浏览器中的免费文件转换器，无需上传。', about: '关于', extensions: '扩展程序', privacy: '隐私', terms: '条款', footerAria: '页脚导航' },
    copy: {
      language: '语言', heroEyebrow: '浏览器中的全部文件转换方式', heroA: '免费文件转换器。', heroB: '直接选择需要的转换。',
      heroBody: 'LayerPorter 的所有网页转换工具集中在这里：JPG、PNG、PDF、WebP、PSD 和 ICO。直接打开需要的格式组合，无需账号，也无需等待文件上传到服务器。',
      proofConverters: '8 个转换器', proofChecker: '1 个兼容性检查工具', proofLocal: '浏览器本地处理', proofAria: '转换工具说明',
      chooseConversion: '选择转换方式', allCurrentTools: '全部工具', routeAria: '所有可用转换器', filesStay: '文件保留在当前设备', checkerJump: '检查 Canva → Slides ↓',
      jpgPdfShort: '将图片合并为一个 PDF', pdfJpgShort: '将页面转换为图片', webpJpgShort: '将 WebP 转为更通用的 JPG', faviconShort: '创建 ICO 和 favicon 尺寸', psdPngShort: '保留透明区域导出', psdJpgShort: '导出为标准图片', pngPsdShort: '进入 PSD 工作流程', jpgPsdShort: '进入 PSD 工作流程',
      popularLabel: '01 · 常用转换器', popularHeading: '根据现有文件和需要的结果，直接选择对应的转换。', popularIntro: '每个工具只处理一种明确任务，输入和输出格式一目了然，无需账号，也没有多余步骤。',
      jpgPdfDesc: '按顺序将 JPG 或 PNG 图片合并为一个 PDF，每张图片成为一页。', pdfJpgDesc: '将 PDF 的每一页分别转换为 JPG 图片文件。', webpJpgDesc: '将 WebP 图片转换为几乎处处兼容的 JPG。', faviconDesc: '从一张源图片创建 favicon 尺寸集合和 ICO 文件。', openConverter: '打开转换器', openTool: '打开工具',
      jpgPdfAlt: '准备合并为一个 PDF 的图片', webpJpgAlt: '准备转换为 JPG 的 WebP 图片',
      designLabel: '02 · 图片与设计转换器', designHeading: '将 PSD 转为 PNG 或 JPG，也可以把 PNG 和 JPG 放入 PSD 文档。', designIntro: '需要保留透明区域时使用 PSD → PNG，需要更广泛兼容性时使用 PSD → JPG；要继续 PSD 工作流程时，可使用 PNG/JPG → PSD。',
      psdPngDesc: '将 PSD 转换为 PNG，并保留透明区域。', psdJpgDesc: '将 PSD 转换为标准 JPG 图片，便于分享并获得更广泛的兼容性。', pngPsdDesc: '将 PNG 放入 PSD 文档，以便继续使用 PSD 工作流程。', jpgPsdDesc: '将 JPG 放入 PSD 文档，继续下一步编辑。',
      compatibilityChecker: '兼容性检查', checkerDesc: '在导入前本地检查 Canva 导出的 PPTX，找出在 Google Slides 中可能表现不同的字体、组合对象或效果。', openChecker: '打开检查工具', analysis: '18 张幻灯片 · 本地分析', fontCompatibility: '字体兼容性', fontResult: '2 种字体可能被替换', groupedObjects: '组合对象', groupedResult: '与 Slides 兼容', effects: '效果', effectsResult: '1 个效果可能显示不同', check: '检查', ok: 'OK',
      chromeExtension: 'Chrome 扩展程序', extensionHeading: '需要更多图片格式，或直接在网站上转换图片？', extensionBody: 'Picture Converter 可在 Chrome 中处理 WebP、HEIC、AVIF 等更多图片格式，也能直接处理你正在网页上查看的图片。', addChrome: '添加到 Chrome ↗', seePicture: '查看 Picture Converter', pictureAlt: 'Picture Converter Chrome 扩展程序界面', pictureIconAlt: 'Picture Converter 图标',
      trustLabel: '04 · 为什么使用 LayerPorter 转换器', trustHeading: '专注具体任务，省去常见的额外转换步骤。', noUploads: '无需上传', noUploadsDesc: '支持的转换直接在浏览器中运行，不需要进入远程上传队列。', noAccount: '无需账号', noAccountDesc: '打开需要的工具即可开始，从搜索到转换之间没有注册步骤。', oneJob: '一个页面一项任务', oneJobDesc: '每个页面只专注一种具体转换，而不会变成复杂笨重的通用编辑器。',
      faqLabel: '05 · 实用信息', faqHeading: '其他说明放在工具下方。', faq1q: 'LayerPorter 提供哪些文件转换器？', faq1a: '目前包括 JPG 转 PDF、PDF 转 JPG、WebP 转 JPG、Favicon Generator、PSD 转 PNG、PSD 转 JPG、PNG 转 PSD、JPG 转 PSD，以及 Canva 转 Google Slides 兼容性检查工具。', faq2q: '文件会上传到服务器吗？', faq2a: '如果所选工具支持本地处理，文件会直接在设备的浏览器中处理，不会发送到远程转换队列。', faq3q: 'Picture Converter 增加了哪些功能？', faq3a: 'Picture Converter 支持更多图片格式，并可直接在 Chrome 中转换网站上选中的图片，也可以处理本地图片文件。', faq4q: '为什么每种转换都有单独页面？', faq4a: '每个页面都围绕一个具体任务设计，让用户可以直接打开搜索到的转换，而无需在大型通用界面中寻找功能。'
    }
  }
];

export const CONVERT_HUB_BY_CODE = new Map(CONVERT_HUB_LOCALES.map((locale) => [locale.code, locale]));

export function convertHubPath(locale: ConvertHubLocale): string {
  return locale.code === 'en' ? '/convert/' : `/${locale.route}/convert/`;
}

export function localeHomePath(locale: ConvertHubLocale): string {
  return locale.code === 'en' ? '/' : `/${locale.route}/`;
}

export function localeExtensionsPath(locale: ConvertHubLocale): string {
  return locale.code === 'en' ? '/extensions/' : `/${locale.route}/extensions/`;
}
