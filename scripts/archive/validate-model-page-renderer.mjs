import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { root } from "./load-catalog.mjs";

const matchesSelector = (element, selector) => {
  if (selector === "img.model-preview-image") {
    return element.tagName === "IMG" && element.className.split(/\s+/).includes("model-preview-image");
  }
  const dataMatch = selector.match(/^\[data-([a-z-]+)\]$/);
  if (dataMatch) {
    const key = dataMatch[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return Object.prototype.hasOwnProperty.call(element.dataset, key);
  }
  return false;
};

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
  }

  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  focus() { globalThis.document.activeElement = this; }
  dispatch(type, event = {}) {
    const listener = this.listeners.get(type);
    if (listener) listener({ preventDefault() {}, ...event });
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
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
}

const requiredSelectors = [
  "#model-select", "#model-eyebrow", "#model-title", "#model-summary", "#model-stats",
  "#model-substrate", "#model-retains", "#model-varies", "#model-question", "#section-summary",
  "#section-tabs", "#variant-list", "#stage-context-role", "#stage-context-copy", "#view-focus",
  "#compare-parent", "#view-all", "#parent-record-link", "#viewport-note", "#preview-grid",
  "#all-preview-grid", "#current-object-title", "#current-object-status", "#current-exact-link",
  "#current-preview-title", "#current-preview-status", "#current-preview", "#parent-pane", "#parent-object-title", "#parent-object-status", "#parent-preview",
  "#difference-eyebrow", "#difference-variable", "#difference-before-label", "#difference-before",
  "#difference-after-label", "#difference-after", "#difference-unchanged-label", "#difference-unchanged",
  "#outcome-title", "#outcome-disposition", "#outcome-evidence", "#outcome-next-row",
  "#outcome-next-label", "#outcome-next-gate", "#lineage", "#record-links",
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

  const rendererUrl = new URL("research-history/model-page.mjs", root);
  await import(`${rendererUrl.href}?model-renderer-smoke=${Date.now()}`);

  if (selectors.get("#model-title").textContent !== "Landscape Paper") {
    throw new Error("Model viewer did not resolve the requested design model.");
  }
  if (selectors.get("#current-object-title").textContent !== "18B · Semantic Zoom") {
    throw new Error("Display titles must not repeat a canonical object ID prefix.");
  }
  const currentImage = selectors.get("#current-preview").children[0];
  if (currentImage?.tagName !== "IMG" || currentImage.src !== "../previews/18B/390.png") {
    throw new Error("Model viewer must render the generated current preview image instead of a nested iframe.");
  }
  if (selectors.get("#current-preview").children.some((child) => child.tagName === "IFRAME")) {
    throw new Error("Reader-facing model pages must not embed live prototype iframes.");
  }
  if (selectors.get("#current-exact-link").hidden
    || selectors.get("#current-exact-link").href !== "../phases/18b-semantic-zoom/index.html") {
    throw new Error("The stage must retain an exact prototype action outside the preview image.");
  }
  const parentImage = selectors.get("#parent-preview").children[0];
  if (selectors.get("#parent-pane").hidden || parentImage?.src !== "../previews/18/390.png") {
    throw new Error("The requested parent comparison must render beside the current preview.");
  }
  if (selectors.get("#preview-grid").dataset.viewMode !== "compare") {
    throw new Error("Parent comparison must be represented as a side-by-side view mode.");
  }
  if (selectors.get("#difference-eyebrow").textContent !== "受控變因") {
    throw new Error("Controlled variants must use direct reader-facing role labels.");
  }
  if (!lastUrl?.includes("compare=parent")) {
    throw new Error("Model viewer did not preserve the comparison deep link.");
  }

  viewportButtons[2].dispatch("click");
  if (selectors.get("#current-preview").children[0] !== currentImage) {
    throw new Error("Changing viewport must preserve the preview image element.");
  }
  if (currentImage.src !== "../previews/18B/desktop.png") {
    throw new Error("Changing viewport must select the matching generated preview asset.");
  }
  if (!pushedUrl?.includes("viewport=desktop")) {
    throw new Error("Viewport changes must create navigable history entries.");
  }

  selectors.get("#view-all").dispatch("click");
  if (selectors.get("#all-preview-grid").hidden || !selectors.get("#preview-grid").hidden) {
    throw new Error("All mode must replace the focus stage with the section comparison board.");
  }
  if (selectors.get("#all-preview-grid").children.length !== 4) {
    throw new Error("All mode must render every object in the active sub-study.");
  }
  if (!pushedUrl?.includes("view=all")) {
    throw new Error("All mode must publish a deep-linkable view state.");
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
  for (const contract of [
    ".model-preview-image",
    'data-view-mode="compare"',
    ".model-all-preview-grid",
    "grid-auto-flow: column",
    "@media (min-width: 901px) and (max-width: 1050px)",
  ]) {
    if (!css.includes(contract)) throw new Error(`Model workbench CSS is missing preview contract: ${contract}`);
  }
} finally {
  for (const name of ["window", "document", "history"]) {
    if (hadGlobals[name]) globalThis[name] = previousGlobals[name];
    else delete globalThis[name];
  }
}

console.log("Design model viewer: static preview assets, side-by-side comparison, section board, deep links, roles, and responsive contracts verified.");
