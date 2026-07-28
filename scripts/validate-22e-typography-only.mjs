import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/22e-typography-only/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const styles = await readFile(new URL("typography-only-focus.css", archiveRoot), "utf8");

for (const required of [
  "22E · 18 + typography-only focus",
  "從 18 的乾淨 landscape substrate 重建",
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../typography-only-focus.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  '<script src="../../paper-landscape-core.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
  'columnClass: "landscape-column type-only-column"',
  "columnWeight: () => 1",
  'aria-label="上一個紙欄"',
  'aria-label="下一個紙欄"',
  "let activeCategoryIndex = null",
  "let activeColumnIndex = 0",
  'category.dataset.focused = "true"',
  "snapToColumn(activeColumnIndex - 1)",
  "snapToColumn(activeColumnIndex + 1)",
  "onSettle: () => snapToColumn(nearestColumnIndex())",
]) {
  if (!html.includes(required)) throw new Error(`22E is missing its typography-only contract: ${required}`);
}

for (const forbidden of [
  "const focusFactor = 1.8",
  "const focusRowWeight = 1.8",
  "const focusColumnWeight = 1.65",
  'setProperty("--column-count"',
  'setProperty("--column-rows"',
  "trackColumn",
  "trackingTimer",
  "data-collapsed",
  "category.dataset.collapsed",
  "focusCategory(activeCategoryIndex - 1)",
  "focusCategory(activeCategoryIndex + 1)",
]) {
  if (html.includes(forbidden)) throw new Error(`22E must not inherit geometry, camera, collapse, or category-step behavior: ${forbidden}`);
}

const focusCategorySource = html.match(/const focusCategory = \(categoryIndex\) => \{[\s\S]*?\n      \};/)?.[0];
const showOverviewSource = html.match(/const showOverview = \(\) => \{[\s\S]*?\n      \};/)?.[0];
if (!focusCategorySource || !showOverviewSource) {
  throw new Error("22E must expose explicit focus and reset functions.");
}
for (const [name, source] of [["focus", focusCategorySource], ["reset", showOverviewSource]]) {
  for (const forbiddenCall of ["snapToColumn", "scrollTo", "trackColumn", "setProperty"]) {
    if (source.includes(forbiddenCall)) throw new Error(`22E ${name} must not move camera or rewrite geometry: ${forbiddenCall}`);
  }
}

for (const requiredStyle of [
  "width: 46rem;",
  "min-width: 46rem;",
  "flex: 1 1 0;",
  "padding-inline: .5rem;",
  "font-size: .64rem;",
  "font-size: .58rem;",
  '.paper-category[data-focused="true"] .paper-product',
  "font-size: .68rem;",
  '.paper-category[data-focused="true"] .paper-product strong',
  "font-size: .62rem;",
  "line-height: 1.2;",
  "transition: none;",
]) {
  if (!styles.includes(requiredStyle)) throw new Error(`22E is missing a presentation contract: ${requiredStyle}`);
}

for (const forbiddenStyle of [
  "--column-count",
  "--column-rows",
  "width: 64rem",
  "padding-inline: .55rem",
  "grid-template-rows",
  "flex-grow",
  "data-collapsed",
  "scroll-snap-type: none",
]) {
  if (styles.includes(forbiddenStyle)) throw new Error(`22E must preserve parent geometry, padding, and snap behavior: ${forbiddenStyle}`);
}

const focusedProductRule = styles.match(/\.type-only-viewport \.paper-category\[data-focused="true"\] \.paper-product \{[\s\S]*?\}/)?.[0];
const focusedPriceRule = styles.match(/\.type-only-viewport \.paper-category\[data-focused="true"\] \.paper-product strong \{[\s\S]*?\}/)?.[0];
if (!focusedProductRule?.includes("font-size: .68rem") || !focusedPriceRule?.includes("font-size: .62rem")) {
  throw new Error("22E focus must change only the two approved Product font sizes.");
}
for (const rule of [focusedProductRule, focusedPriceRule]) {
  for (const forbiddenDeclaration of ["padding", "line-height", "display", "transform", "width", "height", "flex", "grid"]) {
    if (rule.includes(forbiddenDeclaration)) {
      throw new Error(`22E focused typography rules must not add another presentation mechanism: ${forbiddenDeclaration}`);
    }
  }
}

if (html.includes("選這道") || html.includes("加入購物車")) {
  throw new Error("22E must remain a menu-reading study without an order action.");
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("22E typography-only validation passed: focused Product text .64/.58 → .68/.62, with geometry, camera, padding, and line-height unchanged.");
