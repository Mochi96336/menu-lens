import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/22a-row-only/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const styles = await readFile(new URL("row-only-weighted-focus.css", archiveRoot), "utf8");

for (const required of [
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../row-only-weighted-focus.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  '<script src="../../paper-landscape-core.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
  'columnWeight: () => 1',
  'const focusFactor = 1.8',
  'column.style.setProperty("--column-rows"',
  'class="landscape-sheet landscape-sheet--equal-columns row-only-sheet"',
  'aria-label="上一個紙欄"',
  'aria-label="下一個紙欄"',
  'let activeColumnIndex = 0',
  'snapToColumn(activeColumnIndex - 1)',
  'snapToColumn(activeColumnIndex + 1)',
  'viewport.addEventListener("scroll"',
  'onSettle: () => snapToColumn(nearestColumnIndex())',
]) {
  if (!html.includes(required)) throw new Error(`22A is missing its row-only contract: ${required}`);
}

for (const forbidden of [
  'column.style.setProperty("--column-count"',
  'tracked ? "1.65" : "1"',
  "trackColumn",
  "trackingTimer",
  "data-collapsed",
  "category.dataset.collapsed",
  "focusCategory(activeCategoryIndex - 1)",
  "focusCategory(activeCategoryIndex + 1)",
]) {
  if (html.includes(forbidden)) throw new Error(`22A must not inherit mixed focus behavior: ${forbidden}`);
}

const focusCategorySource = html.match(/const focusCategory = \(categoryIndex\) => \{[\s\S]*?\n      \};/)?.[0];
const showOverviewSource = html.match(/const showOverview = \(\) => \{[\s\S]*?\n      \};/)?.[0];
if (!focusCategorySource || !showOverviewSource) {
  throw new Error("22A must expose explicit focus and reset functions for validation.");
}
for (const [name, source] of [["focus", focusCategorySource], ["reset", showOverviewSource]]) {
  if (source.includes("snapToColumn") || source.includes("scrollTo")) {
    throw new Error(`22A ${name} must not move the camera automatically.`);
  }
}

for (const forbiddenStyle of [
  "flex-grow",
  "font-size: .68rem",
  "font-size: .62rem",
  "padding-inline: .55rem",
]) {
  if (styles.includes(forbiddenStyle)) throw new Error(`22A must preserve 18 typography and X geometry: ${forbiddenStyle}`);
}

for (const requiredStyle of [
  "width: 46rem;",
  "min-width: 46rem;",
  "transition: grid-template-rows",
  ".row-only-viewport .paper-product",
  "padding-inline: .5rem;",
  "font-size: .64rem;",
]) {
  if (!styles.includes(requiredStyle)) throw new Error(`22A must preserve 18's base presentation: ${requiredStyle}`);
}

if (html.includes("選這道") || html.includes("加入購物車")) {
  throw new Error("22A must remain a menu-reading study without an order action.");
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("22A row-only validation passed: fixed 1:1:1 columns, 1.8× row weighting, explicit camera navigation only.");