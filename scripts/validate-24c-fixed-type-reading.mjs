import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/24c-fixed-type-reading/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const childStyles = await readFile(new URL("fixed-type-reading.css", archiveRoot), "utf8");
const verticalStyles = await readFile(new URL("vertical-landscape.css", archiveRoot), "utf8");

for (const required of [
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../vertical-landscape.css" />',
  '<link rel="stylesheet" href="../../fixed-type-reading.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  '<script src="../../paper-landscape-core.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
  'class="landscape-viewport vertical-viewport fixed-type-reading"',
  'columnWeight: ({ firstCount, secondCount }) => firstCount + secondCount',
  'category.style.setProperty("--product-count"',
  'core.createDishDetail({',
  'window.enableMenuLensHorizontalDrag(viewport',
  '固定字級',
]) {
  if (!html.includes(required)) throw new Error(`24C is missing its fixed-type reading contract: ${required}`);
}

for (const requiredStyle of [
  ".vertical-sheet {",
  "width: 46rem;",
  '.vertical-viewport[data-scale="reading"] .vertical-sheet',
  "width: 64rem;",
  "grid-template-columns: repeat(var(--product-count), minmax(1.7rem, 1fr));",
  "direction: rtl;",
  "writing-mode: vertical-rl;",
  "text-combine-upright: all;",
  "font-size: .56rem;",
  "font-size: .52rem;",
  "font-size: .72rem;",
  "font-size: .58rem;",
  "font-size: .9rem;",
  "font-size: .7rem;",
  "font-size: 1rem;",
]) {
  if (!verticalStyles.includes(requiredStyle)) throw new Error(`24C must reuse Parent 24 vertical presentation: ${requiredStyle}`);
}

for (const requiredOverride of [
  '.fixed-type-reading[data-scale="reading"] .vertical-category .paper-product__name',
  '.fixed-type-reading[data-scale="reading"] .vertical-category .paper-product strong',
  '.fixed-type-reading[data-scale="reading"] .vertical-category .paper-category__header > span',
  '.fixed-type-reading[data-scale="reading"] .vertical-category .paper-category__header strong',
  '.fixed-type-reading[data-scale="reading"] .vertical-category .paper-category__header small',
  "font-size: .72rem;",
  "font-size: .58rem;",
  "font-size: .56rem;",
  "font-size: .82rem;",
  "font-size: .52rem;",
]) {
  if (!childStyles.includes(requiredOverride)) throw new Error(`24C is missing its fixed typography override: ${requiredOverride}`);
}

for (const forbiddenStyle of [
  "width:",
  "min-width:",
  "flex:",
  "grid-template",
  "padding:",
  "padding-inline",
  "writing-mode:",
  "text-combine-upright:",
  "display:",
  "position:",
  "overflow:",
  "scroll-snap",
  "transform:",
]) {
  if (childStyles.includes(forbiddenStyle)) throw new Error(`24C CSS must change only reading font sizes: ${forbiddenStyle}`);
}

for (const forbidden of [
  "landscape-sheet--equal-columns",
  "columnWeight: () => 1",
  "horizontal-price-labels.css",
  "horizontal-tb",
  "1.65",
  "focusFactor",
  "data-collapsed",
  "trackColumn",
  "trackingTimer",
  "semantic-summary",
  "選這道",
  "加入購物車",
]) {
  if (html.includes(forbidden)) throw new Error(`24C must not inherit another geometry, price, focus, or transaction mechanism: ${forbidden}`);
}

const overrideRules = [...childStyles.matchAll(/font-size:\s*([^;]+);/g)].map((match) => match[1].trim());
if (overrideRules.join("|") !== ".72rem|.58rem|.56rem|.82rem|.52rem") {
  throw new Error(`24C must expose exactly the five approved overview reading sizes, found: ${overrideRules.join(", ")}`);
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("24C validation passed: Parent 24 geometry, vertical flow, detail, and drag are retained while all reading typography stays at overview sizes.");
