import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/22g-collapse-only/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const styles = await readFile(new URL("collapse-only-focus.css", archiveRoot), "utf8");

for (const required of [
  "22G · 18 + paired-category collapse only",
  "23 式空間讓渡機制的獨立 sibling",
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../collapse-only-focus.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  '<script src="../../paper-landscape-core.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
  'columnClass: "landscape-column collapse-only-column"',
  "columnWeight: () => 1",
  'column.dataset.collapseFocus = focusedHere ? (activeLocalIndex === 0 ? "first" : "second") : "none"',
  "category.dataset.collapsed = String(collapsed)",
  'header.setAttribute("aria-expanded", String(!collapsed))',
  'aria-label="上一個紙欄"',
  'aria-label="下一個紙欄"',
  "snapToColumn(activeColumnIndex - 1)",
  "snapToColumn(activeColumnIndex + 1)",
  "onSettle: () => snapToColumn(nearestColumnIndex())",
]) {
  if (!html.includes(required)) throw new Error(`22G is missing its collapse-only contract: ${required}`);
}

for (const forbidden of [
  "const focusFactor = 1.8",
  "const focusRowWeight = 1.8",
  "const focusColumnWeight = 1.65",
  'setProperty("--column-count"',
  'setProperty("--column-rows"',
  "trackColumn",
  "trackingTimer",
  "focusCategory(activeCategoryIndex - 1)",
  "focusCategory(activeCategoryIndex + 1)",
]) {
  if (html.includes(forbidden)) throw new Error(`22G must not inherit geometry weighting, camera tracking, or category-step behavior: ${forbidden}`);
}

const focusCategorySource = html.match(/const focusCategory = \(categoryIndex\) => \{[\s\S]*?\n      \};/)?.[0];
const showOverviewSource = html.match(/const showOverview = \(\) => \{[\s\S]*?\n      \};/)?.[0];
if (!focusCategorySource || !showOverviewSource) {
  throw new Error("22G must expose explicit focus and reset functions.");
}
for (const [name, source] of [["focus", focusCategorySource], ["reset", showOverviewSource]]) {
  for (const forbiddenCall of ["snapToColumn", "scrollTo", "trackColumn", "setProperty"]) {
    if (source.includes(forbiddenCall)) throw new Error(`22G ${name} must not move the camera or write weighted geometry: ${forbiddenCall}`);
  }
}

for (const requiredStyle of [
  "width: 46rem;",
  "min-width: 46rem;",
  "flex: 1 1 0;",
  "scroll-snap-type: x proximity;",
  'data-collapse-focus="first"',
  "grid-template-rows: minmax(0, 1fr) 2.2rem;",
  'data-collapse-focus="second"',
  "grid-template-rows: 2.2rem minmax(0, 1fr);",
  'data-collapsed="true"',
  "display: none;",
  "height: 100%;",
  "padding-inline: .5rem;",
  "font-size: .64rem;",
  "font-size: .58rem;",
  "line-height: 1.2;",
  "transition: none;",
]) {
  if (!styles.includes(requiredStyle)) throw new Error(`22G is missing a presentation contract: ${requiredStyle}`);
}

for (const forbiddenStyle of [
  "--column-count",
  "--column-rows",
  "width: 64rem",
  "padding-inline: .55rem",
  "padding-inline: .68rem",
  "font-size: .68rem",
  "font-size: .62rem",
  "font-size: .8rem",
  "font-size: .72rem",
  "flex-grow",
  "scroll-snap-type: none",
]) {
  if (styles.includes(forbiddenStyle)) throw new Error(`22G must preserve parent width, typography, padding, and camera behavior: ${forbiddenStyle}`);
}

const firstCollapseRule = styles.match(/\.collapse-only-column\[data-collapse-focus="first"\] \{[\s\S]*?\}/)?.[0];
const secondCollapseRule = styles.match(/\.collapse-only-column\[data-collapse-focus="second"\] \{[\s\S]*?\}/)?.[0];
if (!firstCollapseRule?.includes("minmax(0, 1fr) 2.2rem") || !secondCollapseRule?.includes("2.2rem minmax(0, 1fr)")) {
  throw new Error("22G must collapse exactly the paired category to a 2.2rem header.");
}
for (const rule of [firstCollapseRule, secondCollapseRule]) {
  for (const forbiddenDeclaration of ["font-size", "padding", "width", "flex-grow", "transform"]) {
    if (rule.includes(forbiddenDeclaration)) {
      throw new Error(`22G collapse geometry must not add another presentation mechanism: ${forbiddenDeclaration}`);
    }
  }
}

if (html.includes("選這道") || html.includes("加入購物車")) {
  throw new Error("22G must remain a menu-reading study without an order action.");
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("22G collapse-only validation passed: paired category becomes a 2.2rem header while width, camera, typography, padding, and line-height remain unchanged.");
