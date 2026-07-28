import { access, readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { loadArchiveCatalog } from "./archive/load-catalog.mjs";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const childPath = "phases/08a-compressed-truth-cue/index.html";

await Promise.all([
  access(new URL(childPath, archiveRoot)),
  access(new URL("compressed-truth-cue.css", archiveRoot)),
  access(new URL("records/08a/index.html", archiveRoot)),
  access(new URL("review-assets/08a/README.md", archiveRoot)),
  access(new URL("review-assets/08a/compare-320.svg", archiveRoot)),
  access(new URL("review-assets/08a/compare-390.svg", archiveRoot)),
  access(new URL("review-assets/08a/compare-desktop.svg", archiveRoot)),
  access(new URL("docs/research-history/08a-compressed-truth-cue-review.md", root)),
]);

const catalog = await loadArchiveCatalog();
const child = catalog.objects.find((object) => object.id === "08A");
if (!child) throw new Error("Archive v2 catalog must contain 08A Compressed Truth Cue.");
for (const [field, expected] of Object.entries({
  family: "horizontal",
  objectType: "prototype",
  researchParentId: "08",
  disposition: "keep-controlled",
  evidenceState: "implementation-only",
  entrypoint: childPath,
  validationProfile: "spread-truth-cue",
  reviewDocument: "records/08a/index.html",
  evidencePath: "review-assets/08a/README.md",
  sourcePr: 15,
  sourceCommit: "89358e1cac8d02dc9aa155c82162fb85a6e87bb5",
})) {
  if (child[field] !== expected) throw new Error(`08A Archive v2 ${field} drifted.`);
}
const expectedStyles = ["history.css", "menu-spread.css", "compressed-truth-cue.css"];
const expectedScripts = ["menu-fixture.js", "menu-spread-renderer.js", "spatial-drag.js"];
if (child.assets.styles.join("|") !== expectedStyles.join("|")
  || child.assets.scripts.join("|") !== expectedScripts.join("|")) {
  throw new Error("08A must reuse 08 assets and add only compressed-truth-cue.css.");
}

const parentHtml = await readFile(new URL("phases/08-menu-spread/index.html", archiveRoot), "utf8");
const childHtml = await readFile(new URL(childPath, archiveRoot), "utf8");
for (const reference of [
  '<link rel="stylesheet" href="../../menu-spread.css" />',
  '<link rel="stylesheet" href="../../compressed-truth-cue.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../menu-spread-renderer.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
]) {
  if (!childHtml.includes(reference)) throw new Error(`08A is missing ${reference}.`);
}
const inlineController = (html) => html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1]?.trim();
if (!inlineController(parentHtml) || inlineController(parentHtml) !== inlineController(childHtml)) {
  throw new Error("08A must preserve the exact 08 interaction controller.");
}

const parentCss = await readFile(new URL("menu-spread.css", archiveRoot), "utf8");
const childCss = await readFile(new URL("compressed-truth-cue.css", archiveRoot), "utf8");
if (!parentCss.includes('.spread-map[data-mode="focus"] .spread-category__marks { display: none; }')) {
  throw new Error("08 parent must still hide all marks in focus mode before the child override.");
}
for (const contract of [
  '.spread-category:not([data-focused="true"]) .spread-category__marks',
  "display: flex",
  '.spread-category[data-focused="true"] .spread-category__marks',
  "display: none",
]) {
  if (!childCss.includes(contract)) throw new Error(`08A truth-cue CSS is missing ${contract}.`);
}
for (const bannedProperty of ["flex-basis", "scroll-snap", "overflow-x", "translate", "transform", "position: sticky", "font-size"]) {
  if (childCss.includes(bannedProperty)) throw new Error(`08A must not change geometry, camera, typography, or navigation: ${bannedProperty}`);
}

const fixtureSource = await readFile(new URL("menu-fixture.js", archiveRoot), "utf8");
const rendererSource = await readFile(new URL("menu-spread-renderer.js", archiveRoot), "utf8");
const rendererSandbox = { window: {} };
runInNewContext(fixtureSource, rendererSandbox, { filename: "research-history/menu-fixture.js" });
runInNewContext(rendererSource, rendererSandbox, { filename: "research-history/menu-spread-renderer.js" });
const menu = rendererSandbox.window.menuLensResearchMenu;
const markup = rendererSandbox.window.renderMenuLensSpread(menu);
const markGroups = [...markup.matchAll(/class="spread-category__marks"[^>]*>([\s\S]*?)<\/div>/g)];
if (markGroups.length !== menu.categories.length) throw new Error(`08A requires one truth-cue group per category; received ${markGroups.length}.`);
const markCount = markGroups.reduce((sum, match) => sum + [...match[1].matchAll(/<span\b/g)].length, 0);
if (markCount !== menu.products.length) throw new Error(`08A requires one existing mark per product; received ${markCount}.`);
if (!rendererSource.includes("product.price / 8") || !rendererSource.includes("--mark-width")) {
  throw new Error("08A marks must remain derived from the existing product-price projection.");
}
if (childHtml.includes("選這道") || childHtml.includes("加入購物車")) throw new Error("08A must remain a menu-reading study without an order action.");

console.log("08A Archive v2 validation passed: exact 08 controller, 6 categories, 30 product-derived compressed truth marks and no second mechanism.");
