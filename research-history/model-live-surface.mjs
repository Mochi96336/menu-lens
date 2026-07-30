const defaultTargetSelectors = Object.freeze([
  "#prototype",
  "#comparison",
  "#study",
  "#studies",
]);

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
    "html.model-live-ready, html.model-live-ready body {",
    "  overflow: hidden !important;",
    "}",
  ].join("\n");
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

  const { fallback, image, status } = makeFallback(document);
  const frame = document.createElement("iframe");
  frame.className = "model-live-frame";
  frame.loading = "eager";
  frame.setAttribute("scrolling", "no");
  frame.setAttribute("allow", "clipboard-read; clipboard-write");
  frame.setAttribute("aria-live", "off");
  frame.hidden = true;
  shell.append(fallback, frame);
  root.replaceChildren(shell);

  let objectKey = null;
  let source = null;
  let loadVersion = 0;
  let resizeObserver = null;
  let activeTarget = null;
  let activeSelector = null;

  const setState = (state) => {
    root.dataset.liveState = state;
    shell.dataset.liveState = state;
  };

  const showFallback = (message, failed = false) => {
    frame.hidden = true;
    fallback.hidden = false;
    status.textContent = message;
    fallback.dataset.failed = String(failed);
    setState(failed ? "fallback" : "loading");
  };

  const showFrame = () => {
    fallback.hidden = true;
    frame.hidden = false;
    delete fallback.dataset.failed;
    setState("ready");
  };

  const measure = async (expectedVersion = loadVersion) => {
    if (expectedVersion !== loadVersion || !frame.contentWindow || !frame.contentDocument) return false;
    const frameDocument = frame.contentDocument;
    const frameView = frame.contentWindow;
    const match = activeTarget?.isConnected
      ? { selector: activeSelector, target: activeTarget }
      : findTarget(frameDocument, targetSelectors);
    if (!match) throw new Error("找不到可操作畫面根節點。");

    activeTarget = match.target;
    activeSelector = match.selector;
    ensureDocumentStyle(frameDocument);
    isolateTarget(activeTarget);
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
    const rect = activeTarget.getBoundingClientRect();
    const height = Math.max(1, Math.ceil(rect.height));
    frame.style.height = `${height}px`;
    root.dataset.liveRoot = activeSelector;
    root.dataset.liveHeight = String(height);
    showFrame();
    return true;
  };

  const connectResizeObserver = () => {
    resizeObserver?.disconnect();
    if (!activeTarget || typeof ResizeObserver !== "function") return;
    resizeObserver = new ResizeObserver(() => {
      measure().catch(() => {});
    });
    resizeObserver.observe(activeTarget);
  };

  frame.addEventListener("load", async () => {
    const expectedVersion = loadVersion;
    try {
      activeTarget = null;
      activeSelector = null;
      await measure(expectedVersion);
      if (expectedVersion === loadVersion) connectResizeObserver();
    } catch (error) {
      if (expectedVersion !== loadVersion) return;
      showFallback("無法裁切可操作畫面；請開啟原始頁面。", true);
      root.dataset.liveError = error.message;
    }
  });

  const sync = ({ key, src, title, viewportWidth, previewSrc, previewAlt }) => {
    root.style.setProperty("--model-live-width", `${viewportWidth}px`);
    root.closest?.(".model-preview-pane")?.style.setProperty("--model-live-width", `${viewportWidth}px`);
    root.dataset.objectId = key;
    root.dataset.viewportWidth = String(viewportWidth);
    frame.style.width = `${viewportWidth}px`;
    frame.title = title;
    image.src = previewSrc;
    image.alt = previewAlt;

    const sourceChanged = source !== src || objectKey !== key;
    objectKey = key;
    source = src;
    if (!src) {
      loadVersion += 1;
      resizeObserver?.disconnect();
      resizeObserver = null;
      frame.removeAttribute("src");
      showFallback("此研究物件沒有獨立可操作畫面。", true);
      return frame;
    }
    if (sourceChanged) {
      loadVersion += 1;
      resizeObserver?.disconnect();
      resizeObserver = null;
      activeTarget = null;
      activeSelector = null;
      delete root.dataset.liveError;
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
    resizeObserver?.disconnect();
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
