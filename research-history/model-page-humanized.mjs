import "./model-page.mjs";

const frameState = new WeakMap();

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

const objectIdFor = (frame) =>
  frame.closest(".model-pooled-surface, [data-object-id]")?.dataset.objectId ?? null;

const setText = (element, text) => {
  if (element && element.textContent?.trim() !== text) element.textContent = text;
};

const setAttribute = (element, name, value) => {
  if (element && element.getAttribute(name) !== value) element.setAttribute(name, value);
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

  frameState.get(frame)?.observer?.disconnect();
  const objectId = objectIdFor(frame);
  let pending = false;

  const sync = () => {
    pending = false;
    ensureHumanizationStyle(documentRoot);
    syncReturnControls(documentRoot);
    syncControlLanguage(documentRoot);
    syncQuietLiveRegions(documentRoot, objectId);
    syncProportionalLandscape(documentRoot, objectId);
  };

  const queueSync = () => {
    if (pending) return;
    pending = true;
    queueMicrotask(sync);
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
      "data-focused",
      "data-active",
      "data-mode",
      "data-scale",
      "data-lens",
    ],
  });
  frameState.set(frame, { observer });
};

const attachFrame = (frame) => {
  if (frame.dataset.modelLiveHumanizationAttached === "true") return;
  frame.dataset.modelLiveHumanizationAttached = "true";
  frame.addEventListener("load", () => applyHumanization(frame));
  if (frame.contentDocument?.readyState === "complete") applyHumanization(frame);
};

const board = document.querySelector("#all-live-board");
if (board) {
  board.querySelectorAll("iframe.model-live-frame").forEach(attachFrame);
  const observer = new MutationObserver(() => {
    board.querySelectorAll("iframe.model-live-frame").forEach(attachFrame);
  });
  observer.observe(board, { childList: true, subtree: true });
}
