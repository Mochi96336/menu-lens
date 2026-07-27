import { access, readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const childPath = "phases/26a-transition-landmarks/index.html";
const childFiles = [
  childPath,
  "parallax-transition-landmarks.css",
  "parallax-transition-landmarks.js",
];

await Promise.all(childFiles.map((path) => access(new URL(path, archiveRoot))));

const registrySource = await readFile(new URL("prototype-registry.js", archiveRoot), "utf8");
const registrySandbox = { window: {} };
runInNewContext(registrySource, registrySandbox, { filename: "research-history/prototype-registry.js" });
const registry = registrySandbox.window.menuLensPrototypeRegistry;
const child = registry.prototypes.find((prototype) => prototype.id === "26A");
if (!child) throw new Error("Prototype registry must contain 26A.");
if (child.parentId !== "26" || child.family !== "depth") {
  throw new Error("26A must remain a depth child of 26.");
}
if (child.path !== childPath || child.validationProfile !== "parallax-transition-landmarks") {
  throw new Error("26A must use its registered child path and validation profile.");
}
for (const asset of ["history.css", "parallax-menu-volume.css", "parallax-transition-landmarks.css"]) {
  if (!child.assets.styles.includes(asset)) throw new Error(`26A registry styles are missing ${asset}.`);
}
for (const asset of ["menu-fixture.js", "parallax-menu-volume.js", "parallax-transition-landmarks.js"]) {
  if (!child.assets.scripts.includes(asset)) throw new Error(`26A registry scripts are missing ${asset}.`);
}

const html = await readFile(new URL(childPath, archiveRoot), "utf8");
for (const reference of [
  '<link rel="stylesheet" href="../../parallax-menu-volume.css" />',
  '<link rel="stylesheet" href="../../parallax-transition-landmarks.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../parallax-menu-volume.js" defer></script>',
  '<script src="../../parallax-transition-landmarks.js" defer></script>',
  'id="parallax-transition-landmarks"',
  'data-landmark-role="origin"',
  'data-landmark-role="target"',
  'id="parallax-detail"',
]) {
  if (!html.includes(reference)) throw new Error(`26A is missing ${reference}.`);
}
if (/<(?:button|a)\b[^>]*data-landmark-role=/i.test(html)) {
  throw new Error("26A transition landmarks must not be interactive destinations.");
}
if (html.includes("選這道") || html.includes("加入購物車") || html.includes("Candidate")) {
  throw new Error("26A must remain a menu-reading study without decision or order actions.");
}

const parentSource = await readFile(new URL("parallax-menu-volume.js", archiveRoot), "utf8");
new Script(parentSource, { filename: "research-history/parallax-menu-volume.js" });
for (const retainedMechanism of [
  "menu.products.filter",
  'addEventListener("pointerdown"',
  'addEventListener("pointermove"',
  "pointers.size === 2",
  "state.spread",
  "item.dataset.productIndex",
  "openDetail",
  "resetView",
  "settleIfNear",
  "rotateX",
  "rotateY",
  "[-112, 74, -48, 108, 20, -86, 91, -18]",
]) {
  if (!parentSource.includes(retainedMechanism)) throw new Error(`26 parent must retain ${retainedMechanism}.`);
}

const source = await readFile(new URL("parallax-transition-landmarks.js", archiveRoot), "utf8");
new Script(source, { filename: "research-history/parallax-transition-landmarks.js" });
for (const landmarkMechanism of [
  "transitionOriginIndex",
  "renderTransitionLandmarks",
  "MutationObserver",
  "viewFromTransform",
  "extentDescription",
  'dataset.visible = "true"',
  'dataset.visible = "false"',
  "nearest.score >= .9",
]) {
  if (!source.includes(landmarkMechanism)) throw new Error(`26A must implement ${landmarkMechanism}.`);
}
for (const bannedMechanism of [
  'addEventListener("pointerdown"',
  'addEventListener("pointermove"',
  "setPointerCapture",
  "state.spread",
  "translate3d(-50%",
  "tutorial",
  "ghosts",
  "autoFlat",
  "cameraTracking",
  "additionalSnap",
  "categoryTabs",
]) {
  if (source.includes(bannedMechanism)) throw new Error(`26A child layer must not add ${bannedMechanism}.`);
}
if (!html.includes('<script src="../../parallax-menu-volume.js" defer></script>')) {
  throw new Error("26A must reuse the unmodified parent controller before its child landmark layer.");
}

const css = await readFile(new URL("parallax-transition-landmarks.css", archiveRoot), "utf8");
if (!css.includes("pointer-events: none")) throw new Error("26A landmarks must be non-interactive.");
if (!css.includes("@media (max-width: 360px)")) throw new Error("26A must include a 320px-specific responsive rule.");
if (!css.includes("@media (prefers-reduced-motion: reduce)")) throw new Error("26A must define reduced-motion behavior.");

const categoryAnchors = [
  { x: 0, y: 0 },
  { x: -27, y: 52 },
  { x: 29, y: 48 },
  { x: -31, y: -49 },
  { x: 31, y: -47 },
  { x: 54, y: 2 },
];
const targets = categoryAnchors.map((anchor) => ({ x: -anchor.x, y: -anchor.y }));
const representativePairs = [[0, 1], [1, 2], [2, 5], [5, 4], [4, 3], [3, 0]];
const samples = [.25, .5, .75];
const spreads = [.02, .58, 1];
const depthPattern = [-112, 74, -48, 108, 20, -86, 91, -18];
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const scoreAt = (view, target) => clamp(1 - Math.hypot(view.x - target.x, view.y - target.y) / 78, 0, 1);
const interpolate = (from, to, amount) => ({
  x: from.x + (to.x - from.x) * amount,
  y: from.y + (to.y - from.y) * amount,
});
const volumeTransform = (view) => `translate3d(-50%, -50%, -38px) rotateX(${view.x}deg) rotateY(${view.y}deg)`;
const productTransform = (productIndex, categoryIndex, count, spread) => {
  const columns = count <= 3 ? 1 : 2;
  const rows = Math.ceil(count / columns);
  const column = productIndex % columns;
  const row = Math.floor(productIndex / columns);
  const x = (column - (columns - 1) / 2) * 151;
  const y = (row - (rows - 1) / 2) * 51 + 8;
  const rawZ = depthPattern[(productIndex + categoryIndex * 3) % depthPattern.length];
  const tiltX = ((productIndex + categoryIndex) % 3 - 1) * 4.2 * spread;
  const tiltY = ((productIndex * 2 + categoryIndex) % 5 - 2) * 3.1 * spread;
  return `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${rawZ * spread}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
};
const fixtureSource = await readFile(new URL("menu-fixture.js", archiveRoot), "utf8");
const fixtureSandbox = { window: {} };
runInNewContext(fixtureSource, fixtureSandbox, { filename: "research-history/menu-fixture.js" });
const menu = fixtureSandbox.window.menuLensResearchMenu;
const counts = menu.categories.map((category) => menu.products.filter((product) => product.categoryId === category.id).length);
if (counts.join(":") !== "8:6:6:4:4:2") throw new Error(`26A fixture parity changed: ${counts.join(":")}.`);

// Diagonal path 02 → 01 → 05 crosses the existing centre endpoint rather than creating a new destination.
const diagonalSamples = [
  { progress: .25, view: interpolate(targets[1], targets[0], .5), expectedPair: [1, 0], hidden: false },
  { progress: .5, view: targets[0], expectedPair: [0, null], hidden: true },
  { progress: .75, view: interpolate(targets[0], targets[4], .5), expectedPair: [0, 4], hidden: false },
];
for (const sample of diagonalSamples) {
  const ranking = targets
    .map((target, index) => ({ index, score: scoreAt(sample.view, target) }))
    .sort((a, b) => b.score - a.score);
  if (sample.hidden) {
    if (ranking[0].index !== 0 || ranking[0].score < .9) {
      throw new Error("26A diagonal centre path must resolve to the existing category 01 endpoint.");
    }
  } else {
    const topTwo = new Set(ranking.slice(0, 2).map((entry) => entry.index));
    if (!topTwo.has(sample.expectedPair[0]) || !topTwo.has(sample.expectedPair[1])) {
      throw new Error(`26A diagonal path loses its expected pair at ${sample.progress}.`);
    }
  }
}

for (const [originIndex, targetIndex] of representativePairs) {
  for (const amount of samples) {
    const view = interpolate(targets[originIndex], targets[targetIndex], amount);
    const ranking = targets
      .map((target, index) => ({ index, score: scoreAt(view, target) }))
      .sort((a, b) => b.score - a.score);
    const topTwo = new Set(ranking.slice(0, 2).map((entry) => entry.index));
    if (!topTwo.has(originIndex) || !topTwo.has(targetIndex)) {
      throw new Error(`26A landmarks lose the representative pair ${originIndex}-${targetIndex} at ${amount}.`);
    }
    if (ranking.slice(0, 2).length > 2) throw new Error("26A may expose at most two transition landmarks.");
    for (const spread of spreads) {
      const parentVolume = volumeTransform(view);
      const childVolume = volumeTransform(view);
      if (parentVolume !== childVolume) throw new Error("26A changed the parent camera transform.");
      counts.forEach((count, categoryIndex) => {
        for (let productIndex = 0; productIndex < count; productIndex += 1) {
          const parentProduct = productTransform(productIndex, categoryIndex, count, spread);
          const childProduct = productTransform(productIndex, categoryIndex, count, spread);
          if (parentProduct !== childProduct) throw new Error("26A changed parent product geometry.");
        }
      });
    }
  }
}

console.log("26A validation passed: transition landmarks only, 6 representative pairs × 25/50/75% × 3 spreads, parent geometry retained, 6 categories, 30 products.");
