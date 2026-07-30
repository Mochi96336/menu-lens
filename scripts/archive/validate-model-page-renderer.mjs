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
  "#model-substrate",
  "#model-retains",
  "#model-varies",
  "#model-question",
  "#section-summary",
  "#section-tabs",
  "#variant-list",
  "#compare-parent",
  "#preview-grid",
  "#current-object-title",
  "#current-object-status",
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
  "#outcome-disposition",
  "#outcome-evidence",
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
try {
  globalThis.document = {
    title: "",
    body,
    activeElement: null,
    querySelector: (selector) => selectors.get(selector) ?? null,
    querySelectorAll: (selector) => selector === "[data-viewport]" ? viewportButtons : [],
    createElement: (tagName) => new FakeElement(tagName),
  };
  globalThis.window = {
    menuLensPrototypeRegistry: sandbox.window.menuLensPrototypeRegistry,
    location: {
      search: "?model=landscape-paper&section=reading-grammar&variant=18B&viewport=390&compare=parent",
      hash: "",
      href: "",
    },
  };
  globalThis.history = {
    replaceState: (_state, _title, url) => { lastUrl = url; },
  };

  const rendererUrl = new URL("research-history/model-page.mjs", root);
  await import(`${rendererUrl.href}?model-renderer-smoke=${Date.now()}`);

  if (selectors.get("#model-title").textContent !== "Landscape Paper") {
    throw new Error("Model viewer did not resolve the requested design model.");
  }
  if (selectors.get("#current-object-title").textContent !== "18B · 18B Semantic Zoom") {
    throw new Error("Model viewer did not resolve the requested current object.");
  }
  const currentFrame = selectors.get("#current-preview").children[0];
  if (currentFrame?.tagName !== "IFRAME" || currentFrame.src !== "../phases/18b-semantic-zoom/index.html") {
    throw new Error("Model viewer did not render the exact current prototype entrypoint.");
  }
  const parentFrame = selectors.get("#parent-preview").children[0];
  if (selectors.get("#parent-pane").hidden || parentFrame?.src !== "../phases/18-landscape-paper/index.html") {
    throw new Error("Model viewer did not render the requested canonical parent comparison.");
  }
  if (selectors.get("#difference-eyebrow").textContent !== "Isolated difference") {
    throw new Error("Controlled variants must render as isolated differences.");
  }
  if (!lastUrl?.includes("model=landscape-paper") || !lastUrl.includes("compare=parent")) {
    throw new Error("Model viewer did not publish its current deep-link state.");
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

  modelSelect.value = "multiscale-focus";
  modelSelect.dispatch("change");
  const sectionTabs = selectors.get("#section-tabs").children;
  if (sectionTabs[0].tabIndex !== 0 || sectionTabs[1].tabIndex !== -1) {
    throw new Error("Section tabs must expose one keyboard tab stop.");
  }
  sectionTabs[1].dispatch("click");
  selectors.get("#variant-list").children[1].dispatch("click");
  if (selectors.get("#difference-eyebrow").textContent !== "Prerequisite correction") {
    throw new Error("Correction objects must render their prerequisite role.");
  }

  const css = await readFile(new URL("research-history/model-page.css", root), "utf8");
  for (const contract of [
    '--preview-width: 320px',
    '--preview-width: 390px',
    '--preview-width: 1024px',
    'min-width: var(--preview-width)',
  ]) {
    if (!css.includes(contract)) throw new Error(`Model preview CSS is missing exact-width contract: ${contract}`);
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

console.log("Design model viewer: deep links, featured landings, exact prototypes, role-aware analysis, stable iframes, tabs, and controlled widths verified.");
