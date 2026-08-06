const spreadObjectIds = new Set(["08", "08A"]);
const frameState = new WeakMap();

const spreadModelCss = `
  [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"] .spread-phone {
    height: auto !important;
    min-height: 100vh !important;
    overflow: visible !important;
  }

  [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"] .spread-toolbar {
    position: fixed !important;
    inset: 0 0 auto 0 !important;
    z-index: 70 !important;
    width: 100% !important;
  }

  [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"] .spread-map {
    flex: 0 0 auto !important;
    height: auto !important;
    min-height: calc(100vh - 3.15rem) !important;
    align-items: stretch !important;
    overflow-x: auto !important;
    overflow-y: clip !important;
    overscroll-behavior-x: contain !important;
    overscroll-behavior-y: auto !important;
  }

  [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"] .spread-category {
    height: auto !important;
    grid-template-rows: var(--model-spread-header-height, auto) auto !important;
    overflow: clip !important;
  }

  [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"] .spread-category[data-focused="true"] {
    overflow: visible !important;
  }

  [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"]:not(.model-spread-measuring) .spread-category__focus {
    position: fixed !important;
    top: 3.15rem !important;
    left: var(--model-spread-header-left) !important;
    z-index: 60 !important;
    width: var(--model-spread-header-width) !important;
    max-width: none !important;
    align-self: start !important;
    background: rgb(255 253 248 / 96%) !important;
    backdrop-filter: blur(8px);
  }

  @media (prefers-reduced-motion: reduce) {
    [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"] .spread-category__focus {
      backdrop-filter: none !important;
    }
  }
`;

const surfaceRootFor = (frame) =>
  frame.closest(".model-pooled-surface, [data-object-id]");

const applySpreadOverflow = (frame) => {
  const root = surfaceRootFor(frame);
  const objectId = root?.dataset.objectId;
  const documentRoot = frame.contentDocument;
  const view = frame.contentWindow;
  if (!root || !documentRoot?.head || !view || !spreadObjectIds.has(objectId)) return;

  let style = documentRoot.querySelector("#model-spread-single-scroll-style");
  if (!style) {
    style = documentRoot.createElement("style");
    style.id = "model-spread-single-scroll-style";
    documentRoot.head.append(style);
  }
  if (style.textContent !== spreadModelCss) style.textContent = spreadModelCss;

  const previous = frameState.get(frame);
  previous?.cleanup?.();

  const spreadMap = documentRoot.querySelector("#spread-map");
  const presentationRoot = spreadMap?.closest('[data-model-live-presentation="spread"]');
  if (!spreadMap || !presentationRoot) return;

  let geometryRequest = null;
  const categories = () => [...spreadMap.querySelectorAll(".spread-category")];

  const clearPinnedGeometry = () => {
    presentationRoot.classList.remove("model-spread-measuring");
    delete presentationRoot.dataset.modelSpreadPinned;
    for (const category of categories()) {
      category.style.removeProperty("--model-spread-header-height");
      const button = category.querySelector(".spread-category__focus");
      button?.style.removeProperty("--model-spread-header-left");
      button?.style.removeProperty("--model-spread-header-width");
    }
  };

  const syncEvidence = () => {
    const focusedCategory = spreadMap.querySelector('.spread-category[data-focused="true"]');
    const focusedStyle = focusedCategory
      ? view.getComputedStyle(focusedCategory)
      : null;
    root.dataset.liveSpreadVerticalOwner = spreadMap.dataset.mode === "focus"
      ? "iframe"
      : "none";
    root.dataset.liveSpreadNestedVertical = String(Boolean(
      focusedCategory
      && focusedCategory.scrollHeight > focusedCategory.clientHeight + 1
      && !["visible", "clip"].includes(focusedStyle?.overflowY)
    ));
    root.dataset.liveSpreadLandmarks = spreadMap.dataset.mode === "focus"
      ? presentationRoot.dataset.modelSpreadPinned === "true" ? "pinned" : "pending"
      : "inline";
  };

  const syncPinnedGeometry = () => {
    geometryRequest = null;
    if (spreadMap.dataset.mode !== "focus") {
      clearPinnedGeometry();
      syncEvidence();
      return;
    }

    const currentCategories = categories();
    presentationRoot.classList.add("model-spread-measuring");
    for (const category of currentCategories) {
      category.style.removeProperty("--model-spread-header-height");
    }
    const measurements = currentCategories.map((category) => {
      const button = category.querySelector(".spread-category__focus");
      const categoryRect = category.getBoundingClientRect();
      const buttonRect = button?.getBoundingClientRect();
      return {
        category,
        button,
        left: categoryRect.left,
        width: categoryRect.width,
        height: Math.max(1, buttonRect?.height ?? 0),
      };
    });

    for (const measurement of measurements) {
      measurement.category.style.setProperty(
        "--model-spread-header-height",
        `${measurement.height}px`,
      );
      measurement.button?.style.setProperty(
        "--model-spread-header-left",
        `${measurement.left}px`,
      );
      measurement.button?.style.setProperty(
        "--model-spread-header-width",
        `${measurement.width}px`,
      );
    }
    presentationRoot.classList.remove("model-spread-measuring");
    presentationRoot.dataset.modelSpreadPinned = "true";
    syncEvidence();
  };

  const queueGeometry = () => {
    if (geometryRequest !== null) return;
    geometryRequest = view.requestAnimationFrame(syncPinnedGeometry);
  };

  queueGeometry();
  const FrameMutationObserver = view.MutationObserver ?? MutationObserver;
  const observer = new FrameMutationObserver(queueGeometry);
  observer.observe(spreadMap, {
    attributes: true,
    subtree: true,
    attributeFilter: ["data-mode", "data-focused", "open"],
  });
  spreadMap.addEventListener("scroll", queueGeometry, { passive: true });
  view.addEventListener("resize", queueGeometry, { passive: true });

  frameState.set(frame, {
    cleanup: () => {
      observer.disconnect();
      spreadMap.removeEventListener("scroll", queueGeometry);
      view.removeEventListener("resize", queueGeometry);
      if (geometryRequest !== null) view.cancelAnimationFrame(geometryRequest);
      geometryRequest = null;
      clearPinnedGeometry();
    },
  });
};

const attachFrame = (frame) => {
  if (frame.dataset.modelSpreadOverflowAttached === "true") return;
  frame.dataset.modelSpreadOverflowAttached = "true";
  frame.addEventListener("load", () => applySpreadOverflow(frame));
  if (frame.contentDocument?.readyState === "complete") applySpreadOverflow(frame);
};

const board = document.querySelector("#all-live-board");
if (board) {
  board.querySelectorAll("iframe.model-live-frame").forEach(attachFrame);
  const observer = new MutationObserver(() => {
    board.querySelectorAll("iframe.model-live-frame").forEach(attachFrame);
  });
  observer.observe(board, { childList: true, subtree: true });
}
