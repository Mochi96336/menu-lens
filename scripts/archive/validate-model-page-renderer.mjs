import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { root } from "./load-catalog.mjs";

const classList = (element) => String(element.className || "").split(/\s+/).filter(Boolean);
const matchesSelector = (element, selector) => {
  if (selector.startsWith("#")) return element.id === selector.slice(1);
  if (selector.startsWith(".")) return classList(element).includes(selector.slice(1));
  const tagClass = selector.match(/^([a-z]+)\.([\w-]+)$/i);
  if (tagClass) return element.tagName === tagClass[1].toUpperCase() && classList(element).includes(tagClass[2]);
  const dataValue = selector.match(/^\[data-([a-z-]+)="([^"]+)"\]$/);
  if (dataValue) {
    const key = dataValue[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return element.dataset[key] === dataValue[2];
  }
  const data = selector.match(/^\[data-([a-z-]+)\]$/);
  if (data) {
    const key = data[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return Object.prototype.hasOwnProperty.call(element.dataset, key);
  }
  return element.tagName === selector.toUpperCase();
};

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); this[name] = String(value); }
  removeProperty(name) { this.values.delete(name); delete this[name]; }
  getPropertyValue(name) { return this.values.get(name) ?? this[name] ?? ""; }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.id = "";
    this.children = [];
    this.dataset = {};
    this.listeners = new Map();
    this.attributes = new Map();
    this.className = "";
    this.textContent = "";
    this.value = "";
    this.href = "";
    this.src = "";
    this.alt = "";
    this.hidden = false;
    this.open = false;
    this.disabled = false;
    this.tabIndex = 0;
    this.title = "";
    this.style = new FakeStyle();
    this.parentElement = null;
    this.offsetLeft = 0;
    this.offsetWidth = 390;
    this.clientWidth = 390;
    this.scrollWidth = 1600;
  }

  get options() { return this.tagName === "SELECT" ? this.children : undefined; }
  detach(node) {
    if (!node?.parentElement) return;
    node.parentElement.children = node.parentElement.children.filter((child) => child !== node);
    node.parentElement = null;
  }
  append(...nodes) {
    for (const node of nodes) {
      this.detach(node);
      node.parentElement = this;
      this.children.push(node);
    }
  }
  replaceChildren(...nodes) {
    for (const child of this.children) child.parentElement = null;
    this.children = [];
    this.append(...nodes);
  }
  remove() { this.parentElement?.detach(this); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); if (name === "src") this.src = ""; }
  focus() { globalThis.document.activeElement = this; }
  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener({ preventDefault() {}, ...event });
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  querySelectorAll(selector) {
    const results = [];
    const visit = (node) => {
      for (const child of node.children ?? []) {
        if (matchesSelector(child, selector)) results.push(child);
        visit(child);
      }
    };
    visit(this);
    return results;
  }
  closest(selector) {
    let current = this;
    while (current) {
      if (matchesSelector(current, selector)) return current;
      current = current.parentElement;
    }
    return null;
  }
  scrollIntoView() {}
  scrollTo() {}
}

const ids = [
  "model-select", "model-eyebrow", "model-title", "model-summary", "model-stats",
  "model-concept", "model-concept-summary", "model-diagram-signature", "model-diagram-statement",
  "model-concept-vignette", "model-substrate", "model-retains", "model-varies", "model-question",
  "section-tabs", "section-current-label", "section-route-note", "section-summary",
  "object-picker", "object-select", "view-all", "view-focus", "compare-parent", "viewport-note",
  "all-live-board", "inspector-role", "inspector-object-title", "inspector-status", "inspector-tabs",
  "inspector-panel-summary", "inspector-panel-relations", "inspector-panel-records",
  "difference-eyebrow", "difference-variable", "difference-before-label", "difference-before",
  "difference-after-label", "difference-after", "difference-unchanged-label", "difference-unchanged",
  "outcome-title", "outcome-disposition", "outcome-evidence", "outcome-next-row", "outcome-next-label",
  "outcome-next-gate", "inspector-relations", "inspector-records",
];
const elementTagFor = (id) => {
  if (id.includes("select")) return "select";
  if (id === "model-concept") return "details";
  if (id === "model-concept-summary") return "summary";
  return "div";
};
const selectors = new Map(ids.map((id) => {
  const element = new FakeElement(elementTagFor(id));
  element.id = id;
  return [`#${id}`, element];
}));

for (const [id, tab] of [
  ["summary", "inspector-panel-summary"],
  ["relations", "inspector-panel-relations"],
  ["records", "inspector-panel-records"],
]) {
  const button = new FakeElement("button");
  button.dataset.inspectorTab = id;
  button.setAttribute("aria-controls", tab);
  selectors.get("#inspector-tabs").append(button);
}

const viewportButtons = ["320", "390", "desktop"].map((viewport) => {
  const button = new FakeElement("button");
  button.dataset.viewport = viewport;
  return button;
});
const viewModeButtons = [
  [selectors.get("#view-all"), "all"],
  [selectors.get("#view-focus"), "focus"],
].map(([button, mode]) => {
  button.dataset.viewMode = mode;
  return button;
});

const body = new FakeElement("body");
const registrySource = await readFile(new URL("research-history/prototype-registry.js", root), "utf8");
const sandbox = { window: {} };
runInNewContext(registrySource, sandbox, { filename: "research-history/prototype-registry.js" });

const previousGlobals = Object.fromEntries(
  ["window", "document", "history", "requestAnimationFrame", "ResizeObserver"].map((name) => [name, globalThis[name]]),
);
const hadGlobals = Object.fromEntries(Object.keys(previousGlobals).map((name) => [name, name in globalThis]));
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
      if (selector === "[data-view-mode]") return viewModeButtons;
      return [];
    },
    createElement: (tagName) => new FakeElement(tagName),
  };
  globalThis.window = {
    menuLensPrototypeRegistry: sandbox.window.menuLensPrototypeRegistry,
    location: {
      search: "?model=landscape-paper&section=reading-grammar&variant=18B&viewport=390",
      hash: "",
      href: "",
    },
    history: null,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener: (type, listener) => { if (type === "popstate") popstateListener = listener; },
  };
  globalThis.history = {
    replaceState: (_state, _title, url) => { lastUrl = url; },
    pushState: (_state, _title, url) => { pushedUrl = url; },
  };
  globalThis.window.history = globalThis.history;
  globalThis.requestAnimationFrame = (callback) => { callback(); return 1; };
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };

  const rendererUrl = new URL("research-history/model-page.mjs", root);
  await import(`${rendererUrl.href}?model-workbench-refactor=${Date.now()}`);

  if (selectors.get("#model-title").textContent !== "Landscape Paper") {
    throw new Error("Model viewer did not resolve the requested design model.");
  }
  if (selectors.get("#model-concept").open) {
    throw new Error("Narrow model views must begin with the secondary concept preview collapsed.");
  }
  if (!selectors.get("#model-diagram-signature").textContent) {
    throw new Error("Collapsed concept summary must identify the active section concept.");
  }
  if (selectors.get("#inspector-object-title").textContent !== "18B · Semantic Zoom") {
    throw new Error("Inspector must identify the active object once.");
  }
  const board = selectors.get("#all-live-board");
  if (board.hidden || board.children.length !== 4) {
    throw new Error("Default view must show every object in the active sub-study.");
  }
  const currentCard = board.children.find((card) => card.dataset.objectId === "18B");
  const currentFrame = currentCard?.querySelector("iframe.model-live-frame");
  if (!currentFrame || currentFrame.src !== "../phases/18b-semantic-zoom/index.html") {
    throw new Error("The active board card must host its executable surface.");
  }
  if (lastUrl?.includes("view=") || lastUrl?.includes("compare=")) {
    throw new Error("The default all-object URL must remain canonical.");
  }
  if (!selectors.get("#object-picker").hidden || !selectors.get("#compare-parent").hidden) {
    throw new Error("Full-group view must avoid duplicate selected-object and parent controls.");
  }

  currentFrame.reviewMarker = "pool-preserved";
  selectors.get("#view-focus").dispatch("click");
  const focusCards = board.children.filter((card) => !card.hidden);
  const focusFrame = focusCards[0]?.querySelector("iframe.model-live-frame");
  if (board.dataset.viewMode !== "focus" || focusCards.length !== 1
    || focusFrame !== currentFrame || focusFrame.reviewMarker !== "pool-preserved"
    || selectors.get("#object-picker").hidden
    || selectors.get("#compare-parent").hidden
    || selectors.get("#compare-parent").textContent !== "與 18 比較") {
    throw new Error("Selected-object view must reveal its picker and concrete comparison action without recreating the iframe.");
  }
  selectors.get("#view-all").dispatch("click");
  const returnedFrame = board.children
    .find((card) => card.dataset.objectId === "18B")
    ?.querySelector("iframe.model-live-frame");
  if (board.dataset.viewMode !== "all" || board.children.some((card) => card.hidden)
    || returnedFrame !== currentFrame) {
    throw new Error("Returning to the full board must reveal the same iframe instances.");
  }

  viewportButtons[2].dispatch("click");
  if (currentFrame.style.width !== "1024px" || currentFrame.reviewMarker !== "pool-preserved") {
    throw new Error("Viewport changes must resize pooled surfaces without reloading them.");
  }
  if (!pushedUrl?.includes("viewport=desktop")) {
    throw new Error("Viewport changes must create navigable history entries.");
  }

  const objectSelect = selectors.get("#object-select");
  objectSelect.value = "18";
  objectSelect.dispatch("change");
  if (board.hidden || selectors.get("#inspector-object-title").textContent !== "18 · Landscape Paper") {
    throw new Error("Object selection must update the inspector without closing the full board.");
  }

  objectSelect.value = "18B";
  objectSelect.dispatch("change");
  const parentFrame = board.children
    .find((card) => card.dataset.objectId === "18")
    ?.querySelector("iframe.model-live-frame");
  parentFrame.reviewMarker = "parent-preserved";
  selectors.get("#compare-parent").dispatch("click");
  const compareCards = board.children.filter((card) => !card.hidden);
  const compareCurrent = board.children
    .find((card) => card.dataset.objectId === "18B")
    ?.querySelector("iframe.model-live-frame");
  const compareParent = board.children
    .find((card) => card.dataset.objectId === "18")
    ?.querySelector("iframe.model-live-frame");
  const compareRoles = compareCards.map((card) => card.querySelector(".model-live-card__role")?.textContent);
  if (board.dataset.viewMode !== "compare" || compareCards.length !== 2
    || compareCurrent !== currentFrame || compareParent !== parentFrame
    || compareParent.reviewMarker !== "parent-preserved"
    || selectors.get("#compare-parent").textContent !== "結束比較"
    || !compareRoles.includes("比較對象") || !compareRoles.includes("比較基準")) {
    throw new Error("Concrete comparison must label its object and baseline without using current/Parent ambiguity.");
  }

  const inspectorTabs = selectors.get("#inspector-tabs").children;
  inspectorTabs[1].dispatch("click");
  if (selectors.get("#inspector-panel-relations").hidden || !selectors.get("#inspector-panel-summary").hidden) {
    throw new Error("Inspector tabs must concentrate relations without rendering a separate page section.");
  }
  inspectorTabs[2].dispatch("click");
  if (selectors.get("#inspector-panel-records").hidden || !selectors.get("#inspector-panel-relations").hidden) {
    throw new Error("Inspector tabs must expose records in place.");
  }

  const modelSelect = selectors.get("#model-select");
  modelSelect.value = "paper-field";
  modelSelect.dispatch("change");
  const studyOption = [...selectors.get("#object-select").options].find((option) => option.value === "12A-S1");
  if (!studyOption) throw new Error("Paper Field must expose the 12A-S1 study object.");
  selectors.get("#object-select").value = "12A-S1";
  selectors.get("#object-select").dispatch("change");
  if (!selectors.get("#compare-parent").hidden) {
    throw new Error("Study objects must not expose a fake parent comparison.");
  }
  if (selectors.get("#inspector-role").textContent !== "研究工具"
    || selectors.get("#inspector-object-title").textContent !== "12A-S1 · Blinded Reader Comparison"
    || selectors.get("#difference-variable").textContent !== "盲測比較") {
    throw new Error("12A-S1 must retain its identity and explicit blinded-comparison method.");
  }
  const studyCard = selectors.get("#all-live-board").children.find((card) => card.dataset.objectId === "12A-S1");
  if (studyCard?.querySelector(".model-live-card__select")?.children[0]?.textContent !== "12A-S1 · Blinded Reader Comparison"
    || studyCard?.querySelector(".model-live-card__meta")?.textContent !== "盲測比較 · 12 / 12A") {
    throw new Error("12A-S1 card must separate research-tool role, object identity, and protocol metadata.");
  }

  modelSelect.value = "depth-projection";
  modelSelect.dispatch("change");
  selectors.get("#object-select").value = "25P-S1";
  selectors.get("#object-select").dispatch("change");
  const depthStudyCard = selectors.get("#all-live-board").children.find((card) => card.dataset.objectId === "25P-S1");
  if (selectors.get("#inspector-object-title").textContent !== "25P-S1 · Unfamiliar-reader Study"
    || selectors.get("#difference-variable").textContent !== "陌生讀者任務"
    || selectors.get("#difference-before").textContent.includes("25P-L1")
    || !selectors.get("#difference-unchanged").textContent.includes("25P-L1")
    || depthStudyCard?.querySelector(".model-live-card__meta")?.textContent !== "陌生讀者任務 · 25P") {
    throw new Error("25P-S1 must describe one study condition with L1 as a prerequisite, not a blind comparison.");
  }

  if (typeof popstateListener !== "function") {
    throw new Error("Model viewer must subscribe to browser history navigation.");
  }
  globalThis.window.location.search = "?model=complete-document&section=baseline&variant=01&viewport=320&view=focus";
  popstateListener();
  if (selectors.get("#model-title").textContent !== "Complete Document"
    || selectors.get("#all-live-board").dataset.viewMode !== "focus"
    || selectors.get("#all-live-board").children.filter((card) => !card.hidden).length !== 1
    || selectors.get("#object-select").value !== "01") {
    throw new Error("Browser history must restore model, section, object, viewport, and mode.");
  }

  const css = await readFile(new URL("research-history/model-page-workbench.css", root), "utf8");
  for (const contract of [
    "width: min(1760px",
    ".model-live-board",
    "overflow-x: auto",
    "flex: 0 0 calc(var(--model-live-width)",
    'data-view-mode="compare"',
    ".model-object-inspector",
    'data-object-type="study"',
    "#inspector-panel-summary",
  ]) {
    if (!css.includes(contract)) throw new Error(`Model workbench CSS is missing refactor contract: ${contract}`);
  }

  for (const path of [
    "research-history/model-page-state.mjs",
    "research-history/model-surface-pool.mjs",
    "research-history/model-live-board.mjs",
    "research-history/model-object-inspector.mjs",
  ]) {
    await readFile(new URL(path, root), "utf8");
  }
} finally {
  for (const [name, value] of Object.entries(previousGlobals)) {
    if (hadGlobals[name]) globalThis[name] = value;
    else delete globalThis[name];
  }
}

console.log("Design model workbench: canonical live board, filtered focus/compare modes, compact navigation, inspector tabs, and history contracts verified.");
