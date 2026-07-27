import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/22c-camera-only/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const styles = await readFile(new URL("camera-only-focus.css", archiveRoot), "utf8");

for (const required of [
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../camera-only-focus.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  '<script src="../../paper-landscape-core.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
  'columnClass: "landscape-column camera-only-column"',
  'columnWeight: () => 1',
  'const trackColumn =',
  'viewport.scrollTo({ left: Math.max(0, targetLeft), behavior })',
  'requestAnimationFrame(() => trackColumn(Math.floor(activeCategoryIndex / 2)))',
  'trackColumn(0)',
  'window.enableMenuLensHorizontalDrag(viewport',
  'aria-label="上一個分類"',
  'aria-label="下一個分類"',
]) {
  if (!html.includes(required)) throw new Error(`22C is missing its camera-only contract: ${required}`);
}

for (const forbidden of [
  'const focusFactor = 1.8',
  '1.65',
  'column.style.setProperty("--column-count"',
  'column.style.setProperty("--column-rows"',
  'trackingTimer',
  'data-collapsed',
  'category.dataset.collapsed',
  'data-scale="reading"',
  'onSettle:',
]) {
  if (html.includes(forbidden)) throw new Error(`22C must not inherit geometry or mixed focus behavior: ${forbidden}`);
}

const trackColumnSource = html.match(/const trackColumn = \(columnIndex,[\s\S]*?\n      \};/)?.[0];
const focusCategorySource = html.match(/const focusCategory = \(categoryIndex\) => \{[\s\S]*?\n      \};/)?.[0];
const showOverviewSource = html.match(/const showOverview = \(\) => \{[\s\S]*?\n      \};/)?.[0];
if (!trackColumnSource || !focusCategorySource || !showOverviewSource) {
  throw new Error("22C must expose explicit camera, focus, and reset functions for validation.");
}
if (!trackColumnSource.includes("scrollTo") || !focusCategorySource.includes("trackColumn")) {
  throw new Error("22C focus must move only the camera to the selected paper column.");
}
if (!showOverviewSource.includes("trackColumn(0)")) {
  throw new Error("22C reset must return the camera to 18's original left position.");
}
for (const source of [trackColumnSource, focusCategorySource, showOverviewSource]) {
  if (source.includes("--column-count") || source.includes("--column-rows")) {
    throw new Error("22C camera functions must not change paper geometry.");
  }
}

for (const forbiddenStyle of [
  "grid-template-rows",
  "width: 64rem",
  "flex-grow",
  "font-size: .68rem",
  "font-size: .62rem",
  "padding-inline: .55rem",
]) {
  if (styles.includes(forbiddenStyle)) throw new Error(`22C must preserve 18 geometry and typography: ${forbiddenStyle}`);
}

for (const requiredStyle of [
  "width: 46rem;",
  "min-width: 46rem;",
  "flex: 1 1 0;",
  "scroll-snap-type: none;",
  ".camera-only-viewport .paper-product",
  "padding-inline: .5rem;",
  "font-size: .64rem;",
]) {
  if (!styles.includes(requiredStyle)) throw new Error(`22C must preserve 18's base presentation: ${requiredStyle}`);
}

if (html.includes("選這道") || html.includes("加入購物車")) {
  throw new Error("22C must remain a menu-reading study without an order action.");
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("22C camera-only validation passed: fixed 18 geometry with focus-driven paper-column positioning only.");
