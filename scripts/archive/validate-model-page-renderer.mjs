import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { root } from "./load-catalog.mjs";

const matchesSelector = (element, selector) => {
  if (selector === "img.model-preview-image") {
    return element.tagName === "IMG" && element.className.split(/\s+/).includes("model-preview-image");
  }
  if (selector === "iframe.model-live-frame") {
    return element.tagName === "IFRAME" && element.className.split(/\s+/).includes("model-live-frame");
  }
  if (selector.startsWith(".")) return element.className.split(/\s+/).includes(selector.slice(1));
  const dataValueMatch = selector.match(/^\[data-([a-z-]+)="([^"]+)"\]$/);
  if (dataValueMatch) {
    const key = dataValueMatch[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return element.dataset[key] === dataValueMatch[2];
  }
  const dataMatch = selector.match(/^\[data-([a-z-]+)\]$/);
  if (dataMatch) {
    const key = dataMatch[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return Object.prototype.hasOwnProperty.call(element.dataset, key);
  }
  return false;
};

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); }
  removeProperty(name) { this.values.delete(name); }
  getPropertyValue(name) { return this.values.get(name) ?? ""; }
}

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
    this.src = "";
    this.alt = "";
    this.hidden = false;
    this.disabled = false;
    this.tabIndex = 0;
    this.title = "";
    this.style = new FakeStyle();
    this.parentElement = null;
    this.offsetLeft = 0;
    this.offsetWidth = 300;
    this.clientWidth = 320;
    this.scrollWidth = 1200;
  }

  append(...nodes) {
    for (const node of nodes) {
      node.parentElement = this;
      this.children.push(node);
    }
  }
  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); if (name === "src") this.src = ""; }
  focus() { globalThis.document.activeElement = this; }
  dispatch(type, event = {}) {
    const listener = this.listeners.get(type);
    if (listener) listener({ preventDefault() {}, ...event });
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
  scrollTo() {}
  scrollIntoView() {}
}

const requiredSelectors = [
  "#model-select", "#model-eyebrow", "#model-title", "#model-summary", "#model-stats",
  "#model-substrate", "#model-retains", "#model-varies", "#model-question", "#section-summary",
  "#section-tabs", "#variant-list", "#stage-context-role", "#stage-context-copy", "#view-focus",
  "#compare-parent", "#view-all", "#parent-record-link", "#viewport-note", "#preview-grid",
  "#all-preview-grid", "#current-object-title", "#current-object-status", "#current-exact-link",
  "#current-preview-title", "#current-preview-status", "#current-preview", "#parent-pane", "#parent-object-title",
  "#parent-object-status", "#parent-preview", "#difference-eyebrow", "#difference-variable",
  "#difference-before-label", "#difference-before", "#difference-after-label", "#difference-after",
  "#difference-unchanged-label", "#difference-unchanged", "#outcome-title", "#outcome-disposition",
  "#outcome-evidence", "#outcome-next-row", "#outcome-next-label", "#outcome-next-gate", "#lineage", "#record-links",
];
const selectors = new Map(requiredSelectors.map((selector) => [selector, new FakeElement()]));
const viewportButtons = ["320", "390", "desktop"].map((viewport) => {
  const button = new FakeElement("button");
  button.dataset.viewport = viewport;
  return button;
});
const viewModeButtons = [
  [selectors.get("#view-focus"), "focus"],
  [selectors.get("#compare-parent"), "compare"],
  [selectors.get("#view-all"), "all"],
].map(([button, mode]) => {
  button.dataset.viewMode = mode;
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
  requestAnimationFrame: globalThis.requestAnimationFrame,
  ResizeObserver: globalThis.ResizeObserver,
};
const hadGlobals = Object.fromEntries(
  Object.keys(previousGlobals).map((name) => [name, Object.prototype.hasOwnProperty.call(globalThis, name)]),
);

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
  globalThis.requestAnimationFrame = (callback) => { callback(); return 1; };
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };

  const rendererUrl = new URL("research-history/model-page.mjs", root);
  await import(`${rendererUrl.href}?model-renderer-live-smoke=${Date.now()}`);

  if (selectors.get("#model-title").textContent !== "Landscape Paper") {
    throw new Error("Model viewer did not resolve the requested design model.");
  }
  if (selectors.get("#current-object-title").textContent !== "18B · Semantic Zoom") {
    throw new Error("Display titles must not repeat a canonical object ID prefix.");
  }

  const currentFrame = selectors.get("#current-preview").querySelector("iframe.model-live-frame");
  const parentFrame = selectors.get("#parent-preview").querySelector("iframe.model-live-frame");
  if (!currentFrame || currentFrame.src !== "../phases/18b-semantic-zoom/index.html") {
    throw new Error("Focus mode must load the selected executable object as a live surface.");
  }
  if (!parentFrame || selectors.get("#parent-pane").hidden) {
    throw new Error("Parent comparison must create a second live surface.");
  }
  if (selectors.get("#preview-grid").dataset.viewMode !== "compare") {
    throw new Error("Parent comparison must be represented as a side-by-side live mode.");
  }
  if (selectors.get("#difference-eyebrow").textContent !== "受控變因") {
    throw new Error("Controlled variants must use direct reader-facing role labels.");
  }
  if (!lastUrl?.includes("compare=parent")) {
    throw new Error("Model viewer did not preserve the comparison deep link.");
  }

  currentFrame.reviewMarker = "preserved";
  viewportButtons[2].dispatch("click");
  const currentFrameAfterViewport = selectors.get("#current-preview").querySelector("iframe.model-live-frame");
  if (currentFrameAfterViewport !== currentFrame || currentFrameAfterViewport.reviewMarker !== "preserved") {
    throw new Error("Changing viewport must preserve the live iframe instance and interaction state.");
  }
  if (currentFrame.style.width !== "1024px") {
    throw new Error("Changing viewport must resize the live surface without reloading it.");
  }
  if (!pushedUrl?.includes("viewport=desktop")) {
    throw new Error("Viewport changes must create navigable history entries.");
  }

  selectors.get("#view-all").dispatch("click");
  if (selectors.get("#all-preview-grid").hidden || !selectors.get("#preview-grid").hidden) {
    throw new Error("All mode must replace the live stage with the static section board.");
  }
  if (selectors.get("#all-preview-grid").children.length !== 4) {
    throw new Error("All mode must render every object in the active sub-study.");
  }
  if (selectors.get("#all-preview-grid").querySelectorAll("iframe.model-live-frame").length) {
    throw new Error("All-object cards must remain static and must not create nested live frames.");
  }
  if (selectors.get("#current-preview").querySelector("iframe.model-live-frame") !== currentFrame) {
    throw new Error("Opening the static section board must preserve the hidden live surface.");
  }

  const secondCardButton = selectors.get("#all-preview-grid").children[1]?.children[0];
  secondCardButton?.dispatch("click");
  if (!selectors.get("#all-preview-grid").hidden || selectors.get("#preview-grid").hidden) {
    throw new Error("Selecting a static card must return to the operable focus view.");
  }

  const sectionTabs = selectors.get("#section-tabs").children;
  sectionTabs[2].dispatch("click");
  const renderedFocusTabs = selectors.get("#section-tabs").children;
  if (globalThis.document.activeElement !== renderedFocusTabs[2]) {
    throw new Error("Selecting a sub-study must retain focus on its active tab.");
  }
  const focusVariants = selectors.get("#variant-list").children;
  focusVariants[3].dispatch("click");
  if (selectors.get("#difference-eyebrow").textContent !== "停止結果") {
    throw new Error("Negative evidence must render as a stopped result.");
  }

  const modelSelect = selectors.get("#model-select");
  modelSelect.value = "paper-field";
  modelSelect.dispatch("change");
  selectors.get("#variant-list").children[3].dispatch("click");
  if (selectors.get("#difference-eyebrow").textContent !== "研究工具") {
    throw new Error("Study objects must retain their study role.");
  }
  if (!selectors.get("#compare-parent").hidden || selectors.get("#parent-record-link").hidden) {
    throw new Error("Study objects must expose a parent record instead of a fake visual comparison.");
  }
  if (selectors.get("#current-exact-link").textContent !== "開啟研究工具 ↗") {
    throw new Error("Study entrypoints must be presented as research tools, not prototypes.");
  }
  if (!selectors.get("#current-preview").querySelector("iframe.model-live-frame")) {
    throw new Error("Study tools with entrypoints must remain operable in focus mode.");
  }

  if (typeof popstateListener !== "function") {
    throw new Error("Model viewer must subscribe to browser history navigation.");
  }
  globalThis.window.location.search = "?model=complete-document&section=baseline&variant=01&viewport=320&view=all";
  popstateListener();
  if (selectors.get("#current-object-title").textContent !== "01 · Complete menu"
    || selectors.get("#all-preview-grid").hidden) {
    throw new Error("Browser history must restore object, viewport, and observation mode.");
  }

  const css = await readFile(new URL("research-history/model-page-workbench.css", root), "utf8");
  const liveSource = await readFile(new URL("research-history/model-live-surface.mjs", root), "utf8");
  for (const contract of [
    ".model-live-frame",
    ".model-live-fallback",
    'data-view-mode="compare"',
    ".model-all-preview-grid",
    "grid-auto-flow: column",
    "@media (min-width: 901px) and (max-width: 1050px)",
  ]) {
    if (!css.includes(contract)) throw new Error(`Model workbench CSS is missing hybrid-view contract: ${contract}`);
  }
  for (const contract of ["isolateTarget", "ResizeObserver", "model-live-ready", "waitForImages"]) {
    if (!liveSource.includes(contract)) throw new Error(`Live-surface adapter is missing contract: ${contract}`);
  }
} finally {
  for (const name of ["window", "document", "history", "requestAnimationFrame", "ResizeObserver"]) {
    if (hadGlobals[name]) globalThis[name] = previousGlobals[name];
    else delete globalThis[name];
  }
}

console.log("Design model viewer: operable live focus/compare surfaces, static section board, preserved state, roles, and responsive contracts verified.");
