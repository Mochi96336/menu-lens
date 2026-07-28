import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/24b-horizontal-price-labels/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const childStyles = await readFile(new URL("horizontal-price-labels.css", archiveRoot), "utf8");
const verticalStyles = await readFile(new URL("vertical-landscape.css", archiveRoot), "utf8");

for (const required of [
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../vertical-landscape.css" />',
  '<link rel="stylesheet" href="../../horizontal-price-labels.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  '<script src="../../paper-landscape-core.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
  'class="landscape-viewport vertical-viewport horizontal-price-viewport"',
  'columnWeight: ({ firstCount, secondCount }) => firstCount + secondCount',
  'category.style.setProperty("--product-count"',
  'core.createDishDetail({',
  'window.enableMenuLensHorizontalDrag(viewport',
  '欄寬 ${columnCounts.join(":")}',
  '24B · 24 + horizontal price labels',
]) {
  if (!html.includes(required)) throw new Error(`24B is missing its inherited 24 contract: ${required}`);
}

for (const forbidden of [
  'columnWeight: () => 1',
  'landscape-sheet--equal-columns',
  '1.65',
  'focusFactor',
  'data-collapsed',
  'trackColumn',
  'trackingTimer',
  'semantic-summary',
  '選這道',
  '加入購物車',
]) {
  if (html.includes(forbidden)) throw new Error(`24B must not inherit another geometry, focus, or transaction mechanism: ${forbidden}`);
}

for (const requiredStyle of [
  ".vertical-sheet {",
  "width: 46rem;",
  '.vertical-viewport[data-scale="reading"] .vertical-sheet',
  "width: 64rem;",
  "grid-template-columns: repeat(var(--product-count), minmax(1.7rem, 1fr));",
  "direction: rtl;",
  "writing-mode: vertical-rl;",
  "font-size: .72rem;",
  "font-size: .9rem;",
]) {
  if (!verticalStyles.includes(requiredStyle)) throw new Error(`24B must reuse 24 vertical names and geometry unchanged: ${requiredStyle}`);
}

for (const requiredChildStyle of [
  ".horizontal-price-viewport .vertical-category .paper-product {",
  "position: relative;",
  "padding-bottom: 2.05rem;",
  ".horizontal-price-viewport .vertical-category .paper-product strong {",
  "position: absolute;",
  "left: 50%;",
  "bottom: .42rem;",
  "transform: translateX(-50%);",
  "text-combine-upright: none;",
  "writing-mode: horizontal-tb;",
]) {
  if (!childStyles.includes(requiredChildStyle)) throw new Error(`24B is missing its horizontal price-label contract: ${requiredChildStyle}`);
}

for (const forbiddenChildStyle of [
  "grid-template-columns",
  "flex:",
  "width:",
  "min-width:",
  "font-size:",
  "scroll-snap",
  "display: none",
]) {
  if (childStyles.includes(forbiddenChildStyle)) throw new Error(`24B child CSS must change only price orientation and reserved bottom space: ${forbiddenChildStyle}`);
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("24B validation passed: 24 geometry, vertical names, and interaction retained; only price labels return to horizontal flow.");
