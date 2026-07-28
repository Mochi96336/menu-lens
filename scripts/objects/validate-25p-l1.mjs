import { readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";
import { loadArchiveCatalog, root } from "../archive/load-catalog.mjs";

const archiveRoot = new URL("research-history/", root);
const [
  catalog,
  html,
  baseSource,
  addonSource,
  addonStyles,
  protocol,
  review,
  publicRecord,
  fixtureSource,
] = await Promise.all([
  loadArchiveCatalog(),
  readFile(new URL("phases/25-menu-depth/projections.html", archiveRoot), "utf8"),
  readFile(new URL("menu-projections.js", archiveRoot), "utf8"),
  readFile(new URL("menu-projection-band-labels.js", archiveRoot), "utf8"),
  readFile(new URL("menu-projection-band-labels.css", archiveRoot), "utf8"),
  readFile(new URL("docs/research-history/25p-task-first-entry-protocol.md", root), "utf8"),
  readFile(new URL("docs/research-history/25p-band-labels-task-review.md", root), "utf8"),
  readFile(new URL("records/25p-l1/index.html", archiveRoot), "utf8"),
  readFile(new URL("menu-fixture.js", archiveRoot), "utf8"),
]);
const report = JSON.parse(await readFile(new URL("review-assets/25p-band-labels/browser-report.json", archiveRoot), "utf8"));

new Script(baseSource, { filename: "research-history/menu-projections.js" });
new Script(addonSource, { filename: "research-history/menu-projection-band-labels.js" });

const correction = catalog.objects.find((object) => object.id === "25P-L1");
if (!correction) throw new Error("Archive catalog is missing 25P-L1.");
for (const [field, expected] of Object.entries({
  family: "depth",
  objectType: "correction",
  researchParentId: "25P",
  disposition: "keep-controlled",
  evidenceState: "browser-verified",
  reviewDocument: "records/25p-l1/index.html",
  evidencePath: "review-assets/25p-band-labels/browser-report.json",
  sourcePr: 31,
  sourceCommit: "36bc34f50333c239be0dc9b63ca914ac98084002",
})) {
  if (correction[field] !== expected) throw new Error(`25P-L1 ${field} drifted.`);
}
if (correction.entrypoint !== null) throw new Error("25P-L1 must remain a correction record, not a duplicate executable entrypoint.");
for (const asset of ["menu-projection-band-labels.css", "menu-projection-band-labels.js"]) {
  const declared = [...correction.assets.styles, ...correction.assets.scripts];
  if (!declared.includes(asset)) throw new Error(`25P-L1 catalog assets are missing ${asset}.`);
}
if (catalog.objects.some((object) => object.id === "25PA" || object.slug === "task-first-entry")) {
  throw new Error("25P-L1 must not register or authorize 25PA.");
}

for (const reference of [
  '<link rel="stylesheet" href="../../menu-projection-band-labels.css" />',
  '<script src="../../menu-projection-band-labels.js"></script>',
  'id="projection-volume-band-labels"',
  'id="projection-band-summary"',
]) {
  if (!html.includes(reference)) throw new Error(`25P is missing band-label reference: ${reference}`);
}
if (html.indexOf("menu-projections.js") > html.indexOf("menu-projection-band-labels.js")) {
  throw new Error("25P must load the base projection controller before the band-label add-on.");
}

const fixtureSandbox = { window: {} };
runInNewContext(fixtureSource, fixtureSandbox, { filename: "research-history/menu-fixture.js" });
const menu = fixtureSandbox.window.menuLensResearchMenu;
if (menu.categories.length !== 6 || menu.products.length !== 30 || new Set(menu.products.map((product) => product.id)).size !== 30) {
  throw new Error("25P-L1 must retain six categories and 30 unique Products.");
}

for (const label of [
  "NT$120–229", "NT$230–339", "NT$340–449", "NT$450–560",
  "小份", "單份", "分享", "較快", "一般", "較慢", "未標註",
]) {
  if (!addonSource.includes(`"${label}"`)) throw new Error(`25P-L1 is missing band label ${label}.`);
}
for (const contract of [
  "viewQuaternions",
  "slerp(start, target, eased)",
  "const duration = 620",
  'window.matchMedia("(prefers-reduced-motion: reduce)")',
  'attributeFilter: ["aria-pressed"]',
  "layoutFocusCard",
  "focusCard.dataset.layoutSide",
  'focusCard.style.setProperty("--focus-clamp-x"',
  'focusCard.style.setProperty("--focus-clamp-y"',
  'focusCard.style.setProperty("--focus-pointer-y"',
  "focusCard.tabIndex = 0",
  "new ResizeObserver",
  "trackFor(700)",
]) {
  if (!addonSource.includes(contract)) throw new Error(`25P-L1 is missing controller contract: ${contract}`);
}
for (const style of [
  ".projection-volume-band-labels { pointer-events: none; }",
  '.projection-focus-card[data-open="true"]',
  "pointer-events: auto",
  "overscroll-behavior: contain",
  "touch-action: pan-y",
  'data-layout-side="right"',
  'data-layout-side="left"',
  "--focus-pointer-y",
]) {
  if (!addonStyles.includes(style)) throw new Error(`25P-L1 is missing style contract: ${style}`);
}
for (const forbidden of [
  "auto-flat", "camera tracking", "Candidate", "cart", "checkout", "order action", 'type="range"',
]) {
  if (addonSource.includes(forbidden) || addonStyles.includes(forbidden)) {
    throw new Error(`25P-L1 contains forbidden mechanism: ${forbidden}`);
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
for (const phrase of [
  "KEEP as a parent-viability prerequisite",
  "bounded layout evidence",
  "does not prove the projection grammar",
]) {
  if (!review.includes(phrase)) throw new Error(`25P-L1 review is missing: ${phrase}`);
}
for (const phrase of ["25P-L1", "controlled prerequisite", "25P-S1", "25PA"] ) {
  if (!publicRecord.includes(phrase)) throw new Error(`Published 25P-L1 record is missing: ${phrase}`);
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
  throw new Error(`25P task answer key drifted: ${JSON.stringify(actualAnswers)}`);
}

for (const width of ["320", "390", "1280"]) {
  const viewport = report.viewports?.[width];
  if (!viewport || viewport.nodes !== 30 || viewport.overflow || viewport.errors.length) {
    throw new Error(`25P-L1 browser evidence failed at ${width}px.`);
  }
  if (viewport.states["price-serving"].labels.length !== 7
    || viewport.states["price-preparation"].labels.length !== 8
    || viewport.states["serving-preparation"].labels.length !== 7) {
    throw new Error(`25P-L1 label counts drifted at ${width}px.`);
  }
  const layout = viewport.focusCardLayout;
  if (!layout || layout.cases !== 168 || layout.clipped !== 0 || layout.minimumFieldGapPx < 5 || layout.largeResultScrollable !== true) {
    throw new Error(`25P-L1 focus-card evidence failed at ${width}px.`);
  }
}

console.log("25P-L1 validation passed: catalog correction, readable bands, contained focus cards, fixed task, and no 25PA implementation.");
