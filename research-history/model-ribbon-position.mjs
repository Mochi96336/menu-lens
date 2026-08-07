const ribbonObjectIds = new Set(["09", "09A"]);
const frameState = new WeakMap();

const ribbonModelCss = `
  [data-model-live-presentation="ribbon"][data-model-ribbon-handle-ready="true"] .ribbon-scale-bar {
    position: fixed !important;
    inset: 0 0 auto 0 !important;
    z-index: 80 !important;
    width: 100% !important;
  }

  [data-model-live-presentation="ribbon"][data-model-ribbon-handle-ready="true"] .ribbon-minimap {
    box-sizing: border-box !important;
    height: 3.1rem !important;
    padding-bottom: .76rem !important;
  }

  [data-model-live-presentation="ribbon"][data-model-ribbon-handle-ready="true"] .ribbon-minimap::after {
    content: "";
    position: absolute;
    z-index: 2;
    right: .35rem;
    bottom: .39rem;
    left: .35rem;
    height: 1px;
    background: var(--line-strong);
    pointer-events: none;
  }

  [data-model-live-presentation="ribbon"][data-model-ribbon-handle-ready="true"] .ribbon-minimap__window {
    left: var(--model-ribbon-handle-left, 0%) !important;
    width: var(--model-ribbon-handle-width, 100%) !important;
    min-width: 0 !important;
    height: .58rem !important;
    bottom: .1rem !important;
    z-index: 4 !important;
    box-sizing: border-box !important;
    border: 1px solid var(--accent) !important;
    border-radius: 999px !important;
    background: var(--surface-strong) !important;
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent) !important;
    pointer-events: auto !important;
    cursor: grab !important;
    touch-action: none !important;
    outline: none !important;
    transition: left 80ms linear, width 80ms linear !important;
  }

  [data-model-live-presentation="ribbon"][data-model-ribbon-handle-ready="true"] .ribbon-minimap__window::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: max(100%, 2.75rem);
    height: 2rem;
    transform: translate(-50%, -50%);
  }

  [data-model-live-presentation="ribbon"][data-model-ribbon-handle-ready="true"] .ribbon-minimap__window:focus-visible {
    box-shadow: 0 0 0 2px var(--surface-strong), 0 0 0 4px var(--accent) !important;
  }

  [data-model-live-presentation="ribbon"][data-model-ribbon-handle-ready="true"] .ribbon-minimap__window.is-model-ribbon-dragging {
    cursor: grabbing !important;
    transition: none !important;
  }

  [data-model-live-presentation="ribbon"][data-model-ribbon-handle-ready="true"] .ribbon-viewport[data-scale="reading"] {
    scrollbar-width: none !important;
  }

  [data-model-live-presentation="ribbon"][data-model-ribbon-handle-ready="true"] .ribbon-viewport[data-scale="reading"]::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  @media (prefers-reduced-motion: reduce) {
    [data-model-live-presentation="ribbon"][data-model-ribbon-handle-ready="true"] .ribbon-minimap__window {
      transition: none !important;
    }
  }
`;

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const surfaceRootFor = (frame) =>
  frame.closest(".model-pooled-surface, [data-object-id]");

const applyRibbonPosition = (frame) => {
  const root = surfaceRootFor(frame);
  const objectId = root?.dataset.objectId;
  const documentRoot = frame.contentDocument;
  const view = frame.contentWindow;
  if (!root || !documentRoot?.head || !view || !ribbonObjectIds.has(objectId)) return;

  const viewport = documentRoot.querySelector("#ribbon-viewport");
  const minimap = documentRoot.querySelector("#ribbon-minimap");
  const handle = documentRoot.querySelector(".ribbon-minimap__window");
  const readingButton = documentRoot.querySelector("#ribbon-reading");
  const previousButton = documentRoot.querySelector("#ribbon-previous");
  const nextButton = documentRoot.querySelector("#ribbon-next");
  const presentationRoot = viewport?.closest('[data-model-live-presentation="ribbon"]');
  if (!viewport || !minimap || !handle || !readingButton || !presentationRoot) return;

  let style = documentRoot.querySelector("#model-ribbon-position-style");
  if (!style) {
    style = documentRoot.createElement("style");
    style.id = "model-ribbon-position-style";
    documentRoot.head.append(style);
  }
  if (style.textContent !== ribbonModelCss) style.textContent = ribbonModelCss;

  frameState.get(frame)?.cleanup?.();

  handle.id ||= "ribbon-minimap-window";
  handle.setAttribute("role", "slider");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-label", "菜單位置");
  handle.setAttribute("aria-orientation", "horizontal");
  handle.setAttribute("aria-controls", "ribbon-viewport");
  presentationRoot.dataset.modelRibbonHandleReady = "true";

  let syncRequest = null;
  let overviewSettleRequest = null;
  let overviewSettleFrames = 0;
  let overviewStableFrames = 0;
  let overviewGeometryKey = null;
  let activePointerId = null;
  let pointerOffset = 0;
  let pendingOverviewClientX = null;

  const productCount = () =>
    documentRoot.querySelectorAll(".ribbon-product").length;

  const queueSync = () => {
    if (syncRequest !== null) return;
    syncRequest = view.requestAnimationFrame(sync);
  };

  const sync = () => {
    syncRequest = null;
    const totalWidth = Math.max(1, viewport.scrollWidth);
    const clientWidth = Math.max(1, viewport.clientWidth);
    const maximum = Math.max(0, totalWidth - clientWidth);
    const current = clamp(viewport.scrollLeft, 0, maximum);
    const widthRatio = maximum > 0 ? clientWidth / totalWidth : 1;
    const leftRatio = maximum > 0 ? current / totalWidth : 0;
    const progress = maximum > 0 ? current / maximum : 0;
    const count = Math.max(1, productCount());
    const locationText = documentRoot.querySelector("#ribbon-location-meta")?.textContent?.trim();

    minimap.style.setProperty("--model-ribbon-handle-left", `${leftRatio * 100}%`);
    minimap.style.setProperty("--model-ribbon-handle-width", `${widthRatio * 100}%`);

    handle.setAttribute("aria-valuemin", "0");
    handle.setAttribute("aria-valuemax", "100");
    handle.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    handle.setAttribute(
      "aria-valuetext",
      viewport.dataset.scale === "reading"
        ? `菜單位置 ${Math.round(progress * 100)}%${locationText ? ` · ${locationText}` : ""}`
        : `全店尺度 · ${count} 道料理`,
    );
    handle.setAttribute("aria-disabled", "false");

    root.dataset.liveRibbonHandle = "ready";
    root.dataset.liveRibbonNativeScrollbar = viewport.dataset.scale === "reading"
      ? "hidden"
      : "inactive";
    root.dataset.liveRibbonScrollLeft = String(Math.round(current * 100) / 100);
    root.dataset.liveRibbonMaxScroll = String(Math.round(maximum * 100) / 100);
    root.dataset.liveRibbonHandleLeft = String(Math.round(leftRatio * 100000) / 100000);
    root.dataset.liveRibbonHandleWidth = String(Math.round(widthRatio * 100000) / 100000);
  };

  const scrollToClientX = (clientX, offset = pointerOffset) => {
    const minimapRect = minimap.getBoundingClientRect();
    const handleRect = handle.getBoundingClientRect();
    const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const travel = Math.max(0, minimapRect.width - handleRect.width);
    if (maximum <= 0 || travel <= 0) return;
    const handleLeft = clamp(clientX - minimapRect.left - offset, 0, travel);
    viewport.scrollTo({ left: (handleLeft / travel) * maximum, behavior: "auto" });
    queueSync();
  };

  const queueOverviewSettle = () => {
    if (overviewSettleRequest !== null || pendingOverviewClientX === null) return;
    overviewSettleRequest = view.requestAnimationFrame(settleOverviewPointer);
  };

  const settleOverviewPointer = () => {
    overviewSettleRequest = null;
    if (pendingOverviewClientX === null) {
      root.dataset.liveRibbonPointerSettled = "true";
      return;
    }

    sync();
    const handleRect = handle.getBoundingClientRect();
    const minimapRect = minimap.getBoundingClientRect();
    const geometryKey = [
      viewport.scrollWidth,
      viewport.clientWidth,
      Math.round(minimapRect.width * 100) / 100,
      Math.round(handleRect.width * 100) / 100,
    ].join(":");
    overviewStableFrames = geometryKey === overviewGeometryKey
      ? overviewStableFrames + 1
      : 0;
    overviewGeometryKey = geometryKey;
    overviewSettleFrames += 1;

    pointerOffset = handleRect.width / 2;
    scrollToClientX(pendingOverviewClientX, pointerOffset);
    root.dataset.liveRibbonPointerSettled = "false";

    const stableLongEnough = overviewSettleFrames >= 12 && overviewStableFrames >= 3;
    if (stableLongEnough || overviewSettleFrames >= 24) {
      pendingOverviewClientX = null;
      overviewSettleFrames = 0;
      overviewStableFrames = 0;
      overviewGeometryKey = null;
      root.dataset.liveRibbonPointerSettled = "true";
      queueSync();
      return;
    }
    queueOverviewSettle();
  };

  const afterReadingLayout = (callback) => {
    view.requestAnimationFrame(() => {
      view.requestAnimationFrame(() => {
        callback();
        queueSync();
      });
    });
  };

  const enterReadingForPointer = (clientX) => {
    pendingOverviewClientX = clientX;
    overviewSettleFrames = 0;
    overviewStableFrames = 0;
    overviewGeometryKey = null;
    root.dataset.liveRibbonPointerSettled = "false";
    readingButton.click();
    sync();
    pointerOffset = handle.getBoundingClientRect().width / 2;
    scrollToClientX(clientX, pointerOffset);
    queueOverviewSettle();
  };

  const onPointerDown = (event) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activePointerId = event.pointerId;
    handle.setPointerCapture(event.pointerId);
    handle.classList.add("is-model-ribbon-dragging");

    if (viewport.dataset.scale !== "reading") {
      enterReadingForPointer(event.clientX);
      return;
    }

    const handleRect = handle.getBoundingClientRect();
    pointerOffset = clamp(event.clientX - handleRect.left, 0, handleRect.width);
    scrollToClientX(event.clientX);
  };

  const onPointerMove = (event) => {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pendingOverviewClientX !== null) {
      pendingOverviewClientX = event.clientX;
      queueOverviewSettle();
    }
    if (viewport.dataset.scale === "reading") scrollToClientX(event.clientX);
  };

  const finishPointer = (event) => {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pendingOverviewClientX !== null) {
      pendingOverviewClientX = event.clientX;
      queueOverviewSettle();
    }
    if (viewport.dataset.scale === "reading") scrollToClientX(event.clientX);
    activePointerId = null;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    handle.classList.remove("is-model-ribbon-dragging");
    queueSync();
  };

  const runInReading = (action) => {
    if (viewport.dataset.scale === "reading") {
      action();
      return;
    }
    readingButton.click();
    afterReadingLayout(action);
  };

  const onKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runInReading(() => {
      const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      if (event.key === "Home") viewport.scrollTo({ left: 0, behavior: "auto" });
      if (event.key === "End") viewport.scrollTo({ left: maximum, behavior: "auto" });
      if (event.key === "PageUp") viewport.scrollBy({ left: -viewport.clientWidth * .82, behavior: "auto" });
      if (event.key === "PageDown") viewport.scrollBy({ left: viewport.clientWidth * .82, behavior: "auto" });
      if (event.key === "ArrowLeft") previousButton?.click();
      if (event.key === "ArrowRight") nextButton?.click();
      queueSync();
    });
  };

  const onLostPointerCapture = () => {
    activePointerId = null;
    handle.classList.remove("is-model-ribbon-dragging");
  };

  handle.addEventListener("pointerdown", onPointerDown, true);
  handle.addEventListener("pointermove", onPointerMove, true);
  handle.addEventListener("pointerup", finishPointer, true);
  handle.addEventListener("pointercancel", finishPointer, true);
  handle.addEventListener("lostpointercapture", onLostPointerCapture, true);
  handle.addEventListener("keydown", onKeyDown, true);
  viewport.addEventListener("scroll", queueSync, { passive: true });

  const FrameMutationObserver = view.MutationObserver ?? MutationObserver;
  const observer = new FrameMutationObserver(queueSync);
  observer.observe(viewport, {
    attributes: true,
    attributeFilter: ["data-scale"],
  });
  observer.observe(documentRoot.querySelector("#ribbon-location-meta"), {
    childList: true,
    characterData: true,
    subtree: true,
  });

  let resizeObserver = null;
  if (typeof view.ResizeObserver === "function") {
    resizeObserver = new view.ResizeObserver(queueSync);
    resizeObserver.observe(viewport);
    resizeObserver.observe(minimap);
    const track = documentRoot.querySelector("#ribbon-track");
    if (track) resizeObserver.observe(track);
  }

  sync();
  frameState.set(frame, {
    cleanup: () => {
      if (syncRequest !== null) view.cancelAnimationFrame(syncRequest);
      if (overviewSettleRequest !== null) view.cancelAnimationFrame(overviewSettleRequest);
      syncRequest = null;
      overviewSettleRequest = null;
      pendingOverviewClientX = null;
      observer.disconnect();
      resizeObserver?.disconnect();
      handle.removeEventListener("pointerdown", onPointerDown, true);
      handle.removeEventListener("pointermove", onPointerMove, true);
      handle.removeEventListener("pointerup", finishPointer, true);
      handle.removeEventListener("pointercancel", finishPointer, true);
      handle.removeEventListener("lostpointercapture", onLostPointerCapture, true);
      handle.removeEventListener("keydown", onKeyDown, true);
      viewport.removeEventListener("scroll", queueSync);
      presentationRoot.removeAttribute("data-model-ribbon-handle-ready");
      handle.classList.remove("is-model-ribbon-dragging");
      minimap.style.removeProperty("--model-ribbon-handle-left");
      minimap.style.removeProperty("--model-ribbon-handle-width");
    },
  });
};

const attachFrame = (frame) => {
  if (frame.dataset.modelRibbonPositionAttached === "true") return;
  frame.dataset.modelRibbonPositionAttached = "true";
  frame.addEventListener("load", () => applyRibbonPosition(frame));
  if (frame.contentDocument?.readyState === "complete") applyRibbonPosition(frame);
};

const board = document.querySelector("#all-live-board");
if (board) {
  board.querySelectorAll("iframe.model-live-frame").forEach(attachFrame);
  const observer = new MutationObserver(() => {
    board.querySelectorAll("iframe.model-live-frame").forEach(attachFrame);
  });
  observer.observe(board, { childList: true, subtree: true });
}
