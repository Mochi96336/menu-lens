import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { root } from "./load-catalog.mjs";

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.listeners = new Map();
    this.className = "";
    this.textContent = "";
    this.href = "";
    this.hidden = false;
    this.value = "";
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }
}

const registrySource = await readFile(new URL("research-history/prototype-registry.js", root), "utf8");
const manifest = JSON.parse(await readFile(new URL("research-history/originals/manifest.json", root), "utf8"));
const sandbox = { window: {} };
runInNewContext(registrySource, sandbox, { filename: "research-history/prototype-registry.js" });

const selectors = new Map([
  ["#archive-objects", new FakeElement()],
  ["#archive-families", new FakeElement()],
  ["#archive-originals", new FakeElement()],
  ["#object-count", new FakeElement("span")],
  ["#executable-count", new FakeElement("span")],
  ["#study-count", new FakeElement("span")],
  ["#type-filter", new FakeElement("select")],
  ["#disposition-filter", new FakeElement("select")],
  ["#catalog-empty", new FakeElement("p")],
]);
selectors.get("#type-filter").value = "all";
selectors.get("#disposition-filter").value = "all";
selectors.get("#catalog-empty").hidden = true;

const previousGlobals = {
  window: globalThis.window,
  document: globalThis.document,
  fetch: globalThis.fetch,
};
const hadGlobals = {
  window: Object.prototype.hasOwnProperty.call(globalThis, "window"),
  document: Object.prototype.hasOwnProperty.call(globalThis, "document"),
  fetch: Object.prototype.hasOwnProperty.call(globalThis, "fetch"),
};

try {
  globalThis.window = { menuLensPrototypeRegistry: sandbox.window.menuLensPrototypeRegistry };
  globalThis.document = {
    querySelector: (selector) => selectors.get(selector) ?? null,
    createElement: (tagName) => new FakeElement(tagName),
  };
  globalThis.fetch = async (path) => {
    if (path !== "./originals/manifest.json") throw new Error(`Unexpected renderer request: ${path}`);
    return { ok: true, status: 200, json: async () => manifest };
  };

  const rendererUrl = new URL("research-history/catalog/render-index.mjs", root);
  await import(`${rendererUrl.href}?renderer-smoke=${Date.now()}`);

  const catalog = globalThis.window.menuLensArchiveCatalog;
  if (!catalog || catalog.schemaVersion !== 2) throw new Error("Index renderer did not expose catalog v2.");

  const objectRoot = selectors.get("#archive-objects");
  const familyRoot = selectors.get("#archive-families");
  const originalRoot = selectors.get("#archive-originals");
  if (objectRoot.children.length !== catalog.objects.length) {
    throw new Error(`Index renderer produced ${objectRoot.children.length} object cards for ${catalog.objects.length} objects.`);
  }
  if (familyRoot.children.length !== catalog.families.length) {
    throw new Error(`Index renderer produced ${familyRoot.children.length} family cards for ${catalog.families.length} families.`);
  }
  if (originalRoot.children.length !== manifest.snapshots.length) {
    throw new Error(`Index renderer produced ${originalRoot.children.length} original cards for ${manifest.snapshots.length} snapshots.`);
  }

  const expectedEntrypoints = new Set(catalog.objects
    .filter((object) => object.entrypoint)
    .map((object) => `./${object.entrypoint.replace(/index\.html$/, "")}`));
  const objectLinks = objectRoot.children.flatMap((card) => card.children)
    .flatMap((child) => child.children ?? [])
    .filter((child) => child.tagName === "A")
    .map((child) => child.href);
  for (const entrypoint of expectedEntrypoints) {
    if (!objectLinks.includes(entrypoint)) throw new Error(`Index renderer is missing executable link ${entrypoint}`);
  }

  const typeFilter = selectors.get("#type-filter");
  const applyTypeFilter = typeFilter.listeners.get("change");
  if (typeof applyTypeFilter !== "function") throw new Error("Index renderer did not bind the type filter.");
  typeFilter.value = "historical";
  applyTypeFilter();
  const visibleHistorical = objectRoot.children.filter((card) => !card.hidden).length;
  const expectedHistorical = catalog.objects.filter((object) => object.objectType === "historical").length;
  if (visibleHistorical !== expectedHistorical) {
    throw new Error(`Historical filter showed ${visibleHistorical} cards; expected ${expectedHistorical}.`);
  }

  if (!selectors.get("#object-count").textContent.includes(String(catalog.objects.length))) {
    throw new Error("Index renderer did not publish the object count.");
  }
} finally {
  for (const name of ["window", "document", "fetch"]) {
    if (hadGlobals[name]) globalThis[name] = previousGlobals[name];
    else delete globalThis[name];
  }
}

console.log("Archive index renderer: DOM, manifest, links, counts, and filtering verified.");
