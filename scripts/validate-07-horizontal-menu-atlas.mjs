import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);

const readArchive = (path) => readFile(new URL(path, archiveRoot), "utf8");

const registrySource = await readArchive("prototype-registry.js");
const registrySandbox = { window: {} };
runInNewContext(registrySource, registrySandbox, { filename: "prototype-registry.js" });
const registry = registrySandbox.window.menuLensPrototypeRegistry;
const baseline = registry.prototypes.find((prototype) => prototype.id === "07");

if (!baseline) throw new Error("Registry must contain 07 Horizontal Menu Atlas.");
if (baseline.family !== "horizontal") throw new Error("07 must remain in the horizontal family.");
if (baseline.parentId !== null) throw new Error("07 must remain the root baseline of the horizontal family.");
if (baseline.kind !== "baseline" || baseline.status !== "baseline-recorded") {
  throw new Error("07 must remain classified as the recorded market baseline.");
}
if (baseline.path !== "phases/07-horizontal-menu-atlas/index.html") {
  throw new Error("07 must expose the executable baseline path.");
}
if (baseline.validationProfile !== "horizontal-market-baseline") {
  throw new Error("07 must use the horizontal-market-baseline validation profile.");
}

const expectedStyles = ["history.css", "horizontal-menu-atlas.css"];
const expectedScripts = ["menu-fixture.js", "horizontal-menu-atlas-renderer.js"];
if (baseline.assets.styles.join("|") !== expectedStyles.join("|")) {
  throw new Error("07 registry styles must remain exact and baseline-only.");
}
if (baseline.assets.scripts.join("|") !== expectedScripts.join("|")) {
  throw new Error("07 registry scripts must remain exact and baseline-only.");
}

const fixtureSource = await readArchive("menu-fixture.js");
const rendererSource = await readArchive("horizontal-menu-atlas-renderer.js");
const sandbox = { window: {} };
runInNewContext(fixtureSource, sandbox, { filename: "menu-fixture.js" });
runInNewContext(rendererSource, sandbox, { filename: "horizontal-menu-atlas-renderer.js" });

const menu = sandbox.window.menuLensResearchMenu;
const renderAtlas = sandbox.window.renderMenuLensHorizontalMenuAtlas;
if (typeof renderAtlas !== "function") {
  throw new Error("07 renderer must expose renderMenuLensHorizontalMenuAtlas.");
}

const markup = renderAtlas(menu);
const categoryIds = [...markup.matchAll(/class="atlas-category"[\s\S]*?data-category-id="([^"]+)"/g)].map((match) => match[1]);
const tabIds = [...markup.matchAll(/<button[\s\S]*?data-category-id="([^"]+)"[\s\S]*?aria-controls="atlas-[^"]+"/g)].map((match) => match[1]);
const productIds = [...markup.matchAll(/data-product-id="([^"]+)"/g)].map((match) => match[1]);
const expectedCategoryIds = menu.categories.map((category) => category.id);
const expectedProductIds = menu.products.map((product) => product.id);

if (categoryIds.join("|") !== expectedCategoryIds.join("|")) {
  throw new Error("07 must render all six categories in canonical order.");
}
if (tabIds.join("|") !== expectedCategoryIds.join("|")) {
  throw new Error("07 must expose exactly one horizontal tab for each canonical category.");
}
if (productIds.join("|") !== expectedProductIds.join("|")) {
  throw new Error("07 must render all 30 Products exactly once in canonical order.");
}
if (new Set(productIds).size !== 30) {
  throw new Error("07 must not duplicate Product identity.");
}
if ((markup.match(/aria-current="true"/g) ?? []).length !== 1) {
  throw new Error("07 must expose one initial active category tab.");
}
if ((markup.match(/class="atlas-category-nav"/g) ?? []).length !== 1) {
  throw new Error("07 must contain one category navigation surface.");
}
if ((markup.match(/class="atlas-scroll"/g) ?? []).length !== 1) {
  throw new Error("07 must contain one vertical document scroll region.");
}

for (const forbidden of ["minimap", "fisheye", "camera", "candidate", "cart", "order-action", "選這道", "加入購物車"]) {
  if (markup.toLowerCase().includes(forbidden.toLowerCase())) {
    throw new Error(`07 baseline must not introduce ${forbidden}.`);
  }
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
  if (page.includes(forbiddenReference)) {
    throw new Error(`07 page must not depend on ${forbiddenReference}.`);
  }
}
for (const interactionContract of [
  'button.addEventListener("click"',
  'scroll.addEventListener("scroll"',
  'product.addEventListener("toggle"',
  'event.key !== "Escape"',
  'openProduct.querySelector("summary").focus',
  'prefers-reduced-motion: reduce',
]) {
  if (!page.includes(interactionContract)) {
    throw new Error(`07 page is missing baseline interaction contract: ${interactionContract}`);
  }
}

const css = await readArchive("horizontal-menu-atlas.css");
for (const requiredCss of [
  ".atlas-category-nav",
  "overflow-x: auto",
  ".atlas-scroll",
  "overflow-y: auto",
  ".atlas-product summary",
  "@media (prefers-reduced-motion: reduce)",
]) {
  if (!css.includes(requiredCss)) throw new Error(`07 CSS is missing ${requiredCss}.`);
}
for (const forbiddenCss of [
  "scroll-snap-type",
  "scroll-snap-align",
  "transform:",
  "perspective:",
  "width: max-content",
  "writing-mode:",
]) {
  if (css.includes(forbiddenCss)) {
    throw new Error(`07 baseline CSS must not introduce spatial mechanism: ${forbiddenCss}`);
  }
}

console.log("07 Horizontal Menu Atlas baseline validation passed.");
