import { readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);

const readArchive = (path) => readFile(new URL(path, archiveRoot), "utf8");

const [
  registrySource,
  fixtureSource,
  rendererSource,
  parentHtml,
  parentCss,
  childHtml,
  childCss,
  scrubSource,
] = await Promise.all([
  readArchive("prototype-registry.js"),
  readArchive("menu-fixture.js"),
  readArchive("horizontal-ribbon-renderer.js"),
  readArchive("phases/09-horizontal-ribbon/index.html"),
  readArchive("horizontal-ribbon.css"),
  readArchive("phases/09a-direct-minimap-scrub/index.html"),
  readArchive("direct-ribbon-scrub.css"),
  readArchive("direct-ribbon-scrub.js"),
]);

const registrySandbox = { window: {} };
runInNewContext(registrySource, registrySandbox, { filename: "prototype-registry.js" });
const registry = registrySandbox.window.menuLensPrototypeRegistry;
const child = registry.prototypes.find((prototype) => prototype.id === "09A");
if (!child) throw new Error("09A must be registered as an independent prototype.");
if (child.parentId !== "09" || child.family !== "horizontal") {
  throw new Error("09A must remain a horizontal child of 09.");
}
if (child.path !== "phases/09a-direct-minimap-scrub/index.html") {
  throw new Error("09A registry path is incorrect.");
}
if (child.validationProfile !== "ribbon-direct-scrub") {
  throw new Error("09A must use the ribbon-direct-scrub validation profile.");
}
const expectedStyles = ["history.css", "horizontal-ribbon.css", "direct-ribbon-scrub.css"];
const expectedScripts = [
  "menu-fixture.js",
  "horizontal-ribbon-renderer.js",
  "spatial-drag.js",
  "direct-ribbon-scrub.js",
];
if (child.assets.styles.join("|") !== expectedStyles.join("|")) {
  throw new Error("09A registry styles must contain only the parent styles plus direct scrub CSS.");
}
if (child.assets.scripts.join("|") !== expectedScripts.join("|")) {
  throw new Error("09A registry scripts must contain only parent scripts plus direct scrub JS.");
}

for (const reference of [
  '<link rel="stylesheet" href="../../horizontal-ribbon.css" />',
  '<link rel="stylesheet" href="../../direct-ribbon-scrub.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../horizontal-ribbon-renderer.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
  '<script src="../../direct-ribbon-scrub.js"></script>',
]) {
  if (!childHtml.includes(reference)) throw new Error(`09A is missing required reference: ${reference}`);
}

for (const sliderContract of [
  'id="ribbon-minimap-window"',
  'role="slider"',
  'aria-orientation="horizontal"',
  'aria-valuemin="1"',
  'aria-valuemax="30"',
  'tabindex="0"',
]) {
  if (!childHtml.includes(sliderContract)) {
    throw new Error(`09A minimap window is missing slider contract: ${sliderContract}`);
  }
}

const parentStaticButtons = (parentHtml.match(/<button\b/g) ?? []).length;
const childStaticButtons = (childHtml.match(/<button\b/g) ?? []).length;
if (childStaticButtons !== parentStaticButtons) {
  throw new Error("09A must not add a second button or navigation surface.");
}
if ((childHtml.match(/class="ribbon-minimap"/g) ?? []).length !== 1) {
  throw new Error("09A must retain exactly one minimap.");
}

for (const parentGeometry of [
  "flex: 0 0 11.6rem",
  "flex: 0 0 3.15rem",
  "width: max-content",
  "scroll-snap-align: center",
  "window.enableMenuLensHorizontalDrag(viewport",
  "onSettle: snapNearestProduct",
]) {
  const source = parentGeometry.includes("window.") || parentGeometry.includes("onSettle") ? childHtml : parentCss;
  if (!source.includes(parentGeometry)) {
    throw new Error(`09A must preserve parent ribbon geometry or drag behavior: ${parentGeometry}`);
  }
}

for (const forbiddenSelector of [
  ".ribbon-track",
  ".ribbon-product",
  ".ribbon-category",
  ".ribbon-viewport",
  ".ribbon-scale-bar",
]) {
  if (childCss.includes(forbiddenSelector)) {
    throw new Error(`09A child CSS must not alter parent geometry: ${forbiddenSelector}`);
  }
}
for (const forbiddenMechanism of ["scroll-snap", "overflow-x", "flex-basis", "grid-template", "font-size"]) {
  if (childCss.includes(forbiddenMechanism)) {
    throw new Error(`09A child CSS introduces an unrelated mechanism: ${forbiddenMechanism}`);
  }
}
if (!childCss.includes("height: 3px")) {
  throw new Error("09A scrub control must retain the parent 3px viewport-window geometry.");
}
if (childCss.includes("height: 1.15rem")) {
  throw new Error("09A must not cover the minimap buttons with a tall viewport-window layer.");
}
if (!childCss.includes("height: .8rem") || !childCss.includes("translate(-50%, -50%)")) {
  throw new Error("09A must expand only a bounded pseudo hit area around the 3px line.");
}

for (const directContract of [
  "window.enableMenuLensDirectRibbonScrub",
  "window.menuLensRibbonProductIndexFromPointer",
  'event.key === "ArrowLeft"',
  'event.key === "ArrowRight"',
  'event.key === "Home"',
  'event.key === "End"',
  "getScale() === \"overview\"",
]) {
  if (!scrubSource.includes(directContract)) {
    throw new Error(`09A direct scrub controller is missing: ${directContract}`);
  }
}
for (const forbiddenScrubBehavior of ["scrollLeft", "scrollTo", "scrollIntoView", "transform:", "scale("]) {
  if (scrubSource.includes(forbiddenScrubBehavior)) {
    throw new Error(`09A scrub helper must delegate navigation rather than create another camera: ${forbiddenScrubBehavior}`);
  }
}

const scrubSandbox = { window: {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {} };
runInNewContext(scrubSource, scrubSandbox, { filename: "direct-ribbon-scrub.js" });
const indexFromPointer = scrubSandbox.window.menuLensRibbonProductIndexFromPointer;
if (typeof indexFromPointer !== "function") throw new Error("09A must expose its pure pointer mapping.");
const mappingCases = [
  [{ clientX: 100, left: 100, width: 300, productCount: 30 }, 0],
  [{ clientX: 250, left: 100, width: 300, productCount: 30 }, 15],
  [{ clientX: 400, left: 100, width: 300, productCount: 30 }, 29],
  [{ clientX: 20, left: 100, width: 300, productCount: 30 }, 0],
  [{ clientX: 520, left: 100, width: 300, productCount: 30 }, 29],
];
for (const [input, expected] of mappingCases) {
  const actual = indexFromPointer(input);
  if (actual !== expected) {
    throw new Error(`09A pointer mapping expected ${expected}; received ${actual}.`);
  }
}

const projectionSandbox = { window: {} };
runInNewContext(fixtureSource, projectionSandbox, { filename: "menu-fixture.js" });
runInNewContext(rendererSource, projectionSandbox, { filename: "horizontal-ribbon-renderer.js" });
const menu = projectionSandbox.window.menuLensResearchMenu;
const markup = projectionSandbox.window.renderMenuLensHorizontalRibbon(menu);
const productIds = [...markup.matchAll(/data-product-id="([^"]+)"/g)].map((match) => match[1]);
const categoryIds = [...markup.matchAll(/data-category-id="([^"]+)"/g)].map((match) => match[1]);
if (productIds.length !== 30 || new Set(productIds).size !== 30) {
  throw new Error("09A must retain all 30 unique Products from the parent renderer.");
}
if (categoryIds.length !== 6) throw new Error("09A must retain all six categories.");

const inlineScripts = [...childHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
if (inlineScripts.length !== 1) throw new Error("09A must contain one inline controller.");
new Script(inlineScripts[0], { filename: "09a-inline-controller.js" });
for (const controllerContract of [
  "window.renderMenuLensHorizontalRibbon(menu)",
  "scrollProductIntoView",
  "nearestProductIndex",
  "snapNearestProduct",
  "window.enableMenuLensHorizontalDrag",
  "window.enableMenuLensDirectRibbonScrub",
  'enterReading: (index) => setScale("reading", index, "auto")',
  'moveReading: (index) => scrollProductIntoView(index, "auto")',
]) {
  if (!inlineScripts[0].includes(controllerContract)) {
    throw new Error(`09A inline controller is missing preserved or direct behavior: ${controllerContract}`);
  }
}

for (const orderAction of ["加入購物車", "選這道", "下單", "結帳", "Candidate"]) {
  if (childHtml.includes(orderAction)) throw new Error(`09A must not introduce order behavior: ${orderAction}`);
}

console.log("09A direct minimap scrub validation passed: lineage, canonical mapping, 3px minimap geometry, existing drag, keyboard, detail, and no second locator preserved.");
