import { access, readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const pages = ["volume.html"];
const resetPage = "sections.html";
const projectionPage = "projections.html";
const requiredFiles = [
  "menu-depth.js",
  "menu-depth.css",
  "menu-volume.css",
  "menu-sections.css",
  "menu-sections.js",
  "menu-projections.css",
  "menu-projections.js",
  "parallax-menu-volume.css",
  "parallax-menu-volume.js",
  "phases/25-menu-depth/index.html",
  `phases/25-menu-depth/${resetPage}`,
  `phases/25-menu-depth/${projectionPage}`,
  "phases/26-parallax-menu-volume/index.html",
  ...pages.map((page) => `phases/25-menu-depth/${page}`),
];

await Promise.all(requiredFiles.map((path) => access(new URL(path, archiveRoot))));

const fixtureSource = await readFile(new URL("menu-fixture.js", archiveRoot), "utf8");
const helperSource = await readFile(new URL("menu-depth.js", archiveRoot), "utf8");
const sandbox = { window: {} };
runInNewContext(fixtureSource, sandbox, { filename: "research-history/menu-fixture.js" });
runInNewContext(helperSource, sandbox, { filename: "research-history/menu-depth.js" });

const menu = sandbox.window.menuLensResearchMenu;
const helpers = sandbox.window.MenuLensDepth;
const entries = helpers.modelMenu(menu);
const counts = entries.map((entry) => entry.products.length);
if (entries.length !== 6 || counts.join(":") !== "8:6:6:4:4:2") {
  throw new Error(`Menu Depth must preserve the six weighted categories; received ${counts.join(":")}.`);
}
if (entries.flatMap((entry) => entry.products).length !== 30) {
  throw new Error("Menu Depth must project all 30 fixture products exactly once in its shared model.");
}

const hub = await readFile(new URL("phases/25-menu-depth/index.html", archiveRoot), "utf8");
if (!hub.includes(`href="./${resetPage}"`)) throw new Error(`25 hub must link to ${resetPage}.`);
if (!hub.includes(`href="./${projectionPage}"`)) throw new Error(`25 hub must link to ${projectionPage}.`);
for (const page of pages) {
  if (!hub.includes(`href="./${page}"`)) throw new Error(`25 hub must link to ${page}.`);
}

const resetPath = `phases/25-menu-depth/${resetPage}`;
const resetHtml = await readFile(new URL(resetPath, archiveRoot), "utf8");
for (const reference of [
  '<link rel="stylesheet" href="../../menu-sections.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../menu-sections.js"></script>',
  "30 / 30 道",
]) {
  if (!resetHtml.includes(reference)) throw new Error(`${resetPage} is missing ${reference}.`);
}
const sectionsSource = await readFile(new URL("menu-sections.js", archiveRoot), "utf8");
new Script(sectionsSource, { filename: "research-history/menu-sections.js" });
const sectionsStyles = await readFile(new URL("menu-sections.css", archiveRoot), "utf8");
for (const bannedPattern of ["perspective:", "rotateX(", "rotateY(", "translateZ("]) {
  if (sectionsStyles.includes(bannedPattern)) throw new Error(`Menu Sections must not restore literal 3D styling: ${bannedPattern}.`);
}
for (const continuityMechanism of ["groupMenu", "captureVisibleAnchor", "setDepth", "documentRoot.scrollTop +="]) {
  if (!sectionsSource.includes(continuityMechanism)) throw new Error(`Menu Sections must implement ${continuityMechanism}.`);
}
const anchorId = "sichuan-mapo-tofu-pot";
if (!menu.products.some((product) => product.id === anchorId) || !sectionsSource.includes(anchorId)) {
  throw new Error("Menu Sections must preserve one real fixture product as the shared cross-section anchor.");
}

const projectionHtml = await readFile(new URL(`phases/25-menu-depth/${projectionPage}`, archiveRoot), "utf8");
for (const reference of [
  '<link rel="stylesheet" href="../../menu-projections.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../menu-projections.js"></script>',
  "30 / 30",
  'data-projection="price-serving"',
  'data-projection="price-preparation"',
  'data-projection="serving-preparation"',
  'id="projection-volume"',
  'id="projection-depth-axis"',
]) {
  if (!projectionHtml.includes(reference)) throw new Error(`${projectionPage} is missing ${reference}.`);
}
const projectionSource = await readFile(new URL("menu-projections.js", archiveRoot), "utf8");
new Script(projectionSource, { filename: "research-history/menu-projections.js" });
for (const mechanism of ["price", "serving", "preparation", "nodeById", "menu.products.map", "未標註", "viewQuaternions", "slerp", "renderFrame"]) {
  if (!projectionSource.includes(mechanism)) throw new Error(`Menu Projections must implement ${mechanism}.`);
}
const projectionStyles = await readFile(new URL("menu-projections.css", archiveRoot), "utf8");
for (const bannedPattern of ["perspective:", "rotateX(", "rotateY(", "translateZ("]) {
  if (projectionStyles.includes(bannedPattern)) throw new Error(`Menu Projections must remain orthographic: ${bannedPattern}.`);
}

for (const page of pages) {
  const path = `phases/25-menu-depth/${page}`;
  const html = await readFile(new URL(path, archiveRoot), "utf8");
  for (const reference of [
    '<link rel="stylesheet" href="../../menu-depth.css" />',
    '<script src="../../menu-fixture.js"></script>',
    '<script src="../../menu-depth.js"></script>',
    "helpers.modelMenu(menu)",
    "helpers.createDetailController(menu",
  ]) {
    if (!html.includes(reference)) throw new Error(`${page} is missing ${reference}.`);
  }
  if (html.includes("選這道") || html.includes("加入購物車")) {
    throw new Error(`${page} must remain a menu-reading study without an order action.`);
  }
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));
}

const parallaxPath = "phases/26-parallax-menu-volume/index.html";
const parallaxHtml = await readFile(new URL(parallaxPath, archiveRoot), "utf8");
for (const reference of [
  '<link rel="stylesheet" href="../../parallax-menu-volume.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../parallax-menu-volume.js" defer></script>',
  'id="parallax-detail"',
  "30 道料理固定交織",
]) {
  if (!parallaxHtml.includes(reference)) throw new Error(`26 is missing ${reference}.`);
}
const parallaxSource = await readFile(new URL("parallax-menu-volume.js", archiveRoot), "utf8");
new Script(parallaxSource, { filename: "research-history/parallax-menu-volume.js" });
for (const mechanism of [
  "menu.products.filter",
  'addEventListener("pointerdown"',
  'addEventListener("pointermove"',
  "pointers.size === 2",
  "state.spread",
  "item.dataset.productIndex",
  "openDetail",
  "resetView",
  "rotateX",
  "rotateY",
]) {
  if (!parallaxSource.includes(mechanism)) throw new Error(`26 must implement ${mechanism}.`);
}
if (parallaxHtml.includes("選這道") || parallaxHtml.includes("加入購物車")) {
  throw new Error("26 must remain a menu-reading study without an order action.");
}

console.log("Menu Depth validation passed: 1 dimensional projection, 1 continuity study, 1 retained falsification artifact, 1 parallax-volume study, 6 categories, 30 products.");
