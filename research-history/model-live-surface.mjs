import { modelLivePresentationFor } from "./catalog/model-live-presentations.mjs";

const defaultTargetSelectors = Object.freeze([
  "#prototype",
  "#comparison",
  "#study",
  "#studies",
]);

const stageHeightByViewportWidth = Object.freeze({
  320: 568,
  390: 693,
  1024: 640,
});

export const modelLiveStageHeightFor = (viewportWidth) =>
  stageHeightByViewportWidth[String(Number(viewportWidth))] ?? 640;

const nextPaint = (view) => new Promise((resolve) => {
  const request = view?.requestAnimationFrame?.bind(view) ?? requestAnimationFrame;
  request(() => request(resolve));
});

const waitForImages = async (root) => {
  const images = [...root.querySelectorAll("img")];
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => resolve();
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
      setTimeout(done, 5000);
    });
  }));
};

const findTarget = (documentRoot, selectors) => {
  for (const selector of selectors) {
    const target = documentRoot.querySelector(selector);
    if (target) return { selector, target };
  }
  return null;
};

const isolateTarget = (target) => {
  let current = target;
  while (current?.parentElement) {
    const parent = current.parentElement;
    for (const sibling of parent.children) {
      if (sibling === current || sibling.dataset.modelLiveHidden === "true") continue;
      sibling.dataset.modelLiveHidden = "true";
      sibling.style.setProperty("display", "none", "important");
    }
    if (parent === target.ownerDocument.body) break;
    current = parent;
  }
};

const ensureDocumentStyle = (documentRoot) => {
  let style = documentRoot.querySelector("#model-live-surface-style");
  if (!style) {
    style = documentRoot.createElement("style");
    style.id = "model-live-surface-style";
    documentRoot.head.append(style);
  }
  style.textContent = [
    "html, body {",
    "  margin: 0 !important;",
    "  padding: 0 !important;",
    "  background: transparent !important;",
    "  scroll-behavior: auto !important;",
    "  overscroll-behavior: contain !important;",
    "}",
    "html.model-live-ready {",
    "  overflow-x: hidden !important;",
    "  overflow-y: auto !important;",
    "  scrollbar-width: none;",
    "}",
    "html.model-live-ready::-webkit-scrollbar {",
    "  width: 0;",
    "  height: 0;",
    "}",
    "html.model-live-ready body {",
    "  overflow: visible !important;",
    "}",
  ].join("\n");
};

const ensurePresentationStyle = (documentRoot) => {
  let style = documentRoot.querySelector("#model-live-presentation-style");
  if (!style) {
    style = documentRoot.createElement("style");
    style.id = "model-live-presentation-style";
    documentRoot.head.append(style);
  }
  return style;
};

const resolvePresentationState = (state, target, source) => {
  if (state.activeSelectors?.length) {
    const active = state.activeSelectors.some((selector) =>
      target.matches(selector) || Boolean(target.querySelector(selector)));
    return active ? "focus" : "overview";
  }
  const rawValue = source?.getAttribute(state.attribute) ?? state.fallback ?? "default";
  return state.map?.[rawValue] ?? rawValue;
};

const applyPresentation = ({
  documentRoot,
  target,
  presentation,
  onStateChange,
}) => {
  const style = ensurePresentationStyle(documentRoot);
  style.textContent = presentation?.css ?? "";

  delete target.dataset.modelLivePresentation;
  delete target.dataset.modelLivePresentationState;
  if (!presentation) return { cleanup: () => {}, state: null };

  target.dataset.modelLivePresentation = presentation.id;
  if (!presentation.state) return { cleanup: () => {}, state: null };

  const source = presentation.state.selector
    ? (target.matches(presentation.state.selector)
        ? target
        : target.querySelector(presentation.state.selector))
    : target;
  let currentState = null;
  const syncState = (notify = true) => {
    const nextState = resolvePresentationState(presentation.state, target, source);
    if (nextState === currentState) return;
    currentState = nextState;
    target.dataset.modelLivePresentationState = nextState;
    if (notify) onStateChange?.(nextState);
  };
  syncState(false);

  const PresentationObserver = documentRoot.defaultView?.MutationObserver
    ?? globalThis.MutationObserver;
  const observerRoot = presentation.state.activeSelectors?.length ? target : source;
  if (!observerRoot || typeof PresentationObserver !== "function") {
    return { cleanup: () => {}, state: currentState };
  }

  const attributeFilter = presentation.state.attributes
    ?? (presentation.state.attribute ? [presentation.state.attribute] : undefined);
  const observer = new PresentationObserver(() => syncState(true));
  observer.observe(observerRoot, {
    attributes: true,
    subtree: Boolean(presentation.state.activeSelectors?.length),
    ...(attributeFilter ? { attributeFilter } : {}),
  });
  return {
    cleanup: () => observer.disconnect(),
    get state() { return currentState; },
  };
};

const makeFallback = (documentRoot) => {
  const fallback = documentRoot.createElement("div");
  fallback.className = "model-live-fallback";
  const image = documentRoot.createElement("img");
  image.className = "model-preview-image";
  image.decoding = "async";
  const status = documentRoot.createElement("p");
  status.className = "model-live-fallback__status";
  status.textContent = "正在載入可操作畫面…";
  image.addEventListener("error", () => { image.hidden = true; });
  image.addEventListener("load", () => { image.hidden = false; });
  fallback.append(image, status);
  return { fallback, image, status };
};

export const createModelLiveSurface = (root, options = {}) => {
  const targetSelectors = options.targetSelectors ?? defaultTargetSelectors;
  const shell = document.createElement("div");
  shell.className = "model-live-surface";
  shell.style.position = "relative";

  const { fallback, image, status } = makeFallback(document);
  fallback.style.position = "absolute";
  fallback.style.inset = "0";
  fallback.style.overflow = "hidden";
  fallback.style.boxSizing = "border-box";

  const frame = document.createElement("iframe");
  frame.className = "model-live-frame";
  frame.loading = "eager";
  frame.setAttribute("scrolling", "auto");
  frame.setAttribute("allow", "clipboard-read; clipboard-write");
  frame.setAttribute("aria-live", "off");
  frame.style.boxSizing = "border-box";
  frame.hidden = true;
  shell.append(fallback, frame);
  root.replaceChildren(shell);

  let objectKey = null;
  let source = null;
  let presentation = null;
  let loadVersion = 0;
  let measurementVersion = 0;
  let resizeObserver = null;
  let presentationCleanup = () => {};
  let presentationTarget = null;
  let activeTarget = null;
  let activeSelector = null;
  let stageHeight = modelLiveStageHeightFor(390);

  const syncStageHeight = (viewportWidth) => {
    stageHeight = modelLiveStageHeightFor(viewportWidth);
    const stageHeightCss = `${stageHeight}px`;
    shell.style.height = stageHeightCss;
    shell.style.minHeight = stageHeightCss;
    frame.style.height = stageHeightCss;
    fallback.style.height = stageHeightCss;
    root.dataset.liveHeight = String(stageHeight);
    root.dataset.liveStageHeight = String(stageHeight);
  };

  syncStageHeight(390);

  const setState = (state) => {
    root.dataset.liveState = state;
    shell.dataset.liveState = state;
  };

  const showFallback = (message, failed = false, keepFrameMounted = Boolean(source)) => {
    frame.hidden = !keepFrameMounted;
    frame.style.visibility = keepFrameMounted ? "hidden" : "";
    frame.style.pointerEvents = keepFrameMounted ? "none" : "";
    fallback.hidden = false;
    status.textContent = message;
    fallback.dataset.failed = String(failed);
    setState(failed ? "fallback" : "loading");
  };

  const showFrame = () => {
    fallback.hidden = true;
    frame.hidden = false;
    frame.style.visibility = "visible";
    frame.style.pointerEvents = "auto";
    delete fallback.dataset.failed;
    setState("ready");
  };

  const resetPresentation = () => {
    presentationCleanup();
    presentationCleanup = () => {};
    if (presentationTarget) {
      delete presentationTarget.dataset.modelLivePresentation;
      delete presentationTarget.dataset.modelLivePresentationState;
    }
    presentationTarget = null;
    frame.contentDocument?.querySelector("#model-live-presentation-style")?.replaceChildren();
    delete root.dataset.livePresentation;
    delete root.dataset.livePresentationState;
  };

  const measure = async (expectedVersion = loadVersion) => {
    const measurement = ++measurementVersion;
    if (expectedVersion !== loadVersion || !frame.contentWindow || !frame.contentDocument) return false;
    const frameDocument = frame.contentDocument;
    const frameView = frame.contentWindow;
    const match = activeTarget?.isConnected
      ? { selector: activeSelector, target: activeTarget }
      : findTarget(frameDocument, targetSelectors);
    if (!match) throw new Error("找不到可操作畫面根節點。");

    activeTarget = match.target;
    activeSelector = match.selector;
    frame.hidden = false;
    ensureDocumentStyle(frameDocument);
    isolateTarget(activeTarget);

    if (presentationTarget !== activeTarget) {
      resetPresentation();
      const applied = applyPresentation({
        documentRoot: frameDocument,
        target: activeTarget,
        presentation,
        onStateChange: (nextState) => {
          root.dataset.livePresentationState = nextState;
          queueMicrotask(() => measure().catch(() => {}));
        },
      });
      presentationCleanup = applied.cleanup;
      presentationTarget = activeTarget;
      if (presentation) root.dataset.livePresentation = presentation.id;
      if (applied.state) root.dataset.livePresentationState = applied.state;
    }

    await frameDocument.fonts?.ready;
    await waitForImages(activeTarget);

    frameDocument.documentElement.classList.remove("model-live-ready");
    frameView.scrollTo(0, 0);
    const initialRect = activeTarget.getBoundingClientRect();
    frameView.scrollTo({
      left: Math.max(0, initialRect.left + frameView.scrollX),
      top: Math.max(0, initialRect.top + frameView.scrollY),
      behavior: "auto",
    });
    await nextPaint(frameView);
    frameDocument.documentElement.classList.add("model-live-ready");
    await nextPaint(frameView);
    const rect = activeTarget.getBoundingClientRect();
    if (measurement !== measurementVersion || expectedVersion !== loadVersion) return false;
    const contentHeight = Math.max(1, Math.ceil(rect.height));
    root.dataset.liveRoot = activeSelector;
    root.dataset.liveContentHeight = String(contentHeight);
    root.dataset.liveOverflow = String(contentHeight > stageHeight);
    showFrame();
    return true;
  };

  const connectResizeObserver = () => {
    resizeObserver?.disconnect();
    const SurfaceResizeObserver = frame.contentWindow?.ResizeObserver
      ?? globalThis.ResizeObserver;
    if (!activeTarget || typeof SurfaceResizeObserver !== "function") return;
    resizeObserver = new SurfaceResizeObserver(() => {
      measure().catch(() => {});
    });
    resizeObserver.observe(activeTarget);
  };

  frame.addEventListener("load", async () => {
    const expectedVersion = loadVersion;
    try {
      activeTarget = null;
      activeSelector = null;
      presentationTarget = null;
      await measure(expectedVersion);
      if (expectedVersion === loadVersion) connectResizeObserver();
    } catch (error) {
      if (expectedVersion !== loadVersion) return;
      showFallback("無法整理可操作畫面；請開啟原始頁面。", true);
      root.dataset.liveError = error.message;
    }
  });

  const sync = ({ key, src, title, viewportWidth, previewSrc, previewAlt }) => {
    root.style.setProperty("--model-live-width", `${viewportWidth}px`);
    root.closest?.(".model-preview-pane")?.style.setProperty("--model-live-width", `${viewportWidth}px`);
    root.dataset.objectId = key;
    root.dataset.viewportWidth = String(viewportWidth);
    syncStageHeight(viewportWidth);
    frame.style.width = `${viewportWidth}px`;
    frame.title = title;
    image.src = previewSrc;
    image.alt = previewAlt;

    const nextPresentation = modelLivePresentationFor(key);
    const presentationChanged = presentation?.id !== nextPresentation?.id;
    presentation = nextPresentation;
    if (presentationChanged) resetPresentation();

    const sourceChanged = source !== src || objectKey !== key;
    objectKey = key;
    source = src;
    if (!src) {
      loadVersion += 1;
      resizeObserver?.disconnect();
      resizeObserver = null;
      measurementVersion += 1;
      resetPresentation();
      frame.removeAttribute("src");
      delete root.dataset.liveContentHeight;
      delete root.dataset.liveOverflow;
      showFallback("此研究物件沒有獨立可操作畫面。", true, false);
      return frame;
    }
    if (sourceChanged) {
      loadVersion += 1;
      measurementVersion += 1;
      resizeObserver?.disconnect();
      resizeObserver = null;
      resetPresentation();
      activeTarget = null;
      activeSelector = null;
      delete root.dataset.liveError;
      delete root.dataset.liveContentHeight;
      delete root.dataset.liveOverflow;
      showFallback("正在載入可操作畫面…");
      frame.src = src;
      return frame;
    }

    showFallback("正在調整可操作畫面…");
    measure().then(() => connectResizeObserver()).catch((error) => {
      showFallback("無法調整可操作畫面；請開啟原始頁面。", true);
      root.dataset.liveError = error.message;
    });
    return frame;
  };

  const destroy = () => {
    loadVersion += 1;
    measurementVersion += 1;
    resizeObserver?.disconnect();
    resetPresentation();
    frame.src = "about:blank";
    root.replaceChildren();
  };

  return {
    frame,
    sync,
    measure,
    destroy,
    get key() { return objectKey; },
  };
};
