import "./model-page.mjs";

const frameState = new WeakMap();

const documentObjectIds = new Set(["01", "05", "05A", "05B", "05C", "07"]);
const liveTargetSelectors = Object.freeze(["#prototype", "#comparison", "#study", "#studies"]);

const returnControls = Object.freeze([
  Object.freeze({ selector: "#collapse-all", text: "← 返回分類", ariaLabel: "返回分類" }),
  Object.freeze({ selector: "#spread-overview", text: "← 返回分類", ariaLabel: "返回分類" }),
  Object.freeze({ selector: "#ribbon-overview", text: "← 返回菜單", ariaLabel: "返回菜單" }),
]);

const quietLiveRegionSelectors = Object.freeze([
  ".atlas-hint",
  ".spread-location",
  ".ribbon-location",
  ".matrix-location",
  ".paper-location",
  ".depth-toolbar__status",
]);

const controlLanguageSelectors = Object.freeze([
  "button[aria-label]",
  "summary[aria-label]",
  "[role=button][aria-label]",
  ".spread-toolbar[aria-label]",
  ".ribbon-scale-bar[aria-label]",
  ".fisheye-lens-switch[aria-label]",
  ".paper-toolbar[aria-label]",
  ".depth-toolbar[aria-label]",
]);

const outerHumanizationCss = `
  iframe.model-live-frame[data-model-live-document-flow="true"] {
    height: var(--model-live-document-height) !important;
  }
`;

const humanizationCss = `
  .phone-status {
    display: none !important;
  }

  .multiscale-screen > header,
  .spread-restaurant,
  .ribbon-restaurant,
  .fisheye-restaurant,
  .matrix-restaurant,
  .paper-restaurant,
  .depth-restaurant,
  .projection-restaurant,
  .parallax-restaurant {
    display: none !important;
  }

  .atlas-hint,
  .spread-hint,
  .ribbon-hint,
  .fisheye-hint,
  .matrix-hint,
  .paper-hint,
  .depth-hint,
  .projection-hint,
  .parallax-hint {
    display: none !important;
  }

  html.model-live-document,
  html.model-live-document body {
    overflow-y: hidden !important;
    touch-action: pan-x !important;
  }

  html.model-live-document .atlas-phone {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }

  html.model-live-document .atlas-root,
  html.model-live-document .atlas-layout {
    min-height: 0 !important;
    flex: 0 0 auto !important;
    overflow: visible !important;
  }

  html.model-live-document .atlas-scroll {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow-y: visible !important;
    overscroll-behavior: auto !important;
  }

  [data-model-live-presentation="landscape-continuous"] .paper-phone {
    position: relative !important;
    padding-top: 3.15rem !important;
  }

  [data-model-live-presentation="landscape-continuous"] .paper-toolbar {
    position: absolute !important;
    inset: 0 0 auto 0 !important;
    top: 0 !important;
    right: 0 !important;
    display: grid !important;
    grid-template-areas: "previous location next" !important;
    grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem !important;
    grid-auto-flow: initial !important;
    grid-auto-columns: initial !important;
    width: 100% !important;
    min-height: 3.15rem !important;
    margin: 0 !important;
    padding: .45rem .55rem !important;
    gap: .35rem !important;
    border: 0 !important;
    border-bottom: 1px solid var(--line) !important;
    border-radius: 0 !important;
    background: var(--surface-strong) !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
  }

  [data-model-live-presentation="landscape-continuous"] #proportional-viewport {
    scroll-snap-type: none !important;
  }

  [data-model-live-presentation="landscape-continuous"] #proportional-previous {
    grid-area: previous !important;
  }

  [data-model-live-presentation="landscape-continuous"] #proportional-next {
    grid-area: next !important;
  }

  [data-model-live-presentation="landscape-continuous"] .paper-location {
    grid-area: location !important;
    display: flex !important;
    min-width: 0 !important;
    align-items: center !important;
    justify-content: center !important;
    gap: .35rem !important;
    text-align: center !important;
  }

  [data-model-live-presentation="landscape-continuous"] .paper-location strong,
  [data-model-live-presentation="landscape-continuous"] .paper-location span {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  [data-model-live-presentation="landscape-continuous"] .paper-location strong {
    min-width: 0 !important;
    font-size: .72rem !important;
  }

  [data-model-live-presentation="landscape-continuous"] .paper-location span {
    flex: 0 0 auto !important;
    font-size: .68rem !important;
    color: var(--muted) !important;
  }
`;

const ensureOuterHumanizationStyle = () => {
  let style = document.querySelector("#model-live-outer-humanization-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "model-live-outer-humanization-style";
    document.head.append(style);
  }
  if (style.textContent !== outerHumanizationCss) style.textContent = outerHumanizationCss;
};

const surfaceRootFor = (frame) =>
  frame.closest(".model-pooled-surface, [data-object-id]");

const objectIdFor = (frame) =>
  surfaceRootFor(frame)?.dataset.objectId ?? null;

const liveTargetFor = (frame, documentRoot) => {
  const root = surfaceRootFor(frame);
  const recordedSelector = root?.dataset.liveRoot;
  if (recordedSelector) {
    const recordedTarget = documentRoot.querySelector(recordedSelector);
    if (recordedTarget) return recordedTarget;
  }
  for (const selector of liveTargetSelectors) {
    const target = documentRoot.querySelector(selector);
    if (target) return target;
  }
  return null;
};

const setText = (element, text) => {
  if (element && element.textContent?.trim() !== text) element.textContent = text;
};

const setAttribute = (element, name, value) => {
  if (element && element.getAttribute(name) !== value) element.setAttribute(name, value);
};

const setPixelHeight = (element, property, height) => {
  if (!element) return;
  const current = Number.parseFloat(element.style.getPropertyValue(property));
  if (!Number.isFinite(current) || Math.abs(current - height) > .5) {
    element.style.setProperty(property, `${height}px`);
  }
};

const restoreFixedStage = (frame, documentRoot) => {
  const root = surfaceRootFor(frame);
  root?.dataset && (root.dataset.liveLayout = "fixed");
  documentRoot.documentElement.classList.remove("model-live-document");
  frame.setAttribute("scrolling", "auto");
  frame.style.removeProperty("--model-live-document-height");

  if (frame.dataset.modelLiveDocumentFlow !== "true") return;
  delete frame.dataset.modelLiveDocumentFlow;
  delete root?.dataset.liveNaturalHeight;
  delete root?.dataset.liveDocumentContentHeight;
  delete root?.dataset.liveDocumentOverflow;

  const stageHeight = Number(root?.dataset.liveStageHeight);
  if (!Number.isFinite(stageHeight) || stageHeight <= 0) return;
  const shell = frame.closest(".model-live-surface");
  const fallback = shell?.querySelector(".model-live-fallback");
  setPixelHeight(frame, "height", stageHeight);
  setPixelHeight(shell, "height", stageHeight);
  setPixelHeight(shell, "min-height", stageHeight);
  setPixelHeight(fallback, "height", stageHeight);
  if (root) {
    root.dataset.liveHeight = String(stageHeight);
    root.dataset.liveOverflow = String(Number(root.dataset.liveContentHeight) > stageHeight);
  }
};

const syncDocumentFlow = (frame, documentRoot, objectId) => {
  if (!documentObjectIds.has(objectId)) {
    restoreFixedStage(frame, documentRoot);
    return;
  }

  const root = surfaceRootFor(frame);
  const shell = frame.closest(".model-live-surface");
  const fallback = shell?.querySelector(".model-live-fallback");
  const target = liveTargetFor(frame, documentRoot);
  if (!root || !shell || !target) return;

  documentRoot.documentElement.classList.add("model-live-document");
  frame.dataset.modelLiveDocumentFlow = "true";
  frame.setAttribute("scrolling", "no");

  const borderHeight = Math.max(2, Math.ceil(frame.offsetHeight - frame.clientHeight));
  const targetHeight = Math.max(
    target.scrollHeight,
    Math.ceil(target.getBoundingClientRect().height),
  );
  const naturalHeight = Math.max(1, targetHeight + borderHeight);
  const stageHeight = Number(root.dataset.liveStageHeight);

  if (Number.isFinite(stageHeight) && stageHeight > 0) {
    setPixelHeight(frame, "height", stageHeight);
  }
  frame.style.setProperty("--model-live-document-height", `${naturalHeight}px`);
  setPixelHeight(shell, "height", naturalHeight);
  setPixelHeight(shell, "min-height", naturalHeight);
  setPixelHeight(fallback, "height", naturalHeight);

  root.dataset.liveLayout = "document";
  root.dataset.liveHeight = String(naturalHeight);
  root.dataset.liveNaturalHeight = String(naturalHeight);
  root.dataset.liveDocumentContentHeight = String(targetHeight);
  root.dataset.liveDocumentOverflow = "false";
};

const documentScrollKeyDelta = (event, parentView) => {
  switch (event.key) {
    case "ArrowDown": return 48;
    case "ArrowUp": return -48;
    case "PageDown": return Math.max(240, Math.round(parentView.innerHeight * .82));
    case "PageUp": return -Math.max(240, Math.round(parentView.innerHeight * .82));
    case " ": return (event.shiftKey ? -1 : 1)
      * Math.max(240, Math.round(parentView.innerHeight * .82));
    default: return 0;
  }
};

const installDocumentInputForwarding = (frame, documentRoot, objectId) => {
  if (!documentObjectIds.has(objectId)) return () => {};
  const parentView = frame.ownerDocument.defaultView;
  if (!parentView) return () => {};

  const scrollParentBy = (deltaY) => {
    if (!Number.isFinite(deltaY) || Math.abs(deltaY) < .5) return;
    parentView.scrollBy({ top: deltaY, left: 0, behavior: "auto" });
  };

  const onWheel = (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const unit = event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? parentView.innerHeight
        : 1;
    scrollParentBy(event.deltaY * unit);
    event.preventDefault();
  };

  let activePointerId = null;
  let lastPointerY = 0;
  const onPointerDown = (event) => {
    if (!event.isPrimary || !["touch", "pen"].includes(event.pointerType)) return;
    activePointerId = event.pointerId;
    lastPointerY = event.clientY;
    event.target?.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (event.pointerId !== activePointerId) return;
    const deltaY = lastPointerY - event.clientY;
    lastPointerY = event.clientY;
    scrollParentBy(deltaY);
    event.preventDefault();
  };
  const releasePointer = (event) => {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
  };

  const onKeyDown = (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target instanceof documentRoot.defaultView.Element
      ? event.target
      : null;
    if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
    if (event.key === " "
      && target?.closest("button, summary, a[href], [role=button], [role=link]")) return;
    const deltaY = documentScrollKeyDelta(event, parentView);
    if (!deltaY) return;
    scrollParentBy(deltaY);
    event.preventDefault();
  };

  documentRoot.addEventListener("wheel", onWheel, { passive: false, capture: true });
  documentRoot.addEventListener("pointerdown", onPointerDown, { capture: true });
  documentRoot.addEventListener("pointermove", onPointerMove, { passive: false, capture: true });
  documentRoot.addEventListener("pointerup", releasePointer, { capture: true });
  documentRoot.addEventListener("pointercancel", releasePointer, { capture: true });
  documentRoot.addEventListener("keydown", onKeyDown, { capture: true });

  return () => {
    documentRoot.removeEventListener("wheel", onWheel, { capture: true });
    documentRoot.removeEventListener("pointerdown", onPointerDown, { capture: true });
    documentRoot.removeEventListener("pointermove", onPointerMove, { capture: true });
    documentRoot.removeEventListener("pointerup", releasePointer, { capture: true });
    documentRoot.removeEventListener("pointercancel", releasePointer, { capture: true });
    documentRoot.removeEventListener("keydown", onKeyDown, { capture: true });
  };
};

const sanitizeControlLanguage = (value) => String(value ?? "")
  .replace(/，(?:聚焦這個分類|恢復原比例|恢復全覽|回到全覽|返回原比例)$/g, "")
  .replaceAll("菜單尺度與分類移動", "分類導覽")
  .replaceAll("菜單尺度與位置控制", "菜單導覽")
  .replaceAll("閱讀尺度", "閱讀導覽")
  .replaceAll("聚焦這個分類", "查看這個分類")
  .replaceAll("恢復原比例", "返回全覽")
  .replaceAll("inline detail", "料理細節");

const syncControlLanguage = (documentRoot) => {
  for (const selector of controlLanguageSelectors) {
    for (const element of documentRoot.querySelectorAll(selector)) {
      for (const name of ["aria-label", "title"]) {
        if (!element.hasAttribute(name)) continue;
        const current = element.getAttribute(name) ?? "";
        const next = sanitizeControlLanguage(current);
        if (next !== current) element.setAttribute(name, next);
      }
    }
  }
};

const syncReturnControls = (documentRoot) => {
  for (const control of returnControls) {
    const element = documentRoot.querySelector(control.selector);
    setText(element, control.text);
    setAttribute(element, "aria-label", control.ariaLabel);
  }
};

const syncQuietLiveRegions = (documentRoot, objectId) => {
  for (const selector of quietLiveRegionSelectors) {
    for (const element of documentRoot.querySelectorAll(selector)) {
      if (objectId === "18A" && element.matches(".paper-location")) {
        setAttribute(element, "aria-live", "polite");
      } else {
        setAttribute(element, "aria-live", "off");
      }
    }
  }
};

const syncProportionalLandscape = (documentRoot, objectId) => {
  if (objectId !== "18A") return;

  const previous = documentRoot.querySelector("#proportional-previous");
  const next = documentRoot.querySelector("#proportional-next");
  setAttribute(previous, "aria-label", "上一個分類欄");
  setAttribute(next, "aria-label", "下一個分類欄");

  const meta = documentRoot.querySelector("#proportional-location-meta");
  const match = meta?.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) setText(meta, `${match[1]} / ${match[2]}`);

  const viewport = documentRoot.querySelector("#proportional-viewport");
  if (viewport && viewport.dataset.modelLiveInitialPosition !== "true") {
    viewport.dataset.modelLiveInitialPosition = "true";
    documentRoot.defaultView?.requestAnimationFrame(() => {
      viewport.scrollTo({ left: 0, behavior: "auto" });
    });
  }
};

const ensureHumanizationStyle = (documentRoot) => {
  let style = documentRoot.querySelector("#model-live-humanization-style");
  if (!style) {
    style = documentRoot.createElement("style");
    style.id = "model-live-humanization-style";
    documentRoot.head.append(style);
  }
  if (style.textContent !== humanizationCss) style.textContent = humanizationCss;
};

const applyHumanization = (frame) => {
  const documentRoot = frame.contentDocument;
  if (!documentRoot?.documentElement) return;

  const previousState = frameState.get(frame);
  previousState?.observer?.disconnect();
  previousState?.contentResizeObserver?.disconnect();
  previousState?.frameResizeObserver?.disconnect();
  previousState?.cleanupInputForwarding?.();
  previousState?.cancelPendingSync?.();

  const objectId = objectIdFor(frame);
  const cleanupInputForwarding = installDocumentInputForwarding(frame, documentRoot, objectId);
  let pending = false;
  let syncRequest = null;
  let lastFrameWidth = frame.getBoundingClientRect().width;

  const sync = () => {
    pending = false;
    syncRequest = null;
    ensureHumanizationStyle(documentRoot);
    syncReturnControls(documentRoot);
    syncControlLanguage(documentRoot);
    syncQuietLiveRegions(documentRoot, objectId);
    syncProportionalLandscape(documentRoot, objectId);
    syncDocumentFlow(frame, documentRoot, objectId);
  };

  const queueSync = () => {
    if (pending) return;
    pending = true;
    const requestFrame = documentRoot.defaultView?.requestAnimationFrame;
    if (typeof requestFrame === "function") {
      syncRequest = requestFrame.call(documentRoot.defaultView, sync);
    } else {
      queueMicrotask(sync);
    }
  };

  const cancelPendingSync = () => {
    if (syncRequest !== null) {
      documentRoot.defaultView?.cancelAnimationFrame?.(syncRequest);
    }
    syncRequest = null;
    pending = false;
  };

  sync();
  const FrameMutationObserver = documentRoot.defaultView?.MutationObserver ?? MutationObserver;
  const observer = new FrameMutationObserver(queueSync);
  observer.observe(documentRoot.documentElement, {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true,
    attributeFilter: [
      "aria-label",
      "aria-live",
      "title",
      "open",
      "data-focused",
      "data-active",
      "data-mode",
      "data-scale",
      "data-lens",
    ],
  });

  let contentResizeObserver = null;
  const FrameContentResizeObserver = documentRoot.defaultView?.ResizeObserver;
  const liveTarget = liveTargetFor(frame, documentRoot);
  if (documentObjectIds.has(objectId)
    && liveTarget
    && typeof FrameContentResizeObserver === "function") {
    contentResizeObserver = new FrameContentResizeObserver(queueSync);
    contentResizeObserver.observe(liveTarget);
  }

  let frameResizeObserver = null;
  if (documentObjectIds.has(objectId) && typeof ResizeObserver === "function") {
    frameResizeObserver = new ResizeObserver(([entry]) => {
      const nextWidth = entry?.contentRect?.width ?? frame.getBoundingClientRect().width;
      if (Math.abs(nextWidth - lastFrameWidth) <= .5) return;
      lastFrameWidth = nextWidth;
      queueSync();
    });
    frameResizeObserver.observe(frame);
  }

  frameState.set(frame, {
    observer,
    contentResizeObserver,
    frameResizeObserver,
    cleanupInputForwarding,
    cancelPendingSync,
  });
};

const attachFrame = (frame) => {
  if (frame.dataset.modelLiveHumanizationAttached === "true") return;
  frame.dataset.modelLiveHumanizationAttached = "true";
  frame.addEventListener("load", () => applyHumanization(frame));
  if (frame.contentDocument?.readyState === "complete") applyHumanization(frame);
};

ensureOuterHumanizationStyle();
const board = document.querySelector("#all-live-board");
if (board) {
  board.querySelectorAll("iframe.model-live-frame").forEach(attachFrame);
  const observer = new MutationObserver(() => {
    board.querySelectorAll("iframe.model-live-frame").forEach(attachFrame);
  });
  observer.observe(board, { childList: true, subtree: true });
}
