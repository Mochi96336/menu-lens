import { access, readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { loadArchiveCatalog } from "./archive/load-catalog.mjs";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const readArchive = (path) => readFile(new URL(path, archiveRoot), "utf8");

const catalog = await loadArchiveCatalog();
const baseline = catalog.objects.find((object) => object.id === "07");
if (!baseline) throw new Error("Archive v2 catalog must contain 07 Horizontal Menu Atlas.");
for (const [field, expected] of Object.entries({
  family: "horizontal",
  objectType: "prototype",
  researchParentId: null,
  disposition: "reference",
  evidenceState: "implementation-only",
  entrypoint: "phases/07-horizontal-menu-atlas/index.html",
  validationProfile: "horizontal-market-baseline",
  reviewDocument: "records/07/index.html",
  evidencePath: "review-assets/07/README.md",
  sourcePr: 29,
  sourceCommit: "6128517df68f711c49d737ee8601dd3d34415a86",
})) {
  if (baseline[field] !== expected) throw new Error(`07 Archive v2 ${field} drifted.`);
}
const expectedStyles = ["history.css", "horizontal-menu-atlas.css"];
const expectedScripts = ["menu-fixture.js", "horizontal-menu-atlas-renderer.js"];
if (baseline.assets.styles.join("|") !== expectedStyles.join("|")
  || baseline.assets.scripts.join("|") !== expectedScripts.join("|")) {
  throw new Error("07 Archive v2 assets must remain exact and baseline-only.");
}
await Promise.all([
  access(new URL("records/07/index.html", archiveRoot)),
  access(new URL("review-assets/07/README.md", archiveRoot)),
  access(new URL("review-assets/07/viewport-320.svg", archiveRoot)),
  access(new URL("review-assets/07/viewport-390.svg", archiveRoot)),
  access(new URL("review-assets/07/viewport-desktop.svg", archiveRoot)),
  access(new URL("docs/research-history/07-horizontal-menu-atlas-review.md", root)),
]);

const fixtureSource = await readArchive("menu-fixture.js");
const rendererSource = await readArchive("horizontal-menu-atlas-renderer.js");
const sandbox = { window: {} };
runInNewContext(fixtureSource, sandbox, { filename: "menu-fixture.js" });
runInNewContext(rendererSource, sandbox, { filename: "horizontal-menu-atlas-renderer.js" });
const menu = sandbox.window.menuLensResearchMenu;
const renderAtlas = sandbox.window.renderMenuLensHorizontalMenuAtlas;
if (typeof renderAtlas !== "function") throw new Error("07 renderer must expose renderMenuLensHorizontalMenuAtlas.");

const markup = renderAtlas(menu);
const categoryIds = [...markup.matchAll(/class="atlas-category"[\s\S]*?data-category-id="([^"]+)"/g)].map((match) => match[1]);
const tabIds = [...markup.matchAll(/<button[\s\S]*?data-category-id="([^"]+)"[\s\S]*?aria-controls="atlas-[^"]+"/g)].map((match) => match[1]);
const productIds = [...markup.matchAll(/data-product-id="([^"]+)"/g)].map((match) => match[1]);
const expectedCategoryIds = menu.categories.map((category) => category.id);
const expectedProductIds = menu.products.map((product) => product.id);
if (categoryIds.join("|") !== expectedCategoryIds.join("|")) throw new Error("07 must render all six categories in canonical order.");
if (tabIds.join("|") !== expectedCategoryIds.join("|")) throw new Error("07 must expose exactly one horizontal tab per category.");
if (productIds.join("|") !== expectedProductIds.join("|") || new Set(productIds).size !== 30) {
  throw new Error("07 must render all 30 Products exactly once in canonical order.");
}
if ((markup.match(/aria-current="true"/g) ?? []).length !== 1) throw new Error("07 must expose one initial active category tab.");
if ((markup.match(/class="atlas-category-nav"/g) ?? []).length !== 1) throw new Error("07 must contain one category navigation surface.");
if ((markup.match(/class="atlas-scroll"/g) ?? []).length !== 1) throw new Error("07 must contain one vertical document scroll region.");
for (const forbidden of ["minimap", "fisheye", "camera", "candidate", "cart", "order-action", "選這道", "加入購物車"]) {
  if (markup.toLowerCase().includes(forbidden.toLowerCase())) throw new Error(`07 baseline must not introduce ${forbidden}.`);
}

const page = await readArchive("phases/07-horizontal-menu-atlas/index.html");
for (const reference of [
  '<link rel="stylesheet" href="../../horizontal-menu-atlas.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../horizontal-menu-atlas-renderer.js"></script>',
  "window.renderMenuLensHorizontalMenuAtlas(menu)",
]) {
  if (!page.includes(reference)) throw new Error(`07 page is missing required reference: ${reference}`);
}
for (const forbiddenReference of ["spatial-drag.js", "horizontal-ribbon", "fisheye-ribbon", "minimap", "scroll-snap", "Candidate", "下單"]) {
  if (page.includes(forbiddenReference)) throw new Error(`07 page must not depend on ${forbiddenReference}.`);
}
for (const interactionContract of [
  'button.addEventListener("click"',
  'scroll.addEventListener("scroll"',
  'scroll.scrollTo({ top: targetTop',
  "sectionBounds.top - scrollBounds.top",
  'product.addEventListener("toggle"',
  'event.key !== "Escape"',
  'openProduct.querySelector("summary").focus',
  'prefers-reduced-motion: reduce',
]) {
  if (!page.includes(interactionContract)) throw new Error(`07 page is missing baseline interaction contract: ${interactionContract}`);
}
if (page.includes("section.scrollIntoView")) throw new Error("07 category navigation must not scroll the outer research page.");

const css = await readArchive("horizontal-menu-atlas.css");
for (const requiredCss of [".atlas-category-nav", "overflow-x: auto", ".atlas-scroll", "overflow-y: auto", ".atlas-product summary", "@media (prefers-reduced-motion: reduce)"]) {
  if (!css.includes(requiredCss)) throw new Error(`07 CSS is missing ${requiredCss}.`);
}
for (const forbiddenCss of ["scroll-snap-type", "scroll-snap-align", "transform:", "perspective:", "width: max-content", "writing-mode:"]) {
  if (css.includes(forbiddenCss)) throw new Error(`07 baseline CSS must not introduce spatial mechanism: ${forbiddenCss}`);
}

console.log("07 Horizontal Menu Atlas Archive v2 validation passed: reference identity, complete fixture, familiar tabs and vertical document, deterministic evidence only.");
