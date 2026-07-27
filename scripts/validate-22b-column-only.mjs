import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/22b-column-only/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const styles = await readFile(new URL("column-only-focus.css", archiveRoot), "utf8");

for (const required of [
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../column-only-focus.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  '<script src="../../paper-landscape-core.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
  'columnClass: "landscape-column column-only-column"',
  'columnWeight: () => 1',
  'const focusColumnWeight = 1.65',
  'column.style.setProperty("--column-count"',
  'aria-label="上一個紙欄"',
  'aria-label="下一個紙欄"',
  'let activeColumnIndex = 0',
  'snapToColumn(activeColumnIndex - 1)',
  'snapToColumn(activeColumnIndex + 1)',
  'viewport.addEventListener("scroll"',
  'onSettle: () => snapToColumn(nearestColumnIndex())',
]) {
  if (!html.includes(required)) throw new Error(`22B is missing its column-only contract: ${required}`);
}

for (const forbidden of [
  'const focusFactor = 1.8',
  'column.style.setProperty("--column-rows"',
  "trackColumn",
  "trackingTimer",
  "data-collapsed",
  "category.dataset.collapsed",
  "focusCategory(activeCategoryIndex - 1)",
  "focusCategory(activeCategoryIndex + 1)",
]) {
  if (html.includes(forbidden)) throw new Error(`22B must not inherit mixed focus behavior: ${forbidden}`);
}

const applyColumnsSource = html.match(/const applyColumns = \(\) => \{[\s\S]*?\n      \};/)?.[0];
const focusCategorySource = html.match(/const focusCategory = \(categoryIndex\) => \{[\s\S]*?\n      \};/)?.[0];
const showOverviewSource = html.match(/const showOverview = \(\) => \{[\s\S]*?\n      \};/)?.[0];
if (!applyColumnsSource || !focusCategorySource || !showOverviewSource) {
  throw new Error("22B must expose explicit column, focus, and reset functions for validation.");
}
if (applyColumnsSource.includes("--column-rows")) {
  throw new Error("22B must keep 18's row ratios unchanged.");
}
for (const [name, source] of [["focus", focusCategorySource], ["reset", showOverviewSource]]) {
  if (source.includes("snapToColumn") || source.includes("scrollTo")) {
    throw new Error(`22B ${name} must not move the camera automatically.`);
  }
}

for (const forbiddenStyle of [
  "grid-template-rows",
  "width: 64rem",
  "font-size: .68rem",
  "font-size: .62rem",
  "padding-inline: .55rem",
]) {
  if (styles.includes(forbiddenStyle)) throw new Error(`22B must preserve 18 rows and typography: ${forbiddenStyle}`);
}

for (const requiredStyle of [
  "width: 46rem;",
  "min-width: 46rem;",
  "flex: var(--column-count) 1 0;",
  "transition: flex-grow",
  ".column-only-viewport .paper-product",
  "padding-inline: .5rem;",
  "font-size: .64rem;",
]) {
  if (!styles.includes(requiredStyle)) throw new Error(`22B must preserve 18's base presentation: ${requiredStyle}`);
}

if (html.includes("選這道") || html.includes("加入購物車")) {
  throw new Error("22B must remain a menu-reading study without an order action.");
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("22B column-only validation passed: 1→1.65 focused column, fixed rows, explicit camera navigation only.");
