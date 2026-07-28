import { access, readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);

const registrySource = await readFile(new URL("prototype-registry.js", archiveRoot), "utf8");
const registrySandbox = { window: {} };
runInNewContext(registrySource, registrySandbox, {
  filename: "research-history/prototype-registry.js",
});
const registry = registrySandbox.window.menuLensPrototypeRegistry;
if (!registry || registry.schemaVersion !== 1) {
  throw new Error("Prototype registry must expose schemaVersion 1.");
}
if (!Array.isArray(registry.families) || !Array.isArray(registry.prototypes)) {
  throw new Error("Prototype registry must expose families and prototypes arrays.");
}

const familyIds = new Set(registry.families.map((family) => family.id));
const prototypeIds = new Set();
const prototypeSlugs = new Set();
for (const prototype of registry.prototypes) {
  if (prototypeIds.has(prototype.id)) throw new Error(`Duplicate prototype id: ${prototype.id}`);
  if (prototypeSlugs.has(prototype.slug)) throw new Error(`Duplicate prototype slug: ${prototype.slug}`);
  if (!familyIds.has(prototype.family)) {
    throw new Error(`Prototype ${prototype.id} references unknown family ${prototype.family}.`);
  }
  prototypeIds.add(prototype.id);
  prototypeSlugs.add(prototype.slug);
}
for (const prototype of registry.prototypes) {
  if (prototype.parentId && !prototypeIds.has(prototype.parentId)) {
    throw new Error(`Prototype ${prototype.id} references unknown parent ${prototype.parentId}.`);
  }
}

const registeredSnapshots = registry.prototypes.filter((prototype) => prototype.path);
const reconstructedSnapshots = registeredSnapshots.map((prototype) => prototype.path);
const manifest = JSON.parse(await readFile(new URL("originals/manifest.json", archiveRoot), "utf8"));
if (!manifest || !Array.isArray(manifest.snapshots)) {
  throw new Error("Original snapshot manifest must expose a snapshots array.");
}
const originalSnapshots = manifest.snapshots.map((snapshot) => ({
  ...snapshot,
  path: `${snapshot.path.replace(/^\/research-history\//, "")}index.html`,
}));

const registryAssets = registeredSnapshots.flatMap((prototype) => [
  ...prototype.assets.styles,
  ...prototype.assets.scripts,
]);
const requiredFiles = [...new Set([
  "index.html",
  "prototype-registry.js",
  "originals/manifest.json",
  ...registryAssets,
  ...reconstructedSnapshots,
  ...originalSnapshots.flatMap(({ slug, path }) => [path, `originals/${slug}/ORIGIN.txt`]),
])];

await Promise.all(requiredFiles.map((path) => access(new URL(path, archiveRoot))));

const archiveIndex = await readFile(new URL("index.html", archiveRoot), "utf8");
if (!archiveIndex.includes("prototype-registry.js")) {
  throw new Error("Research archive index must load the canonical prototype registry.");
}
for (const objectCatalogContract of [
  'class="prototype-object-grid"',
  "object.dataset.prototypeId = prototype.id",
  "prototypeRegistry.prototypes.forEach((prototype) =>",
  "`${prototypeRegistry.prototypes.length} 個物件",
]) {
  if (!archiveIndex.includes(objectCatalogContract)) {
    throw new Error(`Research archive must render every exact prototype id as an independent object: ${objectCatalogContract}`);
  }
}
for (const distinctId of ["18", "18A", "18C", "25", "25P", "25B"]) {
  if (!registry.prototypes.some((prototype) => prototype.id === distinctId)) {
    throw new Error(`Prototype object catalog is missing the distinct id ${distinctId}.`);
  }
}
for (const prototype of registeredSnapshots) {
  const snapshot = prototype.path;
  const href = `./${snapshot.replace(/index\.html$/, "")}`;
  if (!archiveIndex.includes(`href="${href}`)) {
    throw new Error(`Research archive index does not link to reconstruction ${href}`);
  }
}
for (const { path } of originalSnapshots) {
  const href = `./${path.replace(/index\.html$/, "")}`;
  if (!archiveIndex.includes(`href="${href}`)) {
    throw new Error(`Research archive index does not link to original snapshot ${href}`);
  }
}

if (manifest.snapshots.length !== originalSnapshots.length) {
  throw new Error(
    `Original snapshot manifest must contain ${originalSnapshots.length} entries; received ${manifest.snapshots.length}.`,
  );
}

for (const expected of originalSnapshots) {
  const actual = manifest.snapshots.find((snapshot) => snapshot.slug === expected.slug);
  if (!actual) throw new Error(`Original snapshot manifest is missing ${expected.slug}.`);
  if (actual.sourceType !== "original_implementation") {
    throw new Error(`${expected.slug} must remain labelled original_implementation.`);
  }
  if (actual.repository !== "a20030824/menu-lens") {
    throw new Error(`${expected.slug} has an unexpected source repository.`);
  }
  if (actual.pullRequest !== expected.pullRequest) {
    throw new Error(`${expected.slug} must point to PR #${expected.pullRequest}.`);
  }
  if (actual.commit !== expected.commit) {
    throw new Error(`${expected.slug} must remain pinned to ${expected.commit}.`);
  }
  const origin = await readFile(new URL(`originals/${expected.slug}/ORIGIN.txt`, archiveRoot), "utf8");
  if (!origin.includes(`commit=${expected.commit}`)) {
    throw new Error(`${expected.slug}/ORIGIN.txt does not record its pinned commit.`);
  }
  const html = await readFile(new URL(expected.path, archiveRoot), "utf8");
  if (!html.startsWith("<!doctype html>")) {
    throw new Error(`${expected.path} must remain the standalone historical build entry.`);
  }
  if (!html.includes('<script type="module" src="./src/main.js"></script>')) {
    throw new Error(`${expected.path} must retain its original built module entry.`);
  }
}

const fixtureSource = await readFile(new URL("menu-fixture.js", archiveRoot), "utf8");
const fixtureSandbox = { window: {} };
runInNewContext(fixtureSource, fixtureSandbox, { filename: "research-history/menu-fixture.js" });
const menu = fixtureSandbox.window.menuLensResearchMenu;

if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
  throw new Error("Research fixture must expose categories and products.");
}
if (menu.categories.length !== 6) {
  throw new Error(`Research fixture must contain 6 categories; received ${menu.categories.length}.`);
}
if (menu.products.length !== 30) {
  throw new Error(`Research fixture must contain 30 products; received ${menu.products.length}.`);
}

const categoryIds = new Set(menu.categories.map((category) => category.id));
const productIds = new Set();
for (const product of menu.products) {
  if (productIds.has(product.id)) throw new Error(`Duplicate research ProductId: ${product.id}`);
  productIds.add(product.id);
  if (!categoryIds.has(product.categoryId)) {
    throw new Error(`Research product ${product.id} references unknown category ${product.categoryId}.`);
  }
}

const multiscaleRendererSource = await readFile(
  new URL("multiscale-menu-renderer.js", archiveRoot),
  "utf8",
);
runInNewContext(multiscaleRendererSource, fixtureSandbox, {
  filename: "research-history/multiscale-menu-renderer.js",
});
const renderMultiscaleMap = fixtureSandbox.window.renderMenuLensMultiscaleMap;
if (typeof renderMultiscaleMap !== "function") {
  throw new Error("Multi-scale renderer must expose renderMenuLensMultiscaleMap.");
}

const multiscaleMarkup = renderMultiscaleMap(menu);
const renderedProductIds = [...multiscaleMarkup.matchAll(/data-product-id="([^"]+)"/g)].map(
  (match) => match[1],
);
const renderedCategoryIds = [...multiscaleMarkup.matchAll(/data-category="([^"]+)"/g)].map(
  (match) => match[1],
);

if (renderedProductIds.length !== menu.products.length) {
  throw new Error(
    `Multi-scale snapshot must render ${menu.products.length} products; received ${renderedProductIds.length}.`,
  );
}
if (new Set(renderedProductIds).size !== renderedProductIds.length) {
  throw new Error("Multi-scale snapshot renders at least one ProductId more than once.");
}
for (const product of menu.products) {
  if (!renderedProductIds.includes(product.id)) {
    throw new Error(`Multi-scale snapshot is missing ${product.id}.`);
  }
}
if (renderedCategoryIds.length !== menu.categories.length) {
  throw new Error(
    `Multi-scale snapshot must render ${menu.categories.length} categories; received ${renderedCategoryIds.length}.`,
  );
}
for (const category of menu.categories) {
  if (!renderedCategoryIds.includes(category.id)) {
    throw new Error(`Multi-scale snapshot is missing category ${category.id}.`);
  }
}
if (multiscaleMarkup.includes("選這道")) {
  throw new Error("Multi-scale reading snapshot must not contain a unique order action.");
}

const multiscaleSnapshot = await readFile(
  new URL("phases/06-multiscale-menu-map/index.html", archiveRoot),
  "utf8",
);
for (const scriptPath of ["../../menu-fixture.js", "../../multiscale-menu-renderer.js"]) {
  if (!multiscaleSnapshot.includes(`<script src="${scriptPath}"></script>`)) {
    throw new Error(`Multi-scale snapshot must load ${scriptPath}.`);
  }
}
if (!multiscaleSnapshot.includes("window.renderMenuLensMultiscaleMap(menu)")) {
  throw new Error("Multi-scale snapshot must render from the shared fixture projection.");
}

const spreadRendererSource = await readFile(new URL("menu-spread-renderer.js", archiveRoot), "utf8");
runInNewContext(spreadRendererSource, fixtureSandbox, {
  filename: "research-history/menu-spread-renderer.js",
});
const renderSpread = fixtureSandbox.window.renderMenuLensSpread;
if (typeof renderSpread !== "function") {
  throw new Error("Menu Spread renderer must expose renderMenuLensSpread.");
}

const spreadMarkup = renderSpread(menu);
const spreadProductIds = [...spreadMarkup.matchAll(/data-product-id="([^"]+)"/g)].map(
  (match) => match[1],
);
const spreadCategoryIds = [...spreadMarkup.matchAll(/data-category-id="([^"]+)"/g)].map(
  (match) => match[1],
);

if (spreadProductIds.length !== menu.products.length) {
  throw new Error(
    `Menu Spread must render ${menu.products.length} products; received ${spreadProductIds.length}.`,
  );
}
if (new Set(spreadProductIds).size !== spreadProductIds.length) {
  throw new Error("Menu Spread renders at least one ProductId more than once.");
}
for (const product of menu.products) {
  if (!spreadProductIds.includes(product.id)) {
    throw new Error(`Menu Spread is missing ${product.id}.`);
  }
}

const expectedSpreadCategoryIds = menu.categories.map((category) => category.id);
if (spreadCategoryIds.join("|") !== expectedSpreadCategoryIds.join("|")) {
  throw new Error("Menu Spread must preserve all categories in canonical order.");
}
if (spreadMarkup.includes("選這道")) {
  throw new Error("Menu Spread reading hypothesis must not contain an order action.");
}

const spreadSnapshot = await readFile(new URL("phases/08-menu-spread/index.html", archiveRoot), "utf8");
for (const requiredReference of [
  '<link rel="stylesheet" href="../../menu-spread.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../menu-spread-renderer.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
]) {
  if (!spreadSnapshot.includes(requiredReference)) {
    throw new Error(`Menu Spread snapshot is missing required reference: ${requiredReference}`);
  }
}
if (!spreadSnapshot.includes("window.renderMenuLensSpread(menu)")) {
  throw new Error("Menu Spread snapshot must render from the shared fixture projection.");
}

const spatialDragSource = await readFile(new URL("spatial-drag.js", archiveRoot), "utf8");
new Script(spatialDragSource, { filename: "research-history/spatial-drag.js" });

const pinchSheetSource = await readFile(new URL("pinch-sheet.js", archiveRoot), "utf8");
new Script(pinchSheetSource, { filename: "research-history/pinch-sheet.js" });

const paperLandscapeCoreSource = await readFile(
  new URL("paper-landscape-core.js", archiveRoot),
  "utf8",
);
new Script(paperLandscapeCoreSource, { filename: "research-history/paper-landscape-core.js" });

class PinchTestElement {
  constructor({ width = 0, height = 0, left = 0, top = 0 } = {}) {
    this.clientWidth = width;
    this.clientHeight = height;
    this.offsetWidth = width;
    this.offsetHeight = height;
    this.offsetLeft = left;
    this.offsetTop = top;
    this.dataset = {};
    this.listeners = new Map();
    this.styles = new Map();
    this.style = { setProperty: (name, value) => this.styles.set(name, value) };
    this.classNames = new Set();
    this.classList = {
      add: (name) => this.classNames.add(name),
      remove: (name) => this.classNames.delete(name),
      toggle: (name, force) => force ? this.classNames.add(name) : this.classNames.delete(name),
    };
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  dispatch(type, properties) {
    const event = {
      button: 0,
      pointerType: "touch",
      preventDefault() {},
      stopPropagation() {},
      ...properties,
    };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  setPointerCapture() {}

  getBoundingClientRect() {
    return { left: this.offsetLeft, top: this.offsetTop, width: this.offsetWidth, height: this.offsetHeight };
  }
}

const pinchSandbox = {
  HTMLElement: PinchTestElement,
  performance,
  window: {
    addEventListener() {},
    setTimeout(callback) { callback(); return 1; },
  },
};
runInNewContext(pinchSheetSource, pinchSandbox, { filename: "research-history/pinch-sheet.js" });
const pinchViewport = new PinchTestElement({ width: 400, height: 520 });
const pinchSheet = new PinchTestElement({ width: 380, height: 500, left: 10, top: 10 });
const pinchCamera = pinchSandbox.window.createMenuLensPinchCamera(pinchViewport, pinchSheet, {
  minimumScale: 1,
  maximumScale: 3.2,
});
pinchViewport.dispatch("pointerdown", { pointerId: 1, clientX: 100, clientY: 150 });
pinchViewport.dispatch("pointerdown", { pointerId: 2, clientX: 200, clientY: 150 });
pinchViewport.dispatch("pointermove", { pointerId: 2, clientX: 300, clientY: 150 });
if (Math.abs(pinchCamera.getState().scale - 2) > 0.001) {
  throw new Error("Pinch camera must map a doubled two-pointer distance to a doubled sheet scale.");
}
pinchViewport.dispatch("pointerup", { pointerId: 2, clientX: 300, clientY: 150 });
const prePanX = pinchCamera.getState().x;
pinchViewport.dispatch("pointermove", { pointerId: 1, clientX: 70, clientY: 150 });
if (pinchCamera.getState().x >= prePanX) {
  throw new Error("Pinch camera must allow one-pointer panning after zoom.");
}
pinchViewport.dispatch("pointerup", { pointerId: 1, clientX: 70, clientY: 150 });
pinchCamera.reset();
if (pinchCamera.getState().scale !== 1 || pinchCamera.getState().x !== 0 || pinchCamera.getState().y !== 0) {
  throw new Error("Pinch camera reset must restore the complete sheet.");
}

const ribbonRendererSource = await readFile(
  new URL("horizontal-ribbon-renderer.js", archiveRoot),
  "utf8",
);
runInNewContext(ribbonRendererSource, fixtureSandbox, {
  filename: "research-history/horizontal-ribbon-renderer.js",
});
const renderRibbon = fixtureSandbox.window.renderMenuLensHorizontalRibbon;
if (typeof renderRibbon !== "function") {
  throw new Error("Horizontal Ribbon renderer must expose renderMenuLensHorizontalRibbon.");
}

const ribbonMarkup = renderRibbon(menu);
const ribbonProductIds = [...ribbonMarkup.matchAll(/data-product-id="([^"]+)"/g)].map(
  (match) => match[1],
);
const ribbonCategoryIds = [...ribbonMarkup.matchAll(/data-category-id="([^"]+)"/g)].map(
  (match) => match[1],
);

if (ribbonProductIds.length !== menu.products.length) {
  throw new Error(
    `Horizontal Ribbon must render ${menu.products.length} products; received ${ribbonProductIds.length}.`,
  );
}
if (new Set(ribbonProductIds).size !== ribbonProductIds.length) {
  throw new Error("Horizontal Ribbon renders at least one ProductId more than once.");
}
for (const product of menu.products) {
  if (!ribbonProductIds.includes(product.id)) {
    throw new Error(`Horizontal Ribbon is missing ${product.id}.`);
  }
}
if (ribbonCategoryIds.join("|") !== expectedSpreadCategoryIds.join("|")) {
  throw new Error("Horizontal Ribbon must preserve all categories in canonical order.");
}
if (ribbonMarkup.includes("選這道")) {
  throw new Error("Horizontal Ribbon reading hypothesis must not contain an order action.");
}

const ribbonSnapshot = await readFile(
  new URL("phases/09-horizontal-ribbon/index.html", archiveRoot),
  "utf8",
);
for (const requiredReference of [
  '<link rel="stylesheet" href="../../horizontal-ribbon.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../horizontal-ribbon-renderer.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
]) {
  if (!ribbonSnapshot.includes(requiredReference)) {
    throw new Error(`Horizontal Ribbon snapshot is missing required reference: ${requiredReference}`);
  }
}
if (!ribbonSnapshot.includes("window.renderMenuLensHorizontalRibbon(menu)")) {
  throw new Error("Horizontal Ribbon snapshot must render from the shared fixture projection.");
}

const fisheyeRendererSource = await readFile(
  new URL("fisheye-ribbon-renderer.js", archiveRoot),
  "utf8",
);
runInNewContext(fisheyeRendererSource, fixtureSandbox, {
  filename: "research-history/fisheye-ribbon-renderer.js",
});
const renderFisheye = fixtureSandbox.window.renderMenuLensFisheyeRibbon;
if (typeof renderFisheye !== "function") {
  throw new Error("Fisheye Ribbon renderer must expose renderMenuLensFisheyeRibbon.");
}

const fisheyeMarkup = renderFisheye(menu);
const fisheyeProductIds = [...fisheyeMarkup.matchAll(/data-product-id="([^"]+)"/g)].map(
  (match) => match[1],
);
const fisheyeCategoryIds = [...fisheyeMarkup.matchAll(/data-category-id="([^"]+)"/g)].map(
  (match) => match[1],
);
const fisheyeCategoryOrder = [...new Set(fisheyeCategoryIds)];

if (fisheyeProductIds.length !== menu.products.length) {
  throw new Error(
    `Fisheye Ribbon must render ${menu.products.length} products; received ${fisheyeProductIds.length}.`,
  );
}
if (new Set(fisheyeProductIds).size !== fisheyeProductIds.length) {
  throw new Error("Fisheye Ribbon renders at least one ProductId more than once.");
}
for (const product of menu.products) {
  if (!fisheyeProductIds.includes(product.id)) {
    throw new Error(`Fisheye Ribbon is missing ${product.id}.`);
  }
}
if (fisheyeCategoryOrder.join("|") !== expectedSpreadCategoryIds.join("|")) {
  throw new Error("Fisheye Ribbon must preserve all categories in canonical order.");
}
if (fisheyeMarkup.includes("選這道")) {
  throw new Error("Fisheye Ribbon reading hypothesis must not contain an order action.");
}

const fisheyeSnapshot = await readFile(
  new URL("phases/10-fisheye-ribbon/index.html", archiveRoot),
  "utf8",
);
for (const requiredReference of [
  '<link rel="stylesheet" href="../../fisheye-ribbon.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../fisheye-ribbon-renderer.js"></script>',
]) {
  if (!fisheyeSnapshot.includes(requiredReference)) {
    throw new Error(`Fisheye Ribbon snapshot is missing required reference: ${requiredReference}`);
  }
}
if (!fisheyeSnapshot.includes("window.renderMenuLensFisheyeRibbon(menu)")) {
  throw new Error("Fisheye Ribbon snapshot must render from the shared fixture projection.");
}

const matrixRendererSource = await readFile(
  new URL("menu-matrix-renderer.js", archiveRoot),
  "utf8",
);
runInNewContext(matrixRendererSource, fixtureSandbox, {
  filename: "research-history/menu-matrix-renderer.js",
});
const renderMatrix = fixtureSandbox.window.renderMenuLensMatrix;
if (typeof renderMatrix !== "function") {
  throw new Error("Menu Matrix renderer must expose renderMenuLensMatrix.");
}

const matrixMarkup = renderMatrix(menu);
const matrixProductIds = [...matrixMarkup.matchAll(/data-product-id="([^"]+)"/g)].map(
  (match) => match[1],
);
const matrixCategoryIds = [...matrixMarkup.matchAll(/data-category-id="([^"]+)"/g)].map(
  (match) => match[1],
);
const matrixSlots = [...matrixMarkup.matchAll(/data-matrix-slot="([^"]+)"/g)].map(
  (match) => match[1],
);

if (matrixProductIds.length !== menu.products.length) {
  throw new Error(
    `Menu Matrix must render ${menu.products.length} products; received ${matrixProductIds.length}.`,
  );
}
if (new Set(matrixProductIds).size !== matrixProductIds.length) {
  throw new Error("Menu Matrix renders at least one ProductId more than once.");
}
for (const product of menu.products) {
  if (!matrixProductIds.includes(product.id)) {
    throw new Error(`Menu Matrix is missing ${product.id}.`);
  }
}
if (matrixCategoryIds.join("|") !== expectedSpreadCategoryIds.join("|")) {
  throw new Error("Menu Matrix must preserve all categories in canonical order.");
}
if (matrixSlots.length !== menu.categories.length * 8) {
  throw new Error(`Menu Matrix must render 48 fixed slots; received ${matrixSlots.length}.`);
}
if (matrixSlots.filter((slot) => slot === "product").length !== menu.products.length) {
  throw new Error("Menu Matrix product-slot count must match the 30-product fixture.");
}
if (matrixSlots.filter((slot) => slot === "empty").length !== 18) {
  throw new Error("Menu Matrix must expose 18 empty slots across its fixed 6 × 8 layout.");
}
if (matrixMarkup.includes("選這道")) {
  throw new Error("Menu Matrix reading hypothesis must not contain an order action.");
}

const matrixSnapshot = await readFile(
  new URL("phases/11-menu-matrix/index.html", archiveRoot),
  "utf8",
);
for (const requiredReference of [
  '<link rel="stylesheet" href="../../menu-matrix.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../menu-matrix-renderer.js"></script>',
]) {
  if (!matrixSnapshot.includes(requiredReference)) {
    throw new Error(`Menu Matrix snapshot is missing required reference: ${requiredReference}`);
  }
}
if (!matrixSnapshot.includes("window.renderMenuLensMatrix(menu)")) {
  throw new Error("Menu Matrix snapshot must render from the shared fixture projection.");
}

const paperFieldRendererSource = await readFile(
  new URL("paper-menu-field-renderer.js", archiveRoot),
  "utf8",
);
runInNewContext(paperFieldRendererSource, fixtureSandbox, {
  filename: "research-history/paper-menu-field-renderer.js",
});
const renderPaperField = fixtureSandbox.window.renderMenuLensPaperField;
if (typeof renderPaperField !== "function") {
  throw new Error("Paper Menu Field renderer must expose renderMenuLensPaperField.");
}

const paperFieldMarkup = renderPaperField(menu);
const paperFieldProductIds = [...paperFieldMarkup.matchAll(/data-product-id="([^"]+)"/g)].map(
  (match) => match[1],
);
const paperFieldCategoryIds = [...paperFieldMarkup.matchAll(/data-category-id="([^"]+)"/g)].map(
  (match) => match[1],
);

if (paperFieldProductIds.length !== menu.products.length) {
  throw new Error(
    `Paper Menu Field must render ${menu.products.length} products; received ${paperFieldProductIds.length}.`,
  );
}
if (new Set(paperFieldProductIds).size !== paperFieldProductIds.length) {
  throw new Error("Paper Menu Field renders at least one ProductId more than once.");
}
for (const product of menu.products) {
  if (!paperFieldProductIds.includes(product.id)) {
    throw new Error(`Paper Menu Field is missing ${product.id}.`);
  }
}
if (paperFieldCategoryIds.join("|") !== expectedSpreadCategoryIds.join("|")) {
  throw new Error("Paper Menu Field must preserve all categories in canonical order.");
}
if (paperFieldMarkup.includes("選這道")) {
  throw new Error("Paper Menu Field reading hypothesis must not contain an order action.");
}

const paperFieldSnapshot = await readFile(
  new URL("phases/12-paper-menu-field/index.html", archiveRoot),
  "utf8",
);
for (const requiredReference of [
  '<link rel="stylesheet" href="../../paper-menu-field.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
]) {
  if (!paperFieldSnapshot.includes(requiredReference)) {
    throw new Error(`Paper Menu Field snapshot is missing required reference: ${requiredReference}`);
  }
}
if (!paperFieldSnapshot.includes("window.renderMenuLensPaperField(menu)")) {
  throw new Error("Paper Menu Field snapshot must render from the shared fixture projection.");
}

const landscapePaperStyles = await readFile(new URL("landscape-paper.css", archiveRoot), "utf8");
const landscapePaperCore = await readFile(new URL("paper-landscape-core.js", archiveRoot), "utf8");
if (!landscapePaperStyles.includes("flex: var(--column-count) 1 0;")) {
  throw new Error("Landscape Paper must preserve its existing column geometry hook.");
}
for (const geometryContract of [
  "columnWeight?.({ columnIndex, firstCount, secondCount }) ?? 1",
  'column.style.setProperty("--column-count", String(weight))',
]) {
  if (!landscapePaperCore.includes(geometryContract)) {
    throw new Error(`Landscape variants must default to equal columns unless they opt into a weight: ${geometryContract}`);
  }
}
if (!landscapePaperStyles.includes(".landscape-sheet--equal-columns > .landscape-column { flex: 1 1 0; }")) {
  throw new Error("Landscape Paper must expose an explicit 1:1:1 column contract.");
}

const paperVariantSnapshots = registry.prototypes
  .filter((prototype) => prototype.validationProfile === "paper-field-variant")
  .map((prototype) => ({
    phase: prototype.path.split("/")[1],
    stylesheet: prototype.assets.styles.at(-1),
    label: prototype.title,
  }));

for (const variant of paperVariantSnapshots) {
  const snapshot = await readFile(
    new URL(`phases/${variant.phase}/index.html`, archiveRoot),
    "utf8",
  );
  const variantStyles = await readFile(new URL(variant.stylesheet, archiveRoot), "utf8");
  for (const requiredReference of [
    '<link rel="stylesheet" href="../../paper-menu-field.css" />',
    `<link rel="stylesheet" href="../../${variant.stylesheet}" />`,
    '<script src="../../menu-fixture.js"></script>',
    '<script src="../../paper-menu-field-renderer.js"></script>',
  ]) {
    if (!snapshot.includes(requiredReference)) {
      throw new Error(`${variant.label} snapshot is missing required reference: ${requiredReference}`);
    }
  }
  const usesLandscapeCore = [
    "18a-proportional-landscape",
    "22-weighted-pinch-sheet",
    "23-collapsible-landscape",
    "24-vertical-landscape",
  ].includes(variant.phase);
  const isEqualColumnLandscapeVariant = [
    "22-weighted-pinch-sheet",
    "23-collapsible-landscape",
  ].includes(variant.phase);
  const isLandscapeVariant = [
    "22-weighted-pinch-sheet",
    "23-collapsible-landscape",
    "24-vertical-landscape",
  ].includes(variant.phase);
  if (isEqualColumnLandscapeVariant && snapshot.includes("14:10:6")) {
    throw new Error(`${variant.label} must inherit 18's source geometry instead of inventing a new width ratio.`);
  }
  if (isEqualColumnLandscapeVariant && !snapshot.includes("columnWeight: () => 1")) {
    throw new Error(`${variant.label} must explicitly preserve the 1:1:1 landscape column contract.`);
  }
  if (isLandscapeVariant
    && (!variantStyles.includes("width: 46rem;") || !variantStyles.includes("min-width: 46rem;"))) {
    throw new Error(`${variant.label} must keep an intrinsic 46rem sheet independent of the phone viewport.`);
  }
  if (usesLandscapeCore) {
    for (const requiredReference of [
      '<link rel="stylesheet" href="../../landscape-paper.css" />',
      '<script src="../../paper-landscape-core.js"></script>',
    ]) {
      if (!snapshot.includes(requiredReference)) {
        throw new Error(`${variant.label} snapshot is missing shared landscape reference: ${requiredReference}`);
      }
    }
    if (!snapshot.includes("core.buildLandscape({")) {
      throw new Error(`${variant.label} must build from the shared landscape substrate.`);
    }
  } else if (!snapshot.includes("window.renderMenuLensPaperField(menu)")) {
    throw new Error(`${variant.label} must render from the shared paper-field fixture projection.`);
  }
  if (variant.phase === "18-landscape-paper" && !snapshot.includes('<script src="../../spatial-drag.js"></script>')) {
    throw new Error("Landscape Paper snapshot must load the shared pointer-drag controller.");
  }
  if (variant.phase === "18a-proportional-landscape") {
    for (const reference of [
      "columnWeight: ({ firstCount, secondCount }) => firstCount + secondCount",
      "欄寬 14:10:6",
      '<script src="../../spatial-drag.js"></script>',
    ]) {
      if (!snapshot.includes(reference)) {
        throw new Error(`Proportional Landscape must preserve its content-weight reference: ${reference}`);
      }
    }
  }
  if (variant.phase === "18-landscape-paper"
    && !snapshot.includes('class="landscape-sheet landscape-sheet--equal-columns"')) {
    throw new Error("Landscape Paper must opt into the explicit 1:1:1 column contract.");
  }
  if (variant.phase === "18c-tap-to-read") {
    for (const reference of [
      '<script src="../../spatial-drag.js"></script>',
      'class="landscape-sheet landscape-sheet--equal-columns"',
      'data-activation="category-entry"',
      'header.dataset.tapEntry = "true"',
      'header.tabIndex = overviewMode ? 0 : -1',
      'button.inert = overviewMode',
      'button.setAttribute("aria-hidden", String(overviewMode))',
      'if (scale !== "reading") return;',
      'activeColumnIndex + (event.key === "ArrowLeft" ? -1 : 1)',
    ]) {
      if (!snapshot.includes(reference)) {
        throw new Error(`Tap-to-Read must change only overview activation grammar: ${reference}`);
      }
    }
    for (const styleContract of [
      'content: "閱讀";',
      '#landscape-viewport[data-scale="overview"] .paper-product',
      'pointer-events: none;',
    ]) {
      if (!variantStyles.includes(styleContract)) {
        throw new Error(`Tap-to-Read must expose a visible category entry and suppress overview Product actions: ${styleContract}`);
      }
    }
    for (const forbiddenMechanism of [
      "semantic-overview",
      "columnWeight:",
      "focusFactor",
      "tracked ?",
      "data.collapsed",
      "writing-mode:",
      "category-tabs",
    ]) {
      if (snapshot.includes(forbiddenMechanism) || variantStyles.includes(forbiddenMechanism)) {
        throw new Error(`Tap-to-Read must not accumulate another mechanism: ${forbiddenMechanism}`);
      }
    }
  }
  if (variant.phase === "22-weighted-pinch-sheet") {
    for (const reference of [
      '<script src="../../spatial-drag.js"></script>',
      "const focusFactor = 1.8",
      'column.style.setProperty("--column-rows"',
      'tracked ? "1.65" : "1"',
      "const trackColumn =",
    ]) {
      if (!snapshot.includes(reference)) {
        throw new Error(`Weighted Focus Sheet must combine 18 with 16's row weighting: ${reference}`);
      }
    }
  }
  if (variant.phase === "23-collapsible-landscape") {
    for (const reference of [
      '<script src="../../spatial-drag.js"></script>',
      'tracked ? "1.65" : "1"',
      "const trackColumn =",
      "category.dataset.collapsed = String(collapsed)",
    ]) {
      if (!snapshot.includes(reference)) {
        throw new Error(`Tracked Focus Landscape must preserve 22 and add width plus camera tracking: ${reference}`);
      }
    }
  }
  if (variant.phase === "24-vertical-landscape"
    && !snapshot.includes('<script src="../../spatial-drag.js"></script>')) {
    throw new Error("Vertical Landscape must reuse 18's horizontal drag controller.");
  }
  if (variant.phase === "24-vertical-landscape"
    && (!variantStyles.includes('data-scale="reading"') || !variantStyles.includes("width: 64rem;"))) {
    throw new Error("Vertical Landscape reading scale must use an intrinsic 64rem sheet.");
  }
  if (variant.phase === "24-vertical-landscape"
    && !snapshot.includes("columnWeight: ({ firstCount, secondCount }) => firstCount + secondCount")) {
    throw new Error("Vertical Landscape must allocate outer columns by the 14:10:6 product totals.");
  }
  if (variant.phase === "24-vertical-landscape"
    && (!variantStyles.includes(".vertical-category .paper-product__name")
      || !variantStyles.includes("writing-mode: vertical-rl;")
      || !variantStyles.includes("text-combine-upright: all;")
      || !variantStyles.includes("margin-inline-start: auto;")
      || !variantStyles.includes("font-size: .9rem;"))) {
    throw new Error("Vertical Landscape must keep readable vertical names with inline upright prices.");
  }
  if (snapshot.includes("選這道")) {
    throw new Error(`${variant.label} reading hypothesis must not contain an order action.`);
  }
}

for (const prototype of registeredSnapshots) {
  const snapshot = prototype.path;
  const html = await readFile(new URL(snapshot, archiveRoot), "utf8");
  if (!html.startsWith("<!doctype html>")) {
    throw new Error(`${snapshot} must remain a standalone HTML document.`);
  }
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  inlineScripts.forEach((source, index) => {
    new Script(source, { filename: `${snapshot}#inline-script-${index + 1}` });
  });
}

console.log(
  `Research archive validation passed: ${originalSnapshots.length} original builds, ${reconstructedSnapshots.length} reconstructions/hypotheses, 6 categories, 30 products.`,
);
