import { readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const html = await readFile(new URL("phases/25-menu-depth/projections.html", archiveRoot), "utf8");
const baseSource = await readFile(new URL("menu-projections.js", archiveRoot), "utf8");
const addonSource = await readFile(new URL("menu-projection-band-labels.js", archiveRoot), "utf8");
const addonStyles = await readFile(new URL("menu-projection-band-labels.css", archiveRoot), "utf8");
const protocol = await readFile(new URL("docs/research-history/25p-task-first-entry-protocol.md", root), "utf8");
const report = JSON.parse(await readFile(new URL("review-assets/25p-band-labels/browser-report.json", archiveRoot), "utf8"));

new Script(baseSource, { filename: "research-history/menu-projections.js" });
new Script(addonSource, { filename: "research-history/menu-projection-band-labels.js" });

for (const reference of [
  '<link rel="stylesheet" href="../../menu-projection-band-labels.css" />',
  '<script src="../../menu-projection-band-labels.js"></script>',
  'id="projection-volume-band-labels"',
  'id="projection-band-summary"',
]) {
  if (!html.includes(reference)) throw new Error(`25P is missing band-label reference: ${reference}`);
}

const registrySource = await readFile(new URL("prototype-registry.js", archiveRoot), "utf8");
const registrySandbox = { window: {} };
runInNewContext(registrySource, registrySandbox, { filename: "research-history/prototype-registry.js" });
const registry = registrySandbox.window.menuLensPrototypeRegistry;
const projection = registry.prototypes.find((prototype) => prototype.id === "25P");
if (!projection || projection.parentId !== "25" || projection.family !== "depth") {
  throw new Error("25P must remain a depth child of 25.");
}
for (const asset of ["menu-projection-band-labels.css", "menu-projection-band-labels.js"]) {
  const registered = [...projection.assets.styles, ...projection.assets.scripts];
  if (!registered.includes(asset)) throw new Error(`25P registry assets are missing ${asset}.`);
}
if (registry.prototypes.some((prototype) => prototype.id === "25PA" || prototype.slug === "task-first-entry")) {
  throw new Error("This prerequisite must not register or implement 25PA.");
}

const fixtureSource = await readFile(new URL("menu-fixture.js", archiveRoot), "utf8");
const fixtureSandbox = { window: {} };
runInNewContext(fixtureSource, fixtureSandbox, { filename: "research-history/menu-fixture.js" });
const menu = fixtureSandbox.window.menuLensResearchMenu;
if (menu.categories.length !== 6 || menu.products.length !== 30 || new Set(menu.products.map((product) => product.id)).size !== 30) {
  throw new Error("25P prerequisite must retain 6 categories and 30 unique Products.");
}

const expectedBands = [
  "NT$120–229", "NT$230–339", "NT$340–449", "NT$450–560",
  "小份", "單份", "分享",
  "較快", "一般", "較慢", "未標註",
];
for (const label of expectedBands) {
  if (!addonSource.includes(`"${label}"`)) throw new Error(`Band-label add-on is missing ${label}.`);
}
for (const projectionId of ["price-serving", "price-preparation", "serving-preparation"]) {
  if (!addonSource.includes(`"${projectionId}"`)) throw new Error(`Band-label add-on is missing ${projectionId}.`);
}
for (const contract of [
  "viewQuaternions",
  "slerp(start, target, eased)",
  "const duration = 620",
  'window.matchMedia("(prefers-reduced-motion: reduce)")',
  'attributeFilter: ["aria-pressed"]',
  "projection-band-summary__row",
  "layoutFocusCard",
  "focusCard.dataset.layoutSide",
  'focusCard.style.setProperty("--focus-clamp-x"',
  'focusCard.style.setProperty("--focus-clamp-y"',
  'focusCard.style.setProperty("--focus-pointer-y"',
  "focusCard.tabIndex = 0",
  "new ResizeObserver",
  "trackFor(700)",
]) {
  if (!addonSource.includes(contract)) throw new Error(`Band-label add-on is missing controller contract: ${contract}`);
}
if (!addonStyles.includes("pointer-events: none") || !addonStyles.includes("projection-band-label")) {
  throw new Error("Band labels must remain non-interactive presentation, not controls.");
}
for (const layoutStyle of [
  '.projection-focus-card[data-open="true"]',
  "pointer-events: auto",
  "overscroll-behavior: contain",
  "touch-action: pan-y",
  'data-layout-side="right"',
  'data-layout-side="left"',
  "--focus-pointer-y",
]) {
  if (!addonStyles.includes(layoutStyle)) throw new Error(`25P focus-card layout repair is missing: ${layoutStyle}`);
}

for (const forbidden of [
  "auto-flat", "camera tracking", "Candidate", "cart", "checkout", "order action",
  'type="button"', 'type="range"', "addEventListener(\"pointer",
]) {
  if (addonSource.includes(forbidden) || addonStyles.includes(forbidden)) {
    throw new Error(`Band-label prerequisite contains forbidden mechanism: ${forbidden}`);
  }
}

for (const phrase of [
  "你和兩位朋友要點一道分享料理",
  "NT$500",
  "紹興奶油蝦",
  "蒜酥椒鹽軟殼蟹",
  "宮保杏鮑菇",
  "priority = fastest",
  "priority = lowest price",
  "未標註",
  "25PA becomes eligible",
  "does not authorize",
]) {
  if (!protocol.includes(phrase)) throw new Error(`25P task protocol is missing: ${phrase}`);
}

const expectedAnswers = [
  { name: "紹興奶油蝦", price: 480, preparation: 1 },
  { name: "蒜酥椒鹽軟殼蟹", price: 460, preparation: 0 },
  { name: "宮保杏鮑菇", price: 340, preparation: 1 },
];
const actualAnswers = menu.products
  .filter((product) => product.portion?.value >= 2 && product.price <= 500 && product.preparation?.value <= 1)
  .map((product) => ({ name: product.name, price: product.price, preparation: product.preparation.value }));
if (JSON.stringify(actualAnswers) !== JSON.stringify(expectedAnswers)) {
  throw new Error(`Task answer key drifted: ${JSON.stringify(actualAnswers)}`);
}

for (const width of ["320", "390", "1280"]) {
  const viewport = report.viewports?.[width];
  if (!viewport || viewport.nodes !== 30 || viewport.overflow || viewport.errors.length) {
    throw new Error(`25P band-label browser evidence failed at ${width}px.`);
  }
  const states = viewport.states;
  if (states["price-serving"].labels.length !== 7
    || states["price-preparation"].labels.length !== 8
    || states["serving-preparation"].labels.length !== 7) {
    throw new Error(`25P band-label counts drifted at ${width}px.`);
  }
  const focusCardLayout = viewport.focusCardLayout;
  if (!focusCardLayout
    || focusCardLayout.cases !== 168
    || focusCardLayout.clipped !== 0
    || focusCardLayout.minimumFieldGapPx < 5
    || focusCardLayout.largeResultScrollable !== true) {
    throw new Error(`25P focus-card layout evidence failed at ${width}px.`);
  }
}

console.log("25P band-label and task-definition validation passed: 11 bands, 3 projections, 30 Products, contained scrollable focus cards, one fixed task, no 25PA implementation.");
