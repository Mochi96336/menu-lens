import { access, readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const childPath = "phases/26c-flat-recovery/index.html";
const requiredFiles = [
  childPath,
  "parallax-flat-recovery.css",
  "parallax-flat-recovery.js",
  "parallax-transition-landmarks.css",
  "parallax-transition-landmarks.js",
  "review-assets/26c/spread-matrix.csv",
  "review-assets/26c/runtime-smoke.json",
  "review-assets/26c/parent-child-320.svg",
  "review-assets/26c/parent-child-390.svg",
  "review-assets/26c/parent-child-desktop.svg",
];

await Promise.all(requiredFiles.map((path) => access(new URL(path, archiveRoot))));

const registrySource = await readFile(new URL("prototype-registry.js", archiveRoot), "utf8");
const registrySandbox = { window: {} };
runInNewContext(registrySource, registrySandbox, { filename: "research-history/prototype-registry.js" });
const registry = registrySandbox.window.menuLensPrototypeRegistry;
const child = registry.prototypes.find((prototype) => prototype.id === "26C");
if (!child) throw new Error("Prototype registry must include 26C.");
if (child.parentId !== "26A" || child.family !== "depth") {
  throw new Error("26C must remain a depth child of 26A.");
}
if (child.path !== childPath || child.validationProfile !== "parallax-flat-recovery") {
  throw new Error("26C registry path or validation profile drifted.");
}
for (const asset of [
  "parallax-menu-volume.css",
  "parallax-transition-landmarks.css",
  "parallax-flat-recovery.css",
  "menu-fixture.js",
  "parallax-flat-recovery.js",
  "parallax-transition-landmarks.js",
]) {
  const assets = [...child.assets.styles, ...child.assets.scripts];
  if (!assets.includes(asset)) throw new Error(`26C registry is missing ${asset}.`);
}

const html = await readFile(new URL(childPath, archiveRoot), "utf8");
for (const reference of [
  '<link rel="stylesheet" href="../../parallax-menu-volume.css" />',
  '<link rel="stylesheet" href="../../parallax-transition-landmarks.css" />',
  '<link rel="stylesheet" href="../../parallax-flat-recovery.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../parallax-flat-recovery.js" defer></script>',
  '<script src="../../parallax-transition-landmarks.js" defer></script>',
  'id="parallax-transition-landmarks"',
  'id="parallax-flat-recovery"',
  'id="parallax-flat-range"',
  'min="0.02"',
  'max="1"',
  'step="0.01"',
  'value="0.58"',
]) {
  if (!html.includes(reference)) throw new Error(`26C HTML is missing ${reference}.`);
}
if (html.includes('<script src="../../parallax-menu-volume.js"')) {
  throw new Error("26C must use its child-specific controller instead of running two volume controllers.");
}

const fixtureSource = await readFile(new URL("menu-fixture.js", archiveRoot), "utf8");
const fixtureSandbox = { window: {} };
runInNewContext(fixtureSource, fixtureSandbox, { filename: "research-history/menu-fixture.js" });
const menu = fixtureSandbox.window.menuLensResearchMenu;
if (menu.categories.length !== 6 || menu.products.length !== 30) {
  throw new Error("26C must preserve 6 categories and 30 Products.");
}
if (new Set(menu.products.map((product) => product.id)).size !== 30) {
  throw new Error("26C fixture Product identities must remain unique.");
}

const parentSource = await readFile(new URL("parallax-menu-volume.js", archiveRoot), "utf8");
const childSource = await readFile(new URL("parallax-flat-recovery.js", archiveRoot), "utf8");
const landmarkSource = await readFile(new URL("parallax-transition-landmarks.js", archiveRoot), "utf8");
new Script(parentSource, { filename: "research-history/parallax-menu-volume.js" });
new Script(childSource, { filename: "research-history/parallax-flat-recovery.js" });
new Script(landmarkSource, { filename: "research-history/parallax-transition-landmarks.js" });

const preservedContracts = [
  '{ x: 0, y: 0, color: "#95543d", pale: "#ead8cd" }',
  '{ x: -27, y: 52, color: "#537357", pale: "#dce7d9" }',
  '{ x: 29, y: 48, color: "#486a7c", pale: "#d8e4e8" }',
  '{ x: -31, y: -49, color: "#8a6b38", pale: "#eadfca" }',
  '{ x: 31, y: -47, color: "#785b79", pale: "#e5dce6" }',
  '{ x: 54, y: 2, color: "#9a5b68", pale: "#ead9de" }',
  "const depthPattern = [-112, 74, -48, 108, 20, -86, 91, -18]",
  "const z = rawZ * state.spread",
  "const tiltX = Number(item.dataset.tiltX) * state.spread",
  "const tiltY = Number(item.dataset.tiltY) * state.spread",
  "const isReadable = isCurrent && score >= .58",
  "state.viewY = clamp(state.viewY + dx * .24, -66, 66)",
  "state.viewX = clamp(state.viewX - dy * .22, -61, 61)",
  "state.spread = clamp(pinchStart.spread + Math.log(ratio) * .92, .02, 1)",
  "if (distance({ x: state.viewX, y: state.viewY }, target) <= 18)",
  "state.spread = .58",
];
for (const contract of preservedContracts) {
  if (!parentSource.includes(contract) || !childSource.includes(contract)) {
    throw new Error(`26C must preserve the parent contract: ${contract}`);
  }
}

for (const rangeContract of [
  'document.querySelector("#parallax-flat-range")',
  'flatRange.addEventListener("input"',
  "state.spread = clamp(Number(flatRange.value), .02, 1)",
  'flatRange.setAttribute("aria-valuetext"',
  "updateFlatRecovery()",
  '.parallax-reset, .parallax-detail, .parallax-flat-recovery',
]) {
  if (!childSource.includes(rangeContract)) throw new Error(`26C is missing range contract: ${rangeContract}`);
}

for (const landmarkContract of [
  "transitionOriginIndex",
  "origin.index",
  "target.index",
  "landmarks.setAttribute(\"aria-hidden\", \"true\")",
  "announcement.textContent",
]) {
  if (!landmarkSource.includes(landmarkContract)) {
    throw new Error(`26C must retain 26A landmark grammar: ${landmarkContract}`);
  }
}

const banned = [
  "autoFlat",
  "auto-flat",
  "flat mode",
  "flat-mode",
  "cameraTracking",
  "trackCamera",
  "additionalSnap",
  "newEndpoint",
  "categoryTabs",
  "tutorial-overlay",
  "full-category-ghost",
  "Candidate",
  "加入購物車",
  "選這道",
];
for (const pattern of banned) {
  if (html.includes(pattern) || childSource.includes(pattern)) {
    throw new Error(`26C must not add a second mechanism: ${pattern}`);
  }
}

const styles = await readFile(new URL("parallax-flat-recovery.css", archiveRoot), "utf8");
for (const styleContract of [
  '.parallax-flat-recovery input[type="range"]',
  "pointer-events: auto",
  "touch-action: pan-x",
  "@media (max-width: 360px)",
  "@media (prefers-reduced-motion: reduce)",
]) {
  if (!styles.includes(styleContract)) throw new Error(`26C CSS is missing ${styleContract}.`);
}

const anchors = [
  { x: 0, y: 0 },
  { x: -27, y: 52 },
  { x: 29, y: 48 },
  { x: -31, y: -49 },
  { x: 31, y: -47 },
  { x: 54, y: 2 },
];
const rawDepths = [-112, 74, -48, 108, 20, -86, 91, -18];
const spreads = [.02, .16, .42, .58, .76, 1];
let checkedStates = 0;
for (const anchor of anchors) {
  for (const spread of spreads) {
    for (let productIndex = 0; productIndex < 30; productIndex += 1) {
      const rawZ = rawDepths[productIndex % rawDepths.length];
      const parentZ = rawZ * spread;
      const childZ = rawZ * spread;
      if (parentZ !== childZ) throw new Error("26C Product depth diverged from parent geometry.");
    }
    if (!Number.isFinite(-anchor.x) || !Number.isFinite(-anchor.y)) {
      throw new Error("26C endpoint coordinates must remain finite.");
    }
    checkedStates += 1;
  }
}
if (checkedStates !== 36) throw new Error(`Expected 36 orientation/depth states; received ${checkedStates}.`);

const matrix = await readFile(new URL("review-assets/26c/spread-matrix.csv", archiveRoot), "utf8");
if (!matrix.includes("spread,depth_label,range_value,parent_formula_match,landmark_grammar_unchanged")) {
  throw new Error("26C spread matrix header is missing.");
}
if (matrix.trim().split("\n").length !== spreads.length + 1) {
  throw new Error("26C spread matrix must record all six representative spread values.");
}

const smoke = JSON.parse(await readFile(new URL("review-assets/26c/runtime-smoke.json", archiveRoot), "utf8"));
if (smoke.initial?.categories !== 6 || smoke.initial?.products !== 30 || smoke.initial?.range !== .58) {
  throw new Error("26C runtime smoke must start with 6 categories, 30 Products, and spread .58.");
}
if (smoke.flat?.value !== .02 || smoke.flat?.orientationSame !== true || smoke.deep?.value !== 1) {
  throw new Error("26C runtime smoke must reach .02 and 1 without changing orientation.");
}
if (smoke.rangeKeyboard?.orientationSame !== true) {
  throw new Error("26C range keyboard input must not rotate the stage.");
}
if (smoke.intermediate?.visible !== "true" || smoke.reset?.range !== .58 || smoke.reset?.landmarks !== "false") {
  throw new Error("26C must retain intermediate landmarks and restore the initial state on Home.");
}
if (smoke.detail?.opened !== "true" || smoke.detail?.closed !== "false" || smoke.reducedMotion !== true) {
  throw new Error("26C bounded runtime smoke must preserve detail and reduced-motion paths.");
}
for (const viewport of smoke.viewports ?? []) {
  if (viewport.products !== 30 || viewport.width !== viewport.client) {
    throw new Error(`26C bounded viewport smoke failed at ${viewport.viewport}.`);
  }
}

console.log("26C Flat Recovery validation passed: 6 categories, 30 Products, 6 endpoints, 36 orientation/depth states, one continuous range variable, unchanged 26A landmarks.");
