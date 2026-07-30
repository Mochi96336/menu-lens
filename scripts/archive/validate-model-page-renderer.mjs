import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { root } from "./load-catalog.mjs";

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.listeners = new Map();
    this.attributes = new Map();
    this.className = "";
    this.textContent = "";
    this.value = "";
    this.href = "";
    this.hidden = false;
    this.disabled = false;
    this.tabIndex = 0;
    this.title = "";
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    this.children = [...nodes];
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  focus() {
    globalThis.document.activeElement = this;
  }

  dispatch(type, event = {}) {
    const listener = this.listeners.get(type);
    if (listener) listener({ preventDefault() {}, ...event });
  }
}

const requiredSelectors = [
  "#model-select",
  "#model-eyebrow",
  "#model-title",
  "#model-summary",
  "#model-stats",
  "#model-substrate",
  "#model-retains",
  "#model-varies",
  "#model-question",
  "#section-summary",
  "#section-tabs",
  "#variant-list",
  "#stage-context-role",
  "#stage-context-copy",
  "#compare-parent",
  "#parent-record-link",
  "#viewport-note",
  "#compare-view-switch",
  "#preview-grid",
  "#current-object-title",
  "#current-object-status",
  "#current-exact-link",
  "#current-preview",
  "#parent-pane",
  "#parent-object-title",
  "#parent-object-status",
  "#parent-preview",
  "#difference-eyebrow",
  "#difference-variable",
  "#difference-before-label",
  "#difference-before",
  "#difference-after-label",
  "#difference-after",
  "#difference-unchanged-label",
  "#difference-unchanged",
  "#outcome-title",
  "#outcome-disposition",
  "#outcome-evidence",
  "#outcome-next-row",
  "#outcome-next-label",
  "#outcome-next-gate",
  "#lineage",
  "#record-links",
];

const selectors = new Map(requiredSelectors.map((selector) => [selector, new FakeElement()]));
const viewportButtons = ["320", "390", "desktop"].map((viewport) => {
  const button = new FakeElement("button");
  button.dataset.viewport = viewport;
  return button;
});
const previewPaneButtons = ["current", "parent"].map((pane) => {
  const button = new FakeElement("button");
  button.dataset.previewPane = pane;
  return button;
});
const body = new FakeElement("body");
const registrySource = await readFile(new URL("research-history/prototype-registry.js", root), "utf8");
const sandbox = { window: {} };
runInNewContext(registrySource, sandbox, { filename: "research-history/prototype-registry.js" });

const previousGlobals = {
  window: globalThis.window,
  document: globalThis.document,
  history: globalThis.history,
};
const hadGlobals = {
  window: Object.prototype.hasOwnProperty.call(globalThis, "window"),
  document: Object.prototype.hasOwnProperty.call(globalThis, "document"),
  history: Object.prototype.hasOwnProperty.call(globalThis, "history"),
};

let lastUrl = null;
let pushedUrl = null;
let popstateListener = null;
try {
  globalThis.document = {
    title: "",
    body,
    activeElement: null,
    querySelector: (selector) => selectors.get(selector) ?? null,
    querySelectorAll: (selector) => {
      if (selector === "[data-viewport]") return viewportButtons;
      if (selector === "[data-preview-pane]") return previewPaneButtons;
      return [];
    },
    createElement: (tagName) => new FakeElement(tagName),
  };
  globalThis.window = {
    menuLensPrototypeRegistry: sandbox.window.menuLensPrototypeRegistry,
    location: {
      search: "?model=landscape-paper&section=reading-grammar&variant=18B&viewport=390&compare=parent",
      hash: "",
      href: "",
    },
    addEventListener: (type, listener) => {
      if (type === "popstate") popstateListener = listener;
    },
  };
  globalThis.history = {
    replaceState: (_state, _title, url) => { lastUrl = url; },
    pushState: (_state, _title, url) => { pushedUrl = url; },
  };

  const rendererUrl = new URL("research-history/model-page.mjs", root);
  await import(`${rendererUrl.href}?model-renderer-smoke=${Date.now()}`);

  if (selectors.get("#model-title").textContent !== "Landscape Paper") {
    throw new Error("Model viewer did not resolve the requested design model.");
  }
  if (!selectors.get("#model-stats").textContent.includes("6 組子研究")) {
    throw new Error("Model viewer did not publish compact model statistics.");
  }
  if (selectors.get("#current-object-title").textContent !== "18B · Semantic Zoom") {
    throw new Error("Display titles must not repeat a canonical object ID prefix.");
  }
  const currentFrame = selectors.get("#current-preview").children[0];
  if (currentFrame?.tagName !== "IFRAME" || currentFrame.src !== "../phases/18b-semantic-zoom/index.html") {
    throw new Error("Model viewer did not render the exact current prototype entrypoint.");
  }
  if (currentFrame.title !== "Current — 18B Semantic Zoom — 390px") {
    throw new Error("Current iframe title must identify role, object, controlled viewport, and a deduplicated title.");
  }
  if (selectors.get("#current-exact-link").hidden || selectors.get("#current-exact-link").href !== currentFrame.src) {
    throw new Error("The stage must expose a near-preview exact prototype link.");
  }
  const parentFrame = selectors.get("#parent-preview").children[0];
  if (selectors.get("#parent-pane").hidden || parentFrame?.src !== "../phases/18-landscape-paper/index.html") {
    throw new Error("Model viewer did not render the requested canonical parent comparison.");
  }
  if (parentFrame.title !== "Parent — 18 Landscape Paper — 390px") {
    throw new Error("Parent iframe title must identify role, object, and controlled viewport.");
  }
  if (selectors.get("#difference-eyebrow").textContent !== "Isolated difference") {
    throw new Error("Controlled variants must render as isolated differences.");
  }
  if (!lastUrl?.includes("model=landscape-paper") || !lastUrl.includes("compare=parent")) {
    throw new Error("Model viewer did not publish its initial deep-link state.");
  }

  previewPaneButtons[1].dispatch("click");
  if (selectors.get("#preview-grid").dataset.mobilePane !== "parent") {
    throw new Error("Mobile comparison must switch between current and parent panes.");
  }
  if (selectors.get("#current-preview").children[0] !== currentFrame || selectors.get("#parent-preview").children[0] !== parentFrame) {
    throw new Error("Switching mobile comparison panes must preserve both iframe instances.");
  }

  selectors.get("#compare-parent").dispatch("click");
  if (selectors.get("#current-preview").children[0] !== currentFrame) {
    throw new Error("Toggling parent comparison must not reload the current prototype.");
  }
  viewportButtons[2].dispatch("click");
  if (selectors.get("#current-preview").children[0] !== currentFrame) {
    throw new Error("Changing viewport must not reload the current prototype.");
  }
  if (selectors.get("#current-preview").dataset.viewport !== "desktop") {
    throw new Error("Desktop viewport state was not applied to the preview.");
  }
  if (!currentFrame.title.endsWith("1024px")) {
    throw new Error("Changing viewport must update the iframe accessibility title.");
  }
  if (!pushedUrl?.includes("viewport=desktop")) {
    throw new Error("Interactive state changes must create navigable history entries.");
  }

  const sectionTabs = selectors.get("#section-tabs").children;
  sectionTabs[2].dispatch("click");
  const renderedFocusTabs = selectors.get("#section-tabs").children;
  if (globalThis.document.activeElement !== renderedFocusTabs[2]) {
    throw new Error("Selecting a sub-study must retain focus on its newly rendered active tab.");
  }

  const focusVariants = selectors.get("#variant-list").children;
  if (focusVariants[0].tabIndex !== -1 || focusVariants[1].tabIndex !== 0) {
    throw new Error("Variant navigation must expose one roving keyboard tab stop.");
  }
  focusVariants[3].dispatch("click");
  const renderedFocusVariants = selectors.get("#variant-list").children;
  if (globalThis.document.activeElement !== renderedFocusVariants[3]) {
    throw new Error("Selecting a research object must retain focus on its newly rendered active control.");
  }
  if (selectors.get("#difference-eyebrow").textContent !== "Stopped result") {
    throw new Error("Negative evidence must render as a stopped result before presentation-note logic.");
  }
  if (selectors.get("#outcome-title").textContent !== "停止判斷不是另一個可選方案。") {
    throw new Error("Stopped objects must use explicit outcome language.");
  }

  const modelSelect = selectors.get("#model-select");
  modelSelect.value = "horizontal-navigation";
  modelSelect.dispatch("change");
  if (selectors.get("#current-object-title").textContent !== "08 · Menu Spread") {
    throw new Error("Model selection must open the configured featured object rather than the first section.");
  }

  modelSelect.value = "depth-projection";
  modelSelect.dispatch("change");
  if (selectors.get("#current-object-title").textContent !== "25P · Menu Projections") {
    throw new Error("Depth model must open its configured projection-lens feature.");
  }

  modelSelect.value = "paper-field";
  modelSelect.dispatch("change");
  const semanticVariants = selectors.get("#variant-list").children;
  semanticVariants[3].dispatch("click");
  if (selectors.get("#difference-eyebrow").textContent !== "Study role") {
    throw new Error("Study objects must not be described as isolated design differences.");
  }
  if (!selectors.get("#compare-parent").hidden) {
    throw new Error("Study runners must never expose prototype parent comparison.");
  }
  if (selectors.get("#parent-record-link").hidden) {
    throw new Error("Study runners with a recorded parent must expose the parent record instead.");
  }

  modelSelect.value = "multiscale-focus";
  modelSelect.dispatch("change");
  const multiscaleTabs = selectors.get("#section-tabs").children;
  if (multiscaleTabs[0].tabIndex !== 0 || multiscaleTabs[1].tabIndex !== -1) {
    throw new Error("Section tabs must expose one keyboard tab stop.");
  }
  multiscaleTabs[1].dispatch("click");
  selectors.get("#variant-list").children[1].dispatch("click");
  if (selectors.get("#difference-eyebrow").textContent !== "Prerequisite correction") {
    throw new Error("Correction objects must render their prerequisite role.");
  }
  if (!selectors.get("#compare-parent").hidden) {
    throw new Error("Objects without an eligible prototype pair must not expose a fake compare action.");
  }
  if (selectors.get("#parent-record-link").hidden) {
    throw new Error("A correction with a recorded parent must expose the parent record instead of an empty compare pane.");
  }

  if (typeof popstateListener !== "function") {
    throw new Error("Model viewer must subscribe to browser history navigation.");
  }
  globalThis.window.location.search = "?model=complete-document&section=baseline&variant=01&viewport=320";
  popstateListener();
  if (selectors.get("#current-object-title").textContent !== "01 · Complete menu") {
    throw new Error("Browser history navigation must restore model-page state.");
  }

  const css = await readFile(new URL("research-history/model-page.css", root), "utf8");
  const polishCss = await readFile(new URL("research-history/model-page-polish.css", root), "utf8");
  for (const contract of [
    "--preview-width: 320px",
    "--preview-width: 390px",
    "--preview-width: 1024px",
    "min-width: var(--preview-width)",
    "data-mobile-pane=\"current\"",
    ".model-compare-view-switch:not([hidden])",
  ]) {
    if (!css.includes(contract)) throw new Error(`Model preview CSS is missing responsive contract: ${contract}`);
  }
  for (const contract of [
    ".model-toolbar-link[hidden]",
    "@media (min-width: 901px) and (max-width: 1050px)",
  ]) {
    if (!polishCss.includes(contract)) throw new Error(`Model polish CSS is missing visible-state contract: ${contract}`);
  }
  if (css.includes(".model-preview-frame, .model-preview-placeholder { max-width: 100%")) {
    throw new Error("Responsive CSS must not shrink controlled preview widths.");
  }
} finally {
  for (const name of ["window", "document", "history"]) {
    if (hadGlobals[name]) globalThis[name] = previousGlobals[name];
    else delete globalThis[name];
  }
}

console.log("Design model viewer: compact hierarchy, deduplicated titles, eligible comparisons, focus retention, history, stable panes, role-aware outcomes, and controlled widths verified.");
