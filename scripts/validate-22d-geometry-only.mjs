import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/22d-geometry-only/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const styles = await readFile(new URL("geometry-only-focus.css", archiveRoot), "utf8");

for (const required of [
  "22D · 18 + row and column geometry",
  "從 18 的乾淨 landscape substrate 重建",
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../geometry-only-focus.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  '<script src="../../paper-landscape-core.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
  'columnClass: "landscape-column geometry-only-column"',
  'columnWeight: () => 1',
  'const focusRowWeight = 1.8',
  'const focusColumnWeight = 1.65',
  'column.style.setProperty("--column-count"',
  'column.style.setProperty("--column-rows"',
  'aria-label="上一個紙欄"',
  'aria-label="下一個紙欄"',
  'let activeColumnIndex = 0',
  'snapToColumn(activeColumnIndex - 1)',
  'snapToColumn(activeColumnIndex + 1)',
  'onSettle: () => snapToColumn(nearestColumnIndex())',
]) {
  if (!html.includes(required)) throw new Error(`22D is missing its geometry-only contract: ${required}`);
}

for (const forbidden of [
  "trackColumn",
  "trackingTimer",
  "data-collapsed",
  "category.dataset.collapsed",
  'tracked ? "1.65" : "1"',
  "focusCategory(activeCategoryIndex - 1)",
  "focusCategory(activeCategoryIndex + 1)",
]) {
  if (html.includes(forbidden)) throw new Error(`22D must not inherit camera, collapse, or category-step behavior: ${forbidden}`);
}

const applyGeometrySource = html.match(/const applyGeometry = \(\) => \{[\s\S]*?\n      \};/)?.[0];
const focusCategorySource = html.match(/const focusCategory = \(categoryIndex\) => \{[\s\S]*?\n      \};/)?.[0];
const showOverviewSource = html.match(/const showOverview = \(\) => \{[\s\S]*?\n      \};/)?.[0];
if (!applyGeometrySource || !focusCategorySource || !showOverviewSource) {
  throw new Error("22D must expose explicit geometry, focus, and reset functions.");
}
for (const geometryWrite of ["--column-count", "--column-rows"]) {
  if (!applyGeometrySource.includes(geometryWrite)) {
    throw new Error(`22D must combine both validated geometry writes: ${geometryWrite}`);
  }
}
for (const [name, source] of [["focus", focusCategorySource], ["reset", showOverviewSource]]) {
  for (const cameraCall of ["snapToColumn", "scrollTo", "trackColumn"]) {
    if (source.includes(cameraCall)) throw new Error(`22D ${name} must not move the camera: ${cameraCall}`);
  }
}

for (const forbiddenStyle of [
  "scroll-snap-type: x proximity",
  "width: 64rem",
  "font-size: .68rem",
  "font-size: .62rem",
  "padding-inline: .55rem",
  "[data-focused",
  "data-collapsed",
]) {
  if (styles.includes(forbiddenStyle)) {
    throw new Error(`22D must preserve 18 typography and explicit camera control: ${forbiddenStyle}`);
  }
}

for (const requiredStyle of [
  "width: 46rem;",
  "min-width: 46rem;",
  "flex: var(--column-count) 1 0;",
  "flex-grow 220ms",
  "grid-template-rows 220ms",
  "scroll-snap-type: none;",
  ".geometry-only-viewport .paper-product",
  "padding-inline: .5rem;",
  "font-size: .64rem;",
  "transition: none;",
]) {
  if (!styles.includes(requiredStyle)) throw new Error(`22D is missing a presentation contract: ${requiredStyle}`);
}

if (html.includes("選這道") || html.includes("加入購物車")) {
  throw new Error("22D must remain a menu-reading study without an order action.");
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("22D geometry-only validation passed: row 1→1.8 plus column 1→1.65, with no focus-driven camera or typography change.");
