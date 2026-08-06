const spreadObjectIds = new Set(["08", "08A"]);
const frameState = new WeakMap();

const spreadModelCss = `
  [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"] .spread-phone {
    height: auto !important;
    min-height: 100vh !important;
    overflow: visible !important;
  }

  [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"] .spread-map {
    flex: 1 0 auto !important;
    min-height: calc(100vh - 3.15rem) !important;
    align-items: stretch !important;
    overflow-x: auto !important;
    overflow-y: clip !important;
    overscroll-behavior-x: contain !important;
    overscroll-behavior-y: auto !important;
  }

  [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"] .spread-category {
    height: auto !important;
    overflow: clip !important;
  }

  [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"] .spread-category[data-focused="true"] {
    overflow: visible !important;
  }

  [data-model-live-presentation="spread"][data-model-live-presentation-state="focus"] .spread-category__focus {
    position: sticky !important;
    top: 0 !important;
    z-index: 6 !important;
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
  if (!root || !documentRoot?.head || !spreadObjectIds.has(objectId)) return;

  let style = documentRoot.querySelector("#model-spread-single-scroll-style");
  if (!style) {
    style = documentRoot.createElement("style");
    style.id = "model-spread-single-scroll-style";
    documentRoot.head.append(style);
  }
  if (style.textContent !== spreadModelCss) style.textContent = spreadModelCss;

  const previous = frameState.get(frame);
  previous?.observer?.disconnect();

  const spreadMap = documentRoot.querySelector("#spread-map");
  if (!spreadMap) return;

  const syncEvidence = () => {
    const focusedCategory = spreadMap.querySelector('.spread-category[data-focused="true"]');
    root.dataset.liveSpreadVerticalOwner = spreadMap.dataset.mode === "focus"
      ? "iframe"
      : "none";
    root.dataset.liveSpreadNestedVertical = String(Boolean(
      focusedCategory
      && focusedCategory.scrollHeight > focusedCategory.clientHeight + 1
      && !["visible", "clip"].includes(
        documentRoot.defaultView.getComputedStyle(focusedCategory).overflowY,
      )
    ));
  };

  syncEvidence();
  const FrameMutationObserver = documentRoot.defaultView?.MutationObserver ?? MutationObserver;
  const observer = new FrameMutationObserver(() => {
    documentRoot.defaultView?.requestAnimationFrame(syncEvidence);
  });
  observer.observe(spreadMap, {
    attributes: true,
    subtree: true,
    attributeFilter: ["data-mode", "data-focused", "open"],
  });
  frameState.set(frame, { observer });
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
