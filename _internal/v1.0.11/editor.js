// Картинка (выбрана на странице через picker.js → background.js, либо загружена вручную)
// → PNG/JPG/WEBP/PDF/ICO. HEIC/HEIF на входе декодируется отдельно (браузер это не умеет сам),
// SVG растеризуется через <img>. Всё локально в браузере.
// Принцип UI: один выбор изображения → одно действие → готово (формат подбирается сам).

import { lpInit, lpTrack } from "./lp-telemetry.js"; // ОБЩИЙ-СЛОЙ §1
import { lpFeedbackInit, lpFeedbackOnSuccess, lpFeedbackRenderCard } from "./lp-feedback.js"; // ОБЩИЙ-СЛОЙ §2
import { buildPdf } from "./pdf-build.js";
import { buildIco } from "./ico-build.js";

// классификатор ошибок в короткий технический код (не сырое сообщение — props
// телеметрии не должны нести произвольный текст, см. §1 канона)
function lpErrCode(e) {
  const m = String((e && e.message) || e || "").toLowerCase();
  if (m.includes("heic")) return "heic_decode";
  if (m.includes("svg")) return "svg_render";
  if (m.includes("unknown format")) return "unknown_format";
  return "convert_failed";
}

const MAX_DIM = 4000;

// Жизненный цикл напоминания о закрепе повторяет проверенную механику Summarizer:
// до первого успешного действия напоминание запрещено; после первого успеха оно
// может появиться один раз в текущем открытии панели и снова при следующем открытии.
const PIN_ELIGIBLE_KEY = "lp.ic.pinEligible";
const PIN_PANEL_OPEN_TOKEN_KEY = "icPinPanelOpenTokenV1";
const PIN_PANEL_CLOSED_AT_KEY = "icPinPanelClosedAtV1";
const PIN_FIRST_DELAY_MS = 5000;
const PIN_REPEAT_DELAY_MS = 2500;
let panelLifecyclePort = null;

// Признак «мы в боковой панели, а не во вкладке»: у панели нет своей записи в tabs.
// Порт к SW нужен только там — его обрыв = пользователь закрыл панель крестиком
// Chrome (перехватить сам крестик нельзя), и SW возвращает на страницу иконку-FAB.
const inSidePanel = await new Promise((resolve) => {
  try { chrome.tabs.getCurrent((tab) => resolve(!tab)); } catch { resolve(false); }
});
if (inSidePanel) {
  document.documentElement.classList.add("in-panel"); // вёрстка панели — спринт 2
  // Этот же порт используется background.js как независимый lifecycle-сигнал
  // открытия/закрытия Side Panel. Храним ссылку, чтобы соединение жило вместе с документом.
  try { panelLifecyclePort = chrome.runtime.connect({ name: "ic-panel" }); } catch { panelLifecyclePort = null; }
}

// локализация: в HTML лежит английский (default_locale=en), тут подменяем на активный язык.
// ВАЖНО: до любого сохранения innerHTML (кнопка picker'а сохраняет свой label ниже).
const msg = (key, subs) => chrome.i18n.getMessage(key, subs) || key;
document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = msg(el.dataset.i18n); });
document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = msg(el.dataset.i18nPlaceholder); });

const stage = document.getElementById("stage");
const dropContent = document.getElementById("dropContent");
const previewWrap = document.getElementById("previewWrap");
const pickRow = document.getElementById("pickRow");
const modeSwitch = document.getElementById("modeSwitch");
const modePageBtn = document.getElementById("modePageBtn");
const modeComputerBtn = document.getElementById("modeComputerBtn");
const pickFromSiteBtn = document.getElementById("pickFromSiteBtn");
const webFavicon = document.getElementById("webFavicon");
const webGlobe = document.getElementById("webGlobe");
const webHost = document.getElementById("webHost");
const chooseBtn = document.getElementById("chooseBtn");
const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true }); // читаем пиксели (альфа-скан) — без флага Chrome ругается и читает медленнее
const workControls = document.getElementById("workControls");
const contentEl = document.querySelector(".content");
const topStickyEl = document.getElementById("topSticky");
const resultGapTop = document.getElementById("resultGapTop");
const resultGapMiddle = document.getElementById("resultGapMiddle");
const resultGapBottom = document.getElementById("resultGapBottom");
const previewColumn = document.getElementById("previewColumn");
const tipLineEl = document.getElementById("tipLine");
const resultSummary = document.getElementById("resultSummary");
const metaInputFormat = document.getElementById("metaInputFormat");
const metaInputDims = document.getElementById("metaInputDims");
const metaInputSize = document.getElementById("metaInputSize");
const metaOutputFormat = document.getElementById("metaOutputFormat");
const metaOutputDims = document.getElementById("metaOutputDims");
const metaOutputSize = document.getElementById("metaOutputSize");
const metaOutputAlpha = document.getElementById("metaOutputAlpha");
const replaceBtn = document.getElementById("replaceBtn");
// V4: кнопка «Заменить» переезжает из previewWrap в #stage только в боковой панели —
// там она позиционируется динамически относительно фото (positionReplaceButton), в
// full-page-mode и на пустом главном экране остаётся штатное место в разметке (V3 CSS).
if (inSidePanel) {
  stage.appendChild(replaceBtn);
  replaceBtn.hidden = true;
}
const formatChips = [...document.querySelectorAll(".format-chip")];
const qualityBlock = document.getElementById("qualityBlock");
const qualityEl = document.getElementById("quality");
const qualityVal = document.getElementById("qualityVal");
const pngNoteBlock = document.getElementById("pngNoteBlock");
const pdfNoteBlock = document.getElementById("pdfNoteBlock");
const icoSizeBlock = document.getElementById("icoSizeBlock");
const icoSizeBtns = [...document.querySelectorAll(".ico-size")];
const downloadBtn = document.getElementById("downloadBtn");
const dlLabel = document.getElementById("dlLabel");
const dlSize = document.getElementById("dlSize");

const statusEl = document.getElementById("status");

await lpInit("ic");
lpTrack("ui_opened", { entry: location.hash ? "picker" : "direct" });
lpFeedbackInit({
  product: "ic",
  productName: "Picture Converter",
  actionsLabel: "conversions",
  feedbackUrl: (src) => `https://layerporter.com/feedback/?p=ic&channel=chrome-ext&src=${src}&v=${chrome.runtime.getManifest().version}`,
  reviewUrl: 'https://chromewebstore.google.com/detail/picture-converter/oegpbmdpckfdgodnkdnoggedamfflfcl/reviews',
});
const lpFeedbackMount = document.getElementById("lp-feedback-mount");
const feedbackUrl = (src) => `https://layerporter.com/feedback/?p=ic&channel=chrome-ext&src=${src}&v=${chrome.runtime.getManifest().version}`;
const reviewUrl = 'https://chromewebstore.google.com/detail/picture-converter/oegpbmdpckfdgodnkdnoggedamfflfcl/reviews';

// --- footer: рейтинг звёздами ---
const starBtns = [...document.querySelectorAll(".stars .star")];
function setStarsLit(n) {
  starBtns.forEach((b) => b.classList.toggle("lit", Number(b.dataset.idx) <= n));
}
starBtns.forEach((btn) => {
  const idx = Number(btn.dataset.idx);
  btn.addEventListener("mouseenter", () => setStarsLit(idx));
  btn.addEventListener("focus", () => setStarsLit(idx));
  btn.addEventListener("click", () => {
    lpTrack("rating", { stars: idx });
    if (idx <= 3) window.open(feedbackUrl("stars"), "_blank", "noopener,noreferrer");
    else window.open(reviewUrl || feedbackUrl("stars"), "_blank", "noopener,noreferrer");
  });
});
document.getElementById("ratingStars").addEventListener("mouseleave", () => setStarsLit(0));

// --- footer: Share popup ---
const shareBtn = document.getElementById("shareBtn");
const sharePop = document.getElementById("sharePop");
function closeSharePop() {
  const wasOpen = sharePop.classList.contains("open");
  sharePop.classList.remove("open");
  shareBtn.setAttribute("aria-expanded", "false");
  if (wasOpen) schedulePanelLayout();
}
shareBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const willOpen = !sharePop.classList.contains("open");
  sharePop.classList.toggle("open", willOpen);
  shareBtn.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) lpTrack("share", { action: "opened" });
  schedulePanelLayout();
});
document.addEventListener("click", (e) => {
  if (!sharePop.contains(e.target) && !shareBtn.contains(e.target)) closeSharePop();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSharePop();
});

const shareSiteUrl = "https://layerporter.com/?p=ic&channel=chrome-ext&src=share";
document.getElementById("shareCopyBtn").addEventListener("click", async () => {
  await navigator.clipboard.writeText(shareSiteUrl);
  lpTrack("share", { action: "copy_link" });
  setStatus(msg("shareLinkCopied"));
});
document.getElementById("shareFbBtn").addEventListener("click", () => {
  lpTrack("share", { action: "facebook" });
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareSiteUrl)}`, "_blank", "noopener,noreferrer");
});
document.getElementById("shareXBtn").addEventListener("click", () => {
  lpTrack("share", { action: "x" });
  window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareSiteUrl)}`, "_blank", "noopener,noreferrer");
});
document.getElementById("shareTgBtn").addEventListener("click", () => {
  lpTrack("share", { action: "telegram" });
  window.open(`https://t.me/share/url?url=${encodeURIComponent(shareSiteUrl)}`, "_blank", "noopener,noreferrer");
});
document.getElementById("shareSuggestSend").addEventListener("click", () => {
  const text = document.getElementById("shareSuggestText").value.trim();
  if (!text) return;
  lpTrack("share", { action: "suggest", text });
  window.open(feedbackUrl("share_suggest"), "_blank", "noopener,noreferrer");
  document.getElementById("shareSuggestText").value = "";
  setStatus(msg("shareSuggestSent"));
  closeSharePop();
});

// --- footer: "?" — форма обратной связи ---
document.getElementById("helpBtn").addEventListener("click", () => {
  lpTrack("feedback", { action: "help_click" });
  window.open(feedbackUrl("help"), "_blank", "noopener,noreferrer");
});

// lp-feedback.js рендерит карточку с фиксированными EN-строками (правило §00: код
// ОБЩИЙ-СЛОЙ не переписываем) — локализуем текст поверх готового DOM после рендера,
// подменяя известные английские строки на переведённые (продукт имеет полную i18n).
function localizeFeedbackCard(mountEl, count) {
  const card = mountEl.querySelector(".lp-feedback-card");
  if (!card) return;
  const [title, text] = card.children;
  if (title) title.textContent = msg("fbCardTitle", ["Picture Converter"]);
  if (text) text.textContent = msg("fbCardText", [String(count)]);
  card.querySelectorAll("button").forEach((btn) => {
    if (btn.textContent === "⭐ Rate on Chrome Web Store") btn.textContent = msg("fbRateBtn");
    else if (btn.textContent === "Send feedback") btn.textContent = msg("fbSendFeedback");
    else if (btn.textContent === "Not now") btn.textContent = msg("fbNotNow");
  });
}

let currentFormat = "jpg";
let currentIcoSize = 256;
let hasImage = false;
let lastResult = null;
let currentInputFormat = "";
let postDownloadResetTimer = 0;
let estimateToken = 0; // объявлено здесь, а не рядом с updateEstimate() ниже: updateFormatUI() зовёт
                        // updateEstimate() из loadFile()/loadBitmap(), которые вешаются на fileInput
                        // раньше, чем модуль дойдёт до старого места объявления — TDZ ReferenceError

const FORMAT_LABELS = { png: "PNG", jpg: "JPG", webp: "WEBP", pdf: "PDF", ico: "ICO" };

// пользователь выбирает не «формат», а результат — карточка объясняет выгоду
const FORMAT_INFO = {
  png: msg("fmtInfoPng"),
  jpg: msg("fmtInfoJpg"),
  webp: msg("fmtInfoWebp"),
  pdf: msg("fmtInfoPdf"),
  ico: msg("fmtInfoIco"),
};
const formatInfo = document.getElementById("formatInfo");

function updateOutputMeta() {
  if (!hasImage) return;

  metaOutputFormat.textContent =
    FORMAT_LABELS[currentFormat];

  if (currentFormat === "pdf") {
    metaOutputDims.textContent =
      batch.length > 1
        ? `${batch.length} pages`
        : "1 page";
  } else if (currentFormat === "ico") {
    metaOutputDims.textContent =
      `${currentIcoSize} × ${currentIcoSize}`;
  } else {
    metaOutputDims.textContent =
      `${canvas.width} × ${canvas.height}`;
  }

  const losesAlpha =
    currentFormat === "jpg"
    || currentFormat === "pdf";

  const outputHasAlpha =
    lastAlpha && !losesAlpha;

  metaOutputAlpha.textContent =
    outputHasAlpha
      ? msg("yes")
      : msg("no");

  metaOutputAlpha.classList.toggle(
    "yes",
    outputHasAlpha,
  );
}


let previewFitFrame = 0;


function getVisibleOuterHeight(element) {
  if (!element || element.hidden) {
    return 0;
  }

  const style = getComputedStyle(element);

  if (
    style.display === "none"
    || style.visibility === "hidden"
  ) {
    return 0;
  }

  const rect = element.getBoundingClientRect();

  return (
    rect.height
    + (parseFloat(style.marginTop) || 0)
    + (parseFloat(style.marginBottom) || 0)
  );
}


// === ADAPTIVE RESULT DISTRIBUTION V4 ===
// Три резиновых зазора (top/middle/bottom) вокруг блока фото+контролы делят
// свободную высоту панели весом 2:1:2, каждый со своим min/max — не проседают
// до нуля на маленьких экранах и не растягиваются до нелепых значений на больших.
const RESULT_GAP_PROFILE = {
  top: { min: 8, max: 28, weight: 2 },
  middle: { min: 8, max: 14, weight: 1 },
  bottom: { min: 8, max: 28, weight: 2 },
};

// Кнопка «Заменить» всегда в верхнем правом углу #stage, может лежать над
// фото — 16px = ×2 от прежнего зазора кнопка↔рамка (было 8px, side-режим V4).
const REPLACE_BTN_MARGIN = 16;
const REPLACE_BTN_RIGHT = 0;
const REPLACE_BTN_MIN_MARGIN = 0;
const RESULT_STAGE_SAFE_BOTTOM = 8;
const RESULT_LAYOUT_ROUNDING_GUARD = 1;
const RESULT_CONTROLS_MIN_GAP = 3;
let resultSafeFloorActive = false;

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setResultGap(top, middle, bottom) {
  pageEl.style.setProperty("--result-gap-top", `${top}px`);
  pageEl.style.setProperty("--result-gap-middle", `${middle}px`);
  pageEl.style.setProperty("--result-gap-bottom", `${bottom}px`);
}

function resetResultWorkspaceLayout() {
  pageEl.style.removeProperty("--result-gap-top");
  pageEl.style.removeProperty("--result-gap-middle");
  pageEl.style.removeProperty("--result-gap-bottom");
  pageEl.style.removeProperty("--result-stage-height");
  previewColumn.style.flexShrink = "";
  workControls.style.marginTop = "";
  resultSafeFloorActive = false;
  replaceBtn.style.top = "";
  replaceBtn.style.right = "";
  replaceBtn.style.left = "";
}

// extra — свободная высота сверх суммарного минимума трёх зазоров; делится
// пропорционально весам, но не сверх индивидуального max каждого слота.
// Остаток от урезанных max-слотов уходит оставшимся слотам (иначе высота
// панели просто "теряется" вместо того чтобы уйти в top/bottom).
function distributeResultGapExtra(extra) {
  const slots = ["top", "middle", "bottom"].map((key) => ({
    key,
    ...RESULT_GAP_PROFILE[key],
    value: RESULT_GAP_PROFILE[key].min,
  }));

  let remaining = Math.max(0, extra);
  let open = slots.filter((s) => s.value < s.max);

  while (remaining > 0.01 && open.length) {
    const weightSum = open.reduce((sum, s) => sum + s.weight, 0);
    let distributed = 0;

    for (const slot of open) {
      const share = (remaining * slot.weight) / weightSum;
      const room = slot.max - slot.value;
      const applied = Math.min(share, room);
      slot.value += applied;
      distributed += applied;
    }

    remaining -= distributed;
    open = slots.filter((s) => s.value < s.max);

    if (distributed <= 0.01) break; // все слоты в максимуме — остаток некуда девать
  }

  const byKey = {};
  slots.forEach((s) => { byKey[s.key] = s.value; });
  return byKey;
}

function getPreviewFrameExtras() {
  const frameStyle = getComputedStyle(previewWrap);
  return {
    x:
      (parseFloat(frameStyle.paddingLeft) || 0)
      + (parseFloat(frameStyle.paddingRight) || 0)
      + (parseFloat(frameStyle.borderLeftWidth) || 0)
      + (parseFloat(frameStyle.borderRightWidth) || 0),
    y:
      (parseFloat(frameStyle.paddingTop) || 0)
      + (parseFloat(frameStyle.paddingBottom) || 0)
      + (parseFloat(frameStyle.borderTopWidth) || 0)
      + (parseFloat(frameStyle.borderBottomWidth) || 0),
  };
}

// Считает высоту #stage (--result-stage-height) и делит остаток свободного места
// панели на три зазора. Не трогает previewWrap/canvas — их размером занимается
// fitPreviewToStage(), вызываемая сразу после этой функции.
function layoutResultWorkspace() {
  if (
    !inSidePanel
    || !hasImage
    || batch.length > 1
  ) {
    resetResultWorkspaceLayout();
    return;
  }

  const gapMinSum =
    RESULT_GAP_PROFILE.top.min
    + RESULT_GAP_PROFILE.middle.min
    + RESULT_GAP_PROFILE.bottom.min;

  const reservedHeight = Array.from(contentEl.children)
    .reduce((total, child) => {
      if (
        child.contains(stage)
        || child.contains(workControls)
        || child === resultGapTop
        || child === resultGapMiddle
        || child === resultGapBottom
        || child.contains(resultGapTop)
        || child.contains(resultGapMiddle)
        || child.contains(resultGapBottom)
      ) {
        return total;
      }
      return total + getVisibleOuterHeight(child);
    }, 0);

  const extras = getPreviewFrameExtras();
  const legacyControlsHeight = workControls.getBoundingClientRect().height;
  const legacyAvailable = Math.max(
    0,
    contentEl.clientHeight - reservedHeight - legacyControlsHeight,
  );
  const legacyNaturalStageHeight = Math.max(
    1,
    Math.min(
      canvas.height + extras.y,
      legacyAvailable - gapMinSum,
    ),
  );

  const replaceHeight = replaceBtn.getBoundingClientRect().height;
  const preferredSafeStageHeight =
    REPLACE_BTN_MARGIN + replaceHeight + RESULT_STAGE_SAFE_BOTTOM;

  // Пока старая V4-геометрия уже безопасна, оставляем её 1:1.
  // Это защищает обычные и большие изображения от побочных изменений.
  if (legacyNaturalStageHeight >= preferredSafeStageHeight) {
    previewColumn.style.flexShrink = "";
    workControls.style.marginTop = "";
    resultSafeFloorActive = false;

    const stageHeight = legacyNaturalStageHeight;
    const extra = Math.max(
      0,
      legacyAvailable - gapMinSum - stageHeight,
    );
    const gaps = distributeResultGapExtra(extra);

    pageEl.style.setProperty(
      "--result-stage-height",
      `${Math.round(stageHeight)}px`,
    );
    setResultGap(
      Math.round(gaps.top),
      Math.round(gaps.middle),
      Math.round(gaps.bottom),
    );
    return;
  }

  // Safe-floor включается только когда stage иначе схлопнется ниже Replace.
  // Здесь учитываем реальные margin/padding и не считаем middle-gap дважды.
  previewColumn.style.flexShrink = "0";
  resultSafeFloorActive = true;

  // Always measure the CSS-authored controls gap first; a previous constrained
  // pass may have temporarily reduced it with an inline value.
  workControls.style.marginTop = "";
  const contentStyle = getComputedStyle(contentEl);
  const contentPaddingY =
    (parseFloat(contentStyle.paddingTop) || 0)
    + (parseFloat(contentStyle.paddingBottom) || 0);
  const controlsStyle = getComputedStyle(workControls);
  const controlsBaseGap = parseFloat(controlsStyle.marginTop) || 0;
  const controlsFixedHeight = Math.max(
    0,
    getVisibleOuterHeight(workControls)
      - getVisibleOuterHeight(resultGapMiddle),
  );
  const baseAvailable = Math.max(
    0,
    contentEl.clientHeight
      - contentPaddingY
      - reservedHeight
      - controlsFixedHeight
      - RESULT_LAYOUT_ROUNDING_GUARD,
  );

  // On the native minimum-width panel the Replace button is 32px tall. At the
  // lowest supported viewport, reclaim only the part of the decorative
  // stage->controls gap needed to keep the button inside the stage. The total
  // vertical footprint stays unchanged, so this cannot introduce scrolling.
  const requiredHardStageHeight = REPLACE_BTN_MIN_MARGIN + replaceHeight;
  const reclaimableControlsGap = Math.max(
    0,
    controlsBaseGap - RESULT_CONTROLS_MIN_GAP,
  );
  const controlsGapReclaim = Math.min(
    reclaimableControlsGap,
    Math.max(0, requiredHardStageHeight - baseAvailable),
  );
  workControls.style.marginTop = `${Math.max(
    RESULT_CONTROLS_MIN_GAP,
    controlsBaseGap - controlsGapReclaim,
  )}px`;
  const available = baseAvailable + controlsGapReclaim;

  const naturalStageHeight = Math.max(
    1,
    Math.min(canvas.height + extras.y, available),
  );
  const hardSafeStageHeight = Math.min(
    available,
    REPLACE_BTN_MIN_MARGIN + replaceHeight,
  );
  let stageHeight = Math.max(naturalStageHeight, hardSafeStageHeight);
  let remaining = Math.max(0, available - stageHeight);

  // Сначала возвращаем привычные 16px над Replace.
  const topSafeTarget = Math.min(available, REPLACE_BTN_MARGIN + replaceHeight);
  const topSafeExtra = Math.min(
    remaining,
    Math.max(0, topSafeTarget - stageHeight),
  );
  stageHeight += topSafeExtra;
  remaining -= topSafeExtra;

  let gaps;
  if (remaining >= gapMinSum) {
    // Места достаточно: дальше старая система зазоров работает без изменений.
    const fullSafeExtra = Math.min(
      remaining - gapMinSum,
      Math.max(0, preferredSafeStageHeight - stageHeight),
    );
    stageHeight += fullSafeExtra;
    remaining -= fullSafeExtra;
    gaps = distributeResultGapExtra(Math.max(0, remaining - gapMinSum));
  } else {
    // Низкий viewport: 4/2/4 — существующая CSS-пропорция для <=700px.
    // Если не хватает и на неё, сжимаем только эти декоративные зазоры 2:1:2.
    const compactGapSum = 10;
    const gapBudget = Math.min(remaining, compactGapSum);
    const unit = gapBudget / 5;
    gaps = { top: unit * 2, middle: unit, bottom: unit * 2 };
    remaining -= gapBudget;

    const fullSafeExtra = Math.min(
      remaining,
      Math.max(0, preferredSafeStageHeight - stageHeight),
    );
    stageHeight += fullSafeExtra;
    remaining -= fullSafeExtra;

    if (remaining > 0) {
      const extraUnit = remaining / 5;
      gaps.top += extraUnit * 2;
      gaps.middle += extraUnit;
      gaps.bottom += extraUnit * 2;
    }
  }

  pageEl.style.setProperty(
    "--result-stage-height",
    `${Math.round(stageHeight)}px`,
  );
  setResultGap(
    Math.round(gaps.top),
    Math.round(gaps.middle),
    Math.round(gaps.bottom),
  );
}

// Кнопка «Заменить» всегда зафиксирована в верхнем правом углу #stage —
// не резервирует место и может лежать над фото (разрешено по ТЗ).
function positionReplaceButton() {
  if (
    !inSidePanel
    || !hasImage
    || batch.length > 1
    || previewWrap.hidden
  ) {
    return;
  }

  const replaceHeight = replaceBtn.getBoundingClientRect().height;
  const replaceTop = resultSafeFloorActive
    ? Math.min(
      REPLACE_BTN_MARGIN,
      Math.max(REPLACE_BTN_MIN_MARGIN, stage.clientHeight - replaceHeight),
    )
    : REPLACE_BTN_MARGIN;

  replaceBtn.style.top = `${replaceTop}px`;
  replaceBtn.style.right = `${REPLACE_BTN_RIGHT}px`;
  replaceBtn.style.left = "auto";
}

function fitPreviewToStage() {
  if (
    !hasImage
    || previewWrap.hidden
    || batch.length > 1
    || !canvas.width
    || !canvas.height
  ) {
    return;
  }

  const extras = getPreviewFrameExtras();
  const extraX = extras.x;
  const extraY = extras.y;

  let availableWidth;
  let availableHeight;

  if (inSidePanel) {
    // V4: высота #stage уже фиксирована layoutResultWorkspace() через
    // --result-stage-height — просто вписываем фото в реальный размер stage,
    // а не пересчитываем "оставшееся место" заново (это делала V3-формула).
    availableWidth = Math.max(1, stage.clientWidth - extraX);
    availableHeight = Math.max(1, stage.clientHeight - extraY);
  } else {
    /*
     * full-page-mode: старая модель. В состоянии has-img все видимые дети
     * .content, кроме тех, что содержат #stage/#workControls (сами эти узлы
     * либо их обёртка #fullWorkspace), являются фиксированными блоками.
     * Вычитаем их фактическую высоту.
     */
    const reservedHeight = Array.from(contentEl.children)
      .reduce((total, child) => {
        if (
          child.contains(stage)
          || child.contains(workControls)
        ) {
          return total;
        }

        return total + getVisibleOuterHeight(child);
      }, 0);

    const controlsStyle = getComputedStyle(workControls);
    const controlsTopGap = parseFloat(controlsStyle.marginTop) || 0;
    const controlsHeight = workControls.getBoundingClientRect().height;

    const maximumFrameBoxHeight = Math.max(
      1,
      contentEl.clientHeight
        - reservedHeight
        - controlsHeight
        - controlsTopGap,
    );

    availableWidth = Math.max(1, stage.clientWidth - extraX);
    availableHeight = Math.max(1, maximumFrameBoxHeight - extraY);
  }

  /*
   * Критически важно:
   * значение 1 запрещает увеличивать маленькие изображения
   * выше их исходного размера.
   */
  const scale = Math.max(
    0.01,
    Math.min(
      1,
      availableWidth / canvas.width,
      availableHeight / canvas.height,
    ),
  );

  if (
    !Number.isFinite(scale)
    || scale <= 0
  ) {
    return;
  }

  const renderedWidth = Math.max(
    1,
    Math.floor(canvas.width * scale),
  );

  const renderedHeight = Math.max(
    1,
    Math.floor(canvas.height * scale),
  );

  canvas.style.width =
    `${renderedWidth}px`;

  canvas.style.height =
    `${renderedHeight}px`;

  previewWrap.style.width =
    `${renderedWidth + extraX}px`;

  previewWrap.style.height =
    `${renderedHeight + extraY}px`;

  if (inSidePanel) {
    positionReplaceButton();
  }
}


function schedulePreviewFit() {
  if (inSidePanel) {
    schedulePanelLayout();
    return;
  }

  cancelAnimationFrame(previewFitFrame);

  previewFitFrame =
    requestAnimationFrame(fitPreviewToStage);
}


/*
 * Единый планировщик геометрии панели (Шаг 4). Подбирает самый просторный
 * ярус плотности (.page[data-density]), при котором контент реально
 * влезает без внутреннего/горизонтального overflow, и ВНУТРИ этого же
 * прогона вызывает fitPreviewToStage() — раньше это были две независимые
 * системы (ResizeObserver на #stage-геометрию отдельно от переключателя
 * плотности), что могло по очереди перетягивать одну и ту же раскладку.
 */
const PANEL_DENSITIES = ["comfortable", "compact", "dense"];

const pageEl = document.querySelector(".page");

let panelLayoutFrame = 0;
let panelLayoutRevision = 0;
let panelLayoutProbing = false;

function schedulePanelLayout() {
  if (!inSidePanel) return;

  // The initial result controls intentionally animate with translateY().
  // Transforms can temporarily enlarge scrollable overflow without changing
  // the final layout. Do not density-probe that transient visual state; a
  // verification pass is scheduled as soon as the entry animation finishes.
  if (
    hasImage
    && batch.length <= 1
    && workControls.classList.contains("enter")
  ) {
    return;
  }

  cancelAnimationFrame(panelLayoutFrame);

  panelLayoutFrame =
    requestAnimationFrame(resolvePanelLayout);
}

/*
 * ResizeObserver наблюдает за pageEl/contentEl, но сам resolvePanelLayout()
 * меняет их размеры при переключении плотности — без этого фильтра каждая
 * смена яруса заново триггерила бы observer, тот звал schedulePanelLayout(),
 * revision менялся и текущий прогон прерывался на первой же итерации.
 */
function onPanelResizeObserved() {
  if (panelLayoutProbing) return;
  schedulePanelLayout();
}

async function nextLayoutFrame() {
  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

/*
 * Пока идёт подбор плотности, #stage не должен доигрывать свой обычный
 * transition на padding (editor.html, transition: ... padding .2s ease) —
 * иначе измерение геометрии в промежуточном кадре попадёт на анимируемое,
 * а не целевое значение (см. .page.layout-probe #stage в editor.html).
 */
function panelGeometryFits() {
  const tolerance = 1;

  const contentFitsVertically =
    contentEl.scrollHeight
      <= contentEl.clientHeight + tolerance;

  const contentFitsHorizontally =
    contentEl.scrollWidth
      <= contentEl.clientWidth + tolerance;

  const pageFitsHorizontally =
    pageEl.scrollWidth
      <= pageEl.clientWidth + tolerance;

  /*
   * #stage имеет overflow:hidden.
   * Без отдельной проверки содержимое может быть визуально обрезано,
   * а contentEl при этом формально не иметь переполнения.
   */
  const emptyStageFits =
    hasImage
    || (
      stage.clientWidth > 0
      && stage.clientHeight > 0
      && stage.scrollHeight
        <= stage.clientHeight + tolerance
      && stage.scrollWidth
        <= stage.clientWidth + tolerance
    );

  /*
   * V4: previewWrap и replaceBtn — оба прямые дети #stage теперь — должны
   * целиком помещаться внутрь stage. Без этой проверки узкая панель могла бы
   * "подобрать" плотность, при которой кнопка Replace вылезает за stage.
   */
  const resultStageFits =
    !hasImage
    || batch.length > 1
    || previewWrap.hidden
    || (() => {
      const stageRect = stage.getBoundingClientRect();
      const frameRect = previewWrap.getBoundingClientRect();
      const btnRect = replaceBtn.getBoundingClientRect();
      const within = (rect) =>
        rect.left >= stageRect.left - tolerance
        && rect.right <= stageRect.right + tolerance
        && rect.top >= stageRect.top - tolerance
        && rect.bottom <= stageRect.bottom + tolerance;
      return within(frameRect) && within(btnRect);
    })();

  return (
    contentFitsVertically
    && contentFitsHorizontally
    && pageFitsHorizontally
    && emptyStageFits
    && resultStageFits
  );
}

/*
 * Result mode is resolved synchronously. Every geometry read below forces the
 * current density styles to be applied, but the browser cannot paint an
 * intermediate density while this JavaScript task is still running. This is
 * important for small images: the old async probe visibly painted
 * comfortable -> compact -> dense and moved the preview between frames.
 * Empty/batch states keep the existing async resolver below.
 */
function resolveResultPanelLayoutNow() {
  if (
    !inSidePanel
    || !hasImage
    || batch.length > 1
  ) {
    return false;
  }

  // Cancel the queued probe and invalidate any async empty/batch density probe
  // that started before the image result became visible. Otherwise stale work
  // can resume on a later animation frame and overwrite the settled result.
  cancelAnimationFrame(panelLayoutFrame);
  panelLayoutFrame = 0;
  ++panelLayoutRevision;

  pageEl.classList.add("layout-probe");
  panelLayoutProbing = true;

  let settledTier = PANEL_DENSITIES[PANEL_DENSITIES.length - 1];
  let fits = false;

  for (const tier of PANEL_DENSITIES) {
    pageEl.dataset.density = tier;
    layoutResultWorkspace();
    fitPreviewToStage();

    if (panelGeometryFits()) {
      settledTier = tier;
      fits = true;
      break;
    }
  }

  pageEl.dataset.density = settledTier;
  layoutResultWorkspace();
  fitPreviewToStage();
  document.body.classList.toggle("panel-scroll-mode", !fits);
  pageEl.classList.remove("layout-probe");
  panelLayoutProbing = false;

  return fits;
}

async function resolvePanelLayout() {
  if (hasImage && batch.length <= 1) {
    resolveResultPanelLayoutNow();
    return;
  }

  const revision = ++panelLayoutRevision;

  pageEl.classList.add("layout-probe");
  panelLayoutProbing = true;

  let settledTier = PANEL_DENSITIES[PANEL_DENSITIES.length - 1];
  let fits = false;

  for (const tier of PANEL_DENSITIES) {
    pageEl.dataset.density = tier;

    await nextLayoutFrame();
    if (revision !== panelLayoutRevision) {
      pageEl.classList.remove("layout-probe");
      panelLayoutProbing = false;
      return;
    }

    await nextLayoutFrame();
    if (revision !== panelLayoutRevision) {
      pageEl.classList.remove("layout-probe");
      panelLayoutProbing = false;
      return;
    }

    if (panelGeometryFits()) {
      settledTier = tier;
      fits = true;
      break;
    }
  }

  pageEl.dataset.density = settledTier;
  document.body.classList.toggle("panel-scroll-mode", !fits);
  pageEl.classList.remove("layout-probe");
  panelLayoutProbing = false;
}

if (inSidePanel) {
  const panelResizeObserver =
    new ResizeObserver(onPanelResizeObserved);

  panelResizeObserver.observe(pageEl);
  panelResizeObserver.observe(contentEl);
  panelResizeObserver.observe(stage);
  panelResizeObserver.observe(dropContent);
  panelResizeObserver.observe(workControls);

  if (topStickyEl) {
    panelResizeObserver.observe(topStickyEl);
  }

  window.addEventListener(
    "resize",
    schedulePanelLayout,
    { passive: true },
  );

  schedulePanelLayout();
} else {
  window.addEventListener(
    "resize",
    schedulePreviewFit,
    { passive: true },
  );
}


function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
  if (isError && !hasImage) {
    stage.classList.remove("drag", "accepting");
    stage.classList.add("error");
  }
}

function humanSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return bytes + " " + msg("unitB");
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " " + msg("unitKB");
  return (bytes / 1024 / 1024).toFixed(1) + " " + msg("unitMB");
}

function formatFromBlob(fileOrBlob) {
  const name = (fileOrBlob.name || "").toLowerCase();
  const extMatch = name.match(/\.([a-z0-9]+)$/);
  if (extMatch) return extMatch[1].toUpperCase();
  const type = (fileOrBlob.type || "").toLowerCase();
  if (type.startsWith("image/")) return type.slice(6).replace("svg+xml", "svg").toUpperCase();
  return "—";
}

// формат по умолчанию — по источнику: экзотика → универсальный, универсальный → парный.
// hasAlpha: JPG уничтожает прозрачность (заливка белым) — картинке с альфой
// НЕЛЬЗЯ рекомендовать JPG, вместо него WEBP (меньше веса, альфа живёт).
function recommendFormat(srcFormat, hasAlpha) {
  const f = (srcFormat || "").toLowerCase();
  let rec;
  if (["heic", "heif", "avif"].includes(f)) rec = "jpg";  // «фото с айфона / с сайта не открывается» → JPG
  else if (["webp"].includes(f)) rec = "png";               // webp to png — крупнейшая пара спроса
  else if (["svg", "gif", "bmp"].includes(f)) rec = "png";
  else if (["jpg", "jpeg", "jfif"].includes(f)) rec = "png";
  else if (f === "png") rec = "jpg";
  else rec = "jpg";
  if (hasAlpha && rec === "jpg") rec = "webp";
  return rec;
}

// --- определение форматов входа ---

function isHeic(fileOrBlob) {
  const type = (fileOrBlob.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  const name = (fileOrBlob.name || "").toLowerCase();
  return /\.(heic|heif)$/.test(name);
}

function isSvg(fileOrBlob) {
  const type = (fileOrBlob.type || "").toLowerCase();
  if (type === "image/svg+xml") return true;
  return /\.svg$/.test((fileOrBlob.name || "").toLowerCase());
}

// HEIC — не декодируется браузером нативно, нужен libheif-js (WASM вшит в бандл).
// Дефолтный экспорт бандла — Emscripten-ФАБРИКА: её надо вызвать и дождаться,
// HeifDecoder есть только у результата (проверено живым тестом 14.07).
let libheifPromise = null;
function getLibheif() {
  if (!libheifPromise) {
    libheifPromise = import("./vendor/libheif-bundle.mjs").then((m) => m.default());
  }
  return libheifPromise;
}

async function decodeHeicToCanvas(fileOrBlob) {
  const libheif = await getLibheif();
  const buf = await fileOrBlob.arrayBuffer();
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(buf);
  if (!images.length) throw new Error(msg("heicEmpty"));
  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();
  const heicCanvas = document.createElement("canvas");
  heicCanvas.width = width;
  heicCanvas.height = height;
  const hctx = heicCanvas.getContext("2d");
  const imageData = hctx.createImageData(width, height);
  await new Promise((resolve, reject) => {
    image.display(imageData, (displayData) => {
      if (!displayData) { reject(new Error(msg("heicFail"))); return; }
      resolve();
    });
  });
  hctx.putImageData(imageData, 0, 0);
  return heicCanvas;
}

// SVG рисуем через <img>: в этом режиме браузер по спецификации не исполняет
// скрипты и не грузит внешние ресурсы из SVG — безопасно для чужих файлов.
async function rasterizeSvgToBitmap(fileOrBlob) {
  const url = URL.createObjectURL(fileOrBlob.slice(0, fileOrBlob.size, "image/svg+xml"));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error(msg("svgFail")));
      img.src = url;
    });
    const w = img.naturalWidth || 1024;
    const h = img.naturalHeight || 1024;
    const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    return await createImageBitmap(c);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// единая точка декода для всех 9 входных форматов: HEIC → libheif, SVG → <img>,
// остальное → нативный createImageBitmap. Используется и одиночным путём, и батчем.
async function decodeToBitmap(fileOrBlob, showStatus = false) {
  if (isHeic(fileOrBlob)) {
    if (showStatus) setStatus(msg("decodingHeic"));
    return createImageBitmap(await decodeHeicToCanvas(fileOrBlob));
  }
  if (isSvg(fileOrBlob)) return rasterizeSvgToBitmap(fileOrBlob);
  return createImageBitmap(fileOrBlob);
}

// --- загрузка и превью (одна сцена: dropzone превращается в превью, не новый экран) ---

// точный попиксельный скан альфа-канала: даже на 4000×4000 это ~50мс один раз
// при загрузке — зато никаких ложных «Нет» на крошечных прозрачных зонах
function canvasHasAlpha() {
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let p = 3; p < data.length; p += 4) {
    if (data[p] < 255) return true;
  }
  return false;
}

async function loadBitmap(bitmap) {
  let { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  metaInputDims.textContent = `${width} × ${height}`;
  const alpha = canvasHasAlpha();
  lastAlpha = alpha; // рекомендация формата и предупреждения зависят от альфы
  previewWrap.classList.toggle("alpha", alpha);

  hasImage = true;
  document.body.classList.add("has-img"); // широкая страница нужна только под превью
  stage.classList.remove("accepting", "error", "drag");
  stage.classList.add("has-image");
  dropContent.hidden = true;
  previewWrap.hidden = false;
  replaceBtn.hidden = false;
  document.querySelector(".format-chips").style.display = "";
  resultSummary.hidden = false;
  pickRow.hidden = true;
  modeSwitch.hidden = false; // на экране результата — над карточкой сайта
  paintModeSwitch();
  workControls.style.display = "block";
  updateFormatUI();
  if (!inSidePanel) {
    schedulePreviewFit();
  }
}

let currentSource = null; // "page" | "file" — для умного «Заменить» (не локализуемый enum!)
// состояние кнопки-тумблера выбора с сайта. Объявлено здесь, а не рядом с обработчиком:
// resetToEmpty() выше по файлу читает его, иначе TDZ при раннем сбросе
let pickerState = "idle"; // idle | selecting | selected
let pickerTabId = null;
let selectedTimer = null; // авто-отжатие «Image selected» через 2с — как уведомление
let lastAlpha = false; // есть ли прозрачность у текущей картинки (ставится в loadBitmap)

async function loadFile(fileOrBlob, sourceKind) {
  stage.classList.remove("error", "drag");
  stage.classList.add("accepting");
  currentSource = sourceKind;
  const srcFormat = formatFromBlob(fileOrBlob);
  currentInputFormat = srcFormat;
  metaInputFormat.textContent = srcFormat;
  metaInputDims.textContent = "";
  metaInputSize.textContent = humanSize(fileOrBlob.size);
  metaOutputSize.textContent = "—";

  // формат результата выбирается сам — пользователь сразу видит «Скачать JPG» и жмёт
  // (до декода альфа неизвестна — после loadBitmap рекомендация пересчитывается с ней)
  currentFormat = recommendFormat(srcFormat, false);
  updateFormatUI();

  let bitmap;
  try {
    bitmap = await decodeToBitmap(fileOrBlob, true);
  } catch (e) {
    lpTrack("error", { code: lpErrCode(e), stage: "load" });
    throw e;
  }
  await loadBitmap(bitmap);
  // теперь альфа известна — пересчитать рекомендацию (JPG для прозрачной картинки = дефект)
  const recWithAlpha = recommendFormat(srcFormat, lastAlpha);
  if (recWithAlpha !== currentFormat) {
    currentFormat = recWithAlpha;
    updateFormatUI();
  }

  if (inSidePanel) {
    // loadBitmap() and this continuation complete in the same render turn.
    // Resolve only after the alpha-aware output UI is final, then allow the
    // existing control-entry animation to paint without re-probing its
    // temporary transform overflow.
    resolveResultPanelLayoutNow();
    workControls.classList.add("enter");
    setTimeout(() => {
      workControls.classList.remove("enter");
      schedulePanelLayout();
    }, 600);
  }

  lpTrack("action_step", { step: "image_loaded", source: sourceKind, format: srcFormat, alpha: lastAlpha }); // В3 воронки
}

// --- батч: несколько картинок → один PDF ---
// В памяти держим ТОЛЬКО миниатюры (файлы остаются файлами): 30 фото по 4000px
// в виде канвасов — это порядка гигабайта, поэтому каждая страница декодируется
// заново прямо перед вставкой в PDF и сразу отпускается.
const MAX_BATCH = 30;
const THUMB = 150;
const batchWrap = document.getElementById("batchWrap");
const batchStrip = document.getElementById("batchStrip");
const batchTitle = document.getElementById("batchTitle");
let batch = []; // [{ file, thumb }]

async function makeThumb(bitmap) {
  const scale = Math.min(1, THUMB / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  c.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  return c;
}

function renderBatch() {
  batchTitle.textContent = msg("batchTitle", [String(batch.length)]);
  batchStrip.textContent = "";
  batch.forEach((item, i) => {
    const box = document.createElement("div");
    box.className = "batch-item";
    const num = document.createElement("span");
    num.className = "batch-num";
    num.textContent = String(i + 1);
    const name = document.createElement("div");
    name.className = "batch-name";
    name.textContent = item.file.name || msg("batchUntitled");
    name.title = item.file.name || "";
    const ctrl = document.createElement("div");
    ctrl.className = "batch-ctrl";
    // textContent, не innerHTML: имя файла приходит от пользователя
    for (const [act, label, dis] of [["up", "←", i === 0], ["down", "→", i === batch.length - 1], ["del", "✕", false]]) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.act = act;
      b.dataset.idx = String(i);
      b.textContent = label;
      b.disabled = dis;
      if (act === "del") b.className = "batch-del";
      b.setAttribute("aria-label", msg(act === "up" ? "batchMoveUp" : act === "down" ? "batchMoveDown" : "batchRemove", [String(i + 1)]));
      ctrl.append(b);
    }
    box.append(num, item.thumb, name, ctrl);
    batchStrip.append(box);
  });
}

batchStrip.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  e.stopPropagation();
  const i = Number(btn.dataset.idx);
  const act = btn.dataset.act;
  if (act === "del") batch.splice(i, 1);
  else if (act === "up" && i > 0) [batch[i - 1], batch[i]] = [batch[i], batch[i - 1]];
  else if (act === "down" && i < batch.length - 1) [batch[i + 1], batch[i]] = [batch[i], batch[i + 1]];
  lpTrack("action_step", { step: "batch_edit", act, count: batch.length });
  if (!batch.length) { resetToEmpty(); return; }
  if (batch.length === 1) { // остался один — это уже не батч, возвращаемся в обычный режим
    const only = batch[0].file;
    batch = [];
    loadFile(only, "file").catch((err) => setStatus(msg("loadError", [err.message]), true));
    return;
  }
  renderBatch();
  updateBatchUI();
});

// в батче выход только один (PDF), поэтому чипы форматов и мета-карточки скрыты:
// показывать «выберите формат» там, где выбора нет, — врать пользователю
function updateBatchUI() {
  const on = batch.length > 1;
  document.body.classList.toggle("batch-mode", on);
  batchWrap.hidden = !on;
  previewWrap.hidden = on || !hasImage;
  replaceBtn.hidden = on || !hasImage;
  document.querySelector(".format-chips").style.display = on ? "none" : "";
  resultSummary.hidden = on;
  icoSizeBlock.style.display = "none";
  pngNoteBlock.style.display = "none";
  pdfNoteBlock.style.display = "none";

  if (on) {
    currentFormat = "pdf";
    qualityBlock.style.display = "grid"; // качество влияет на JPEG-страницы
    dlLabel.textContent = msg("downloadPdfPages", [String(batch.length)]);
    dlSize.textContent = "";
  }

  schedulePanelLayout();
}

async function loadBatch(files) {
  const list = files.slice(0, MAX_BATCH);
  const skipped = files.length - list.length;
  setStatus(msg("batchLoading", [String(list.length)]));
  batch = [];
  const failed = [];
  for (const file of list) {
    try {
      const bmp = await decodeToBitmap(file);
      batch.push({ file, thumb: await makeThumb(bmp) });
      bmp.close?.();
    } catch {
      failed.push(file.name || "?"); // один битый файл не должен убивать весь батч
    }
  }
  if (batch.length < 2) { // нечего склеивать — уходим в обычный путь
    batch = [];
    if (list.length) { await loadFile(list[0], "file"); return; }
    throw new Error(msg("batchAllFailed"));
  }
  currentSource = "file";
  hasImage = true;
  document.body.classList.add("has-img");
  stage.classList.remove("accepting", "error", "drag");
  stage.classList.add("has-image");
  dropContent.hidden = true;
  modeSwitch.hidden = false;
  paintModeSwitch();
  workControls.style.display = "block";
  renderBatch();
  updateBatchUI();
  lpTrack("action_step", { step: "batch_loaded", count: batch.length, skipped, failed: failed.length });
  const notes = [];
  if (failed.length) notes.push(msg("batchSkippedBad", [String(failed.length)]));
  if (skipped > 0) notes.push(msg("batchTooMany", [String(MAX_BATCH), String(skipped)]));
  setStatus(msg("batchReady", [String(batch.length)]) + (notes.length ? " " + notes.join(" ") : ""));
}

chooseBtn.addEventListener("click", () => { fileInput.click(); });
stage.addEventListener("click", (e) => {
  if (hasImage) return;
  // кнопки внутри dropzone (выбор файла / picker с сайта) не должны открывать диалог файла
  if (chooseBtn.contains(e.target) || pickFromSiteBtn.contains(e.target)) return;
  fileInput.click();
});

// однократная анимация входа при открытии панели (иконка/кнопка/форматы)
stage.classList.add("intro");
setTimeout(() => stage.classList.remove("intro"), 1050);

// радиальная подсветка следует за курсором внутри dropzone (--mx/--my читаются в CSS)
stage.addEventListener("pointermove", (e) => {
  const r = stage.getBoundingClientRect();
  stage.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
  stage.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
});
stage.addEventListener("pointerleave", () => {
  stage.style.removeProperty("--mx");
  stage.style.removeProperty("--my");
});

// счётчик глубины drag — dragenter/dragleave срабатывают и на дочерних элементах,
// без счётчика класс .drag мигал бы при пересечении границ внутренних блоков
let dragDepth = 0;
stage.addEventListener("dragenter", (e) => {
  e.preventDefault();
  if (hasImage) return;
  dragDepth++;
  stage.classList.remove("error", "accepting");
  stage.classList.add("drag");
});
stage.addEventListener("dragover", (e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; });
stage.addEventListener("dragleave", (e) => {
  e.preventDefault();
  if (hasImage) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) stage.classList.remove("drag");
});
// один файл → обычный путь (поведение не меняется), несколько → батч в один PDF
function acceptFiles(files) {
  const list = [...files];
  if (!list.length) return;
  const fail = (err) => { stage.classList.remove("accepting"); setStatus(msg("loadError", [err.message]), true); };
  if (list.length === 1) {
    batch = [];
    updateBatchUI();
    loadFile(list[0], "file").catch(fail);
  } else {
    loadBatch(list).catch(fail);
  }
}
stage.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  stage.classList.remove("drag");
  acceptFiles(e.dataTransfer.files);
});
fileInput.addEventListener("change", () => { acceptFiles(fileInput.files); });

// подсветка переключателя идёт по реальному источнику картинки,
// иначе после файла с диска активной оставалась бы «Со страницы»
function paintModeSwitch() {
  const fromPage = currentSource !== "file";
  modePageBtn.classList.toggle("active", fromPage);
  modePageBtn.setAttribute("aria-selected", String(fromPage));
  modeComputerBtn.classList.toggle("active", !fromPage);
  modeComputerBtn.setAttribute("aria-selected", String(!fromPage));
}

function resetToEmpty() {
  hasImage = false;
  lastResult = null;
  fileInput.value = "";
  batch = [];
  document.body.classList.remove("batch-mode");
  batchWrap.hidden = true;
  clearTimeout(postDownloadResetTimer);
  postDownloadResetTimer = 0;
  document.querySelector(".format-chips").style.display = "";
  resultSummary.hidden = false;
  document.body.classList.remove("has-img");
  stage.classList.remove("has-image", "accepting", "error");
  dropContent.hidden = false;
  previewWrap.hidden = true;
  replaceBtn.hidden = true;
  resetResultWorkspaceLayout();

  canvas.style.width = "";
  canvas.style.height = "";

  previewWrap.style.width = "";
  previewWrap.style.height = "";

  metaInputFormat.textContent = "";
  metaInputDims.textContent = "";
  metaInputSize.textContent = "";

  metaOutputFormat.textContent = "";
  metaOutputDims.textContent = "";
  metaOutputSize.textContent = "";
  metaOutputAlpha.textContent = "";

  currentInputFormat = "";

  pickRow.hidden = false;
  modeSwitch.hidden = true; // на первом экране источник выбирают самими карточками
  currentSource = null;
  paintModeSwitch();
  clearTimeout(selectedTimer); // ушли с экрана раньше авто-отжатия — не дать таймеру сработать задним числом
  if (pickerState === "selecting") stopPicker(); // ушли с экрана — гасим оверлей на сайте
  else if (pickerState === "selected") { pickerState = "idle"; setPickerVisual("idle"); }
  workControls.style.display = "none";
  buttonState("idle");
  setStatus("");
  schedulePanelLayout();
}
// «Заменить» повторяет путь, которым картинка пришла (без пересадки на пустой экран):
// со страницы → сразу picker на сайте; локальный файл → сразу диалог выбора.
// Полный выбор способа остаётся за «Конвертировать ещё» (это «новая задача»).
replaceBtn.addEventListener("click", () => {
  if (currentSource === "page") {
    pickFromSiteBtn.click();
    return;
  }
  fileInput.click();
});
// «С компьютера» = вернуться на первый экран (он же side panel по манифесту),
// откуда доступны и локальный файл, и картинка с сайта. Сам экран не меняем.
modeComputerBtn.addEventListener("click", resetToEmpty);

modePageBtn.addEventListener("click", () => {
  if (currentSource === "page") return;

  resetToEmpty();
  pickFromSiteBtn.click();
});

// «Выбрать картинку с сайта» из пустого редактора: мост «Открываю сайт…» →
// переключение на последнюю ОБЫЧНУЮ вкладку сайта → picker там.
// АРХИТЕКТУРНЫЙ фикс (не третья заплатка поверх старой): раньше вкладка угадывалась
// снимком tabs.query()+сортировкой по lastAccessed в момент клика — хрупко (могла
// выбрать служебную/заблокированную вкладку, executeScript падал с «must request
// permission to access the respective host»). Теперь background.js СЛУШАЕТ реальные
// события фокуса вкладок непрерывно (tabs.onActivated/onUpdated) и держит готовый
// ответ — здесь просто спрашиваем «какая последняя нормальная», без снимков-догадок.
// Если сайтов нет вообще (частый случай сразу после установки) — открываем Википедию
// как запасной полигон и запускаем picker после загрузки (В2б чек-листа воронки).
const FALLBACK_SITE = "https://ru.wikipedia.org/";

// Карточка называет конкретный сайт активной вкладки вместо абстрактного «a website»:
// подзаголовок «Import assets from any URL» обещал поле для ссылки, которого нет.
// Нет годной вкладки → домен не показываем, и человек заранее видит, что брать не с чего
// (сейчас в этом случае молча открывается FALLBACK_SITE).
// Узлы ищем внутри функции, а не из внешних const — привычка с тех пор, когда кнопка
// пересобиралась через innerHTML. Сейчас DOM кнопки не пересоздаётся (см. setPickerVisual),
// но поиск по месту безопаснее и ничего не стоит.
async function paintActiveSite() {
  try {
    const tab = await chrome.runtime.sendMessage({ cmd: "get-last-site-tab" });
    const host = document.getElementById("webHost");
    const fav = document.getElementById("webFavicon");
    const globe = document.getElementById("webGlobe");
    if (!host) return;
    if (!tab || !tab.host) return;
    // домен/фавиконка — живой индикатор активной вкладки, обновляем ВСЕГДА (даже
    // в режиме selecting/selected), иначе после перехода на другой сайт кнопка
    // продолжает показывать прежний домен до переотжатия
    host.textContent = tab.host;
    host.hidden = false;
    if (tab.favIconUrl && fav && globe) {
      fav.onload = () => { fav.hidden = false; globe.hidden = true; };
      fav.onerror = () => { fav.hidden = true; globe.hidden = false; };
      fav.src = tab.favIconUrl; // глобус держится, пока картинка не подтвердит загрузку
    } else if (fav && globe) {
      // у новой вкладки фавиконка ещё не подгрузилась (навигация только началась) —
      // держим глобус, а не прежнюю иконку с чужого сайта
      fav.hidden = true;
      globe.hidden = false;
    }
    // заголовок/подпись — только в состоянии idle: в selecting/selected они заняты
    // текстом самого пикера (setPickerVisual), домену туда лезть не нужно
    if (pickerState === "idle") {
      // «с сайта» + «wikipedia.org» = масло масляное; с известным доменом заголовок короче
      const title = document.querySelector(".web-title");
      if (title) title.textContent = msg("pickFromSiteHost");
      const sub = document.querySelector(".web-subtitle");
      if (sub) sub.hidden = true; // домен заменяет врущий подзаголовок про «любой URL»
    }
  } catch { /* карточка работает и без домена — не критичный путь */ }
}
paintActiveSite();

// перерисовываем карточку при каждом переключении вкладки —
// background пишет lastSiteTab в session-storage, панель слушает изменения.
// Раньше здесь стоял гейт «только если pickerState === idle» — из-за него домен
// замирал на старом сайте, пока пикер активен. paintActiveSite() сам не трогает
// заголовок/подпись вне idle, так что гейт был лишним и только вредил.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes.lastSiteTab) paintActiveSite();
});

// --- кнопка выбора с сайта как тумблер: idle → selecting → selected ---
// Текст меняем ТОЛЬКО внутри .web-title/.web-subtitle. Раньше на клике стоял
// pickFromSiteBtn.textContent = ... — он сносил #webFavicon/#webGlobe/#webHost и
// требовал восстановления из снимка innerHTML; фавиконка сайта при этом мигала.
function setPickerVisual(state) {
  pickFromSiteBtn.classList.toggle("is-selecting", state === "selecting");
  pickFromSiteBtn.classList.toggle("is-selected", state === "selected");
  pickFromSiteBtn.setAttribute("aria-pressed", state === "selecting" ? "true" : "false");
  const title = pickFromSiteBtn.querySelector(".web-title");
  const sub = pickFromSiteBtn.querySelector(".web-subtitle");
  if (state === "selecting") {
    if (title) title.textContent = msg("pickerSelectingTitle");
    if (sub) { sub.textContent = msg("pickerSelectingHint"); sub.hidden = false; }
    pickFromSiteBtn.setAttribute("aria-label", msg("pickerSelectingHint"));
  } else if (state === "selected") {
    if (title) title.textContent = msg("pickerSelectedTitle");
    if (sub) { sub.textContent = msg("pickerSelectedHint"); sub.hidden = false; }
    pickFromSiteBtn.setAttribute("aria-label", msg("pickerSelectedHint"));
  } else {
    if (title) title.textContent = msg("pickFromSite");
    if (sub) sub.textContent = msg("pickFromSiteSub");
    pickFromSiteBtn.removeAttribute("aria-label");
    paintActiveSite(); // вернуть домен и подпись по активной вкладке
  }
}

function waitTabComplete(tabId, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpd);
      reject(new Error(msg("pageLoadFail")));
    }, timeoutMs);
    function onUpd(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpd);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(onUpd);
  });
}

pickFromSiteBtn.addEventListener("click", async (e) => {
  // критично: остановить всплытие ДО мутации ниже. Клик обычно попадает на внутренний
  // svg/текст кнопки (это e.target) — следующая строка заменяет textContent и УНИЧТОЖАЕТ
  // этот дочерний узел. Событие в этот момент ещё всплывает к #stage, где стоит проверка
  // pickFromSiteBtn.contains(e.target) — с оторванным (удалённым) e.target она вернёт
  // false, и #stage откроет системный диалог выбора файла вместо picker'а на сайте.
  e.stopPropagation();
  // повторный клик в режиме выбора = отмена (тумблер), а не второй запуск пикера
  if (pickerState === "selecting") { stopPicker(); return; }
  clearTimeout(selectedTimer); // клик из «selected» запускает новый выбор раньше авто-отжатия
  pickerState = "selecting";
  setPickerVisual("selecting");
  pickFromSiteBtn.disabled = true;
  try {
    const tracked = await chrome.runtime.sendMessage({ cmd: "get-last-site-tab" });
    let target = tracked;

    if (!target) {
      // запасной полигон: реальный нейтральный сайт с картинками, не ошибка-тупик
      lpTrack("action_step", { step: "picker_fallback", entry: "editor_btn", reason: "no_site_tab" }); // В2б: причина, не просто факт
      target = await chrome.tabs.create({ url: FALLBACK_SITE, active: true });
      await waitTabComplete(target.id, 15000);
    }

    pickerTabId = target.id; // локально — только для UI-логики этой панели/вкладки
    await new Promise((r) => setTimeout(r, 400)); // мост должен успеть прочитаться
    // режим включаем в background: он персистентный (chrome.storage.session) и
    // САМ дотащит picker.js до любой вкладки, куда пользователь перейдёт дальше —
    // без этого пикер жил только в первой вкладке и гас при переключении/навигации
    const ok = await chrome.runtime.sendMessage({ cmd: "start-picker", tabId: target.id });
    if (!ok) throw new Error(msg("pageLoadFail"));
    await chrome.tabs.update(target.id, { active: true });
    lpTrack("action_started", { entry: "editor_btn" }); // В2: пикер реально запущен
  } catch (e) {
    console.error("[image-converter] pick-from-site failed:", e);
    lpTrack("action_step", { step: "picker_fail", entry: "editor_btn" });
    setStatus(msg("openSiteFail", [e.message]), true);
    pickerState = "idle"; // пикер не поднялся — кнопка не должна остаться нажатой
    pickerTabId = null;
    setPickerVisual("idle");
  } finally {
    pickFromSiteBtn.disabled = false;
  }
});

// отмена режима выбора: гасим оверлей ВЕЗДЕ (background помнит все вкладки,
// куда режим успел доехать), кнопку возвращаем в исходный вид
function stopPicker() {
  if (pickerState !== "selecting") return;
  chrome.runtime.sendMessage({ cmd: "stop-picker" }).catch(() => {});
  pickerState = "idle";
  pickerTabId = null;
  setPickerVisual("idle");
}

// восстановление после (пере)открытия панели/вкладки редактора: Chrome выгружает
// документ панели при переключении вкладки (см. комментарий про ic-panel в
// background.js), поэтому pickerState в module-scope переменной не переживает
// возврат — спрашиваем у background, жив ли персистентный режим, и красим кнопку
// «нажатой», а не даём ей молча показать idle, пока оверлей всё ещё висит на сайте.
(async () => {
  try {
    const active = await chrome.runtime.sendMessage({ cmd: "get-picker-mode" });
    if (active && pickerState === "idle") { pickerState = "selecting"; setPickerVisual("selecting"); }
  } catch { /* best-effort */ }
})();

// Esc отжимает кнопку. Слушатель отдельный, чтобы не мешать Esc в шаринг-попапе выше.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && pickerState === "selecting") stopPicker();
});

// Esc нажали на самом сайте (picker.js → background → сюда) — кнопка тоже отжимается
chrome.runtime.onMessage.addListener((m) => {
  if (m && m.cmd === "picker-cancelled" && pickerState === "selecting") {
    pickerState = "idle";
    pickerTabId = null;
    setPickerVisual("idle");
  }
});


// картинка, выбранная на странице через picker.js → background.js → сюда.
// Во вкладке id приезжает в hash (background переиспользует вкладку), в боковой
// панели hash недоступен (path панели задаёт манифест) — там id спрашиваем у SW.
async function loadFromBackground(explicitId) {
  const id = explicitId || location.hash.slice(1);
  if (!id) return;
  const entry = await chrome.runtime.sendMessage({ cmd: "editor-pull", id });
  if (!entry) return;
  const bytes = Uint8Array.from(atob(entry.b64), (c) => c.charCodeAt(0));
  // File, а не Blob: имя из URL нужно isHeic/isSvg, когда сервер отдал картинку
  // без content-type (entry.type пустой) — иначе HEIC уходит в createImageBitmap и падает
  const blob = entry.name
    ? new File([bytes], entry.name, { type: entry.type })
    : new Blob([bytes], { type: entry.type });
  // картинка реально доехала со страницы — кнопка на миг показывает «выбрано» и
  // сама отжимается в idle как уведомление. Без привязки к pickerState === "selecting":
  // основной путь (иконка/шорткат/контекст-меню открывают панель заново, минуя клик
  // по этой кнопке) приходит уже с pickerState === "idle" — раньше таймер из-за этого
  // не стартовал вообще, кнопка молча зависала «выбрано» без клика для сброса.
  pickerState = "selected";
  setPickerVisual("selected");
  clearTimeout(selectedTimer);
  selectedTimer = setTimeout(() => {
    if (pickerState === "selected") { pickerState = "idle"; setPickerVisual("idle"); }
  }, 1200);
  pickerTabId = null;
  await loadFile(blob, "page");
}
// в панели hash пустой: id картинки, выбранной до старта панели, забираем у SW
(async () => {
  const id = inSidePanel ? await chrome.runtime.sendMessage({ cmd: "panel-pending" }) : null;
  await loadFromBackground(id);
})().catch((e) => setStatus(msg("fromPageFail", [e.message]), true));
// background переиспользует эту вкладку при повторном выборе — ловим смену hash
window.addEventListener("hashchange", () => {
  loadFromBackground().catch((e) => setStatus(msg("fromPageFail", [e.message]), true));
});
// панель уже открыта, пользователь выбрал новую картинку на странице — SW присылает id
chrome.runtime.onMessage.addListener((m) => {
  if (m.cmd !== "panel-image" || !inSidePanel) return;
  loadFromBackground(m.id).catch((e) => setStatus(msg("fromPageFail", [e.message]), true));
});

// --- выбор формата, качества, размера иконки ---

function updateFormatUI() {
  if (batch.length > 1) { updateBatchUI(); return; } // в батче формат один — PDF
  formatChips.forEach((chip) => {
    const active = chip.dataset.format === currentFormat;
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-checked", active ? "true" : "false");
  });
  // ровно один блок в этом месте разметки: качество — только JPG/WEBP,
  // размер иконки — только ICO, пояснение про lossless — только PNG,
  // для PDF пока просто пусто. display:none, не dimmed — раньше неактивный
  // слайдер оставался видимым (просто потухшим) и мешал новому блоку под ним
  qualityBlock.style.display =
    (
      currentFormat === "jpg"
      || currentFormat === "webp"
    )
      ? "grid"
      : "none";

  icoSizeBlock.style.display =
    currentFormat === "ico"
      ? "grid"
      : "none";

  pngNoteBlock.style.display =
    currentFormat === "png"
      ? "flex"
      : "none";

  pdfNoteBlock.style.display =
    currentFormat === "pdf"
      ? "flex"
      : "none";

  updateOutputMeta();
  dlLabel.textContent = msg("downloadFmt", [FORMAT_LABELS[currentFormat]]);
  // плавная смена объяснения формата (живой отклик, не мгновенная подмена)
  formatInfo.classList.add("fade");
  setTimeout(() => {
    // JPG/PDF заливают прозрачность белым (flattenOnWhite) — честно предупредить;
    // ICO сохраняет альфу (PNG внутри ICO), для него предупреждение не нужно
    const killsAlpha = hasImage && lastAlpha && (currentFormat === "jpg" || currentFormat === "pdf");
    formatInfo.textContent = FORMAT_INFO[currentFormat] + (killsAlpha ? " " + msg("alphaWarnFlatten") : "");
    formatInfo.classList.remove("fade");
  }, 120);
  updateEstimate();
  schedulePreviewFit();
}

formatChips.forEach((chip) => chip.addEventListener("click", () => {
  lpTrack("action_step", { step: "format_change", from: currentFormat, to: chip.dataset.format }); // ручная смена = авто-рекомендация не попала
  currentFormat = chip.dataset.format;
  updateFormatUI();
}));
qualityEl.addEventListener("input", () => {
  qualityVal.textContent = qualityEl.value + "%";
  updateEstimate();
});
icoSizeBtns.forEach((btn) => btn.addEventListener("click", () => {
  currentIcoSize = Number(btn.dataset.size);

  icoSizeBtns.forEach((b) => {
    b.classList.toggle("active", b === btn);
  });

  updateOutputMeta();
}));

// ожидаемый размер результата в кнопке — считается по-настоящему (toBlob быстрый);
// для PDF/ICO не считаем (дороже и вводит в заблуждение из-за обвязки формата)
function updateEstimate() {
  if (!hasImage) {
    dlSize.textContent = "";
    metaOutputSize.textContent = "";
    return;
  }

  if (
    !["png", "jpg", "webp"]
      .includes(currentFormat)
  ) {
    dlSize.textContent = "";
    metaOutputSize.textContent = "—";
    return;
  }

  const token = ++estimateToken;

  const mime =
    currentFormat === "png"
      ? "image/png"
      : currentFormat === "jpg"
        ? "image/jpeg"
        : "image/webp";

  const source =
    currentFormat === "jpg"
      ? flattenOnWhite()
      : canvas;

  dlSize.classList.add("fade");

  source.toBlob(
    (blob) => {
      if (
        token !== estimateToken
        || !blob
      ) {
        return;
      }

      const size =
        "≈ " + humanSize(blob.size);

      dlSize.textContent = size;
      metaOutputSize.textContent = size;

      dlSize.classList.remove("fade");
    },
    mime,
    Number(qualityEl.value) / 100,
  );
}

// --- скачивание ---

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// PNG/WEBP умеют прозрачность, JPG/PDF/ICO — нет, поэтому рисуем на белой подложке.
function flattenOnWhite() {
  const flat = Object.assign(document.createElement("canvas"), { width: canvas.width, height: canvas.height });
  const fctx = flat.getContext("2d");
  fctx.fillStyle = "#ffffff";
  fctx.fillRect(0, 0, flat.width, flat.height);
  fctx.drawImage(canvas, 0, 0);
  return flat;
}

function buttonState(state) {
  downloadBtn.classList.remove(
    "success",
    "error",
  );

  downloadBtn.disabled = false;

  if (state === "loading") {
    downloadBtn.disabled = true;
    dlLabel.textContent = msg("converting");
    dlSize.textContent = "";
  } else if (state === "success") {
    downloadBtn.disabled = true;
    downloadBtn.classList.add("success");
    dlLabel.textContent = msg("downloadedOk");
    dlSize.textContent = "";
  } else if (state === "error") {
    downloadBtn.classList.add("error");
    dlLabel.textContent = msg("errorRetry");
  } else if (batch.length > 1) {
    dlLabel.textContent = msg(
      "downloadPdfPages",
      [String(batch.length)],
    );
  } else {
    dlLabel.textContent = msg(
      "downloadFmt",
      [FORMAT_LABELS[currentFormat]],
    );

    updateEstimate();
  }
}

async function convertAndDownload() {
  const format = currentFormat;
  const quality = Number(qualityEl.value) / 100;
  const finish = (blob, filename) => {
    lastResult = { blob, filename };
    triggerDownload(blob, filename);
    // Quick Convert в контекст-меню запомнит последний формат
    chrome.runtime.sendMessage({ cmd: "format-used", format }).catch?.(() => {});
  };

  // батч: страницы декодируются по одной ленивыми функциями (см. pdf-build.js) —
  // в памяти одновременно живёт один кадр, а не все 30
  if (batch.length > 1) {
    const frames = batch.map((item, i) => async () => {
      setStatus(msg("batchPage", [String(i + 1), String(batch.length)]));
      const bmp = await decodeToBitmap(item.file);
      const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
      c.getContext("2d").drawImage(bmp, 0, 0, w, h);
      bmp.close?.();
      return c;
    });
    const { blob } = await buildPdf(frames, quality);
    finish(blob, "images.pdf");
    return;
  }

  if (format === "png" || format === "webp") {
    const mime = format === "png" ? "image/png" : "image/webp";
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
    finish(blob, `image.${format}`);
    return;
  }

  if (format === "jpg") {
    const blob = await new Promise((resolve) => flattenOnWhite().toBlob(resolve, "image/jpeg", quality));
    finish(blob, "image.jpg");
    return;
  }

  if (format === "pdf") {
    // кодек внутри PDF выбирает pdf-build по самой картинке (фото → JPEG, графика → PNG)
    const { blob } = await buildPdf([canvas], quality);
    finish(blob, "image.pdf");
    return;
  }

  if (format === "ico") {
    // выбранный размер = максимум; в файл идёт лестница до него (favicon-кейс)
    const { blob } = await buildIco(canvas, currentIcoSize);
    finish(blob, "image.ico");
    return;
  }
}

// прогрессивное раскрытие: после 1/2/3-й успешной конвертации — по одной подсказке,
// не грузим всеми возможностями сразу (welcome-мастер уже показал полный набор)
const tipLine = document.getElementById("tipLine");
const PROGRESSIVE_TIPS = {
  2: msg("tipRightClick"),
  3: msg("tipShortcut"),
};

// Напоминание о закрепе: логика перенесена из Summarizer.
// Ключевое правило — при первом открытии панели ничего не показываем. Право на показ
// появляется только после первого реально успешного скачивания/конвертации.
const pinOverlay = document.getElementById("pinOverlay");
let pinPromptWasShown = false;
let pinPromptTimer = null;
let pinCompletedTracked = false;
let lastHandledPinOpenToken = "";
let lastHandledPinClosedAt = 0;

function hidePinPrompt() {
  clearTimeout(pinPromptTimer);
  pinPromptTimer = null;
  if (pinOverlay) pinOverlay.hidden = true;
}

async function syncPinPrompt() {
  if (!inSidePanel || !pinOverlay || pinPromptWasShown) return false;
  try {
    const eligibleStore = await chrome.storage.local.get(PIN_ELIGIBLE_KEY);
    if (eligibleStore[PIN_ELIGIBLE_KEY] !== true) {
      pinOverlay.hidden = true;
      return false;
    }

    const { isOnToolbar } = await chrome.action.getUserSettings();
    if (isOnToolbar === true) {
      pinOverlay.hidden = true;
      return false;
    }

    pinPromptWasShown = true;
    pinOverlay.hidden = false;
    lpTrack("pin_prompt_shown", { source: "side_panel" });
    return true;
  } catch (error) {
    console.error("[image-converter] pin state check failed:", error);
    return false;
  }
}

async function markPinEligibleAfterFirstSuccess() {
  if (!inSidePanel) return;
  let alreadyEligible = false;
  try {
    const store = await chrome.storage.local.get(PIN_ELIGIBLE_KEY);
    alreadyEligible = store[PIN_ELIGIBLE_KEY] === true;
    if (!alreadyEligible) await chrome.storage.local.set({ [PIN_ELIGIBLE_KEY]: true });
  } catch { return; }

  if (!alreadyEligible && !pinPromptWasShown) {
    clearTimeout(pinPromptTimer);
    // После первого успеха ждём, пока нативная Chrome-плашка скачивания уйдёт из угла.
    pinPromptTimer = setTimeout(() => { syncPinPrompt().catch(() => {}); }, PIN_FIRST_DELAY_MS);
  }
}

async function handlePanelOpenedForPin(token) {
  if (!inSidePanel || !token || token === lastHandledPinOpenToken) return;
  lastHandledPinOpenToken = token;
  pinPromptWasShown = false;
  hidePinPrompt();

  let eligible = false;
  try {
    const store = await chrome.storage.local.get(PIN_ELIGIBLE_KEY);
    eligible = store[PIN_ELIGIBLE_KEY] === true;
  } catch { return; }
  if (!eligible) return;

  clearTimeout(pinPromptTimer);
  pinPromptTimer = setTimeout(() => { syncPinPrompt().catch(() => {}); }, PIN_REPEAT_DELAY_MS);
}

async function recoverPinSessionFromLifecycle() {
  if (!inSidePanel || !chrome.storage?.session) return;
  try {
    const store = await chrome.storage.session.get([PIN_PANEL_OPEN_TOKEN_KEY, PIN_PANEL_CLOSED_AT_KEY]);
    const token = store[PIN_PANEL_OPEN_TOKEN_KEY];
    const closedAt = Number(store[PIN_PANEL_CLOSED_AT_KEY]) || 0;

    // Если закрытие уже зафиксировано, а новый onOpened потерялся/состязался, сам
    // видимый документ панели доказывает новое открытие — создаём локальный токен.
    if (closedAt > lastHandledPinClosedAt && closedAt > 0 && token === lastHandledPinOpenToken) {
      lastHandledPinClosedAt = closedAt;
      await handlePanelOpenedForPin(`visible-after-close-${closedAt}-${Date.now()}`);
      return;
    }
    if (closedAt > lastHandledPinClosedAt) lastHandledPinClosedAt = closedAt;
    if (token) await handlePanelOpenedForPin(token);
  } catch { /* lifecycle recovery is best effort */ }
}

function dismissPinPrompt() {
  hidePinPrompt();
  lpTrack("pin_prompt_dismissed", { source: "side_panel" });
}

document.getElementById("pinGotIt").addEventListener("click", dismissPinPrompt);
pinOverlay.addEventListener("click", (e) => {
  if (e.target === pinOverlay) dismissPinPrompt();
});

chrome.action.onUserSettingsChanged?.addListener(({ isOnToolbar }) => {
  if (isOnToolbar !== true) return;
  hidePinPrompt();
  if (!pinCompletedTracked) {
    pinCompletedTracked = true;
    lpTrack("pin_completed", { source: "side_panel_prompt" });
  }
});

chrome.runtime.onMessage.addListener((m) => {
  if (!inSidePanel || !m) return;
  if (m.cmd === "pin-panel-opened" && m.token) handlePanelOpenedForPin(m.token).catch(() => {});
  if (m.cmd === "pin-panel-closed" && m.closedAt) {
    lastHandledPinClosedAt = Math.max(lastHandledPinClosedAt, Number(m.closedAt) || 0);
    hidePinPrompt();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (!inSidePanel || areaName !== "session") return;
  if (changes[PIN_PANEL_OPEN_TOKEN_KEY]?.newValue) {
    handlePanelOpenedForPin(changes[PIN_PANEL_OPEN_TOKEN_KEY].newValue).catch(() => {});
  }
  if (changes[PIN_PANEL_CLOSED_AT_KEY]?.newValue) {
    lastHandledPinClosedAt = Number(changes[PIN_PANEL_CLOSED_AT_KEY].newValue) || lastHandledPinClosedAt;
    hidePinPrompt();
  }
});

window.addEventListener("focus", () => {
  if (!document.hidden) recoverPinSessionFromLifecycle().catch(() => {});
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) recoverPinSessionFromLifecycle().catch(() => {});
});

if (inSidePanel && chrome.storage?.session) {
  recoverPinSessionFromLifecycle().catch(() => {});
}

// единственное место, где convCount читается И пишется — источник истины для
// прогрессивных подсказок И для порога feedback-карточки (ТЗ-01 п.1: счётчик сохранить)
async function showProgressiveTip() {
  try {
    const { convCount = 0 } = await chrome.storage.local.get("convCount");
    const next = convCount + 1;
    await chrome.storage.local.set({ convCount: next });
    if (next > 1) {
      tipLine.textContent = PROGRESSIVE_TIPS[next] || "";
    }
    return next;
  } catch {
    return 0; // подсказка — не критичный путь
  }
}

downloadBtn.addEventListener("click", async () => {
  if (!hasImage) return;
  buttonState("loading");
  setStatus("");
  const t0 = performance.now();
  try {
    const pages = batch.length > 1 ? batch.length : 1;
    await convertAndDownload();
    buttonState("success");
    lpTrack("action_completed", { feature: "convert", format: currentFormat, pages, dur: Math.round(performance.now() - t0) });
    setStatus(msg("downloadedFile", [pages > 1 ? "images.pdf" : "image." + currentFormat]));
    markPinEligibleAfterFirstSuccess().catch(() => {});
    const successCount = await showProgressiveTip(); // единственный источник счётчика (В5 + порог feedback)
    if (successCount === 1) {
      lpTrack("first_conversion_completed", {
        source: inSidePanel ? "side_panel" : "full_editor",
        format: currentFormat,
      });
    }
    const decision = await lpFeedbackOnSuccess(successCount);
    if (decision) {
      lpFeedbackRenderCard(
        lpFeedbackMount,
        decision,
      );

      localizeFeedbackCard(
        lpFeedbackMount,
        decision.count,
      );
    }

    postDownloadResetTimer =
      setTimeout(
        resetToEmpty,
        950,
      );
  } catch (e) {
    console.error("[image-converter] convert failed:", e);
    lpTrack("error", { code: lpErrCode(e), stage: "action", format: currentFormat });
    buttonState("error");
    setStatus(msg("convertError", [e.message]), true);
  }
});

updateFormatUI();
