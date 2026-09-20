// Service worker: мост picker.js → editor.html, контекст-меню «Convert to X»
// (конвертация прямо здесь, без открытия редактора) и Quick Convert с памятью формата.

import { lpInit, lpTrack } from "./lp-telemetry.js"; // ОБЩИЙ-СЛОЙ §1 — 17_СТАНДАРТ-ЛИНЕЙКИ-РАСШИРЕНИЙ.md
import { buildPdf } from "./pdf-build.js";
import { buildIco } from "./ico-build.js";

// инициализация телеметрии: убран top-level await (запрещён в SW) — вызываем при старте
let lpReady = lpInit("ic");

// классификатор ошибок конвертации в короткий технический код (не сырое сообщение —
// props телеметрии не должны нести произвольный текст, см. §1 канона)
function lpErrCode(e) {
  const m = String((e && e.message) || e || "").toLowerCase();
  if (m.includes("heic")) return "heic_decode";
  if (m.includes("svg")) return "svg_render";
  if (m.includes("unknown format")) return "unknown_format";
  return "convert_failed";
}

const isBlockedUrl = (url) => /^(chrome|chrome-extension|edge|about|devtools|view-source):|chromewebstore\.google\.com/i.test(url || "") || !/^https?:/.test(url || "");

const FAB_OPEN_WINDOWS_KEY = "icFabOpenWindowsV5";
const FAB_ENABLED_WINDOWS_KEY = "icFabEnabledWindowsV5";
const FAB_LAYOUT_WINDOWS_KEY = "icFabLayoutWindowsV5";
const FAB_ENABLED_KEY = "icFabEnabledV1";
const PIN_PANEL_OPEN_TOKEN_KEY = "icPinPanelOpenTokenV1";
const PIN_PANEL_CLOSED_AT_KEY = "icPinPanelClosedAtV1";
const PIN_PANEL_IS_OPEN_KEY = "icPinPanelIsOpenV1";
const PIN_PANEL_DOCUMENT_ID_KEY = "icPinPanelDocumentIdV1";

// --- отслеживание «последней обычной вкладки сайта» (замена хрупкому угадыванию
// по lastAccessed в момент клика — SW слушает события фокуса ПОСТОЯННО и держит
// правду, а не восстанавливает её задним числом из снимка tabs.query()) ---

// chrome.storage.session, не переменная в памяти: SW Chrome убивает через ~30с
// бездействия и обнуляет module-scope переменные — session-хранилище переживает
// перезапуск SW (живёт до закрытия браузера), не пишется на диск.
async function trackTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab && !isBlockedUrl(tab.url)) await chrome.storage.session.set({ lastSiteTab: { id: tab.id, url: tab.url } });
  } catch { /* вкладка могла закрыться между событием и get() — не критично */ }
}
chrome.tabs.onActivated.addListener((info) => trackTab(info.tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // favIconUrl приходит отдельным событием ПОСЛЕ загрузки страницы (позже, чем url) —
  // без этого условия панель ловила пустую фавиконку в момент старта навигации
  // и больше не обновляла её, т.к. changeInfo.url второй раз не срабатывает
  if ((changeInfo.url || changeInfo.favIconUrl) && tab.active) trackTab(tabId);
});

// --- персистентный режим пикера: живёт в storage.session (не в module-scope
// переменной — SW засыпает и её теряет), переживает переключение вкладок и
// навигацию. executeScript инжектит контент-скрипт один раз в одну вкладку —
// Chrome сносит его при любой полной навигации документа, поэтому здесь
// не «помним факт», а активно ДОСЫЛАЕМ picker.js туда, где сейчас находится
// пользователь, пока режим включён. Формат: { tabIds, startedAt }.
const PICKER_TIMEOUT_MS = 5 * 60 * 1000; // забытая нажатая кнопка не должна затемнять браузер вечно

async function getPickerMode() {
  const { pickerMode } = await chrome.storage.session.get("pickerMode");
  return pickerMode || null;
}
async function setPickerMode(mode) {
  if (mode) await chrome.storage.session.set({ pickerMode: mode });
  else await chrome.storage.session.remove("pickerMode");
}

async function injectPickerInto(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["src/shared/image-source-core.js", "src/picker.js"] });
    return true;
  } catch { return false; } // служебная страница/CWS — не ошибка режима
}

async function stopPickerEverywhere() {
  const mode = await getPickerMode();
  await setPickerMode(null);
  if (!mode) return;
  for (const tabId of mode.tabIds) {
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => { if (typeof window.__icStopPicker === "function") window.__icStopPicker(); },
    }).catch(() => {}); // вкладку могли закрыть — не ошибка
  }
}

// Вкладка стала активной ИЛИ у неё завершилась навигация, пока режим включён —
// (пере)инжектим пикер туда же, без повторного нажатия кнопки. Инжект не
// пропускаем по «уже инжектили раньше» — полная навигация внутри той же
// вкладки сносит прежний экземпляр, а повторный инжект в живой — безвреден
// (picker.js сам не даёт себе продублироваться через window.__imageToPsdPickerActive).
async function followPickerTo(tabId) {
  const mode = await getPickerMode();
  if (!mode) return;
  if (Date.now() - mode.startedAt > PICKER_TIMEOUT_MS) { await stopPickerEverywhere(); return; }
  let tab;
  try { tab = await chrome.tabs.get(tabId); } catch { return; }
  if (!tab || isBlockedUrl(tab.url)) return;
  if (await injectPickerInto(tabId) && !mode.tabIds.includes(tabId)) {
    mode.tabIds.push(tabId);
    await setPickerMode(mode);
  }
}
chrome.tabs.onActivated.addListener((info) => followPickerTo(info.tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) followPickerTo(tabId);
});

// подсеиваем сразу при (пере)запуске SW (топ-уровневый код исполняется при каждом
// пробуждении service worker'а) — не ждём следующего переключения вкладки вручную
(async () => {
  await lpReady; // ждём телеметрию внутри IIFE, не в глобальной области
  try {
    const tabs = await chrome.tabs.query({ active: true }); // активная вкладка КАЖДОГО окна
    const good = tabs.find((t) => !isBlockedUrl(t.url));
    if (good) await chrome.storage.session.set({ lastSiteTab: { id: good.id, url: good.url } });
  } catch { /* best-effort */ }
})();

// --- нативная боковая панель ---
// default_path в манифесте делает панель доступной на любом сайте, но она НЕ
// появляется сама по себе — Chrome показывает её только через явный open({tabId}),
// который мы вызываем по клику на иконку/FAB. Этого достаточно, чтобы панель не
// «утекала» на другие вкладки: там open() просто никто не вызывал.

// FAB зарегистрирован постоянным content script на http/https. Для вкладок,
// открытых до reload/update unpacked, sendFab() делает безопасную доинъекцию.
async function sendFab(tabId, cmd, url = "") {
  if (tabId == null || isBlockedUrl(url)) return false;
  try {
    await chrome.tabs.sendMessage(tabId, { cmd });
    return true;
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["src/panel.js"] });
      await chrome.tabs.sendMessage(tabId, { cmd });
      return true;
    } catch { return false; }
  }
}

async function readFabWindowState() {
  const store = await chrome.storage.session.get([FAB_OPEN_WINDOWS_KEY, FAB_ENABLED_WINDOWS_KEY]);
  return { open: store[FAB_OPEN_WINDOWS_KEY] || {}, enabled: store[FAB_ENABLED_WINDOWS_KEY] || {} };
}

async function readFabUserEnabled() {
  const store = await chrome.storage.local.get(FAB_ENABLED_KEY);
  return store[FAB_ENABLED_KEY] !== false;
}

async function setFabWindowState(windowId, patch) {
  if (!Number.isInteger(windowId)) return;
  const { open, enabled } = await readFabWindowState();
  if (patch.open != null) open[windowId] = !!patch.open;
  if (patch.enabled != null) enabled[windowId] = !!patch.enabled;
  await chrome.storage.session.set({ [FAB_OPEN_WINDOWS_KEY]: open, [FAB_ENABLED_WINDOWS_KEY]: enabled });
}

async function activeWebTab(windowId) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    return tab && !isBlockedUrl(tab.url) ? tab : null;
  } catch { return null; }
}

async function syncFabForWindow(windowId) {
  const tab = await activeWebTab(windowId);
  if (!tab?.id) return;
  const [{ open, enabled }, userEnabled] = await Promise.all([readFabWindowState(), readFabUserEnabled()]);
  const shouldShow = userEnabled && !!enabled[windowId] && !open[windowId];
  await sendFab(tab.id, shouldShow ? "show-fab" : "hide-fab", tab.url);
}

// ВАЖНО: sidePanel.open() обязан быть первым await в цепочке от жеста пользователя.
// Любой await перед ним (даже storage.session.set) съедает флаг «это клик
// пользователя», и Chrome тихо отклоняет вызов — вот откуда был регресс на открытие
// обычной вкладкой. Поэтому open() всегда первый, остальное — после.
async function openPanel(tabId) {
  await chrome.sidePanel.open({ tabId });
  // sidePanel.open() остаётся первым await от пользовательского жеста.
  await chrome.storage.session.set({ panelTab: tabId });
  // Пользователь снова открыл расширение — если раньше он полностью погасил
  // FAB вторым кликом по крестику (см. panel.js), это решение отменяется:
  // FAB должен снова появиться везде, значит и человек сейчас реально
  // работает с расширением.
  await chrome.storage.local.set({ [FAB_ENABLED_KEY]: true });
  try {
    const tab = await chrome.tabs.get(tabId);
    await setFabWindowState(tab.windowId, { open: true, enabled: true });
    await sendFab(tabId, "hide-fab", tab.url);
  } catch { /* onOpened/fallback синхронизируют состояние */ }
}

// картинку в уже открытую панель докидываем ОТДЕЛЬНЫМ вызовом после openPanel —
// сама она не должна быть перед sidePanel.open(), см. комментарий выше
async function attachPanelImage(tabId, imageId) {
  await chrome.storage.session.set({ pendingPanelImage: imageId });
  chrome.runtime.sendMessage({ cmd: "panel-image", id: imageId }).catch(() => {});
}

// Напоминание о закрепе должно различать первое открытие, закрытие и повторное
// открытие панели даже после сна service worker. Два сигнала (официальные события
// Side Panel + runtime.connect) дедуплицируются через durable state в storage.session.
let pinLifecycleQueue = Promise.resolve();

function queuePinLifecycle(task) {
  pinLifecycleQueue = pinLifecycleQueue.then(task, task);
  return pinLifecycleQueue;
}

function notifyEditorPin(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Панель могла ещё не загрузиться. Состояние также хранится в storage.session
    // и будет восстановлено editor.js после инициализации.
  });
}

function announcePinPanelOpened(source, info = {}, documentId = null) {
  return queuePinLifecycle(async () => {
    let state = {};
    try {
      state = await chrome.storage.session.get([PIN_PANEL_IS_OPEN_KEY, PIN_PANEL_DOCUMENT_ID_KEY]);
    } catch { /* best effort */ }

    const wasOpen = state[PIN_PANEL_IS_OPEN_KEY] === true;
    const previousDocumentId = state[PIN_PANEL_DOCUMENT_ID_KEY] || "";
    const nextDocumentId = documentId || previousDocumentId || "";
    const definitelyNewDocument = !!documentId && !!previousDocumentId && documentId !== previousDocumentId;

    if (wasOpen && !definitelyNewDocument) {
      if (documentId && !previousDocumentId) {
        try { await chrome.storage.session.set({ [PIN_PANEL_DOCUMENT_ID_KEY]: documentId }); } catch { /* best effort */ }
      }
      return;
    }

    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      await chrome.storage.session.set({
        [PIN_PANEL_OPEN_TOKEN_KEY]: token,
        [PIN_PANEL_CLOSED_AT_KEY]: 0,
        [PIN_PANEL_IS_OPEN_KEY]: true,
        [PIN_PANEL_DOCUMENT_ID_KEY]: nextDocumentId,
      });
    } catch { /* best effort */ }
    notifyEditorPin({ cmd: "pin-panel-opened", token, source });
  });
}

function announcePinPanelClosed(source, documentId = null) {
  return queuePinLifecycle(async () => {
    let state = {};
    try {
      state = await chrome.storage.session.get([PIN_PANEL_IS_OPEN_KEY, PIN_PANEL_DOCUMENT_ID_KEY]);
    } catch { /* best effort */ }

    const currentDocumentId = state[PIN_PANEL_DOCUMENT_ID_KEY] || "";
    if (documentId && currentDocumentId && documentId !== currentDocumentId) return;
    if (state[PIN_PANEL_IS_OPEN_KEY] !== true && source !== "sidePanel.onClosed") return;

    const closedAt = Date.now();
    try {
      await chrome.storage.session.set({
        [PIN_PANEL_CLOSED_AT_KEY]: closedAt,
        [PIN_PANEL_IS_OPEN_KEY]: false,
        [PIN_PANEL_DOCUMENT_ID_KEY]: "",
      });
    } catch { /* best effort */ }
    notifyEditorPin({ cmd: "pin-panel-closed", closedAt, source });
  });
}

// закрытие панели крестиком Chrome перехватить нельзя, но страница панели держит
// порт к SW — обрыв порта и есть сигнал «панель закрыли»
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "ic-panel") return;
  const windowId = Number.isInteger(port.sender?.tab?.windowId) ? port.sender.tab.windowId : null;
  const documentId = typeof port.sender?.documentId === "string" ? port.sender.documentId : null;
  announcePinPanelOpened("runtime.connect", { windowId }, documentId);

  port.onDisconnect.addListener(async () => {
    // Для pin lifecycle disconnect — независимый fallback закрытия документа панели.
    announcePinPanelClosed("runtime.disconnect", documentId);

    // Существующий FAB fallback нужен только там, где официального onClosed нет.
    if (chrome.sidePanel?.onClosed) return;
    const { panelTab } = await chrome.storage.session.get("panelTab");
    if (panelTab == null) return;
    try {
      const tab = await chrome.tabs.get(panelTab);
      if (!tab || isBlockedUrl(tab.url) || !tab.active) return;
      await setFabWindowState(tab.windowId, { open: false, enabled: true });
      const userEnabled = await readFabUserEnabled();
      if (userEnabled) await sendFab(panelTab, "show-fab", tab.url);
    } catch { /* вкладка закрылась вместе с панелью */ }
  });
});

chrome.sidePanel?.onOpened?.addListener((info) => {
  announcePinPanelOpened("sidePanel.onOpened", info);
  (async () => {
    await setFabWindowState(info.windowId, { open: true, enabled: true });
    await syncFabForWindow(info.windowId);
  })().catch(() => {});
});

chrome.sidePanel?.onClosed?.addListener((info) => {
  announcePinPanelClosed("sidePanel.onClosed");
  (async () => {
    await setFabWindowState(info.windowId, { open: false, enabled: true });
    await syncFabForWindow(info.windowId);
  })().catch(() => {});
});

chrome.tabs.onActivated.addListener(({ windowId }) => {
  syncFabForWindow(windowId).catch(() => {});
});

// --- мост picker → editor ---

const pickedImages = new Map(); // id -> { b64, type }

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd === "get-fab-state") {
    (async () => {
      const windowId = sender.tab?.windowId;
      if (!Number.isInteger(windowId)) { sendResponse({ visible: false, layout: null }); return; }
      const [{ open, enabled }, userEnabled, store] = await Promise.all([
        readFabWindowState(),
        readFabUserEnabled(),
        chrome.storage.session.get(FAB_LAYOUT_WINDOWS_KEY),
      ]);
      const layouts = store[FAB_LAYOUT_WINDOWS_KEY] || {};
      sendResponse({ visible: userEnabled && !!enabled[windowId] && !open[windowId], layout: layouts[windowId] || null });
    })().catch(() => sendResponse({ visible: false, layout: null }));
    return true;
  }
  if (msg.cmd === "set-fab-layout") {
    (async () => {
      const windowId = sender.tab?.windowId;
      const layout = msg.layout;
      if (!Number.isInteger(windowId) || !layout || typeof layout !== "object") return;
      const side = layout.side === "left" ? "left" : "right";
      const tucked = !!layout.tucked;
      const topRatio = Number.isFinite(layout.topRatio) ? Math.min(1, Math.max(0, layout.topRatio)) : 0.62;
      const store = await chrome.storage.session.get(FAB_LAYOUT_WINDOWS_KEY);
      const layouts = store[FAB_LAYOUT_WINDOWS_KEY] || {};
      layouts[windowId] = { side, tucked, topRatio };
      await chrome.storage.session.set({ [FAB_LAYOUT_WINDOWS_KEY]: layouts });
    })().catch(() => {});
    return;
  }
  if (msg.cmd === "picked-image") {
    lpTrack("action_step", { step: "picker_image_chosen" }); // клик по картинке в пикере (между action_started и action_completed)
    // картинка выбрана — режим выполнил свою задачу. Сама вкладка, где кликнули,
    // уже погасила себя (picker.js вызывает cleanup() перед отправкой сюда), но
    // persistent-флаг и другие вкладки, куда он успел доехать, иначе остались бы
    // висеть и получили бы повторный инжект при следующем переключении вкладки.
    // stopPickerEverywhere() безвреден для уже-погашенной вкладки: __icStopPicker
    // там уже null, executeScript просто ничего не найдёт.
    stopPickerEverywhere().catch(() => {});
    handlePicked(msg.src, sender.tab?.id).catch((err) => console.error("[image-converter] pick failed:", err));
    return;
  }
  if (msg.cmd === "editor-pull") {
    const entry = pickedImages.get(msg.id) || null;
    pickedImages.delete(msg.id);
    sendResponse(entry);
    return true;
  }
  if (msg.cmd === "editor-push") {
    // «Открыть полный редактор» из боковой панели: кладём картинку в тот же Map,
    // новая вкладка editor.html забирает её через editor-pull по id из hash
    pickedImages.set(msg.id, { b64: msg.b64, type: msg.type, name: msg.name || "" });
    sendResponse(true);
    return true;
  }
  if (msg.cmd === "format-used") {
    // редактор сообщает последний скачанный формат — Quick Convert его запомнит
    rememberFormat(msg.format);
    return;
  }
  if (msg.cmd === "panel-pending") {
    // панель стартовала: забирает id картинки, выбранной до её появления
    (async () => {
      const { pendingPanelImage } = await chrome.storage.session.get("pendingPanelImage");
      await chrome.storage.session.remove("pendingPanelImage");
      sendResponse(pendingPanelImage || null);
    })();
    return true;
  }
  if (msg.cmd === "open-panel") {
    const tabId = sender.tab?.id;
    if (tabId == null) { sendResponse({ ok: false }); return; }
    openPanel(tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => {
        console.error("[image-converter] panel open failed:", e);
        sendResponse({ ok: false });
      });
    return true;
  }
  if (msg.cmd === "start-picker") {
    // редактор/панель просят включить персистентный режим на конкретной вкладке —
    // дальше tabs.onActivated/onUpdated сами дотащат picker.js до любой вкладки,
    // куда пользователь перейдёт, пока режим не выключен.
    (async () => {
      await setPickerMode({ tabIds: msg.tabId != null ? [msg.tabId] : [], startedAt: Date.now() });
      const ok = msg.tabId != null ? await injectPickerInto(msg.tabId) : false;
      if (!ok) await setPickerMode(null);
      sendResponse(ok);
    })();
    return true;
  }
  if (msg.cmd === "stop-picker") {
    // отмена из редактора/панели: гасим оверлей во ВСЕХ вкладках, куда режим успел
    // доехать (не только в одной) — режим персистентный и мог пережить несколько
    // переключений вкладок с момента запуска.
    stopPickerEverywhere().catch(() => {});
    return;
  }
  if (msg.cmd === "picker-cancelled") {
    // Esc нажали на сайте: гасим режим везде (не только в этой вкладке) и
    // пробрасываем страницам расширения, чтобы кнопка отжалась.
    // sender.tab есть только у контент-скрипта — гарантия, что ретрансляция не зацикливается.
    if (sender.tab) {
      stopPickerEverywhere().catch(() => {});
      chrome.runtime.sendMessage({ cmd: "picker-cancelled" }).catch(() => {});
    }
    return;
  }
  if (msg.cmd === "get-picker-mode") {
    getPickerMode().then((mode) => sendResponse(!!mode));
    return true;
  }
  if (msg.cmd === "welcome-view") {
    lpTrack("welcome_view", {
      source: "welcome_site",
      locale: typeof msg.locale === "string" ? msg.locale.slice(0, 16) : "unknown",
    });
    sendResponse({ ok: true });
    return;
  }
  if (msg.cmd === "welcome-open-panel") {
    // жест пользователя (клик по кнопке страницы) дошёл через welcome-bridge.js —
    // sidePanel.open() должен быть первым await здесь, та же причина, что у openPanel() выше.
    // windowId, не tabId: welcome-вкладка закрывается после успеха, а панель должна
    // остаться открытой в окне.
    const windowId = sender.tab?.windowId;
    const welcomeTabId = sender.tab?.id;
    if (!Number.isInteger(windowId)) {
      lpTrack("welcome_open_error", { source: "welcome_site", reason: "missing_window_id" });
      sendResponse({ ok: false, error: "missing_window_id" });
      return;
    }
    const opening = chrome.sidePanel.open({ windowId });
    lpTrack("welcome_open_click", { source: "welcome_site" });
    opening
      .then(async () => {
        // тот же сброс, что в openPanel(): открытие расширения с welcome-страницы
        // тоже отменяет ранее выставленное полное скрытие FAB
        await chrome.storage.local.set({ [FAB_ENABLED_KEY]: true }).catch(() => {});
        lpTrack("welcome_open_success", { source: "welcome_site" });
        sendResponse({ ok: true });
        if (Number.isInteger(welcomeTabId)) {
          setTimeout(() => {
            chrome.tabs.remove(welcomeTabId).catch(() => {});
          }, 500);
        }
      })
      .catch((error) => {
        console.error("[image-converter] welcome panel open failed:", error);
        lpTrack("welcome_open_error", { source: "welcome_site", reason: "side_panel_open_failed" });
        sendResponse({ ok: false, error: "side_panel_open_failed" });
      });
    return true;
  }
  if (msg.cmd === "get-last-site-tab") {
    (async () => {
      // перепроверяем, что вкладка ещё жива и не сменила url на служебный
      const { lastSiteTab } = await chrome.storage.session.get("lastSiteTab");
      if (lastSiteTab) {
        try {
          const tab = await chrome.tabs.get(lastSiteTab.id);
          // favIconUrl/host отдаём вместе с id: панель показывает на карточке
          // конкретный сайт («Взять картинку с wikipedia.org»), а не абстракцию
          if (tab && !isBlockedUrl(tab.url)) {
            let host = "";
            try { host = new URL(tab.url).hostname.replace(/^www\./, ""); } catch { /* url мог быть битым */ }
            sendResponse({ id: tab.id, url: tab.url, host, favIconUrl: tab.favIconUrl || "" });
            return;
          }
        } catch { /* закрыта */ }
      }
      sendResponse(null);
    })();
    return true;
  }
});

// имя файла из URL — нужно редактору, чтобы распознать HEIC/SVG по расширению,
// когда сервер отдал картинку без корректного content-type (blob.type пустой)
function nameFromUrl(url) {
  try {
    const p = new URL(url).pathname;
    const last = p.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last);
  } catch { return ""; }
}

async function handlePicked(src, tabId) {
  // sidePanel.open() должен быть первым await от жеста клика по картинке в пикере —
  // поэтому открываем панель ДО fetch/base64, а не после (та же причина, что и в openPanel)
  let panelOpened = false;
  if (tabId != null) {
    try {
      await openPanel(tabId);
      panelOpened = true;
    } catch { /* фолбэк на вкладку редактора ниже */ }
  }
  const resp = await fetch(src);
  const blob = await resp.blob();
  const b64 = await blobToBase64(blob);
  const id = String(Date.now());
  pickedImages.set(id, { b64, type: blob.type || "image/png", name: nameFromUrl(src) });
  if (panelOpened) {
    await attachPanelImage(tabId, id);
    return;
  }
  // переиспользуем открытую вкладку редактора (иначе при «Заменить» плодятся дубли);
  // редактор ловит hashchange и подтягивает новую картинку сам
  const editorUrl = chrome.runtime.getURL("src/editor.html");
  const existing = await chrome.tabs.query({ url: editorUrl + "*" });
  if (existing.length) {
    await chrome.tabs.update(existing[0].id, { url: editorUrl + "#" + id, active: true });
  } else {
    await chrome.tabs.create({ url: editorUrl + "#" + id });
  }
}

async function blobToBase64(blob) {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const OFFSCREEN_DOWNLOAD_PATH = "src/offscreen-download.html";
let offscreenDownloadCreating = null;

async function ensureDownloadOffscreen() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOWNLOAD_PATH);
  let exists = false;

  if (typeof chrome.runtime.getContexts === "function") {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl],
    });
    exists = contexts.length > 0;
  } else if (typeof clients !== "undefined" && clients.matchAll) {
    const matched = await clients.matchAll();
    exists = matched.some((client) => client.url === offscreenUrl);
  }

  if (exists) return;
  if (offscreenDownloadCreating) {
    await offscreenDownloadCreating;
    return;
  }

  offscreenDownloadCreating = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOWNLOAD_PATH,
    reasons: ["BLOBS"],
    justification: "Save converted images with a normal browser download without access to download history.",
  });

  try {
    await offscreenDownloadCreating;
  } finally {
    offscreenDownloadCreating = null;
  }
}

async function sendOffscreenDownload(message) {
  await ensureDownloadOffscreen();
  const response = await chrome.runtime.sendMessage({
    target: "lp-download-offscreen",
    ...message,
  });
  return response || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function closeDownloadOffscreen() {
  try {
    await chrome.offscreen.closeDocument();
  } catch {}
}

async function saveConvertedBlobOnce(blob, filename) {
  try {
    let response = null;

    try {
      response = await sendOffscreenDownload({
        type: "download-blob",
        blob,
        filename,
      });
    } catch {
      response = null;
    }

    if (response?.ok) return response;

    // Compatibility fallback for Chrome versions where extension messaging
    // does not structured-clone Blob payloads.
    const b64 = await blobToBase64(blob);
    const dataUrl = `data:${blob.type || "application/octet-stream"};base64,${b64}`;
    response = await sendOffscreenDownload({
      type: "download-data-url",
      dataUrl,
      filename,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Browser download failed");
    }
    return response;
  } finally {
    // A fresh offscreen document per completed Quick Convert avoids Chrome's
    // automatic-multiple-download throttle accumulating on one hidden page.
    await delay(300);
    await closeDownloadOffscreen();
  }
}

let saveConvertedBlobQueue = Promise.resolve();

function saveConvertedBlob(blob, filename) {
  const task = saveConvertedBlobQueue
    .catch(() => {})
    .then(() => saveConvertedBlobOnce(blob, filename));
  saveConvertedBlobQueue = task.catch(() => {});
  return task;
}

// --- первый запуск: сразу показать редактор, а не дать наткнуться на ошибку picker'а
// (сразу после установки активная вкладка — Chrome Web Store, там picker запрещён) ---

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await lpReady; // lpInit("ic") асинхронный — без ожидания lpTrack иногда успевает раньше state и молча гасится
    lpTrack("install"); // §1 воронки (версия/локаль уже в конверте события — v/l)
    // uninstall-опрос линейки (17_СТАНДАРТ §4) — без iid/PII в URL
    chrome.runtime.setUninstallURL(
      "https://layerporter.com/uninstall?product=ic&v=" + chrome.runtime.getManifest().version + "&locale=" + chrome.i18n.getUILanguage()
    );
    // единственное автоматическое открытие вкладки на инсталле — сайтовая welcome-страница;
    // на update её не показываем (этот блок только внутри reason === "install")
    chrome.tabs.create({
      url: "https://layerporter.com/picture-converter/welcome/?source=install",
      active: true,
    });
  }
  setupMenus();
});
chrome.runtime.onStartup?.addListener(() => setupMenus());

// клик по иконке расширения (popup убран в 0.6.0): нативная боковая панель — Chrome
// сам сдвигает содержимое сайта. sidePanel.open() не инжектит скрипты в страницу
// (в отличие от picker/FAB), поэтому не фильтруем tab.url заранее — пусть решает
// сам Chrome; вкладка-фолбэк — только если он реально откажет (см. openPanel выше).
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/editor.html") });
    return;
  }
  try {
    await openPanel(tab.id);
    lpTrack("action_started", { entry: "icon_panel" });
  } catch {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/editor.html") });
  }
});

// горячая клавиша (Alt+Shift+C по умолчанию): запустить picker на активной вкладке;
// на служебных страницах — открыть редактор, а не молчать
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "launch-picker") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || isBlockedUrl(tab.url)) {
    lpTrack("action_step", { step: "picker_fallback", entry: "shortcut", reason: "blocked_page" });
    chrome.tabs.create({ url: chrome.runtime.getURL("src/editor.html") });
    return;
  }
  try {
    await setPickerMode({ tabIds: [tab.id], startedAt: Date.now() });
    const ok = await injectPickerInto(tab.id);
    if (!ok) throw new Error("inject failed");
    lpTrack("action_started", { entry: "shortcut" });
  } catch {
    await setPickerMode(null);
    lpTrack("action_step", { step: "picker_fail", entry: "shortcut" });
    chrome.tabs.create({ url: chrome.runtime.getURL("src/editor.html") });
  }
});

// --- контекст-меню (правый клик по картинке) ---

const MENU_FORMATS = ["png", "jpg", "webp", "pdf", "ico"];
const FORMAT_LABELS = { png: "PNG", jpg: "JPG", webp: "WEBP", pdf: "PDF", ico: "ICO" };

async function setupMenus() {
  const store = await chrome.storage.local.get(["lastFormat", FAB_ENABLED_KEY]);
  const quick = MENU_FORMATS.includes(store.lastFormat) ? store.lastFormat : "png";
  const fabEnabled = store[FAB_ENABLED_KEY] !== false;
  chrome.contextMenus.removeAll(() => {
    // Явная пользовательская настройка FAB живёт в меню иконки расширения.
    chrome.contextMenus.create({
      id: "toggle-fab",
      title: chrome.i18n.getMessage("menuFabToggle") || "Show floating button",
      type: "checkbox",
      checked: fabEnabled,
      contexts: ["action"],
    });

    // «Convert Image», не имя продукта: иконка расширения и так видна рядом с пунктом,
    // строка заголовка должна продавать действие, а не повторять бренд
    chrome.contextMenus.create({ id: "root", title: chrome.i18n.getMessage("menuRoot"), contexts: ["image"] });
    chrome.contextMenus.create({ id: "quick", parentId: "root", title: chrome.i18n.getMessage("menuQuick", [FORMAT_LABELS[quick]]), contexts: ["image"] });
    chrome.contextMenus.create({ id: "sep", parentId: "root", type: "separator", contexts: ["image"] });
    for (const f of MENU_FORMATS) {
      chrome.contextMenus.create({ id: "convert-" + f, parentId: "root", title: chrome.i18n.getMessage("menuTo", [FORMAT_LABELS[f]]), contexts: ["image"] });
    }
  });
}

async function rememberFormat(format) {
  if (!MENU_FORMATS.includes(format)) return;
  await chrome.storage.local.set({ lastFormat: format });
  chrome.contextMenus.update("quick", { title: chrome.i18n.getMessage("menuQuick", [FORMAT_LABELS[format]]) }, () => chrome.runtime.lastError);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "toggle-fab") {
    const enabled = info.checked !== false;
    chrome.storage.local.set({ [FAB_ENABLED_KEY]: enabled }).catch(() => {});
    return;
  }
  if (!info.srcUrl) return;
  let format = null;
  if (info.menuItemId === "quick") format = null; // возьмём из storage ниже
  else if (String(info.menuItemId).startsWith("convert-")) format = String(info.menuItemId).slice(8);
  else return;

  (async () => {
    if (!format) {
      const { lastFormat } = await chrome.storage.local.get("lastFormat");
      format = MENU_FORMATS.includes(lastFormat) ? lastFormat : "png";
    }
    const t0 = Date.now();
    try {
      await convertAndDownload(info.srcUrl, format);
      lpTrack("action_completed", { feature: "convert", format, dur: Date.now() - t0 });
      rememberFormat(format);
    } catch (e) {
      console.error("[image-converter] context convert failed:", e);
      lpTrack("error", { code: lpErrCode(e), stage: "action", format });
      // фолбэк: не смогли тихо — панель с этой картинкой на той же вкладке
      handlePicked(info.srcUrl, tab?.id).catch(() => {});
    }
  })();
});

// --- конвертация в service worker (OffscreenCanvas, без DOM) ---

function isHeicLike(blob, url) {
  const t = (blob.type || "").toLowerCase();
  if (t === "image/heic" || t === "image/heif") return true;
  return /\.(heic|heif)(\?|#|$)/i.test(url || "");
}
function isSvgLike(blob, url) {
  const t = (blob.type || "").toLowerCase();
  if (t === "image/svg+xml") return true;
  return /\.svg(\?|#|$)/i.test(url || "");
}

async function decodeToCanvas(blob, srcUrl) {
  if (isSvgLike(blob, srcUrl)) {
    // в SW нет <img> — SVG честно отправляем в редактор (фолбэк выше)
    throw new Error("SVG requires editor");
  }
  let bitmap;
  if (isHeicLike(blob, srcUrl)) {
    // дефолтный экспорт — Emscripten-фабрика, HeifDecoder есть только у её результата
    const libheif = await import("./vendor/libheif-bundle.mjs").then((m) => m.default());
    const decoder = new libheif.HeifDecoder();
    const images = decoder.decode(await blob.arrayBuffer());
    if (!images.length) throw new Error("empty HEIC");
    const image = images[0];
    const w = image.get_width(), h = image.get_height();
    const c = new OffscreenCanvas(w, h);
    const cctx = c.getContext("2d");
    const imageData = cctx.createImageData(w, h);
    await new Promise((resolve, reject) => {
      image.display(imageData, (d) => (d ? resolve() : reject(new Error("HEIC decode failed"))));
    });
    cctx.putImageData(imageData, 0, 0);
    return c;
  }
  bitmap = await createImageBitmap(blob);
  const MAX_DIM = 4000;
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const c = new OffscreenCanvas(w, h);
  c.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return c;
}

function flattenOnWhiteSW(canvas) {
  const flat = new OffscreenCanvas(canvas.width, canvas.height);
  const fctx = flat.getContext("2d");
  fctx.fillStyle = "#ffffff";
  fctx.fillRect(0, 0, flat.width, flat.height);
  fctx.drawImage(canvas, 0, 0);
  return flat;
}

async function convertAndDownload(srcUrl, format) {
  const resp = await fetch(srcUrl);
  const blob = await resp.blob();
  const canvas = await decodeToCanvas(blob, srcUrl);

  let outBlob;
  if (format === "png" || format === "webp") {
    outBlob = await canvas.convertToBlob({ type: format === "png" ? "image/png" : "image/webp", quality: 0.92 });
  } else if (format === "jpg") {
    outBlob = await flattenOnWhiteSW(canvas).convertToBlob({ type: "image/jpeg", quality: 0.92 });
  } else if (format === "pdf") {
    outBlob = (await buildPdf([canvas], 0.92)).blob;
  } else if (format === "ico") {
    outBlob = (await buildIco(canvas, 256)).blob;
  } else {
    throw new Error("unknown format " + format);
  }

  await saveConvertedBlob(outBlob, "image." + format);
}
